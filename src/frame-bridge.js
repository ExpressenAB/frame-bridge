(function (root, factory) {

  if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function () {
      return (root.returnExportsGlobal = factory());
    });
  } else {
    // As global variable
    root.FrameBridge = factory();
  }

}(this, function () {
  'use strict';

  // Events
  var Event = {
    INIT: 'init',
    CHILD_READY: 'child-ready',
    REQUEST_API: 'request-api',
    API: 'api',
    API_RECEIVED: 'api-received',
    CALL_FUNCTION: 'call-function',
    RETURN_VALUE: 'return-value',
    RETURN_ERROR: 'return-error'
  };

  // Promise
  function Promise() {
  }

  Promise.prototype.success = function(callback) {
    this.successCallback = callback;
    return this;
  };

  Promise.prototype.error = function(callback) {
    this.errorCallback = callback;
    return this;
  };

  // Defer
  function Defer() {
    this.id = Math.random().toString().substr(2);
    this.promise = new Promise();
  }

  Defer.prototype.resolve = function(data) {
    if(this.promise.successCallback) {
      this.promise.successCallback(data);
    }
  };

  Defer.prototype.reject = function(data) {
    if(this.promise.errorCallback) {
      this.promise.errorCallback(data);
    }
  };

  // Message Dispatcher
  function MessageDispatcher(targetWindow, targetDomain) {
    this.targetWindow = targetWindow;
    this.targetDomain = targetDomain;
    this.listeners = [];
  }

  MessageDispatcher.prototype.sendEvent = function(event, data) {

    var message = {
      event: event
    };

    if (data) {
      message.data = data;
    }

    this.targetWindow.postMessage(JSON.stringify(message), this.targetDomain);
  };

  MessageDispatcher.prototype.receiveEvent = function(event) {

    if (event.origin === this.targetDomain) {
      var data, i;

      try {
        data = JSON.parse(event.data);

        for (i = 0; i < this.listeners.length; i++) {

          if (this.listeners[i].event === data.event) {
            this.listeners[i].callback(data.data);
          }
        }

      } catch (e) {
        if (window.console && typeof window.console.log === 'function') {
          window.console.log(e);
        }
      }
    }
  };

  MessageDispatcher.prototype.addListener = function(event, listener) {

    this.listeners.push({
      event: event,
      callback: listener
    });
  };

  MessageDispatcher.prototype.removeListener = function(event, listener) {
    var i;

    for (i = 0; i < this.listeners.length; i++) {

      if (this.listeners[i].event === event && this.listeners[i].callback === listener) {
        this.listeners.splice(i, 1);
        return;
      }
    }
  };

  MessageDispatcher.prototype.init = function() {
    var me = this;

    function messageListener(event) {
      me.receiveEvent(event);
    }

    if (window.addEventListener) {
      window.addEventListener('message', messageListener, false);
    } else if (window.attachEvent) {
      window.attachEvent('onmessage', messageListener);
    }

    return me;
  };

  // Frame Bridge
  var handShakeTimeLimitInMilliSeconds = 60000,
    handShakePostMessageInterval = 100,
    handShakeMessagesLimit = handShakeTimeLimitInMilliSeconds / handShakePostMessageInterval;

  function FrameBridge(localAPIObject, targetWindow, targetDomain) {
    this.localAPIObject = localAPIObject;
    this.targetWindow = targetWindow;
    this.targetDomain = targetDomain;
    this.localFunctionsInProgress = {};
  }

  FrameBridge.prototype.invoke = function(name, args) {
    var defer = new Defer();
    this.messageDispatcher.sendEvent(Event.CALL_FUNCTION, {
      name: name,
      args: args,
      deferId: defer.id
    });
    this.localFunctionsInProgress[defer.id] = defer;
    return defer.promise;
  };

  FrameBridge.prototype.getInterfaceFunction = function(name) {
    var me = this;

    return function() {
      var args = Array.prototype.splice.call(arguments, 0, arguments.length);
      return me.invoke(name, args);
    };
  };

  FrameBridge.prototype.setupLocalAPIRequestListener = function() {
    var me = this;

    var localAPIReceivedListener = function() {
      me.messageDispatcher.removeListener(Event.API_RECEIVED, localAPIReceivedListener);

      me.localAPIReceived = true;
      me.checkInitDone();
    };

    var localAPIRequestListener = function() {
      me.messageDispatcher.removeListener(Event.REQUEST_API, localAPIRequestListener);
      me.messageDispatcher.addListener(Event.API_RECEIVED, localAPIReceivedListener);
      me.messageDispatcher.sendEvent(Event.API, me.API);

    };

    me.messageDispatcher.addListener(Event.REQUEST_API, localAPIRequestListener);
  };

  FrameBridge.prototype.checkInitDone = function() {

    if(this.localAPIReceived && this.remoteAPIObjectInterface) {
      this.initDoneCallback(this.remoteAPIObjectInterface);
    }
  };

  FrameBridge.prototype.setupRemoteAPIListener = function() {
    var me = this;

    var remoteAPIReadyHandler = function(message) {
      clearTimeout(me.requestRemoteAPI);
      me.messageDispatcher.removeListener(Event.API, remoteAPIReadyHandler);

      me.setupRemoteAPIObjectInterface(message);
      me.setupBridge();
      me.messageDispatcher.sendEvent(Event.API_RECEIVED);
      me.checkInitDone();
    };

    me.messageDispatcher.addListener(Event.API, remoteAPIReadyHandler);
  };

  FrameBridge.prototype.requestRemoteAPI = function(count) {
    var me = this;

    me.messageDispatcher.sendEvent(Event.REQUEST_API);

    if (count < handShakeMessagesLimit) {

      me.waitForFrameTimeout = setTimeout(function() {
        me.requestRemoteAPI(++count);
      }, handShakePostMessageInterval);
    }
  };

  FrameBridge.prototype.sendReturnValue = function(result, deferId) {
    var message = {
      result: result,
      deferId: deferId
    };

    this.messageDispatcher.sendEvent(Event.RETURN_VALUE, message);
  };

  FrameBridge.prototype.callFunctionHandler = function(data) {
    var me = this;

    try {
      var result = me.localAPIObject[data.name].apply(me.localAPIObject, data.args);

      if (result && result instanceof Promise) {
        result.success(function(result) {
          me.sendReturnValue(result, data.deferId);
        }).error(function(result) {
            me.messageDispatcher.sendEvent(Event.RETURN_ERROR, {
              deferId: data.deferId
            });
          })
      } else {
        me.sendReturnValue(result, data.deferId);
      }
    } catch(e) {
      if (window.console && typeof window.console.log === 'function') {
        console.log(e);
      }

      me.messageDispatcher.sendEvent(Event.RETURN_ERROR, {
        deferId: data.deferId
      });
    }
  };

  FrameBridge.prototype.setupBridge = function() {
    var me = this;

    me.messageDispatcher.addListener(Event.CALL_FUNCTION, function(data) {
      me.callFunctionHandler(data);
    });

    me.messageDispatcher.addListener(Event.RETURN_VALUE, function(message) {
      var defer = me.localFunctionsInProgress[message.deferId];
      defer.resolve(message.result);
      delete me.localFunctionsInProgress[message.deferId];
    });

    me.messageDispatcher.addListener(Event.RETURN_ERROR, function(message) {
      var defer = me.localFunctionsInProgress[message.deferId];
      defer.reject();
      delete me.localFunctionsInProgress[message.deferId];
    });
  };

  FrameBridge.prototype.setupRemoteAPIObjectInterface = function(data) {
    this.remoteAPIObjectInterface = {};
    var i;

    for (i = 0; i < data.length; i++) {
      this.remoteAPIObjectInterface[data[i]] = this.getInterfaceFunction(data[i]);
    }
  };

  FrameBridge.prototype.extractAPIFromLocalAPIObject = function() {
    var api = [];

    for (var key in this.localAPIObject) {
      if (typeof this.localAPIObject[key] === 'function') {
        api.push(key);
      }
    }

    this.API = api;
  };

  FrameBridge.prototype.init = function(initDoneCallback) {
    this.initDoneCallback = initDoneCallback;
    this.messageDispatcher = new MessageDispatcher(this.targetWindow, this.targetDomain).init();
    this.extractAPIFromLocalAPIObject();
    this.setupRemoteAPIListener();
    this.setupLocalAPIRequestListener();
    this.requestRemoteAPI(0);

    return this;
  };

  return {
    create: function(localAPIObject, targetWindow, targetDomain) {
      return new FrameBridge(localAPIObject, targetWindow, targetDomain);
    },
    defer: function() {
      return new Defer();
    }
  };

}));