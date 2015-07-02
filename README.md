<a href="https://promisesaplus.com/">
    <img src="https://raw.githubusercontent.com/danthareja/robin-egg-bluebird/master/logo.png" alt="Promises/A+ logo"
         title="Promises/A+ 1.0 compliant" align="right" />
</a>

Robin Egg Bluebird
======
A tiny Promises/A+ compliant implementation inspired by the official Crayola color. 

## Quick Start
```
npm install robin-egg-bluebird
```
then:
```js
var Promise = require('robin-egg-bluebird');
```

## Example
```js
var myPromise = new Promise(function(resolve, reject) {
  // do something async...
    if (error) {
      reject(error);
    }
    resolve(successfulValue); // Pass to .then handler
});

myPromise().then(function(success) {
  // success is successfulValue from above
});
```

## Implementation
Created with help of the [Promises/A+ test suite](https://github.com/promises-aplus/promises-tests)
