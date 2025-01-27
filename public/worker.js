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
  var jyut6ping3$3 = "粤语拼音";
  var jyut6ping3_ipa$3 = "粤语拼音·IPA";
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
  var ipa_xsampa$2 = "X-SAMPA";
  var ipa_yunlong$2 = "云龙国际音标";
  var bopomofo$4 = "注音";
  var bopomofo_express$3 = "注音·快打";
  var zyenpheng$3 = "中古全拼";
  var sampheng$3 = "中古三拼";
  var cangjie5$3 = "仓颉五代";
  var cangjie5_express$3 = "仓颉五代·快打";
  var stroke$4 = "五笔画";
  var array30$3 = "行列30";
  var wugniu_lopha$3 = "上海吴语·老派";
  var wugniu$4 = "上海吴语·新派";
  var soutzoe$4 = "苏州吴语";
  var stenotype$4 = "打字速记法";
  var scj6$3 = "快速仓颉";
  var quick5$3 = "速成";
  var schemaName = {
  	luna_pinyin: luna_pinyin$3,
  	luna_pinyin_fluency: luna_pinyin_fluency$3,
  	jyut6ping3: jyut6ping3$3,
  	jyut6ping3_ipa: jyut6ping3_ipa$3,
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
  	ipa_xsampa: ipa_xsampa$2,
  	ipa_yunlong: ipa_yunlong$2,
  	bopomofo: bopomofo$4,
  	bopomofo_express: bopomofo_express$3,
  	zyenpheng: zyenpheng$3,
  	sampheng: sampheng$3,
  	cangjie5: cangjie5$3,
  	cangjie5_express: cangjie5_express$3,
  	stroke: stroke$4,
  	array30: array30$3,
  	wugniu_lopha: wugniu_lopha$3,
  	wugniu: wugniu$4,
  	soutzoe: soutzoe$4,
  	stenotype: stenotype$4,
  	scj6: scj6$3,
  	quick5: quick5$3
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
  var jyut6ping3$2 = {
  };
  var jyut6ping3_ipa$2 = {
  	dict: "jyut6ping3",
  	prism: "jyut6ping3_ipa"
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
  var ipa_xsampa$1 = {
  };
  var ipa_yunlong$1 = {
  };
  var bopomofo$3 = {
  	dict: "terra_pinyin",
  	prism: "bopomofo"
  };
  var bopomofo_express$2 = {
  	dict: "terra_pinyin",
  	prism: "bopomofo_express"
  };
  var zyenpheng$2 = {
  };
  var sampheng$2 = {
  	dict: "zyenpheng",
  	prism: "sampheng"
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
  var wugniu_lopha$2 = {
  };
  var wugniu$3 = {
  	dict: "wugniu_lopha",
  	prism: "wugniu"
  };
  var soutzoe$3 = {
  };
  var stenotype$3 = {
  	dict: "luna_pinyin",
  	prism: "stenotype"
  };
  var scj6$2 = {
  };
  var quick5$2 = {
  };
  var schemaFiles = {
  	luna_pinyin: luna_pinyin$2,
  	luna_pinyin_fluency: luna_pinyin_fluency$2,
  	luna_quanpin: luna_quanpin$1,
  	jyut6ping3: jyut6ping3$2,
  	jyut6ping3_ipa: jyut6ping3_ipa$2,
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
  	ipa_xsampa: ipa_xsampa$1,
  	ipa_yunlong: ipa_yunlong$1,
  	bopomofo: bopomofo$3,
  	bopomofo_express: bopomofo_express$2,
  	zyenpheng: zyenpheng$2,
  	sampheng: sampheng$2,
  	cangjie5: cangjie5$2,
  	cangjie5_express: cangjie5_express$2,
  	stroke: stroke$3,
  	array30: array30$2,
  	wugniu_lopha: wugniu_lopha$2,
  	wugniu: wugniu$3,
  	soutzoe: soutzoe$3,
  	stenotype: stenotype$3,
  	scj6: scj6$2,
  	quick5: quick5$2
  };

  var luna_pinyin$1 = "luna-pinyin";
  var luna_pinyin_fluency$1 = "luna-pinyin";
  var luna_quanpin = "luna-pinyin";
  var jyut6ping3$1 = "cantonese";
  var jyut6ping3_ipa$1 = "cantonese";
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
  var ipa_xsampa = "ipa";
  var ipa_yunlong = "ipa";
  var bopomofo$2 = "bopomofo";
  var bopomofo_express$1 = "bopomofo";
  var zyenpheng$1 = "middle-chinese";
  var sampheng$1 = "middle-chinese";
  var cangjie5$1 = "cangjie";
  var cangjie5_express$1 = "cangjie";
  var stroke$2 = "stroke";
  var array30$1 = "array";
  var wugniu_lopha$1 = "wugniu";
  var wugniu$2 = "wugniu";
  var soutzoe$2 = "soutzoe";
  var stenotype$2 = "stenotype";
  var scj6$1 = "scj";
  var quick5$1 = "quick";
  var schemaTarget = {
  	luna_pinyin: luna_pinyin$1,
  	luna_pinyin_fluency: luna_pinyin_fluency$1,
  	luna_quanpin: luna_quanpin,
  	jyut6ping3: jyut6ping3$1,
  	jyut6ping3_ipa: jyut6ping3_ipa$1,
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
  	ipa_xsampa: ipa_xsampa,
  	ipa_yunlong: ipa_yunlong,
  	bopomofo: bopomofo$2,
  	bopomofo_express: bopomofo_express$1,
  	zyenpheng: zyenpheng$1,
  	sampheng: sampheng$1,
  	cangjie5: cangjie5$1,
  	cangjie5_express: cangjie5_express$1,
  	stroke: stroke$2,
  	array30: array30$1,
  	wugniu_lopha: wugniu_lopha$1,
  	wugniu: wugniu$2,
  	soutzoe: soutzoe$2,
  	stenotype: stenotype$2,
  	scj6: scj6$1,
  	quick5: quick5$1
  };

  var luna_pinyin = [
  	"stroke"
  ];
  var luna_pinyin_fluency = [
  	"stroke"
  ];
  var jyut6ping3 = [
  	"luna_pinyin",
  	"stroke",
  	"cangjie5"
  ];
  var jyut6ping3_ipa = [
  	"luna_pinyin",
  	"stroke",
  	"cangjie5"
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
  var zyenpheng = [
  	"luna_pinyin"
  ];
  var sampheng = [
  	"luna_pinyin"
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
  var wugniu_lopha = [
  	"luna_pinyin"
  ];
  var wugniu$1 = [
  	"luna_pinyin"
  ];
  var soutzoe$1 = [
  	"luna_pinyin"
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
  var dependencyMap = {
  	luna_pinyin: luna_pinyin,
  	luna_pinyin_fluency: luna_pinyin_fluency,
  	jyut6ping3: jyut6ping3,
  	jyut6ping3_ipa: jyut6ping3_ipa,
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
  	zyenpheng: zyenpheng,
  	sampheng: sampheng,
  	cangjie5: cangjie5,
  	cangjie5_express: cangjie5_express,
  	stroke: stroke$1,
  	array30: array30,
  	wugniu_lopha: wugniu_lopha,
  	wugniu: wugniu$1,
  	soutzoe: soutzoe$1,
  	stenotype: stenotype$1,
  	scj6: scj6,
  	quick5: quick5
  };

  var cantonese = [
  	{
  		name: "jyut6ping3.prism.bin",
  		md5: "5449db95af0fba0aa87ec44695033d3f"
  	},
  	{
  		name: "jyut6ping3.reverse.bin",
  		md5: "61d0d6d737159187c1bdef9e299d62bf"
  	},
  	{
  		name: "jyut6ping3.schema.yaml",
  		md5: "a7ca63a2c115a4f94a1d6dd3456025fc"
  	},
  	{
  		name: "jyut6ping3.table.bin",
  		md5: "8c3610806e682fc6c263d835ef134659"
  	},
  	{
  		name: "jyut6ping3_ipa.prism.bin",
  		md5: "ade9842464a86563c7becc4c97e8b5e8"
  	},
  	{
  		name: "jyut6ping3_ipa.schema.yaml",
  		md5: "f38558f91b530e2b0c72faa725aeb24b"
  	}
  ];
  var wubi = [
  	{
  		name: "wubi86.prism.bin",
  		md5: "531262bd7dd0b37387480a6be793e992"
  	},
  	{
  		name: "wubi86.reverse.bin",
  		md5: "fd84814998dbcc3feecc117ee8835ee3"
  	},
  	{
  		name: "wubi86.schema.yaml",
  		md5: "8d909e711934ced60b061569e7f78670"
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
  var ipa = [
  	{
  		name: "ipa_xsampa.prism.bin",
  		md5: "1f89f323b398e55b41a3d51292e153b4"
  	},
  	{
  		name: "ipa_xsampa.reverse.bin",
  		md5: "204c1a057beff33f33e4e6e2334d9388"
  	},
  	{
  		name: "ipa_xsampa.schema.yaml",
  		md5: "3de5dc8e1373f3445eb3eb6372757725"
  	},
  	{
  		name: "ipa_xsampa.table.bin",
  		md5: "2643f70120a14876bf358e77fae47def"
  	},
  	{
  		name: "ipa_yunlong.prism.bin",
  		md5: "e99012d354473ed9251fde4d664cf360"
  	},
  	{
  		name: "ipa_yunlong.reverse.bin",
  		md5: "bb4ede9eca7365defaa9631dacf2d0c6"
  	},
  	{
  		name: "ipa_yunlong.schema.yaml",
  		md5: "bca1844fbfc48f6141d419cb154cbc00"
  	},
  	{
  		name: "ipa_yunlong.table.bin",
  		md5: "ca7388b30a151620453ef1684408c34f"
  	}
  ];
  var bopomofo = [
  	{
  		name: "bopomofo.prism.bin",
  		md5: "cfdb9263986831e1d21c23654ec3543b"
  	},
  	{
  		name: "bopomofo.schema.yaml",
  		md5: "2c657fdc0c9ac5894f3e4244949f2ef4"
  	},
  	{
  		name: "bopomofo_express.prism.bin",
  		md5: "a12cc380155da94b5fb4e97e0bcffe4f"
  	},
  	{
  		name: "bopomofo_express.schema.yaml",
  		md5: "d15617e84bc8cb6d001dba90c8bf5cfb"
  	}
  ];
  var cangjie = [
  	{
  		name: "cangjie5.prism.bin",
  		md5: "b9cf1ba7d30cfcea467771b61422701b"
  	},
  	{
  		name: "cangjie5.reverse.bin",
  		md5: "302de203207d03703306bece4b57d86e"
  	},
  	{
  		name: "cangjie5.schema.yaml",
  		md5: "df8cbfe8269ac88860873e5fc02eb4c5"
  	},
  	{
  		name: "cangjie5.table.bin",
  		md5: "1c854e997f5fe1c7690cd7f40bb4df96"
  	},
  	{
  		name: "cangjie5_express.prism.bin",
  		md5: "75fdabf12b40399baf77cb3c8ee62fe8"
  	},
  	{
  		name: "cangjie5_express.schema.yaml",
  		md5: "8777c77fe530913bb23321a0534b66ec"
  	}
  ];
  var stroke = [
  	{
  		name: "stroke.prism.bin",
  		md5: "1f26c416eb52ea8f3561138ceb11c6c1"
  	},
  	{
  		name: "stroke.reverse.bin",
  		md5: "a086c66e7d7ce40e4941fcb5d9e349b4"
  	},
  	{
  		name: "stroke.schema.yaml",
  		md5: "44e4e9b9b7560c88374b6227816567d4"
  	},
  	{
  		name: "stroke.table.bin",
  		md5: "797242fa9b16802d8cac5c0f4fafe726"
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
  var wugniu = [
  	{
  		name: "wugniu.prism.bin",
  		md5: "f819b520ea3ffe24f56b32903fe3898e"
  	},
  	{
  		name: "wugniu.schema.yaml",
  		md5: "ee539505db7b3e4503a3a0f4cae62617"
  	},
  	{
  		name: "wugniu_lopha.prism.bin",
  		md5: "ddc49adef5f36fb8accc38d162c3e7bb"
  	},
  	{
  		name: "wugniu_lopha.reverse.bin",
  		md5: "3cd2200a259a83b80fcb356682174ce1"
  	},
  	{
  		name: "wugniu_lopha.schema.yaml",
  		md5: "f548d1bc05160aca287f455e1c94d338"
  	},
  	{
  		name: "wugniu_lopha.table.bin",
  		md5: "89ebfd89994a67472b2378f488338a76"
  	}
  ];
  var soutzoe = [
  	{
  		name: "soutzoe.prism.bin",
  		md5: "4af9c71a9e69294ca4dab79a4eafcefa"
  	},
  	{
  		name: "soutzoe.reverse.bin",
  		md5: "db12cdab4004bf6efa49542152fb7cfe"
  	},
  	{
  		name: "soutzoe.schema.yaml",
  		md5: "40f575d07cf52d64c1a15c5a58f255a7"
  	},
  	{
  		name: "soutzoe.table.bin",
  		md5: "6239f14f75ec3cbb0d913b6947f8e8c0"
  	}
  ];
  var stenotype = [
  	{
  		name: "stenotype.prism.bin",
  		md5: "c120d2ace6fca1b1b52016b268e37203"
  	},
  	{
  		name: "stenotype.schema.yaml",
  		md5: "0a6f54723a56922d7c73aa8fb654ee05"
  	}
  ];
  var scj = [
  	{
  		name: "scj6.prism.bin",
  		md5: "bd95bef1a1cd46f289c7750337072373"
  	},
  	{
  		name: "scj6.reverse.bin",
  		md5: "efb9d5051b2ce3e4d91a4a8dc4b63027"
  	},
  	{
  		name: "scj6.schema.yaml",
  		md5: "ec5610abdd580e2699f51aa9c36aa8bc"
  	},
  	{
  		name: "scj6.table.bin",
  		md5: "4216472d63de2550ee944ac5e97c557a"
  	}
  ];
  var quick = [
  	{
  		name: "quick5.prism.bin",
  		md5: "3bde0fa40d486200ce17c45574575cca"
  	},
  	{
  		name: "quick5.reverse.bin",
  		md5: "27444b0d2825ee331e992058d419be34"
  	},
  	{
  		name: "quick5.schema.yaml",
  		md5: "d1fa5bb2d31c5e4130df680aee8c4d0c"
  	},
  	{
  		name: "quick5.table.bin",
  		md5: "25954fec90c31dedb99a45812c7447a9"
  	}
  ];
  var targetFiles = {
  	"luna-pinyin": [
  	{
  		name: "luna_pinyin.prism.bin",
  		md5: "7d9d35a535f4314e0e639a755a49a803"
  	},
  	{
  		name: "luna_pinyin.reverse.bin",
  		md5: "09b9cb91da7877ba3031a2b489cbb872"
  	},
  	{
  		name: "luna_pinyin.schema.yaml",
  		md5: "b3555fff5919fb9a87cb7418d50705ea"
  	},
  	{
  		name: "luna_pinyin.table.bin",
  		md5: "3459c9adedacd1e8a5549151c6eebfaf"
  	},
  	{
  		name: "luna_pinyin_fluency.schema.yaml",
  		md5: "754f317e79fe2eb7b49916080682353a"
  	},
  	{
  		name: "luna_quanpin.prism.bin",
  		md5: "9ac86ebd50964ca73777e95d39ffcdfa"
  	},
  	{
  		name: "luna_quanpin.schema.yaml",
  		md5: "9aeff9d907c95ba1649f05d9985d166d"
  	}
  ],
  	cantonese: cantonese,
  	"double-pinyin": [
  	{
  		name: "double_pinyin.prism.bin",
  		md5: "8f0f67cc03e7997e6fb1f54340d0900f"
  	},
  	{
  		name: "double_pinyin.schema.yaml",
  		md5: "37d4bbe21afc6ecbffef32035853a62f"
  	},
  	{
  		name: "double_pinyin_abc.prism.bin",
  		md5: "37de99c9f1f41eb0b0ca49d3e8437e77"
  	},
  	{
  		name: "double_pinyin_abc.schema.yaml",
  		md5: "c19a099692bfff3d2292f31cae94f1f3"
  	},
  	{
  		name: "double_pinyin_flypy.prism.bin",
  		md5: "768868e81ef8ec82082b7cdf60877665"
  	},
  	{
  		name: "double_pinyin_flypy.schema.yaml",
  		md5: "20da2434e8413cfee9a16862b5de94e7"
  	},
  	{
  		name: "double_pinyin_mspy.prism.bin",
  		md5: "553677ad635979a6c6ad41e8e81bafbc"
  	},
  	{
  		name: "double_pinyin_mspy.schema.yaml",
  		md5: "da893bb1ccb222953447bc03e28a7aa3"
  	},
  	{
  		name: "double_pinyin_pyjj.prism.bin",
  		md5: "5e111aefe2225f4ae81247c5d8671782"
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
  		md5: "396310ce988926a9b042e46367bd7cdc"
  	},
  	{
  		name: "pinyin_simp.reverse.bin",
  		md5: "ca9481c53e46b9e83959059dbed3245f"
  	},
  	{
  		name: "pinyin_simp.schema.yaml",
  		md5: "afd22c2b963905a5784b785d347807ce"
  	},
  	{
  		name: "pinyin_simp.table.bin",
  		md5: "1b3d113faba63c656d600206c44144ff"
  	}
  ],
  	"terra-pinyin": [
  	{
  		name: "terra_pinyin.prism.bin",
  		md5: "b18b47791691f7673836fd5e5acc7356"
  	},
  	{
  		name: "terra_pinyin.reverse.bin",
  		md5: "6dcec3929ee0be53c3b16c64539604b0"
  	},
  	{
  		name: "terra_pinyin.schema.yaml",
  		md5: "e1d2aabdde916f7bb782d4e924b529c7"
  	},
  	{
  		name: "terra_pinyin.table.bin",
  		md5: "3889cac922d8acc149e1498897970f10"
  	}
  ],
  	ipa: ipa,
  	bopomofo: bopomofo,
  	"middle-chinese": [
  	{
  		name: "sampheng.prism.bin",
  		md5: "edccb12d4111233c6c02cccd989c195b"
  	},
  	{
  		name: "sampheng.schema.yaml",
  		md5: "47d5a80503aac65038f641958672829b"
  	},
  	{
  		name: "zyenpheng.prism.bin",
  		md5: "7ad3323279ae37dbdaf2dd4b804b8618"
  	},
  	{
  		name: "zyenpheng.reverse.bin",
  		md5: "0d3b84ce7e7b2714cb4a0eea35536d38"
  	},
  	{
  		name: "zyenpheng.schema.yaml",
  		md5: "e7c18923cb4e305362f0b7ae48b2c329"
  	},
  	{
  		name: "zyenpheng.table.bin",
  		md5: "dc2e6122b5e0753e6c12887d21c38195"
  	}
  ],
  	cangjie: cangjie,
  	stroke: stroke,
  	array: array,
  	wugniu: wugniu,
  	soutzoe: soutzoe,
  	stenotype: stenotype,
  	scj: scj,
  	quick: quick
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
