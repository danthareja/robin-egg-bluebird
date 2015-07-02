/*
 *  In order to test your promise library, you must expose a very minimal adapter interface. 
 *  These are written as Node.js modules with a few well-known exports:
 *  
 *  resolved(value): creates a promise that is resolved with value.
 *  rejected(reason): creates a promise that is already rejected with reason.
 *  deferred(): creates an object consisting of { promise, resolve, reject }:
 *    promise is a promise that is currently in the pending state.
 *    resolve(value) resolves the promise with value.
 *    reject(reason) moves the promise from the pending state to the rejected state, with rejection reason reason.
 */

var Promise = require('./index');

module.exports = {
  resolved: function(value) {
    return new Promise(function(resolve, reject) {
      resolve(value);
    });
  },
  rejected: function(reason) {
    return new Promise(function(resolve, reject) {
      reject(reason);
    });
  },
  deferred: function(){
    var resolvePromise, rejectPromise;
    var pendingPromise = new Promise(function(resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    return {
      promise: pendingPromise,
      resolve: resolvePromise,
      reject: rejectPromise
    }
  }
}
