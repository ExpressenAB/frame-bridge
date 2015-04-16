frame-bridge
==========

This module simplifies communication between a parent page and an embedded page (i.e. a page inside an iframe) on another domain. By using the post message api under the hood, FrameBridge enables you to define an api on both sides (web page and iframed page) and expose it to the other side, thus creating a "bridge" between the frames. The api supports return from the remote side of the bridge using promises which makes calling functions across domains very intuitive.

## Usage

1) Include the api in both parent and child

**Parent and child**

```html
<script src="frame-bridge.min.js"></script>
```

2) Setup the api to be exposed in both parent and child

**Parent and child**

```javascript
var localApi = {
  printMessage: function(message) {
    console.log(message);
  }
};
```

3) Create the bridge in both parent and child

**Parent**

```javascript
// Create the bridge object using the local api, the iframe's content window and the child domain.
var frameBridge = FrameBridge.create(localApi, document.getElementById('iframe-id').contentWindow, 'http://child.domain.com');
```

**Child**

```javascript
// Create the bridge object using the local api, the parent window and the parent domain.
var frameBridge = FrameBridge.create(localApi, window.parent, 'http://parent.domain.com');
```

4) Initialize the bridge in both parent and child

**Parent**

```javascript
frameBridge.init(function(remoteApi) {
  remoteApi.printMessage('Hello from parent');
});
```

**Child**

```javascript
frameBridge.init(function(remoteApi) {
  remoteApi.printMessage('Hello from child');
});
```

## Returning values

Returning values from the remote side can be done in one of two ways.

**Returning the value directly**

```javascript
var localApi = {
  getReturnValue: function() {
    return 'Return value';
  }
};
```

**Returning a promise that will later be resolved (or rejected)**

```javascript
var localApi = {
  getReturnValueUsingPromise: function() {
    var deferred = FrameBridge.defer();

    setTimeout(function() {
      deferred.resolve('Return value using promise');
    }, 1000);

    return deferred.promise;
  }
};
```

**The value will always be returned as a promise on the calling side of the bridge:**

```javascript
remoteApi.getReturnValue().success(function(returnValue) {
  console.log(returnValue); // 'Return value'
});
remoteApi.getReturnValueUsingPromise().success(function(returnValue) {
  console.log(returnValue); // 'Return value using promise'
});
```
