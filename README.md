frame-bridge
==========

This module simplifies communication between a parent page and an embedded page (i.e. a page inside an iframe) on another domain. By using the post message api under the hood, FrameBridge enables you to define an api on both sides (web page and iframed page) and expose it to the other side, thus creating a "bridge" between the frames. The api supports both return values (as promises) and callbacks from the remote side of the bridge which makes calling functions across domains very intuitive.

## Usage

### Include the api in both parent and child

#### Parent and child

```html
<script src="frame-bridge.min.js"></script>
```

### Setup the api to be exposed in both parent and child

#### Parent and child

```javascript
var localApi = {
  printMessage: function(message) {
    console.log(message);
  }
};
```

### Create the bridge in both parent and child

#### Parent

```javascript
// Create the bridge object using the local api, the iframe's content window and the child domain.
var frameBridge = FrameBridge.create(localApi, document.getElementById('iframe-id').contentWindow, 'http://child.domain.com');
```

#### Child

```javascript
// Create the bridge object using the local api, the parent window and the parent domain.
var frameBridge = FrameBridge.create(localApi, window.parent, 'http://parent.domain.com');
```

### Initialize the bridge in both parent and child

#### Parent:

```javascript
frameBridge.init(function(remoteApi) {
  remoteApi.printMessage('Hello from parent');
});
```

#### Child:

```javascript
frameBridge.init(function(remoteApi) {
  remoteApi.printMessage('Hello from child');
});
```


