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
  var yuyan_t9_pinyin$3 = "语燕九键";
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
  	xiaobai_simp: xiaobai_simp$3,
  	yuyan_t9_pinyin: yuyan_t9_pinyin$3
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
  var yuyan_t9_pinyin$2 = {
  	dict: "luna_pinyin",
  	prism: "yuyan_t9_pinyin"
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
  	xiaobai_simp: xiaobai_simp$2,
  	yuyan_t9_pinyin: yuyan_t9_pinyin$2
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
  var yuyan_t9_pinyin$1 = "zhou9110/rime-yuyan_t9_pinyin";
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
  	xiaobai_simp: xiaobai_simp$1,
  	yuyan_t9_pinyin: yuyan_t9_pinyin$1
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
  var yuyan_t9_pinyin = [
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
  	xiaobai_simp: xiaobai_simp,
  	yuyan_t9_pinyin: yuyan_t9_pinyin
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
  		md5: "c1278e7f9226189e9317287953fae78c"
  	},
  	{
  		name: "bopomofo.schema.yaml",
  		md5: "192d106e67555eaa288721567997bde6"
  	},
  	{
  		name: "bopomofo_express.prism.bin",
  		md5: "c090c042943418591167802c791e70e4"
  	},
  	{
  		name: "bopomofo_express.schema.yaml",
  		md5: "f561b9d3743f79bc557e3fb8c463a380"
  	}
  ];
  var cangjie = [
  	{
  		name: "cangjie5.prism.bin",
  		md5: "20296dded7f3062faf7a8c517cf31a42"
  	},
  	{
  		name: "cangjie5.reverse.bin",
  		md5: "d848049ab6069b1120189fc5f6151b6f"
  	},
  	{
  		name: "cangjie5.schema.yaml",
  		md5: "0b768b370805f7be54fa4bab2fd06316"
  	},
  	{
  		name: "cangjie5.table.bin",
  		md5: "30493238367ea0203ebdb75eb1d426d1"
  	},
  	{
  		name: "cangjie5_express.prism.bin",
  		md5: "ca6ef6b29663c3063a1e1d72de58a51a"
  	},
  	{
  		name: "cangjie5_express.schema.yaml",
  		md5: "8777c77fe530913bb23321a0534b66ec"
  	}
  ];
  var stroke = [
  	{
  		name: "stroke.prism.bin",
  		md5: "6eafd1e9620254a7b5297f418878f779"
  	},
  	{
  		name: "stroke.reverse.bin",
  		md5: "eae499a58d2b94d2438b3bb2ffc5e4d2"
  	},
  	{
  		name: "stroke.schema.yaml",
  		md5: "104032be71bea2b1cc7ea65bede494cc"
  	},
  	{
  		name: "stroke.table.bin",
  		md5: "9ec845b54a22954fc1a5fcc2d817db5a"
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
  		md5: "abb097cf54a84c31c10c9edef685ef31"
  	},
  	{
  		name: "stenotype.schema.yaml",
  		md5: "7e6af3748383d5e9ed45c48b5467544e"
  	}
  ];
  var scj = [
  	{
  		name: "scj6.prism.bin",
  		md5: "8c38ecd205f60475328b0bce5aaf9255"
  	},
  	{
  		name: "scj6.reverse.bin",
  		md5: "bf8191c5d48f493fef0d32671fe91059"
  	},
  	{
  		name: "scj6.schema.yaml",
  		md5: "ec5610abdd580e2699f51aa9c36aa8bc"
  	},
  	{
  		name: "scj6.table.bin",
  		md5: "868e8be661a0fd1784af0762850d1421"
  	}
  ];
  var quick = [
  	{
  		name: "quick5.prism.bin",
  		md5: "e92bb954376e23242b5a9b05211ceb86"
  	},
  	{
  		name: "quick5.reverse.bin",
  		md5: "5f2aa17364c0819715389341428e66c3"
  	},
  	{
  		name: "quick5.schema.yaml",
  		md5: "d1fa5bb2d31c5e4130df680aee8c4d0c"
  	},
  	{
  		name: "quick5.table.bin",
  		md5: "22c183295074bcde228604acd1187091"
  	}
  ];
  var targetFiles = {
  	"luna-pinyin": [
  	{
  		name: "luna_pinyin.prism.bin",
  		md5: "e0497dfc3a8bf5406dc956d86b198eab"
  	},
  	{
  		name: "luna_pinyin.reverse.bin",
  		md5: "00e3d7892479025cd9fb6d1e8ca312db"
  	},
  	{
  		name: "luna_pinyin.schema.yaml",
  		md5: "b65e8177efc46a9c3b519183e7eb0e4b"
  	},
  	{
  		name: "luna_pinyin.table.bin",
  		md5: "118739bdc45d46cccf8afb704fd62804"
  	},
  	{
  		name: "luna_pinyin_fluency.schema.yaml",
  		md5: "5a48bc22ac651089f77737d212e6e82d"
  	},
  	{
  		name: "luna_quanpin.prism.bin",
  		md5: "d93fae1b719022e0c3aae4efaa09151d"
  	},
  	{
  		name: "luna_quanpin.schema.yaml",
  		md5: "0cdd7f78f444c634e81261df81b874a8"
  	}
  ],
  	"double-pinyin": [
  	{
  		name: "double_pinyin.prism.bin",
  		md5: "88c0cf78815507730790dcda527fef5b"
  	},
  	{
  		name: "double_pinyin.schema.yaml",
  		md5: "37d4bbe21afc6ecbffef32035853a62f"
  	},
  	{
  		name: "double_pinyin_abc.prism.bin",
  		md5: "8670b8290bf645cc1c0f481f8e430423"
  	},
  	{
  		name: "double_pinyin_abc.schema.yaml",
  		md5: "c19a099692bfff3d2292f31cae94f1f3"
  	},
  	{
  		name: "double_pinyin_flypy.prism.bin",
  		md5: "41c52332b932736e2901f231b3aad8a8"
  	},
  	{
  		name: "double_pinyin_flypy.schema.yaml",
  		md5: "20da2434e8413cfee9a16862b5de94e7"
  	},
  	{
  		name: "double_pinyin_mspy.prism.bin",
  		md5: "204238b9d053356ffb7823ab7d8e96b8"
  	},
  	{
  		name: "double_pinyin_mspy.schema.yaml",
  		md5: "c003fa9a25e2fab5f92d87868ac2d193"
  	},
  	{
  		name: "double_pinyin_pyjj.prism.bin",
  		md5: "2f1afb7211c578cd4cb087b0754d58f1"
  	},
  	{
  		name: "double_pinyin_pyjj.schema.yaml",
  		md5: "8c0b98e7395f454375331f51953ab3e6"
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
  		md5: "04f58a899cff09faed70a7a4526254ad"
  	},
  	{
  		name: "terra_pinyin.reverse.bin",
  		md5: "36c9dd7499616465aca09ef896a26c64"
  	},
  	{
  		name: "terra_pinyin.schema.yaml",
  		md5: "db9b5fd43de95964b8832a4cc076f563"
  	},
  	{
  		name: "terra_pinyin.table.bin",
  		md5: "b35fe1fd19df4295ce4405fa947a27e3"
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
  ],
  	"zhou9110/rime-yuyan_t9_pinyin": [
  	{
  		name: "yuyan_t9_pinyin.prism.bin",
  		md5: "67e30a26a9485ab94665b73c86ea7033"
  	},
  	{
  		name: "yuyan_t9_pinyin.schema.yaml",
  		md5: "dbba2cddf826c5906fd9bf50f50679b2"
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
