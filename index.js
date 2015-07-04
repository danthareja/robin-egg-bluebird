(function(global) {
  'use strict';

  // 2.1 Promise States
  // A promise must be in one of three states: pending, fulfilled, or rejected.
  var PENDING = 'pending';
  var FULFILLED = 'fulfilled';
  var REJECTED = 'rejected';

  // Grab fastest async tick available
  var tick = (typeof process === 'object' && process.nextTick) ||
    (typeof setImmediate === 'function' && setImmediate) ||
    function(func) { setTimeout(func, 0); };

  var Promise = function(resolver) {
    var promise = this;

    promise._queue = [];
    promise.status = PENDING;
    promise.value = undefined;

    // Kick off promise resolution by invoking resolver(resolve, reject)
    try {
      resolver(
        function resolve(value) {
          $$Resolve$$(promise, value);
        },
        function reject(reason) {
          rejectPromise(promise, reason)
        }
      );
    } catch (e) {
      rejectPromise(promise, e)
    }
  }

  // 2.2 The `then` Method
  // A promise must provide a then method to access its current or eventual value or reason.
  // A promise's then method accepts two arguments:
  Promise.prototype.then = function(onFulfilled, onRejected) {
    var promise = this;
    
    // 2.2.1 Both onFulfilled and onRejected are optional arguments
    // 2.2.1.1 If onFulfilled is not a function, it must be ignored.
    if (!isFunction(onFulfilled)) {
      onFulfilled = identity;
    }
    // 2.2.1.2 If onRejected is not a function, it must be ignored.
    if (!isFunction(onRejected)){
      onRejected = throwIdentity;
    }

    // 2.2.7 then must return a promise
    return new Promise(function(resolve, reject) {
      var asyncOnFulfilled = doAsync(onFulfilled);
      var asyncOnRejected = doAsync(onRejected);

      switch(promise.status) {
        case FULFILLED:
          asyncOnFulfilled();
          break;
        case REJECTED:
          asyncOnRejected();
          break;
        default:
          promise._queue.push({
            onFulfilled: asyncOnFulfilled,
            onRejected: asyncOnRejected
          });
      }

      function doAsync(fn) {
        // 2.2.4 onFulfilled or onRejected must not be called until the execution context
        // stack contains only platform code.
        return function() {
          tick(function() {
            var result;
            try {
              result = fn(promise.value);
            } 
            // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, 
            // promise2 must be rejected with e as the reason.
            catch (e) {
              return reject(e);
            }
            // 2.2.7.1 If either onFulfilled or onRejected returns a value x, 
            // run the Promise Resolution Procedure [[Resolve]](promise2, x).
            resolve(result);
          })
        };
      }
    });
  }

  /*
   *  The Promise Resolution Procedure
   *  
   *  The promise resolution procedure is an abstract operation taking as input a promise and a value,
   *  which we denote as [[Resolve]](promise, x). If x is a thenable, it attempts to make promise adopt the state of x,
   *  under the assumption that x behaves at least somewhat like a promise. Otherwise, it fulfills promise with the value x.
   *  
   *  This treatment of thenables allows promise implementations to interoperate, as long as they expose a 
   *  Promises/A+-compliant then method. It also allows Promises/A+ implementations to “assimilate” nonconformant
   *  implementations with reasonable then methods.
   */

  // [[Resolve]](promise, x)
  function $$Resolve$$(promise, x) {
    // 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if (promise === x) {
      rejectPromise(promise, new TypeError('A Promise can not be fulfilled with itself'))
    }

    // 2.3.2 If x is a promise, adopt its state:
    // 2.3.1.1 If x is pending, promise must remain pending until x is fulfilled or rejected.
    else if (isPromise(x)) {
      x.then(
        // 2.3.2.2 if/when x is fulfilled, fulfill promise with the same value.
        function resolve(value) {
          fulfillPromise(promise, value)
        },
        // 2.3.2.3 If/when x is rejected, reject promise with the same reason.
        function reject(reason) {
          rejectPromise(promise, reason)
        }
      )
    }

    // 2.3.3 Otherwise, if x is an object or function (allowing us to check for other `thenables`)
    else if (isObject(x) || isFunction(x)) {
      var then;
      // 2.3.3.1 Let then be x.then
      try {
        then = x.then;
      } 
      // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
      catch(e) {
        rejectPromise(promise, e);
      }
      // 2.3.3.3 If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise, where:
      if (isFunction(then)) {
        // 2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, 
        // the first call takes precedence, and any further calls are ignored.
        var called = false;
        try {
          then.call(
            x,
            // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
            function resolve(y) {
              if (!called) {
                $$Resolve$$(promise, y);
                called = true;
              }
            },
            // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r.
            function reject(r) {
              if (!called) {
                rejectPromise(promise, r);
                called = true;
              }
            }
          );
        }
        // 2.3.3.3.4 If calling then throws an exception e,
        catch(e) {
          // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.
          // 2.3.3.3.4.2 Otherwise, reject promise with e as the reason.
          if (!called) {
            rejectPromise(promise, e);
          }
        }
      } 
      // 2.3.3.4 If then is not a function, fulfill promise with x
      else {
        fulfillPromise(promise, x);
      }
    }
    // 2.3.4 If x is not an object or function, fulfill promise with x
    else {
      fulfillPromise(promise, x)
    }
  }

  function fulfillPromise(promise, value) {
    // 2.1.1.1: When pending, a promise may transition to the fulfilled state.
    // 2.1.2.1: When fulfilled, a promise must not transition to any other state.
    if (promise.status !== PENDING) return;

    // 2.1.2.2: When in fulfilled, a promise must have a value, which must not change.
    promise.value = value;
    promise.status = FULFILLED;

    // 2.2.2.1 Call each onFulfilled after promise is fulfilled
    promise._queue.forEach(function(queued) {
      queued.onFulfilled();
    })
  }

  function rejectPromise(promise, reason) {
    // 2.1.1.1: When pending, a promise may transition to the rejected state.
    // 2.1.3.1: When fulfilled, a promise must not transition to any other state.
    if (promise.status !== PENDING) return;
    
    // 2.1.3.2: When in rejected, a promise must have a reason, which must not change.
    promise.value = reason;
    promise.status = REJECTED;

    // 2.2.2.1 Call each onRejected after promise is rejected
    promise._queue.forEach(function(queued) {
      queued.onRejected();
    })
  }

  // Helpers
  function identity(value) {return value; }
  function throwIdentity(reason) {throw reason; }
  function isPromise(unknown) {return unknown instanceof(Promise); }
  function isObject(unknown) {return unknown && typeof unknown === 'object'; }
  function isFunction(unknown) {return unknown && typeof unknown === 'function'; }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js Support
    module.exports = Promise;
  }
  else if (isFunction(global.define)) {
    (function(define) {
      // AMD Support
      define(function() { return Promise; });
    }(global.define));
  }
  else {
    // Browser support
    global.Promise = Promise;
  }
}(this));
