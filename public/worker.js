(function () {
  'use strict';

  // src/LambdaWrapper.ts
  function expose(functions, readyPromise) {
    self.onmessage = async (msg) => {
      await readyPromise;
      const { name, args, transferableIndices } = msg.data;
      const transferables = [];
      let data;
      try {
        const workerFunction = functions[name];
        if (typeof workerFunction !== "function") {
          console.error(`${name} is not an exposed worker function`);
          self.close();
          return;
        }
        const result = await workerFunction(...args);
        args.forEach((arg, i) => transferableIndices.includes(i) && transferables.push(arg));
        data = { type: "success", result, transferables };
      } catch (error) {
        const { message, name: name2 } = error;
        data = {
          type: "error",
          error: {
            message,
            name: name2
          }
        };
      }
      self.postMessage(data, transferables);
    };
  }
  function control(name) {
    return (...args) => {
      const data = {
        type: "control",
        name,
        args
      };
      self.postMessage(data);
    };
  }
  function loadWasm(script, options) {
    options = options || {};
    const { url, init } = options;
    return new Promise((resolve) => {
      self.Module = {
        ...options?.Module,
        async onRuntimeInitialized() {
          init && await init();
          resolve(null);
        },
        locateFile(path, prefix) {
          return (url || prefix) + path;
        }
      };
      importScripts((url || "") + script);
    });
  }

  // src/AsyncFS.ts
  function fsOperate(operation, ...args) {
    const result = Module.FS[operation](...args);
    if (operation === "mkdir") {
      return;
    }
    return result;
  }

  const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

  let idbProxyableTypes;
  let cursorAdvanceMethods;
  // This is a function to prevent it throwing up in node environments.
  function getIdbProxyableTypes() {
      return (idbProxyableTypes ||
          (idbProxyableTypes = [
              IDBDatabase,
              IDBObjectStore,
              IDBIndex,
              IDBCursor,
              IDBTransaction,
          ]));
  }
  // This is a function to prevent it throwing up in node environments.
  function getCursorAdvanceMethods() {
      return (cursorAdvanceMethods ||
          (cursorAdvanceMethods = [
              IDBCursor.prototype.advance,
              IDBCursor.prototype.continue,
              IDBCursor.prototype.continuePrimaryKey,
          ]));
  }
  const transactionDoneMap = new WeakMap();
  const transformCache = new WeakMap();
  const reverseTransformCache = new WeakMap();
  function promisifyRequest(request) {
      const promise = new Promise((resolve, reject) => {
          const unlisten = () => {
              request.removeEventListener('success', success);
              request.removeEventListener('error', error);
          };
          const success = () => {
              resolve(wrap(request.result));
              unlisten();
          };
          const error = () => {
              reject(request.error);
              unlisten();
          };
          request.addEventListener('success', success);
          request.addEventListener('error', error);
      });
      // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
      // is because we create many promises from a single IDBRequest.
      reverseTransformCache.set(promise, request);
      return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
      // Early bail if we've already created a done promise for this transaction.
      if (transactionDoneMap.has(tx))
          return;
      const done = new Promise((resolve, reject) => {
          const unlisten = () => {
              tx.removeEventListener('complete', complete);
              tx.removeEventListener('error', error);
              tx.removeEventListener('abort', error);
          };
          const complete = () => {
              resolve();
              unlisten();
          };
          const error = () => {
              reject(tx.error || new DOMException('AbortError', 'AbortError'));
              unlisten();
          };
          tx.addEventListener('complete', complete);
          tx.addEventListener('error', error);
          tx.addEventListener('abort', error);
      });
      // Cache it for later retrieval.
      transactionDoneMap.set(tx, done);
  }
  let idbProxyTraps = {
      get(target, prop, receiver) {
          if (target instanceof IDBTransaction) {
              // Special handling for transaction.done.
              if (prop === 'done')
                  return transactionDoneMap.get(target);
              // Make tx.store return the only store in the transaction, or undefined if there are many.
              if (prop === 'store') {
                  return receiver.objectStoreNames[1]
                      ? undefined
                      : receiver.objectStore(receiver.objectStoreNames[0]);
              }
          }
          // Else transform whatever we get back.
          return wrap(target[prop]);
      },
      set(target, prop, value) {
          target[prop] = value;
          return true;
      },
      has(target, prop) {
          if (target instanceof IDBTransaction &&
              (prop === 'done' || prop === 'store')) {
              return true;
          }
          return prop in target;
      },
  };
  function replaceTraps(callback) {
      idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
      // Due to expected object equality (which is enforced by the caching in `wrap`), we
      // only create one new func per func.
      // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
      // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
      // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
      // with real promises, so each advance methods returns a new promise for the cursor object, or
      // undefined if the end of the cursor has been reached.
      if (getCursorAdvanceMethods().includes(func)) {
          return function (...args) {
              // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
              // the original object.
              func.apply(unwrap(this), args);
              return wrap(this.request);
          };
      }
      return function (...args) {
          // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
          // the original object.
          return wrap(func.apply(unwrap(this), args));
      };
  }
  function transformCachableValue(value) {
      if (typeof value === 'function')
          return wrapFunction(value);
      // This doesn't return, it just creates a 'done' promise for the transaction,
      // which is later returned for transaction.done (see idbObjectHandler).
      if (value instanceof IDBTransaction)
          cacheDonePromiseForTransaction(value);
      if (instanceOfAny(value, getIdbProxyableTypes()))
          return new Proxy(value, idbProxyTraps);
      // Return the same value back if we're not going to transform it.
      return value;
  }
  function wrap(value) {
      // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
      // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
      if (value instanceof IDBRequest)
          return promisifyRequest(value);
      // If we've already transformed this value before, reuse the transformed value.
      // This is faster, but it also provides object equality.
      if (transformCache.has(value))
          return transformCache.get(value);
      const newValue = transformCachableValue(value);
      // Not all types are transformed.
      // These may be primitive types, so they can't be WeakMap keys.
      if (newValue !== value) {
          transformCache.set(value, newValue);
          reverseTransformCache.set(newValue, value);
      }
      return newValue;
  }
  const unwrap = (value) => reverseTransformCache.get(value);

  /**
   * Open a database.
   *
   * @param name Name of the database.
   * @param version Schema version.
   * @param callbacks Additional callbacks.
   */
  function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
      const request = indexedDB.open(name, version);
      const openPromise = wrap(request);
      if (upgrade) {
          request.addEventListener('upgradeneeded', (event) => {
              upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
          });
      }
      if (blocked) {
          request.addEventListener('blocked', (event) => blocked(
          // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
          event.oldVersion, event.newVersion, event));
      }
      openPromise
          .then((db) => {
          if (terminated)
              db.addEventListener('close', () => terminated());
          if (blocking) {
              db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
          }
      })
          .catch(() => { });
      return openPromise;
  }

  const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
  const writeMethods = ['put', 'add', 'delete', 'clear'];
  const cachedMethods = new Map();
  function getMethod(target, prop) {
      if (!(target instanceof IDBDatabase &&
          !(prop in target) &&
          typeof prop === 'string')) {
          return;
      }
      if (cachedMethods.get(prop))
          return cachedMethods.get(prop);
      const targetFuncName = prop.replace(/FromIndex$/, '');
      const useIndex = prop !== targetFuncName;
      const isWrite = writeMethods.includes(targetFuncName);
      if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
          !(isWrite || readMethods.includes(targetFuncName))) {
          return;
      }
      const method = async function (storeName, ...args) {
          // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
          const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
          let target = tx.store;
          if (useIndex)
              target = target.index(args.shift());
          // Must reject if op rejects.
          // If it's a write operation, must reject if tx.done rejects.
          // Must reject with op rejection first.
          // Must resolve with op value.
          // Must handle both promises (no unhandled rejections)
          return (await Promise.all([
              target[targetFuncName](...args),
              isWrite && tx.done,
          ]))[0];
      };
      cachedMethods.set(prop, method);
      return method;
  }
  replaceTraps((oldTraps) => ({
      ...oldTraps,
      get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
      has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
  }));

  const advanceMethodProps = ['continue', 'continuePrimaryKey', 'advance'];
  const methodMap = {};
  const advanceResults = new WeakMap();
  const ittrProxiedCursorToOriginalProxy = new WeakMap();
  const cursorIteratorTraps = {
      get(target, prop) {
          if (!advanceMethodProps.includes(prop))
              return target[prop];
          let cachedFunc = methodMap[prop];
          if (!cachedFunc) {
              cachedFunc = methodMap[prop] = function (...args) {
                  advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
              };
          }
          return cachedFunc;
      },
  };
  async function* iterate(...args) {
      // tslint:disable-next-line:no-this-assignment
      let cursor = this;
      if (!(cursor instanceof IDBCursor)) {
          cursor = await cursor.openCursor(...args);
      }
      if (!cursor)
          return;
      cursor = cursor;
      const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
      ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
      // Map this double-proxy back to the original, so other cursor methods work.
      reverseTransformCache.set(proxiedCursor, unwrap(cursor));
      while (cursor) {
          yield proxiedCursor;
          // If one of the advancing methods was not called, call continue().
          cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
          advanceResults.delete(proxiedCursor);
      }
  }
  function isIteratorProp(target, prop) {
      return ((prop === Symbol.asyncIterator &&
          instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor])) ||
          (prop === 'iterate' && instanceOfAny(target, [IDBIndex, IDBObjectStore])));
  }
  replaceTraps((oldTraps) => ({
      ...oldTraps,
      get(target, prop, receiver) {
          if (isIteratorProp(target, prop))
              return iterate;
          return oldTraps.get(target, prop, receiver);
      },
      has(target, prop) {
          return isIteratorProp(target, prop) || oldTraps.has(target, prop);
      },
  }));

  const HASH = 'hash';
  const CONTENT = 'content';
  class LazyCache {
      dbPromise;
      constructor(name) {
          this.dbPromise = openDB(name, 1, {
              upgrade(db) {
                  db.createObjectStore(HASH);
                  db.createObjectStore(CONTENT);
              }
          });
      }
      async getDB() {
          return this.dbPromise.catch(() => undefined); // not available in Firefox Private Browsing
      }
      async get(key, hash, url) {
          const db = await this.getDB();
          const storedHash = await db?.get(HASH, key);
          if (storedHash === hash) {
              return db.get(CONTENT, key);
          }
          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`Fail to download ${key}`);
          }
          const buffer = await response.arrayBuffer();
          await db?.put(CONTENT, buffer, key);
          await db?.put(HASH, hash, key);
          return buffer;
      }
      async invalidate() {
          const db = await this.getDB();
          return db?.clear(HASH);
      }
  }

  var luna_pinyin$3 = "朙月拼音";
  var luna_pinyin_fluency$3 = "朙月拼音·语句流";
  var double_pinyin$3 = "自然码双拼";
  var double_pinyin_abc$3 = "智能ABC双拼";
  var double_pinyin_flypy$3 = "小鹤双拼";
  var double_pinyin_mspy$3 = "微软双拼";
  var double_pinyin_pyjj$3 = "拼音加加双拼";
  var wubi86$3 = "86五笔";
  var wubi_pinyin$3 = "86五笔·拼音";
  var wubi_trad$3 = "86五笔·繁体";
  var pinyin_simp$3 = "袖珍简拼";
  var terra_pinyin$3 = "地球拼音";
  var bopomofo$4 = "注音";
  var bopomofo_express$3 = "注音·快打";
  var cangjie5$3 = "仓颉五代";
  var cangjie5_express$3 = "仓颉五代·快打";
  var stroke$4 = "五笔画";
  var array30$3 = "行列30";
  var stenotype$4 = "打字速记法";
  var scj6$3 = "快速仓颉";
  var quick5$3 = "速成";
  var xiaobai_simp$3 = "小白九键";
  var schemaName = {
  	luna_pinyin: luna_pinyin$3,
  	luna_pinyin_fluency: luna_pinyin_fluency$3,
  	double_pinyin: double_pinyin$3,
  	double_pinyin_abc: double_pinyin_abc$3,
  	double_pinyin_flypy: double_pinyin_flypy$3,
  	double_pinyin_mspy: double_pinyin_mspy$3,
  	double_pinyin_pyjj: double_pinyin_pyjj$3,
  	wubi86: wubi86$3,
  	wubi_pinyin: wubi_pinyin$3,
  	wubi_trad: wubi_trad$3,
  	pinyin_simp: pinyin_simp$3,
  	terra_pinyin: terra_pinyin$3,
  	bopomofo: bopomofo$4,
  	bopomofo_express: bopomofo_express$3,
  	cangjie5: cangjie5$3,
  	cangjie5_express: cangjie5_express$3,
  	stroke: stroke$4,
  	array30: array30$3,
  	stenotype: stenotype$4,
  	scj6: scj6$3,
  	quick5: quick5$3,
  	xiaobai_simp: xiaobai_simp$3
  };

  var luna_pinyin$2 = {
  };
  var luna_pinyin_fluency$2 = {
  	dict: "luna_pinyin"
  };
  var luna_quanpin$1 = {
  	dict: "luna_pinyin",
  	prism: "luna_quanpin"
  };
  var double_pinyin$2 = {
  	dict: "luna_pinyin",
  	prism: "double_pinyin"
  };
  var double_pinyin_abc$2 = {
  	dict: "luna_pinyin",
  	prism: "double_pinyin_abc"
  };
  var double_pinyin_flypy$2 = {
  	dict: "luna_pinyin",
  	prism: "double_pinyin_flypy"
  };
  var double_pinyin_mspy$2 = {
  	dict: "luna_pinyin",
  	prism: "double_pinyin_mspy"
  };
  var double_pinyin_pyjj$2 = {
  	dict: "luna_pinyin",
  	prism: "double_pinyin_pyjj"
  };
  var wubi86$2 = {
  };
  var wubi_pinyin$2 = {
  	dict: "wubi86",
  	prism: "wubi_pinyin"
  };
  var wubi_trad$2 = {
  	dict: "wubi86",
  	prism: "wubi_trad"
  };
  var pinyin_simp$2 = {
  };
  var terra_pinyin$2 = {
  };
  var bopomofo$3 = {
  	dict: "terra_pinyin",
  	prism: "bopomofo"
  };
  var bopomofo_express$2 = {
  	dict: "terra_pinyin",
  	prism: "bopomofo_express"
  };
  var cangjie5$2 = {
  };
  var cangjie5_express$2 = {
  	dict: "cangjie5",
  	prism: "cangjie5_express"
  };
  var stroke$3 = {
  };
  var array30$2 = {
  };
  var stenotype$3 = {
  	dict: "luna_pinyin",
  	prism: "stenotype"
  };
  var scj6$2 = {
  };
  var quick5$2 = {
  };
  var xiaobai_simp$2 = {
  	dict: "xiaobai",
  	prism: "xiaobai_simp"
  };
  var schemaFiles = {
  	luna_pinyin: luna_pinyin$2,
  	luna_pinyin_fluency: luna_pinyin_fluency$2,
  	luna_quanpin: luna_quanpin$1,
  	double_pinyin: double_pinyin$2,
  	double_pinyin_abc: double_pinyin_abc$2,
  	double_pinyin_flypy: double_pinyin_flypy$2,
  	double_pinyin_mspy: double_pinyin_mspy$2,
  	double_pinyin_pyjj: double_pinyin_pyjj$2,
  	wubi86: wubi86$2,
  	wubi_pinyin: wubi_pinyin$2,
  	wubi_trad: wubi_trad$2,
  	pinyin_simp: pinyin_simp$2,
  	terra_pinyin: terra_pinyin$2,
  	bopomofo: bopomofo$3,
  	bopomofo_express: bopomofo_express$2,
  	cangjie5: cangjie5$2,
  	cangjie5_express: cangjie5_express$2,
  	stroke: stroke$3,
  	array30: array30$2,
  	stenotype: stenotype$3,
  	scj6: scj6$2,
  	quick5: quick5$2,
  	xiaobai_simp: xiaobai_simp$2
  };

  var luna_pinyin$1 = "luna-pinyin";
  var luna_pinyin_fluency$1 = "luna-pinyin";
  var luna_quanpin = "luna-pinyin";
  var double_pinyin$1 = "double-pinyin";
  var double_pinyin_abc$1 = "double-pinyin";
  var double_pinyin_flypy$1 = "double-pinyin";
  var double_pinyin_mspy$1 = "double-pinyin";
  var double_pinyin_pyjj$1 = "double-pinyin";
  var wubi86$1 = "wubi";
  var wubi_pinyin$1 = "wubi";
  var wubi_trad$1 = "wubi";
  var pinyin_simp$1 = "pinyin-simp";
  var terra_pinyin$1 = "terra-pinyin";
  var bopomofo$2 = "bopomofo";
  var bopomofo_express$1 = "bopomofo";
  var cangjie5$1 = "cangjie";
  var cangjie5_express$1 = "cangjie";
  var stroke$2 = "stroke";
  var array30$1 = "array";
  var stenotype$2 = "stenotype";
  var scj6$1 = "scj";
  var quick5$1 = "quick";
  var xiaobai_simp$1 = "zhou9110/rime-xiaobai_simp";
  var schemaTarget = {
  	luna_pinyin: luna_pinyin$1,
  	luna_pinyin_fluency: luna_pinyin_fluency$1,
  	luna_quanpin: luna_quanpin,
  	double_pinyin: double_pinyin$1,
  	double_pinyin_abc: double_pinyin_abc$1,
  	double_pinyin_flypy: double_pinyin_flypy$1,
  	double_pinyin_mspy: double_pinyin_mspy$1,
  	double_pinyin_pyjj: double_pinyin_pyjj$1,
  	wubi86: wubi86$1,
  	wubi_pinyin: wubi_pinyin$1,
  	wubi_trad: wubi_trad$1,
  	pinyin_simp: pinyin_simp$1,
  	terra_pinyin: terra_pinyin$1,
  	bopomofo: bopomofo$2,
  	bopomofo_express: bopomofo_express$1,
  	cangjie5: cangjie5$1,
  	cangjie5_express: cangjie5_express$1,
  	stroke: stroke$2,
  	array30: array30$1,
  	stenotype: stenotype$2,
  	scj6: scj6$1,
  	quick5: quick5$1,
  	xiaobai_simp: xiaobai_simp$1
  };

  var luna_pinyin = [
  	"stroke"
  ];
  var luna_pinyin_fluency = [
  	"stroke"
  ];
  var double_pinyin = [
  	"luna_pinyin"
  ];
  var double_pinyin_abc = [
  	"luna_pinyin"
  ];
  var double_pinyin_flypy = [
  	"luna_pinyin"
  ];
  var double_pinyin_mspy = [
  	"luna_pinyin"
  ];
  var double_pinyin_pyjj = [
  	"luna_pinyin"
  ];
  var wubi86 = [
  	"pinyin_simp"
  ];
  var wubi_pinyin = [
  	"pinyin_simp"
  ];
  var wubi_trad = [
  	"pinyin_simp"
  ];
  var pinyin_simp = [
  	"stroke"
  ];
  var terra_pinyin = [
  	"stroke"
  ];
  var bopomofo$1 = [
  	"terra_pinyin",
  	"stroke"
  ];
  var bopomofo_express = [
  	"terra_pinyin",
  	"stroke"
  ];
  var cangjie5 = [
  	"luna_quanpin"
  ];
  var cangjie5_express = [
  	"luna_quanpin"
  ];
  var stroke$1 = [
  	"luna_pinyin"
  ];
  var array30 = [
  	"luna_quanpin"
  ];
  var stenotype$1 = [
  	"luna_pinyin"
  ];
  var scj6 = [
  	"luna_quanpin"
  ];
  var quick5 = [
  	"luna_quanpin"
  ];
  var xiaobai_simp = [
  	"luna_quanpin"
  ];
  var dependencyMap = {
  	luna_pinyin: luna_pinyin,
  	luna_pinyin_fluency: luna_pinyin_fluency,
  	double_pinyin: double_pinyin,
  	double_pinyin_abc: double_pinyin_abc,
  	double_pinyin_flypy: double_pinyin_flypy,
  	double_pinyin_mspy: double_pinyin_mspy,
  	double_pinyin_pyjj: double_pinyin_pyjj,
  	wubi86: wubi86,
  	wubi_pinyin: wubi_pinyin,
  	wubi_trad: wubi_trad,
  	pinyin_simp: pinyin_simp,
  	terra_pinyin: terra_pinyin,
  	bopomofo: bopomofo$1,
  	bopomofo_express: bopomofo_express,
  	cangjie5: cangjie5,
  	cangjie5_express: cangjie5_express,
  	stroke: stroke$1,
  	array30: array30,
  	stenotype: stenotype$1,
  	scj6: scj6,
  	quick5: quick5,
  	xiaobai_simp: xiaobai_simp
  };

  var wubi = [
  	{
  		name: "wubi86.prism.bin",
  		md5: "6fd543a2732c327608896ec77c95569e"
  	},
  	{
  		name: "wubi86.reverse.bin",
  		md5: "fd84814998dbcc3feecc117ee8835ee3"
  	},
  	{
  		name: "wubi86.schema.yaml",
  		md5: "8deadd5945ef0e8d254365f907d6baba"
  	},
  	{
  		name: "wubi86.table.bin",
  		md5: "5f9a629c8ed1b254ebe2897474e9d39b"
  	},
  	{
  		name: "wubi_pinyin.prism.bin",
  		md5: "67b7747db86930810dce46bf26f0d5e0"
  	},
  	{
  		name: "wubi_pinyin.schema.yaml",
  		md5: "4c04a659b6eb7371b3c2ec2607a19671"
  	},
  	{
  		name: "wubi_trad.prism.bin",
  		md5: "330f3f5e67cdc152368431d5707a8d60"
  	},
  	{
  		name: "wubi_trad.schema.yaml",
  		md5: "47aff1514de471d8937c1730944dca85"
  	}
  ];
  var bopomofo = [
  	{
  		name: "bopomofo.prism.bin",
  		md5: "18098153fe8122dd0cf51ad859385e0f"
  	},
  	{
  		name: "bopomofo.schema.yaml",
  		md5: "2c657fdc0c9ac5894f3e4244949f2ef4"
  	},
  	{
  		name: "bopomofo_express.prism.bin",
  		md5: "91affb22303874a39a2fa8d4b41e2dfd"
  	},
  	{
  		name: "bopomofo_express.schema.yaml",
  		md5: "d15617e84bc8cb6d001dba90c8bf5cfb"
  	}
  ];
  var cangjie = [
  	{
  		name: "cangjie5.prism.bin",
  		md5: "46bcbd50ef0c452c51bee7e34df3dc8c"
  	},
  	{
  		name: "cangjie5.reverse.bin",
  		md5: "695a8bcddf67b27558b1868318cfa658"
  	},
  	{
  		name: "cangjie5.schema.yaml",
  		md5: "0b768b370805f7be54fa4bab2fd06316"
  	},
  	{
  		name: "cangjie5.table.bin",
  		md5: "390879988e5779b29f3f8e0bd60943ad"
  	},
  	{
  		name: "cangjie5_express.prism.bin",
  		md5: "fdfc04eb4c10f4502cd69bae62a832ba"
  	},
  	{
  		name: "cangjie5_express.schema.yaml",
  		md5: "8777c77fe530913bb23321a0534b66ec"
  	}
  ];
  var stroke = [
  	{
  		name: "stroke.prism.bin",
  		md5: "d21e27a81187bf058527e519f0aa67b9"
  	},
  	{
  		name: "stroke.reverse.bin",
  		md5: "2e0f7babfeb626770e68ad55f3baa506"
  	},
  	{
  		name: "stroke.schema.yaml",
  		md5: "44e4e9b9b7560c88374b6227816567d4"
  	},
  	{
  		name: "stroke.table.bin",
  		md5: "55068a995707ff31c911d7cd2af4f5f7"
  	}
  ];
  var array = [
  	{
  		name: "array30.prism.bin",
  		md5: "145544e36e59f20cfef6dea90522b2d3"
  	},
  	{
  		name: "array30.reverse.bin",
  		md5: "7f7d287012202461fc5ceb3f9eca2116"
  	},
  	{
  		name: "array30.schema.yaml",
  		md5: "e526324ff344202f5485e87166b73200"
  	},
  	{
  		name: "array30.table.bin",
  		md5: "e6dde610a837ae475807936ae77270d0"
  	}
  ];
  var stenotype = [
  	{
  		name: "stenotype.prism.bin",
  		md5: "986af9a4a8cfe295ad3c7884dd1f2652"
  	},
  	{
  		name: "stenotype.schema.yaml",
  		md5: "0a6f54723a56922d7c73aa8fb654ee05"
  	}
  ];
  var scj = [
  	{
  		name: "scj6.prism.bin",
  		md5: "1f7c7b2330a8058cba5be328e4860417"
  	},
  	{
  		name: "scj6.reverse.bin",
  		md5: "a902a4e442e9e15011e532dbf3fb9446"
  	},
  	{
  		name: "scj6.schema.yaml",
  		md5: "ec5610abdd580e2699f51aa9c36aa8bc"
  	},
  	{
  		name: "scj6.table.bin",
  		md5: "e0c43ec9862f999a1907408596018d25"
  	}
  ];
  var quick = [
  	{
  		name: "quick5.prism.bin",
  		md5: "9b44199f6ddf7de5d28097da678b7dcf"
  	},
  	{
  		name: "quick5.reverse.bin",
  		md5: "16549ca49a8dac115c227696fe44b6bc"
  	},
  	{
  		name: "quick5.schema.yaml",
  		md5: "d1fa5bb2d31c5e4130df680aee8c4d0c"
  	},
  	{
  		name: "quick5.table.bin",
  		md5: "9fbda05373f2b1fa250358911b2cde3b"
  	}
  ];
  var targetFiles = {
  	"luna-pinyin": [
  	{
  		name: "luna_pinyin.prism.bin",
  		md5: "4cd7ffbe72384440f02cc1383b4ab094"
  	},
  	{
  		name: "luna_pinyin.reverse.bin",
  		md5: "69b6755f9493932788125b8de4ac4947"
  	},
  	{
  		name: "luna_pinyin.schema.yaml",
  		md5: "b65e8177efc46a9c3b519183e7eb0e4b"
  	},
  	{
  		name: "luna_pinyin.table.bin",
  		md5: "fcc7ea435ec40adfd584e9d296ebd3e3"
  	},
  	{
  		name: "luna_pinyin_fluency.schema.yaml",
  		md5: "5a48bc22ac651089f77737d212e6e82d"
  	},
  	{
  		name: "luna_quanpin.prism.bin",
  		md5: "65d0193fc6ac1e36cbff44f0b1467d85"
  	},
  	{
  		name: "luna_quanpin.schema.yaml",
  		md5: "0cdd7f78f444c634e81261df81b874a8"
  	}
  ],
  	"double-pinyin": [
  	{
  		name: "double_pinyin.prism.bin",
  		md5: "9600b90a52a64411bd5ffc4e9e3034b1"
  	},
  	{
  		name: "double_pinyin.schema.yaml",
  		md5: "37d4bbe21afc6ecbffef32035853a62f"
  	},
  	{
  		name: "double_pinyin_abc.prism.bin",
  		md5: "be790f1479535b53c2ddfd7ca92f85d9"
  	},
  	{
  		name: "double_pinyin_abc.schema.yaml",
  		md5: "c19a099692bfff3d2292f31cae94f1f3"
  	},
  	{
  		name: "double_pinyin_flypy.prism.bin",
  		md5: "595f6b225fabcc8ebc9b82cd7fe43996"
  	},
  	{
  		name: "double_pinyin_flypy.schema.yaml",
  		md5: "20da2434e8413cfee9a16862b5de94e7"
  	},
  	{
  		name: "double_pinyin_mspy.prism.bin",
  		md5: "6845a703998953d7c260f57e73a0bed2"
  	},
  	{
  		name: "double_pinyin_mspy.schema.yaml",
  		md5: "da893bb1ccb222953447bc03e28a7aa3"
  	},
  	{
  		name: "double_pinyin_pyjj.prism.bin",
  		md5: "5c3aed4a07b5882a450d2b5b9920816f"
  	},
  	{
  		name: "double_pinyin_pyjj.schema.yaml",
  		md5: "fa420f3c963b79af67c8c52c27cbffc2"
  	}
  ],
  	wubi: wubi,
  	"pinyin-simp": [
  	{
  		name: "pinyin_simp.prism.bin",
  		md5: "f63d0ae4f9fa9ae0f8ca3756254ba112"
  	},
  	{
  		name: "pinyin_simp.reverse.bin",
  		md5: "0a6da52bdc7437661d449d59abdf8094"
  	},
  	{
  		name: "pinyin_simp.schema.yaml",
  		md5: "a8f31e89a6d2b7c5db47fbc9c929b221"
  	},
  	{
  		name: "pinyin_simp.table.bin",
  		md5: "5a9c1633422d813e39f324461b9319c6"
  	}
  ],
  	"terra-pinyin": [
  	{
  		name: "terra_pinyin.prism.bin",
  		md5: "b9608538b802715e49b88389fa9d80b4"
  	},
  	{
  		name: "terra_pinyin.reverse.bin",
  		md5: "786ff4d6db340c4f72eaa9bd10f2722c"
  	},
  	{
  		name: "terra_pinyin.schema.yaml",
  		md5: "e1d2aabdde916f7bb782d4e924b529c7"
  	},
  	{
  		name: "terra_pinyin.table.bin",
  		md5: "cc9c8bed8612199ca53591947142830e"
  	}
  ],
  	bopomofo: bopomofo,
  	cangjie: cangjie,
  	stroke: stroke,
  	array: array,
  	stenotype: stenotype,
  	scj: scj,
  	quick: quick,
  	"zhou9110/rime-xiaobai_simp": [
  	{
  		name: "xiaobai.reverse.bin",
  		md5: "bc0519b8692ba7edbcf044c4f19ee37a"
  	},
  	{
  		name: "xiaobai.table.bin",
  		md5: "ec5e9ce0f7b48c1be4ba34d7552ca31a"
  	},
  	{
  		name: "xiaobai_simp.prism.bin",
  		md5: "567b74a04448edb706b844abccac10c4"
  	},
  	{
  		name: "xiaobai_simp.schema.yaml",
  		md5: "4187a7cb77ce4c3f1e74588968966217"
  	}
  ]
  };

  const RIME_USER = "/rime";
  const RIME_SHARED = "/usr/share/rime-data";
  function getURL(target, name) {
    return `ime/${target}/${name}`;
  }
  const lazyCache = new LazyCache("ime");
  async function fetchPrebuilt(schemaId) {
    const fetched = [];
    function getFiles(key) {
      if (fetched.includes(key)) {
        return [];
      }
      fetched.push(key);
      const files2 = [];
      for (const dependency of dependencyMap[key] || []) {
        files2.push(...getFiles(dependency));
      }
      const { dict, prism } = schemaFiles[key];
      const dictionary = dict || key;
      const tableBin = `${dictionary}.table.bin`;
      const reverseBin = `${dictionary}.reverse.bin`;
      const prismBin = `${prism || dictionary}.prism.bin`;
      const schemaYaml = `${key}.schema.yaml`;
      const target = schemaTarget[key];
      for (const fileName of [tableBin, reverseBin, prismBin, schemaYaml]) {
        for (const { name, md5 } of targetFiles[target]) {
          if (fileName === name) {
            files2.push({ name, md5, target });
            break;
          }
        }
      }
      return files2;
    }
    const files = getFiles(schemaId);
    await Promise.all(files.map(async ({ name, target, md5 }) => {
      const path = `${RIME_SHARED}/build/${name}`;
      try {
        Module.FS.lookupPath(path);
      } catch (e) {
        const ab = await lazyCache.get(name, md5, getURL(target, name));
        Module.FS.writeFile(path, new Uint8Array(ab));
      }
    }));
  }
  async function setIME(schemaId) {
    if (!deployed) {
      await fetchPrebuilt(schemaId);
    }
    Module.ccall("set_ime", "null", ["string"], [schemaId]);
    return syncUserDirectory("write");
  }
  function syncUserDirectory(direction) {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    Module.FS.syncfs(direction === "read", (err) => {
      if (err) {
        reject(err);
      }
      resolve(null);
    });
    return promise;
  }
  const readyPromise = loadWasm("rime.js", {
    url: "",
    async init() {
      Module.FS.mkdir(RIME_USER);
      Module.FS.mount(IDBFS, {}, RIME_USER);
      await syncUserDirectory("read");
      Module.ccall("init", "null", [], []);
      for (const [schema, name] of Object.entries(schemaName)) {
        Module.ccall("set_schema_name", "null", ["string", "string"], [schema, name]);
      }
    },
    Module: {
      // Customize for glog
      printErr(message) {
        const match = message.match(/[EWID]\S+ \S+ \S+ (.*)/);
        if (match) {
          ({
            E: console.error,
            W: console.warn,
            I: console.info,
            D: console.debug
          })[message[0]](match[1]);
        } else {
          console.error(message);
        }
      }
    }
  });
  let deployed = false;
  const deployStatus = control("deployStatus");
  globalThis._deployStatus = (status, schemas) => {
    if (status === "success") {
      deployed = true;
    }
    deployStatus(status, schemas);
  };
  function rmStar(path) {
    for (const file of Module.FS.readdir(path)) {
      if (file === "." || file === "..") {
        continue;
      }
      const subPath = `${path}/${file}`;
      const { mode } = Module.FS.lstat(subPath);
      if (Module.FS.isDir(mode)) {
        rmStar(subPath);
        Module.FS.rmdir(subPath);
      } else {
        Module.FS.unlink(subPath);
      }
    }
  }
  async function resetUserDirectory() {
    rmStar(RIME_USER);
    await syncUserDirectory("write");
    deployed = false;
    Module.ccall("reset", "null", [], []);
  }
  expose({
    fsOperate,
    resetUserDirectory,
    setIME,
    setOption(option, value) {
      return Module.ccall("set_option", "null", ["string", "number"], [option, value]);
    },
    setPageSize(size) {
      return Module.ccall("set_page_size", "null", ["number"], [size]);
    },
    deploy() {
      return Module.ccall("deploy", "null", [], []);
    },
    async process(input) {
      const result = JSON.parse(Module.ccall("process", "string", ["string"], [input]));
      if ("committed" in result) {
        await syncUserDirectory("write");
      }
      return result;
    },
    selectCandidateOnCurrentPage(index) {
      return Module.ccall("select_candidate_on_current_page", "string", ["number"], [index]);
    },
    changePage(backward) {
      return Module.ccall("change_page", "string", ["boolean"], [backward]);
    }
  }, readyPromise);

})();
//# sourceMappingURL=worker.js.map
