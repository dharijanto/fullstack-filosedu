(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":3}],2:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if (process.env.NODE_ENV !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/axios/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

}).call(this,require('_process'))

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":29}],3:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":4,"./cancel/CancelToken":5,"./cancel/isCancel":6,"./core/Axios":7,"./defaults":14,"./helpers/bind":15,"./helpers/spread":24,"./utils":25}],4:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],5:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":4}],6:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],7:[function(require,module,exports){
'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, this.defaults, { method: 'get' }, config);
  config.method = config.method.toLowerCase();

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"./../defaults":14,"./../utils":25,"./InterceptorManager":8,"./dispatchRequest":10}],8:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":25}],9:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":11}],10:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":6,"../defaults":14,"./../helpers/combineURLs":18,"./../helpers/isAbsoluteURL":20,"./../utils":25,"./transformData":13}],11:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
};

},{}],12:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":9}],13:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":25}],14:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":29}],15:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],16:[function(require,module,exports){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

},{}],17:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      }

      if (!utils.isArray(val)) {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":25}],18:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],19:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

},{"./../utils":25}],20:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],21:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

},{"./../utils":25}],22:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":25}],23:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":25}],24:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],25:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');
var isBuffer = require('is-buffer');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":15,"is-buffer":28}],26:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2017 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.5.1
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":26,"./schedule":29,"./util":36}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":22}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var args = [].slice.call(arguments, 1);;
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":36}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":36}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":13,"./util":36}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    var self = this;
    setTimeout(function() {
        self._notifyUnhandledRejection();
    }, 1);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new CustomEvent(name.toLowerCase(), {
                    detail: event,
                    cancelable: true
                });
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":12,"./util":36}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};


},{}],12:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":13,"./util":36}],13:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],14:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise, NEXT_FILTER) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret === NEXT_FILTER) {
            return ret;
        } else if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};


Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;
    if(len === 1) {
        return this._passThrough(handlerOrPredicate,
                                 1,
                                 undefined,
                                 finallyHandler);
    } else {
         var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(new TypeError(
                    "tapCatch statement predicate: "
                    + "expecting an object but got " + util.classString(item)
                ));
            }
        }
        catchInstances.length = j;
        var handler = arguments[i];
        return this._passThrough(catchFilter(catchInstances, handler, this),
                                 1,
                                 undefined,
                                 finallyHandler);
    }

};

return PassThroughHandlerContext;
};

},{"./catch_filter":7,"./util":36}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = _dereq_("./errors");
var TypeError = errors.TypeError;
var util = _dereq_("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
        var internal = new Promise(INTERNAL);
        var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function() {
            return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
    } else {
        var promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
    }
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this._promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
    if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
    }
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    this._cancellationPhase = true;
    this._yieldedPromise = null;
    this._continue(result);
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._rejectCallback(result.e, false);
        }
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._resolveCallback(value);
        }
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", String(value)) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            Promise._async.invoke(
                this._promiseFulfilled, this, maybePromise._value()
            );
        } else if (((bitField & 16777216) !== 0)) {
            Promise._async.invoke(
                this._promiseRejected, this, maybePromise._reason()
            );
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":12,"./util":36}],17:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":36}],18:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : util.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._asyncInit = function() {
    this._init$(undefined, -2);
};

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }

    var limit = 0;
    if (options !== undefined) {
        if (typeof options === "object" && options !== null) {
            if (typeof options.concurrency !== "number") {
                return Promise.reject(
                    new TypeError("'concurrency' must be a number but it is " +
                                    util.classString(options.concurrency)));
            }
            limit = options.concurrency;
        } else {
            return Promise.reject(new TypeError(
                            "options argument must be an object but it is " +
                             util.classString(options)));
        }
    }
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":36}],19:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":36}],20:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":12,"./es5":13,"./util":36}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":36}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise, NEXT_FILTER);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }

}

function Promise(executor) {
    if (executor !== INTERNAL) {
        check(this, executor);
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("Catch statement predicate: " +
                    "expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.5.1";
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./call_get.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_dereq_('./timers.js')(Promise, INTERNAL, debug);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_dereq_('./nodeify.js')(Promise);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./settle.js')(Promise, PromiseArray, debug);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./filter.js')(Promise, INTERNAL);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    case -6: return new Map();
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":36}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util");
var nodebackForPromise = _dereq_("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");
var isObject = util.isObject;
var es5 = _dereq_("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, isMap ? -6 : -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":13,"./util":36}],26:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":36}],28:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util.domainBind(domain, fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if(_each === INTERNAL) {
        this._eachValues = Array(this._length);
    } else if (_each === 0) {
        this._eachValues = null;
    } else {
        this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && 
        this._eachValues !== null && 
        accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    if (this._eachValues !== null) {
        this._eachValues.push(value);
    }
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":36}],29:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
            toggleScheduled = true;
            div2.classList.toggle("foo");
        };

        return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":36}],30:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":36}],31:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util");
var RangeError = _dereq_("./errors").RangeError;
var AggregateError = _dereq_("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":12,"./util":36}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":36}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, debug) {
var util = _dereq_("./util");
var TimeoutError = Promise.TimeoutError;

function HandleWrapper(handle)  {
    this.handle = handle;
}

HandleWrapper.prototype._resultCancelled = function() {
    clearTimeout(this.handle);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
        if (debug.cancellation() && value instanceof Promise) {
            ret._setOnCancel(value);
        }
    } else {
        ret = new Promise(INTERNAL);
        handle = setTimeout(function() { ret._fulfill(); }, +ms);
        if (debug.cancellation()) {
            ret._setOnCancel(new HandleWrapper(handle));
        }
        ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

var afterTimeout = function (promise, message, parent) {
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
        parent.cancel();
    }
};

function successClear(value) {
    clearTimeout(this.handle);
    return value;
}

function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;

    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
        if (ret.isPending()) {
            afterTimeout(ret, message, parent);
        }
    }, ms));

    if (debug.cancellation()) {
        parent = this.then();
        ret = parent._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
        ret._setOnCancel(handleWrapper);
    } else {
        ret = this._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
    }

    return ret;
};

};

},{"./util":36}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = _dereq_("./util");
    var TypeError = _dereq_("./errors").TypeError;
    var inherits = _dereq_("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;
    var NULL = {};

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return NULL;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== NULL
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":12,"./util":36}],36:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj instanceof Error ||
        (obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string");
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":13}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":29}],27:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.4+314e4831
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":29}],28:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],29:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],30:[function(require,module,exports){
(function (global){
/*
 * Toastr
 * Copyright 2012-2015
 * Authors: John Papa, Hans Fjällemark, and Tim Ferrell.
 * All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
 *
 * ARIA Support: Greta Krafsig
 *
 * Project: https://github.com/CodeSeven/toastr
 */
/* global define */
(function (define) {
    define(['jquery'], function ($) {
        return (function () {
            var $container;
            var listener;
            var toastId = 0;
            var toastType = {
                error: 'error',
                info: 'info',
                success: 'success',
                warning: 'warning'
            };

            var toastr = {
                clear: clear,
                remove: remove,
                error: error,
                getContainer: getContainer,
                info: info,
                options: {},
                subscribe: subscribe,
                success: success,
                version: '2.1.4',
                warning: warning
            };

            var previousToast;

            return toastr;

            ////////////////

            function error(message, title, optionsOverride) {
                return notify({
                    type: toastType.error,
                    iconClass: getOptions().iconClasses.error,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function getContainer(options, create) {
                if (!options) { options = getOptions(); }
                $container = $('#' + options.containerId);
                if ($container.length) {
                    return $container;
                }
                if (create) {
                    $container = createContainer(options);
                }
                return $container;
            }

            function info(message, title, optionsOverride) {
                return notify({
                    type: toastType.info,
                    iconClass: getOptions().iconClasses.info,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function subscribe(callback) {
                listener = callback;
            }

            function success(message, title, optionsOverride) {
                return notify({
                    type: toastType.success,
                    iconClass: getOptions().iconClasses.success,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function warning(message, title, optionsOverride) {
                return notify({
                    type: toastType.warning,
                    iconClass: getOptions().iconClasses.warning,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function clear($toastElement, clearOptions) {
                var options = getOptions();
                if (!$container) { getContainer(options); }
                if (!clearToast($toastElement, options, clearOptions)) {
                    clearContainer(options);
                }
            }

            function remove($toastElement) {
                var options = getOptions();
                if (!$container) { getContainer(options); }
                if ($toastElement && $(':focus', $toastElement).length === 0) {
                    removeToast($toastElement);
                    return;
                }
                if ($container.children().length) {
                    $container.remove();
                }
            }

            // internal functions

            function clearContainer (options) {
                var toastsToClear = $container.children();
                for (var i = toastsToClear.length - 1; i >= 0; i--) {
                    clearToast($(toastsToClear[i]), options);
                }
            }

            function clearToast ($toastElement, options, clearOptions) {
                var force = clearOptions && clearOptions.force ? clearOptions.force : false;
                if ($toastElement && (force || $(':focus', $toastElement).length === 0)) {
                    $toastElement[options.hideMethod]({
                        duration: options.hideDuration,
                        easing: options.hideEasing,
                        complete: function () { removeToast($toastElement); }
                    });
                    return true;
                }
                return false;
            }

            function createContainer(options) {
                $container = $('<div/>')
                    .attr('id', options.containerId)
                    .addClass(options.positionClass);

                $container.appendTo($(options.target));
                return $container;
            }

            function getDefaults() {
                return {
                    tapToDismiss: true,
                    toastClass: 'toast',
                    containerId: 'toast-container',
                    debug: false,

                    showMethod: 'fadeIn', //fadeIn, slideDown, and show are built into jQuery
                    showDuration: 300,
                    showEasing: 'swing', //swing and linear are built into jQuery
                    onShown: undefined,
                    hideMethod: 'fadeOut',
                    hideDuration: 1000,
                    hideEasing: 'swing',
                    onHidden: undefined,
                    closeMethod: false,
                    closeDuration: false,
                    closeEasing: false,
                    closeOnHover: true,

                    extendedTimeOut: 1000,
                    iconClasses: {
                        error: 'toast-error',
                        info: 'toast-info',
                        success: 'toast-success',
                        warning: 'toast-warning'
                    },
                    iconClass: 'toast-info',
                    positionClass: 'toast-top-right',
                    timeOut: 5000, // Set timeOut and extendedTimeOut to 0 to make it sticky
                    titleClass: 'toast-title',
                    messageClass: 'toast-message',
                    escapeHtml: false,
                    target: 'body',
                    closeHtml: '<button type="button">&times;</button>',
                    closeClass: 'toast-close-button',
                    newestOnTop: true,
                    preventDuplicates: false,
                    progressBar: false,
                    progressClass: 'toast-progress',
                    rtl: false
                };
            }

            function publish(args) {
                if (!listener) { return; }
                listener(args);
            }

            function notify(map) {
                var options = getOptions();
                var iconClass = map.iconClass || options.iconClass;

                if (typeof (map.optionsOverride) !== 'undefined') {
                    options = $.extend(options, map.optionsOverride);
                    iconClass = map.optionsOverride.iconClass || iconClass;
                }

                if (shouldExit(options, map)) { return; }

                toastId++;

                $container = getContainer(options, true);

                var intervalId = null;
                var $toastElement = $('<div/>');
                var $titleElement = $('<div/>');
                var $messageElement = $('<div/>');
                var $progressElement = $('<div/>');
                var $closeElement = $(options.closeHtml);
                var progressBar = {
                    intervalId: null,
                    hideEta: null,
                    maxHideTime: null
                };
                var response = {
                    toastId: toastId,
                    state: 'visible',
                    startTime: new Date(),
                    options: options,
                    map: map
                };

                personalizeToast();

                displayToast();

                handleEvents();

                publish(response);

                if (options.debug && console) {
                    console.log(response);
                }

                return $toastElement;

                function escapeHtml(source) {
                    if (source == null) {
                        source = '';
                    }

                    return source
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }

                function personalizeToast() {
                    setIcon();
                    setTitle();
                    setMessage();
                    setCloseButton();
                    setProgressBar();
                    setRTL();
                    setSequence();
                    setAria();
                }

                function setAria() {
                    var ariaValue = '';
                    switch (map.iconClass) {
                        case 'toast-success':
                        case 'toast-info':
                            ariaValue =  'polite';
                            break;
                        default:
                            ariaValue = 'assertive';
                    }
                    $toastElement.attr('aria-live', ariaValue);
                }

                function handleEvents() {
                    if (options.closeOnHover) {
                        $toastElement.hover(stickAround, delayedHideToast);
                    }

                    if (!options.onclick && options.tapToDismiss) {
                        $toastElement.click(hideToast);
                    }

                    if (options.closeButton && $closeElement) {
                        $closeElement.click(function (event) {
                            if (event.stopPropagation) {
                                event.stopPropagation();
                            } else if (event.cancelBubble !== undefined && event.cancelBubble !== true) {
                                event.cancelBubble = true;
                            }

                            if (options.onCloseClick) {
                                options.onCloseClick(event);
                            }

                            hideToast(true);
                        });
                    }

                    if (options.onclick) {
                        $toastElement.click(function (event) {
                            options.onclick(event);
                            hideToast();
                        });
                    }
                }

                function displayToast() {
                    $toastElement.hide();

                    $toastElement[options.showMethod](
                        {duration: options.showDuration, easing: options.showEasing, complete: options.onShown}
                    );

                    if (options.timeOut > 0) {
                        intervalId = setTimeout(hideToast, options.timeOut);
                        progressBar.maxHideTime = parseFloat(options.timeOut);
                        progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
                        if (options.progressBar) {
                            progressBar.intervalId = setInterval(updateProgress, 10);
                        }
                    }
                }

                function setIcon() {
                    if (map.iconClass) {
                        $toastElement.addClass(options.toastClass).addClass(iconClass);
                    }
                }

                function setSequence() {
                    if (options.newestOnTop) {
                        $container.prepend($toastElement);
                    } else {
                        $container.append($toastElement);
                    }
                }

                function setTitle() {
                    if (map.title) {
                        var suffix = map.title;
                        if (options.escapeHtml) {
                            suffix = escapeHtml(map.title);
                        }
                        $titleElement.append(suffix).addClass(options.titleClass);
                        $toastElement.append($titleElement);
                    }
                }

                function setMessage() {
                    if (map.message) {
                        var suffix = map.message;
                        if (options.escapeHtml) {
                            suffix = escapeHtml(map.message);
                        }
                        $messageElement.append(suffix).addClass(options.messageClass);
                        $toastElement.append($messageElement);
                    }
                }

                function setCloseButton() {
                    if (options.closeButton) {
                        $closeElement.addClass(options.closeClass).attr('role', 'button');
                        $toastElement.prepend($closeElement);
                    }
                }

                function setProgressBar() {
                    if (options.progressBar) {
                        $progressElement.addClass(options.progressClass);
                        $toastElement.prepend($progressElement);
                    }
                }

                function setRTL() {
                    if (options.rtl) {
                        $toastElement.addClass('rtl');
                    }
                }

                function shouldExit(options, map) {
                    if (options.preventDuplicates) {
                        if (map.message === previousToast) {
                            return true;
                        } else {
                            previousToast = map.message;
                        }
                    }
                    return false;
                }

                function hideToast(override) {
                    var method = override && options.closeMethod !== false ? options.closeMethod : options.hideMethod;
                    var duration = override && options.closeDuration !== false ?
                        options.closeDuration : options.hideDuration;
                    var easing = override && options.closeEasing !== false ? options.closeEasing : options.hideEasing;
                    if ($(':focus', $toastElement).length && !override) {
                        return;
                    }
                    clearTimeout(progressBar.intervalId);
                    return $toastElement[method]({
                        duration: duration,
                        easing: easing,
                        complete: function () {
                            removeToast($toastElement);
                            clearTimeout(intervalId);
                            if (options.onHidden && response.state !== 'hidden') {
                                options.onHidden();
                            }
                            response.state = 'hidden';
                            response.endTime = new Date();
                            publish(response);
                        }
                    });
                }

                function delayedHideToast() {
                    if (options.timeOut > 0 || options.extendedTimeOut > 0) {
                        intervalId = setTimeout(hideToast, options.extendedTimeOut);
                        progressBar.maxHideTime = parseFloat(options.extendedTimeOut);
                        progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
                    }
                }

                function stickAround() {
                    clearTimeout(intervalId);
                    progressBar.hideEta = 0;
                    $toastElement.stop(true, true)[options.showMethod](
                        {duration: options.showDuration, easing: options.showEasing}
                    );
                }

                function updateProgress() {
                    var percentage = ((progressBar.hideEta - (new Date().getTime())) / progressBar.maxHideTime) * 100;
                    $progressElement.width(percentage + '%');
                }
            }

            function getOptions() {
                return $.extend({}, getDefaults(), toastr.options);
            }

            function removeToast($toastElement) {
                if (!$container) { $container = getContainer(); }
                if ($toastElement.is(':visible')) {
                    return;
                }
                $toastElement.remove();
                $toastElement = null;
                if ($container.children().length === 0) {
                    $container.remove();
                    previousToast = undefined;
                }
            }

        })();
    });
}(typeof define === 'function' && define.amd ? define : function (deps, factory) {
    if (typeof module !== 'undefined' && module.exports) { //Node
        module.exports = factory((typeof window !== "undefined" ? window['$'] : typeof global !== "undefined" ? global['$'] : null));
    } else {
        window.toastr = factory(window.jQuery);
    }
}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],31:[function(require,module,exports){
(function (global){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios = require("../libs/axios-wrapper");
const toastr = require("toastr");
const $ = (typeof window !== "undefined" ? window['$'] : typeof global !== "undefined" ? global['$'] : null);
let Utils = require('../libs/utils');
function errHandler(err) {
    console.error(err);
    toastr.error('Error: ' + err.message);
}
$(document).ready(() => {
    $('#btn-start-topic').on('click', () => {
        axios.post('/competency-exercise/start-topic').then(rawResp => {
            const resp = rawResp.data;
            if (resp.status) {
                window.location.reload();
            }
            else {
                toastr.error('Gagal memulai uji kompetensi: ' + resp.errMessage);
                console.error(resp.errMessage);
            }
        }).catch(errHandler);
    });
    $('#btn-abandon-exercise').on('click', () => {
        if (confirm('Semua progres akan hilang. Apakah anda yakin?')) {
            axios.post('/competency-exercise/abandon-exercise').then(rawResp => {
                const resp = rawResp.data;
                if (resp.status) {
                    window.location.reload();
                }
                else {
                    toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage);
                    console.error(resp.errMessage);
                }
            }).catch(errHandler);
        }
    });
    $('#btn-skip-exercise').on('click', () => {
        if (confirm('Topik ini akan di lewati. Apakah anda yakin?')) {
            axios.post('/competency-exercise/skip-topic').then(rawResp => {
                const resp = rawResp.data;
                if (resp.status) {
                    window.location.reload();
                }
                else {
                    toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage);
                    console.error(resp.errMessage);
                }
            }).catch(errHandler);
        }
    });
    function submit(name, email, phone) {
        axios.post('/competency-exercise/submit', { name, email, phone }).then(rawResp => {
            const resp = rawResp.data;
            if (resp.status) {
                window.location.reload();
            }
            else {
                console.error(new Error('Failed to submit exercise: ' + resp.errMessage));
                toastr.error('Gagal memproses submission: ' + resp.errMessage);
            }
        }).catch(errHandler);
    }
    $('#btn-contact-us').on('click', () => {
        const name = $('#input-name').val();
        const email = $('#input-email').val();
        const phone = $('#input-phone').val();
        if ((name && phone) || (name && email)) {
            if (email && !Utils.validateEmail(email)) {
                alert('Format email salah');
            }
            else {
                submit(name, email, phone);
            }
        }
        else {
            alert('Nama dan nomor telepon/email harus diisi');
        }
    });
    $('#btn-dont-contact-us').on('click', () => {
        const name = $('#input-name').val();
        const email = $('#input-email').val();
        const phone = $('#input-phone').val();
        submit(name + ' (do not contact)', email, phone);
    });
    $('#btn-skip-topic').on('click', () => {
        if (confirm('Topik ini akan di lewati. Apakah anda yakin?')) {
            axios.post('/competency-exercise/skip-topic').then(rawResp => {
                const resp = rawResp.data;
                if (resp.status) {
                    window.location.reload();
                }
                else {
                    toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage);
                    console.error(resp.errMessage);
                }
            }).catch(errHandler);
        }
    });
    $('#btn-retake-exercise').on('click', () => {
        axios.post('/competency-exercise/retake-exercise').then(rawResp => {
            const resp = rawResp.data;
            if (resp.status) {
                window.location.reload();
            }
            else {
                toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage);
                console.error(resp.errMessage);
            }
        }).catch(errHandler);
    });
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../libs/axios-wrapper":34,"../libs/utils":35,"toastr":30}],32:[function(require,module,exports){
"use strict";

module.exports = {
  // Max time before a POST/GET request is aborted
  NETWORK_TIMEOUT: 15000
};

},{}],33:[function(require,module,exports){

},{}],34:[function(require,module,exports){
'use strict';

require('es6-promise').polyfill();
var axios = require('axios');
var Config = require('../config.js');
module.exports = axios.create({
  timeout: Config.NETWORK_TIMEOUT
});

},{"../config.js":32,"axios":1,"es6-promise":27}],35:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Promise = require('bluebird');

var Utils = function () {
  function Utils() {
    _classCallCheck(this, Utils);
  }

  _createClass(Utils, null, [{
    key: 'sleep',

    // Usage: await sleep(500)
    // i.e. used to simulate network delay
    value: function sleep(ms) {
      return new Promise(function (resolve) {
        return setTimeout(resolve, ms);
      });
    }

    // Take the result of form.serializeArray() and convert it to JSON object

  }, {
    key: 'objectifyForm',
    value: function objectifyForm(formArray) {
      var returnArray = {};
      for (var i = 0; i < formArray.length; i++) {
        returnArray[formArray[i]['name']] = formArray[i]['value'];
      }
      return returnArray;
    }
  }, {
    key: 'validateEmail',
    value: function validateEmail(email) {
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(String(email).toLowerCase());
    }
  }]);

  return Utils;
}();

module.exports = Utils;

},{"bluebird":26}]},{},[31,33])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL2lzQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0F4aW9zLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9jcmVhdGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9kaXNwYXRjaFJlcXVlc3QuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3NldHRsZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS90cmFuc2Zvcm1EYXRhLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9iaW5kLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2J0b2EuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29tYmluZVVSTHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29va2llcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9zcHJlYWQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2JsdWViaXJkL2pzL2Jyb3dzZXIvYmx1ZWJpcmQuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9pcy1idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RvYXN0ci90b2FzdHIuanMiLCJzcmMvY29tcGV0ZW5jeS1leGVyY2lzZS1sb2dpc3RpYy1hcHAvbWFpbi50cyIsInNyYy9jb25maWcuanMiLCJzcmMvaW5kZXguZC50cyIsInNyYy9saWJzL2F4aW9zLXdyYXBwZXIuanMiLCJzcmMvbGlicy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN0L0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQzVkQSwrQ0FBOEM7QUFDOUMsaUNBQWdDO0FBQ2hDLDRCQUEyQjtBQUMzQixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7QUFFcEMsb0JBQXFCLEdBQUc7SUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDdkMsQ0FBQztBQUVELENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO0lBQ3JCLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLEtBQUssQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDNUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQTtZQUN6QixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ2YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTthQUN6QjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDaEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7YUFDL0I7UUFDSCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFFRixDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUMxQyxJQUFJLE9BQU8sQ0FBQywrQ0FBK0MsQ0FBQyxFQUFFO1lBQzVELEtBQUssQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ2pFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDZixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO2lCQUN6QjtxQkFBTTtvQkFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDcEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7aUJBQy9CO1lBQ0gsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1NBQ3JCO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUN2QyxJQUFJLE9BQU8sQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFO1lBQzNELEtBQUssQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDZixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO2lCQUN6QjtxQkFBTTtvQkFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDcEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7aUJBQy9CO1lBQ0gsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1NBQ3JCO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixnQkFBaUIsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQy9FLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7WUFDekIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNmLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7YUFDekI7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtnQkFDekUsTUFBTSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7YUFDL0Q7UUFDSCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDckMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRXJDLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUU7WUFDdEMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN4QyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTthQUM1QjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTthQUMzQjtTQUNGO2FBQU07WUFDTCxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQTtTQUNsRDtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ25DLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7UUFFckMsTUFBTSxDQUFDLElBQUksR0FBRyxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNwQyxJQUFJLE9BQU8sQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFO1lBQzNELEtBQUssQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDZixNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO2lCQUN6QjtxQkFBTTtvQkFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDcEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7aUJBQy9CO1lBQ0gsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1NBQ3JCO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2hFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7WUFDekIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNmLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7YUFDekI7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3BFLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2FBQy9CO1FBQ0gsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUE7Ozs7Ozs7QUNoSEYsT0FBTyxPQUFQLEdBQWlCO0FBQ2Y7QUFDQSxtQkFBaUI7QUFGRixDQUFqQjs7O0FDQUE7Ozs7QUNBQSxRQUFRLGFBQVIsRUFBdUIsUUFBdkI7QUFDQSxJQUFJLFFBQVEsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJLFNBQVMsUUFBUSxjQUFSLENBQWI7QUFDQSxPQUFPLE9BQVAsR0FBaUIsTUFBTSxNQUFOLENBQWE7QUFDNUIsV0FBUyxPQUFPO0FBRFksQ0FBYixDQUFqQjs7Ozs7Ozs7O0FDSEEsSUFBSSxVQUFVLFFBQVEsVUFBUixDQUFkOztJQUVNLEs7Ozs7Ozs7O0FBQ0o7QUFDQTswQkFDYyxFLEVBQUk7QUFDaEIsYUFBTyxJQUFJLE9BQUosQ0FBWTtBQUFBLGVBQVcsV0FBVyxPQUFYLEVBQW9CLEVBQXBCLENBQVg7QUFBQSxPQUFaLENBQVA7QUFDRDs7QUFFRDs7OztrQ0FDc0IsUyxFQUFXO0FBQy9CLFVBQUksY0FBYyxFQUFsQjtBQUNBLFdBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxVQUFVLE1BQTlCLEVBQXNDLEdBQXRDLEVBQTJDO0FBQ3pDLG9CQUFZLFVBQVUsQ0FBVixFQUFhLE1BQWIsQ0FBWixJQUFvQyxVQUFVLENBQVYsRUFBYSxPQUFiLENBQXBDO0FBQ0Q7QUFDRCxhQUFPLFdBQVA7QUFDRDs7O2tDQUVvQixLLEVBQU87QUFDMUIsVUFBSSxLQUFLLHlKQUFUO0FBQ0EsYUFBTyxHQUFHLElBQUgsQ0FBUSxPQUFPLEtBQVAsRUFBYyxXQUFkLEVBQVIsQ0FBUDtBQUNEOzs7Ozs7QUFHSCxPQUFPLE9BQVAsR0FBaUIsS0FBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9heGlvcycpOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIHNldHRsZSA9IHJlcXVpcmUoJy4vLi4vY29yZS9zZXR0bGUnKTtcbnZhciBidWlsZFVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9idWlsZFVSTCcpO1xudmFyIHBhcnNlSGVhZGVycyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9wYXJzZUhlYWRlcnMnKTtcbnZhciBpc1VSTFNhbWVPcmlnaW4gPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvaXNVUkxTYW1lT3JpZ2luJyk7XG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuLi9jb3JlL2NyZWF0ZUVycm9yJyk7XG52YXIgYnRvYSA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYnRvYSAmJiB3aW5kb3cuYnRvYS5iaW5kKHdpbmRvdykpIHx8IHJlcXVpcmUoJy4vLi4vaGVscGVycy9idG9hJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24geGhyQWRhcHRlcihjb25maWcpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIGRpc3BhdGNoWGhyUmVxdWVzdChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVxdWVzdERhdGEgPSBjb25maWcuZGF0YTtcbiAgICB2YXIgcmVxdWVzdEhlYWRlcnMgPSBjb25maWcuaGVhZGVycztcblxuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKHJlcXVlc3REYXRhKSkge1xuICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzWydDb250ZW50LVR5cGUnXTsgLy8gTGV0IHRoZSBicm93c2VyIHNldCBpdFxuICAgIH1cblxuICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgdmFyIGxvYWRFdmVudCA9ICdvbnJlYWR5c3RhdGVjaGFuZ2UnO1xuICAgIHZhciB4RG9tYWluID0gZmFsc2U7XG5cbiAgICAvLyBGb3IgSUUgOC85IENPUlMgc3VwcG9ydFxuICAgIC8vIE9ubHkgc3VwcG9ydHMgUE9TVCBhbmQgR0VUIGNhbGxzIGFuZCBkb2Vzbid0IHJldHVybnMgdGhlIHJlc3BvbnNlIGhlYWRlcnMuXG4gICAgLy8gRE9OJ1QgZG8gdGhpcyBmb3IgdGVzdGluZyBiL2MgWE1MSHR0cFJlcXVlc3QgaXMgbW9ja2VkLCBub3QgWERvbWFpblJlcXVlc3QuXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAndGVzdCcgJiZcbiAgICAgICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgd2luZG93LlhEb21haW5SZXF1ZXN0ICYmICEoJ3dpdGhDcmVkZW50aWFscycgaW4gcmVxdWVzdCkgJiZcbiAgICAgICAgIWlzVVJMU2FtZU9yaWdpbihjb25maWcudXJsKSkge1xuICAgICAgcmVxdWVzdCA9IG5ldyB3aW5kb3cuWERvbWFpblJlcXVlc3QoKTtcbiAgICAgIGxvYWRFdmVudCA9ICdvbmxvYWQnO1xuICAgICAgeERvbWFpbiA9IHRydWU7XG4gICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiBoYW5kbGVQcm9ncmVzcygpIHt9O1xuICAgICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge307XG4gICAgfVxuXG4gICAgLy8gSFRUUCBiYXNpYyBhdXRoZW50aWNhdGlvblxuICAgIGlmIChjb25maWcuYXV0aCkge1xuICAgICAgdmFyIHVzZXJuYW1lID0gY29uZmlnLmF1dGgudXNlcm5hbWUgfHwgJyc7XG4gICAgICB2YXIgcGFzc3dvcmQgPSBjb25maWcuYXV0aC5wYXNzd29yZCB8fCAnJztcbiAgICAgIHJlcXVlc3RIZWFkZXJzLkF1dGhvcml6YXRpb24gPSAnQmFzaWMgJyArIGJ0b2EodXNlcm5hbWUgKyAnOicgKyBwYXNzd29yZCk7XG4gICAgfVxuXG4gICAgcmVxdWVzdC5vcGVuKGNvbmZpZy5tZXRob2QudG9VcHBlckNhc2UoKSwgYnVpbGRVUkwoY29uZmlnLnVybCwgY29uZmlnLnBhcmFtcywgY29uZmlnLnBhcmFtc1NlcmlhbGl6ZXIpLCB0cnVlKTtcblxuICAgIC8vIFNldCB0aGUgcmVxdWVzdCB0aW1lb3V0IGluIE1TXG4gICAgcmVxdWVzdC50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG5cbiAgICAvLyBMaXN0ZW4gZm9yIHJlYWR5IHN0YXRlXG4gICAgcmVxdWVzdFtsb2FkRXZlbnRdID0gZnVuY3Rpb24gaGFuZGxlTG9hZCgpIHtcbiAgICAgIGlmICghcmVxdWVzdCB8fCAocmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0ICYmICF4RG9tYWluKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSByZXF1ZXN0IGVycm9yZWQgb3V0IGFuZCB3ZSBkaWRuJ3QgZ2V0IGEgcmVzcG9uc2UsIHRoaXMgd2lsbCBiZVxuICAgICAgLy8gaGFuZGxlZCBieSBvbmVycm9yIGluc3RlYWRcbiAgICAgIC8vIFdpdGggb25lIGV4Y2VwdGlvbjogcmVxdWVzdCB0aGF0IHVzaW5nIGZpbGU6IHByb3RvY29sLCBtb3N0IGJyb3dzZXJzXG4gICAgICAvLyB3aWxsIHJldHVybiBzdGF0dXMgYXMgMCBldmVuIHRob3VnaCBpdCdzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0XG4gICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDAgJiYgIShyZXF1ZXN0LnJlc3BvbnNlVVJMICYmIHJlcXVlc3QucmVzcG9uc2VVUkwuaW5kZXhPZignZmlsZTonKSA9PT0gMCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBQcmVwYXJlIHRoZSByZXNwb25zZVxuICAgICAgdmFyIHJlc3BvbnNlSGVhZGVycyA9ICdnZXRBbGxSZXNwb25zZUhlYWRlcnMnIGluIHJlcXVlc3QgPyBwYXJzZUhlYWRlcnMocmVxdWVzdC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkgOiBudWxsO1xuICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9ICFjb25maWcucmVzcG9uc2VUeXBlIHx8IGNvbmZpZy5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JyA/IHJlcXVlc3QucmVzcG9uc2VUZXh0IDogcmVxdWVzdC5yZXNwb25zZTtcbiAgICAgIHZhciByZXNwb25zZSA9IHtcbiAgICAgICAgZGF0YTogcmVzcG9uc2VEYXRhLFxuICAgICAgICAvLyBJRSBzZW5kcyAxMjIzIGluc3RlYWQgb2YgMjA0IChodHRwczovL2dpdGh1Yi5jb20vYXhpb3MvYXhpb3MvaXNzdWVzLzIwMSlcbiAgICAgICAgc3RhdHVzOiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/IDIwNCA6IHJlcXVlc3Quc3RhdHVzLFxuICAgICAgICBzdGF0dXNUZXh0OiByZXF1ZXN0LnN0YXR1cyA9PT0gMTIyMyA/ICdObyBDb250ZW50JyA6IHJlcXVlc3Quc3RhdHVzVGV4dCxcbiAgICAgICAgaGVhZGVyczogcmVzcG9uc2VIZWFkZXJzLFxuICAgICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgICAgcmVxdWVzdDogcmVxdWVzdFxuICAgICAgfTtcblxuICAgICAgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpO1xuXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gSGFuZGxlIGxvdyBsZXZlbCBuZXR3b3JrIGVycm9yc1xuICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uIGhhbmRsZUVycm9yKCkge1xuICAgICAgLy8gUmVhbCBlcnJvcnMgYXJlIGhpZGRlbiBmcm9tIHVzIGJ5IHRoZSBicm93c2VyXG4gICAgICAvLyBvbmVycm9yIHNob3VsZCBvbmx5IGZpcmUgaWYgaXQncyBhIG5ldHdvcmsgZXJyb3JcbiAgICAgIHJlamVjdChjcmVhdGVFcnJvcignTmV0d29yayBFcnJvcicsIGNvbmZpZywgbnVsbCwgcmVxdWVzdCkpO1xuXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gSGFuZGxlIHRpbWVvdXRcbiAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7XG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ3RpbWVvdXQgb2YgJyArIGNvbmZpZy50aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJywgY29uZmlnLCAnRUNPTk5BQk9SVEVEJyxcbiAgICAgICAgcmVxdWVzdCkpO1xuXG4gICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICB9O1xuXG4gICAgLy8gQWRkIHhzcmYgaGVhZGVyXG4gICAgLy8gVGhpcyBpcyBvbmx5IGRvbmUgaWYgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gICAgLy8gU3BlY2lmaWNhbGx5IG5vdCBpZiB3ZSdyZSBpbiBhIHdlYiB3b3JrZXIsIG9yIHJlYWN0LW5hdGl2ZS5cbiAgICBpZiAodXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSkge1xuICAgICAgdmFyIGNvb2tpZXMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29va2llcycpO1xuXG4gICAgICAvLyBBZGQgeHNyZiBoZWFkZXJcbiAgICAgIHZhciB4c3JmVmFsdWUgPSAoY29uZmlnLndpdGhDcmVkZW50aWFscyB8fCBpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpICYmIGNvbmZpZy54c3JmQ29va2llTmFtZSA/XG4gICAgICAgICAgY29va2llcy5yZWFkKGNvbmZpZy54c3JmQ29va2llTmFtZSkgOlxuICAgICAgICAgIHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHhzcmZWYWx1ZSkge1xuICAgICAgICByZXF1ZXN0SGVhZGVyc1tjb25maWcueHNyZkhlYWRlck5hbWVdID0geHNyZlZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBoZWFkZXJzIHRvIHRoZSByZXF1ZXN0XG4gICAgaWYgKCdzZXRSZXF1ZXN0SGVhZGVyJyBpbiByZXF1ZXN0KSB7XG4gICAgICB1dGlscy5mb3JFYWNoKHJlcXVlc3RIZWFkZXJzLCBmdW5jdGlvbiBzZXRSZXF1ZXN0SGVhZGVyKHZhbCwga2V5KSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVxdWVzdERhdGEgPT09ICd1bmRlZmluZWQnICYmIGtleS50b0xvd2VyQ2FzZSgpID09PSAnY29udGVudC10eXBlJykge1xuICAgICAgICAgIC8vIFJlbW92ZSBDb250ZW50LVR5cGUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgICAgICAgICBkZWxldGUgcmVxdWVzdEhlYWRlcnNba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgYWRkIGhlYWRlciB0byB0aGUgcmVxdWVzdFxuICAgICAgICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB3aXRoQ3JlZGVudGlhbHMgdG8gcmVxdWVzdCBpZiBuZWVkZWRcbiAgICBpZiAoY29uZmlnLndpdGhDcmVkZW50aWFscykge1xuICAgICAgcmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIEFkZCByZXNwb25zZVR5cGUgdG8gcmVxdWVzdCBpZiBuZWVkZWRcbiAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSBjb25maWcucmVzcG9uc2VUeXBlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBFeHBlY3RlZCBET01FeGNlcHRpb24gdGhyb3duIGJ5IGJyb3dzZXJzIG5vdCBjb21wYXRpYmxlIFhNTEh0dHBSZXF1ZXN0IExldmVsIDIuXG4gICAgICAgIC8vIEJ1dCwgdGhpcyBjYW4gYmUgc3VwcHJlc3NlZCBmb3IgJ2pzb24nIHR5cGUgYXMgaXQgY2FuIGJlIHBhcnNlZCBieSBkZWZhdWx0ICd0cmFuc2Zvcm1SZXNwb25zZScgZnVuY3Rpb24uXG4gICAgICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlICE9PSAnanNvbicpIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHByb2dyZXNzIGlmIG5lZWRlZFxuICAgIGlmICh0eXBlb2YgY29uZmlnLm9uRG93bmxvYWRQcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIC8vIE5vdCBhbGwgYnJvd3NlcnMgc3VwcG9ydCB1cGxvYWQgZXZlbnRzXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25VcGxvYWRQcm9ncmVzcyA9PT0gJ2Z1bmN0aW9uJyAmJiByZXF1ZXN0LnVwbG9hZCkge1xuICAgICAgcmVxdWVzdC51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25VcGxvYWRQcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xuICAgICAgLy8gSGFuZGxlIGNhbmNlbGxhdGlvblxuICAgICAgY29uZmlnLmNhbmNlbFRva2VuLnByb21pc2UudGhlbihmdW5jdGlvbiBvbkNhbmNlbGVkKGNhbmNlbCkge1xuICAgICAgICBpZiAoIXJlcXVlc3QpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXF1ZXN0LmFib3J0KCk7XG4gICAgICAgIHJlamVjdChjYW5jZWwpO1xuICAgICAgICAvLyBDbGVhbiB1cCByZXF1ZXN0XG4gICAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHJlcXVlc3REYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlcXVlc3REYXRhID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBTZW5kIHRoZSByZXF1ZXN0XG4gICAgcmVxdWVzdC5zZW5kKHJlcXVlc3REYXRhKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XG52YXIgQXhpb3MgPSByZXF1aXJlKCcuL2NvcmUvQXhpb3MnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vZGVmYXVsdHMnKTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgQXhpb3NcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdENvbmZpZyBUaGUgZGVmYXVsdCBjb25maWcgZm9yIHRoZSBpbnN0YW5jZVxuICogQHJldHVybiB7QXhpb3N9IEEgbmV3IGluc3RhbmNlIG9mIEF4aW9zXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRDb25maWcpIHtcbiAgdmFyIGNvbnRleHQgPSBuZXcgQXhpb3MoZGVmYXVsdENvbmZpZyk7XG4gIHZhciBpbnN0YW5jZSA9IGJpbmQoQXhpb3MucHJvdG90eXBlLnJlcXVlc3QsIGNvbnRleHQpO1xuXG4gIC8vIENvcHkgYXhpb3MucHJvdG90eXBlIHRvIGluc3RhbmNlXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgQXhpb3MucHJvdG90eXBlLCBjb250ZXh0KTtcblxuICAvLyBDb3B5IGNvbnRleHQgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBjb250ZXh0KTtcblxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbi8vIENyZWF0ZSB0aGUgZGVmYXVsdCBpbnN0YW5jZSB0byBiZSBleHBvcnRlZFxudmFyIGF4aW9zID0gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdHMpO1xuXG4vLyBFeHBvc2UgQXhpb3MgY2xhc3MgdG8gYWxsb3cgY2xhc3MgaW5oZXJpdGFuY2VcbmF4aW9zLkF4aW9zID0gQXhpb3M7XG5cbi8vIEZhY3RvcnkgZm9yIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXNcbmF4aW9zLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShpbnN0YW5jZUNvbmZpZykge1xuICByZXR1cm4gY3JlYXRlSW5zdGFuY2UodXRpbHMubWVyZ2UoZGVmYXVsdHMsIGluc3RhbmNlQ29uZmlnKSk7XG59O1xuXG4vLyBFeHBvc2UgQ2FuY2VsICYgQ2FuY2VsVG9rZW5cbmF4aW9zLkNhbmNlbCA9IHJlcXVpcmUoJy4vY2FuY2VsL0NhbmNlbCcpO1xuYXhpb3MuQ2FuY2VsVG9rZW4gPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWxUb2tlbicpO1xuYXhpb3MuaXNDYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9pc0NhbmNlbCcpO1xuXG4vLyBFeHBvc2UgYWxsL3NwcmVhZFxuYXhpb3MuYWxsID0gZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XG4gIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XG59O1xuYXhpb3Muc3ByZWFkID0gcmVxdWlyZSgnLi9oZWxwZXJzL3NwcmVhZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGF4aW9zO1xuXG4vLyBBbGxvdyB1c2Ugb2YgZGVmYXVsdCBpbXBvcnQgc3ludGF4IGluIFR5cGVTY3JpcHRcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBheGlvcztcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIGBDYW5jZWxgIGlzIGFuIG9iamVjdCB0aGF0IGlzIHRocm93biB3aGVuIGFuIG9wZXJhdGlvbiBpcyBjYW5jZWxlZC5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7c3RyaW5nPX0gbWVzc2FnZSBUaGUgbWVzc2FnZS5cbiAqL1xuZnVuY3Rpb24gQ2FuY2VsKG1lc3NhZ2UpIHtcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbn1cblxuQ2FuY2VsLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICByZXR1cm4gJ0NhbmNlbCcgKyAodGhpcy5tZXNzYWdlID8gJzogJyArIHRoaXMubWVzc2FnZSA6ICcnKTtcbn07XG5cbkNhbmNlbC5wcm90b3R5cGUuX19DQU5DRUxfXyA9IHRydWU7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2FuY2VsID0gcmVxdWlyZSgnLi9DYW5jZWwnKTtcblxuLyoqXG4gKiBBIGBDYW5jZWxUb2tlbmAgaXMgYW4gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gcmVxdWVzdCBjYW5jZWxsYXRpb24gb2YgYW4gb3BlcmF0aW9uLlxuICpcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZXhlY3V0b3IgVGhlIGV4ZWN1dG9yIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBDYW5jZWxUb2tlbihleGVjdXRvcikge1xuICBpZiAodHlwZW9mIGV4ZWN1dG9yICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhlY3V0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uLicpO1xuICB9XG5cbiAgdmFyIHJlc29sdmVQcm9taXNlO1xuICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiBwcm9taXNlRXhlY3V0b3IocmVzb2x2ZSkge1xuICAgIHJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcbiAgfSk7XG5cbiAgdmFyIHRva2VuID0gdGhpcztcbiAgZXhlY3V0b3IoZnVuY3Rpb24gY2FuY2VsKG1lc3NhZ2UpIHtcbiAgICBpZiAodG9rZW4ucmVhc29uKSB7XG4gICAgICAvLyBDYW5jZWxsYXRpb24gaGFzIGFscmVhZHkgYmVlbiByZXF1ZXN0ZWRcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0b2tlbi5yZWFzb24gPSBuZXcgQ2FuY2VsKG1lc3NhZ2UpO1xuICAgIHJlc29sdmVQcm9taXNlKHRva2VuLnJlYXNvbik7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRocm93cyBhIGBDYW5jZWxgIGlmIGNhbmNlbGxhdGlvbiBoYXMgYmVlbiByZXF1ZXN0ZWQuXG4gKi9cbkNhbmNlbFRva2VuLnByb3RvdHlwZS50aHJvd0lmUmVxdWVzdGVkID0gZnVuY3Rpb24gdGhyb3dJZlJlcXVlc3RlZCgpIHtcbiAgaWYgKHRoaXMucmVhc29uKSB7XG4gICAgdGhyb3cgdGhpcy5yZWFzb247XG4gIH1cbn07XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3QgdGhhdCBjb250YWlucyBhIG5ldyBgQ2FuY2VsVG9rZW5gIGFuZCBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLFxuICogY2FuY2VscyB0aGUgYENhbmNlbFRva2VuYC5cbiAqL1xuQ2FuY2VsVG9rZW4uc291cmNlID0gZnVuY3Rpb24gc291cmNlKCkge1xuICB2YXIgY2FuY2VsO1xuICB2YXIgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oZnVuY3Rpb24gZXhlY3V0b3IoYykge1xuICAgIGNhbmNlbCA9IGM7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHRva2VuOiB0b2tlbixcbiAgICBjYW5jZWw6IGNhbmNlbFxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWxUb2tlbjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0NhbmNlbCh2YWx1ZSkge1xuICByZXR1cm4gISEodmFsdWUgJiYgdmFsdWUuX19DQU5DRUxfXyk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuLy4uL2RlZmF1bHRzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgSW50ZXJjZXB0b3JNYW5hZ2VyID0gcmVxdWlyZSgnLi9JbnRlcmNlcHRvck1hbmFnZXInKTtcbnZhciBkaXNwYXRjaFJlcXVlc3QgPSByZXF1aXJlKCcuL2Rpc3BhdGNoUmVxdWVzdCcpO1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZUNvbmZpZyBUaGUgZGVmYXVsdCBjb25maWcgZm9yIHRoZSBpbnN0YW5jZVxuICovXG5mdW5jdGlvbiBBeGlvcyhpbnN0YW5jZUNvbmZpZykge1xuICB0aGlzLmRlZmF1bHRzID0gaW5zdGFuY2VDb25maWc7XG4gIHRoaXMuaW50ZXJjZXB0b3JzID0ge1xuICAgIHJlcXVlc3Q6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKSxcbiAgICByZXNwb25zZTogbmV3IEludGVyY2VwdG9yTWFuYWdlcigpXG4gIH07XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggYSByZXF1ZXN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHNwZWNpZmljIGZvciB0aGlzIHJlcXVlc3QgKG1lcmdlZCB3aXRoIHRoaXMuZGVmYXVsdHMpXG4gKi9cbkF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0ID0gZnVuY3Rpb24gcmVxdWVzdChjb25maWcpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIC8vIEFsbG93IGZvciBheGlvcygnZXhhbXBsZS91cmwnWywgY29uZmlnXSkgYSBsYSBmZXRjaCBBUElcbiAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgY29uZmlnID0gdXRpbHMubWVyZ2Uoe1xuICAgICAgdXJsOiBhcmd1bWVudHNbMF1cbiAgICB9LCBhcmd1bWVudHNbMV0pO1xuICB9XG5cbiAgY29uZmlnID0gdXRpbHMubWVyZ2UoZGVmYXVsdHMsIHRoaXMuZGVmYXVsdHMsIHsgbWV0aG9kOiAnZ2V0JyB9LCBjb25maWcpO1xuICBjb25maWcubWV0aG9kID0gY29uZmlnLm1ldGhvZC50b0xvd2VyQ2FzZSgpO1xuXG4gIC8vIEhvb2sgdXAgaW50ZXJjZXB0b3JzIG1pZGRsZXdhcmVcbiAgdmFyIGNoYWluID0gW2Rpc3BhdGNoUmVxdWVzdCwgdW5kZWZpbmVkXTtcbiAgdmFyIHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoY29uZmlnKTtcblxuICB0aGlzLmludGVyY2VwdG9ycy5yZXF1ZXN0LmZvckVhY2goZnVuY3Rpb24gdW5zaGlmdFJlcXVlc3RJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcbiAgICBjaGFpbi51bnNoaWZ0KGludGVyY2VwdG9yLmZ1bGZpbGxlZCwgaW50ZXJjZXB0b3IucmVqZWN0ZWQpO1xuICB9KTtcblxuICB0aGlzLmludGVyY2VwdG9ycy5yZXNwb25zZS5mb3JFYWNoKGZ1bmN0aW9uIHB1c2hSZXNwb25zZUludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xuICAgIGNoYWluLnB1c2goaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XG4gIH0pO1xuXG4gIHdoaWxlIChjaGFpbi5sZW5ndGgpIHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKGNoYWluLnNoaWZ0KCksIGNoYWluLnNoaWZ0KCkpO1xuICB9XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vLyBQcm92aWRlIGFsaWFzZXMgZm9yIHN1cHBvcnRlZCByZXF1ZXN0IG1ldGhvZHNcbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAnb3B0aW9ucyddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB1cmxcbiAgICB9KSk7XG4gIH07XG59KTtcblxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcbiAgLyplc2xpbnQgZnVuYy1uYW1lczowKi9cbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIHVybDogdXJsLFxuICAgICAgZGF0YTogZGF0YVxuICAgIH0pKTtcbiAgfTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF4aW9zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEludGVyY2VwdG9yTWFuYWdlcigpIHtcbiAgdGhpcy5oYW5kbGVycyA9IFtdO1xufVxuXG4vKipcbiAqIEFkZCBhIG5ldyBpbnRlcmNlcHRvciB0byB0aGUgc3RhY2tcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdWxmaWxsZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgdGhlbmAgZm9yIGEgYFByb21pc2VgXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3RlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGByZWplY3RgIGZvciBhIGBQcm9taXNlYFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gQW4gSUQgdXNlZCB0byByZW1vdmUgaW50ZXJjZXB0b3IgbGF0ZXJcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbiB1c2UoZnVsZmlsbGVkLCByZWplY3RlZCkge1xuICB0aGlzLmhhbmRsZXJzLnB1c2goe1xuICAgIGZ1bGZpbGxlZDogZnVsZmlsbGVkLFxuICAgIHJlamVjdGVkOiByZWplY3RlZFxuICB9KTtcbiAgcmV0dXJuIHRoaXMuaGFuZGxlcnMubGVuZ3RoIC0gMTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGludGVyY2VwdG9yIGZyb20gdGhlIHN0YWNrXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIFRoZSBJRCB0aGF0IHdhcyByZXR1cm5lZCBieSBgdXNlYFxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmVqZWN0ID0gZnVuY3Rpb24gZWplY3QoaWQpIHtcbiAgaWYgKHRoaXMuaGFuZGxlcnNbaWRdKSB7XG4gICAgdGhpcy5oYW5kbGVyc1tpZF0gPSBudWxsO1xuICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbGwgdGhlIHJlZ2lzdGVyZWQgaW50ZXJjZXB0b3JzXG4gKlxuICogVGhpcyBtZXRob2QgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3Igc2tpcHBpbmcgb3ZlciBhbnlcbiAqIGludGVyY2VwdG9ycyB0aGF0IG1heSBoYXZlIGJlY29tZSBgbnVsbGAgY2FsbGluZyBgZWplY3RgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGludGVyY2VwdG9yXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIGZvckVhY2goZm4pIHtcbiAgdXRpbHMuZm9yRWFjaCh0aGlzLmhhbmRsZXJzLCBmdW5jdGlvbiBmb3JFYWNoSGFuZGxlcihoKSB7XG4gICAgaWYgKGggIT09IG51bGwpIHtcbiAgICAgIGZuKGgpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEludGVyY2VwdG9yTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGVuaGFuY2VFcnJvciA9IHJlcXVpcmUoJy4vZW5oYW5jZUVycm9yJyk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBtZXNzYWdlLCBjb25maWcsIGVycm9yIGNvZGUsIHJlcXVlc3QgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBlcnJvciBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBjcmVhdGVkIGVycm9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAgdmFyIGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICByZXR1cm4gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciB0cmFuc2Zvcm1EYXRhID0gcmVxdWlyZSgnLi90cmFuc2Zvcm1EYXRhJyk7XG52YXIgaXNDYW5jZWwgPSByZXF1aXJlKCcuLi9jYW5jZWwvaXNDYW5jZWwnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4uL2RlZmF1bHRzJyk7XG52YXIgaXNBYnNvbHV0ZVVSTCA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9pc0Fic29sdXRlVVJMJyk7XG52YXIgY29tYmluZVVSTHMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvY29tYmluZVVSTHMnKTtcblxuLyoqXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxuICovXG5mdW5jdGlvbiB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZykge1xuICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgY29uZmlnLmNhbmNlbFRva2VuLnRocm93SWZSZXF1ZXN0ZWQoKTtcbiAgfVxufVxuXG4vKipcbiAqIERpc3BhdGNoIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIHVzaW5nIHRoZSBjb25maWd1cmVkIGFkYXB0ZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHRoYXQgaXMgdG8gYmUgdXNlZCBmb3IgdGhlIHJlcXVlc3RcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkaXNwYXRjaFJlcXVlc3QoY29uZmlnKSB7XG4gIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAvLyBTdXBwb3J0IGJhc2VVUkwgY29uZmlnXG4gIGlmIChjb25maWcuYmFzZVVSTCAmJiAhaXNBYnNvbHV0ZVVSTChjb25maWcudXJsKSkge1xuICAgIGNvbmZpZy51cmwgPSBjb21iaW5lVVJMcyhjb25maWcuYmFzZVVSTCwgY29uZmlnLnVybCk7XG4gIH1cblxuICAvLyBFbnN1cmUgaGVhZGVycyBleGlzdFxuICBjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xuXG4gIC8vIFRyYW5zZm9ybSByZXF1ZXN0IGRhdGFcbiAgY29uZmlnLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgIGNvbmZpZy5kYXRhLFxuICAgIGNvbmZpZy5oZWFkZXJzLFxuICAgIGNvbmZpZy50cmFuc2Zvcm1SZXF1ZXN0XG4gICk7XG5cbiAgLy8gRmxhdHRlbiBoZWFkZXJzXG4gIGNvbmZpZy5oZWFkZXJzID0gdXRpbHMubWVyZ2UoXG4gICAgY29uZmlnLmhlYWRlcnMuY29tbW9uIHx8IHt9LFxuICAgIGNvbmZpZy5oZWFkZXJzW2NvbmZpZy5tZXRob2RdIHx8IHt9LFxuICAgIGNvbmZpZy5oZWFkZXJzIHx8IHt9XG4gICk7XG5cbiAgdXRpbHMuZm9yRWFjaChcbiAgICBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwb3N0JywgJ3B1dCcsICdwYXRjaCcsICdjb21tb24nXSxcbiAgICBmdW5jdGlvbiBjbGVhbkhlYWRlckNvbmZpZyhtZXRob2QpIHtcbiAgICAgIGRlbGV0ZSBjb25maWcuaGVhZGVyc1ttZXRob2RdO1xuICAgIH1cbiAgKTtcblxuICB2YXIgYWRhcHRlciA9IGNvbmZpZy5hZGFwdGVyIHx8IGRlZmF1bHRzLmFkYXB0ZXI7XG5cbiAgcmV0dXJuIGFkYXB0ZXIoY29uZmlnKS50aGVuKGZ1bmN0aW9uIG9uQWRhcHRlclJlc29sdXRpb24ocmVzcG9uc2UpIHtcbiAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxuICAgIHJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgICAgcmVzcG9uc2UuZGF0YSxcbiAgICAgIHJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LCBmdW5jdGlvbiBvbkFkYXB0ZXJSZWplY3Rpb24ocmVhc29uKSB7XG4gICAgaWYgKCFpc0NhbmNlbChyZWFzb24pKSB7XG4gICAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgICBpZiAocmVhc29uICYmIHJlYXNvbi5yZXNwb25zZSkge1xuICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEsXG4gICAgICAgICAgcmVhc29uLnJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHJlYXNvbik7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBVcGRhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIGNvbmZpZywgZXJyb3IgY29kZSwgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGVycm9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xuICBlcnJvci5jb25maWcgPSBjb25maWc7XG4gIGlmIChjb2RlKSB7XG4gICAgZXJyb3IuY29kZSA9IGNvZGU7XG4gIH1cbiAgZXJyb3IucmVxdWVzdCA9IHJlcXVlc3Q7XG4gIGVycm9yLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gIHJldHVybiBlcnJvcjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4vY3JlYXRlRXJyb3InKTtcblxuLyoqXG4gKiBSZXNvbHZlIG9yIHJlamVjdCBhIFByb21pc2UgYmFzZWQgb24gcmVzcG9uc2Ugc3RhdHVzLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmUgQSBmdW5jdGlvbiB0aGF0IHJlc29sdmVzIHRoZSBwcm9taXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0IEEgZnVuY3Rpb24gdGhhdCByZWplY3RzIHRoZSBwcm9taXNlLlxuICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIFRoZSByZXNwb25zZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSkge1xuICB2YXIgdmFsaWRhdGVTdGF0dXMgPSByZXNwb25zZS5jb25maWcudmFsaWRhdGVTdGF0dXM7XG4gIC8vIE5vdGU6IHN0YXR1cyBpcyBub3QgZXhwb3NlZCBieSBYRG9tYWluUmVxdWVzdFxuICBpZiAoIXJlc3BvbnNlLnN0YXR1cyB8fCAhdmFsaWRhdGVTdGF0dXMgfHwgdmFsaWRhdGVTdGF0dXMocmVzcG9uc2Uuc3RhdHVzKSkge1xuICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICB9IGVsc2Uge1xuICAgIHJlamVjdChjcmVhdGVFcnJvcihcbiAgICAgICdSZXF1ZXN0IGZhaWxlZCB3aXRoIHN0YXR1cyBjb2RlICcgKyByZXNwb25zZS5zdGF0dXMsXG4gICAgICByZXNwb25zZS5jb25maWcsXG4gICAgICBudWxsLFxuICAgICAgcmVzcG9uc2UucmVxdWVzdCxcbiAgICAgIHJlc3BvbnNlXG4gICAgKSk7XG4gIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gdGhlIGRhdGEgZm9yIGEgcmVxdWVzdCBvciBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBkYXRhIFRoZSBkYXRhIHRvIGJlIHRyYW5zZm9ybWVkXG4gKiBAcGFyYW0ge0FycmF5fSBoZWFkZXJzIFRoZSBoZWFkZXJzIGZvciB0aGUgcmVxdWVzdCBvciByZXNwb25zZVxuICogQHBhcmFtIHtBcnJheXxGdW5jdGlvbn0gZm5zIEEgc2luZ2xlIGZ1bmN0aW9uIG9yIEFycmF5IG9mIGZ1bmN0aW9uc1xuICogQHJldHVybnMgeyp9IFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgZGF0YVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoZGF0YSwgaGVhZGVycywgZm5zKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICB1dGlscy5mb3JFYWNoKGZucywgZnVuY3Rpb24gdHJhbnNmb3JtKGZuKSB7XG4gICAgZGF0YSA9IGZuKGRhdGEsIGhlYWRlcnMpO1xuICB9KTtcblxuICByZXR1cm4gZGF0YTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBub3JtYWxpemVIZWFkZXJOYW1lID0gcmVxdWlyZSgnLi9oZWxwZXJzL25vcm1hbGl6ZUhlYWRlck5hbWUnKTtcblxudmFyIERFRkFVTFRfQ09OVEVOVF9UWVBFID0ge1xuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbn07XG5cbmZ1bmN0aW9uIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCB2YWx1ZSkge1xuICBpZiAoIXV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnMpICYmIHV0aWxzLmlzVW5kZWZpbmVkKGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddKSkge1xuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gdmFsdWU7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGVmYXVsdEFkYXB0ZXIoKSB7XG4gIHZhciBhZGFwdGVyO1xuICBpZiAodHlwZW9mIFhNTEh0dHBSZXF1ZXN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIEZvciBicm93c2VycyB1c2UgWEhSIGFkYXB0ZXJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy94aHInKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBGb3Igbm9kZSB1c2UgSFRUUCBhZGFwdGVyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMvaHR0cCcpO1xuICB9XG4gIHJldHVybiBhZGFwdGVyO1xufVxuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGFkYXB0ZXI6IGdldERlZmF1bHRBZGFwdGVyKCksXG5cbiAgdHJhbnNmb3JtUmVxdWVzdDogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlcXVlc3QoZGF0YSwgaGVhZGVycykge1xuICAgIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgJ0NvbnRlbnQtVHlwZScpO1xuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0FycmF5QnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0J1ZmZlcihkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNTdHJlYW0oZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzRmlsZShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNCbG9iKGRhdGEpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzQXJyYXlCdWZmZXJWaWV3KGRhdGEpKSB7XG4gICAgICByZXR1cm4gZGF0YS5idWZmZXI7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhkYXRhKSkge1xuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD11dGYtOCcpO1xuICAgICAgcmV0dXJuIGRhdGEudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOCcpO1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfV0sXG5cbiAgdHJhbnNmb3JtUmVzcG9uc2U6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXNwb25zZShkYXRhKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICB9IGNhdGNoIChlKSB7IC8qIElnbm9yZSAqLyB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICB0aW1lb3V0OiAwLFxuXG4gIHhzcmZDb29raWVOYW1lOiAnWFNSRi1UT0tFTicsXG4gIHhzcmZIZWFkZXJOYW1lOiAnWC1YU1JGLVRPS0VOJyxcblxuICBtYXhDb250ZW50TGVuZ3RoOiAtMSxcblxuICB2YWxpZGF0ZVN0YXR1czogZnVuY3Rpb24gdmFsaWRhdGVTdGF0dXMoc3RhdHVzKSB7XG4gICAgcmV0dXJuIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwO1xuICB9XG59O1xuXG5kZWZhdWx0cy5oZWFkZXJzID0ge1xuICBjb21tb246IHtcbiAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvcGxhaW4sICovKidcbiAgfVxufTtcblxudXRpbHMuZm9yRWFjaChbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB7fTtcbn0pO1xuXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xuICBkZWZhdWx0cy5oZWFkZXJzW21ldGhvZF0gPSB1dGlscy5tZXJnZShERUZBVUxUX0NPTlRFTlRfVFlQRSk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0cztcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kKGZuLCB0aGlzQXJnKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKCkge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gYnRvYSBwb2x5ZmlsbCBmb3IgSUU8MTAgY291cnRlc3kgaHR0cHM6Ly9naXRodWIuY29tL2RhdmlkY2hhbWJlcnMvQmFzZTY0LmpzXG5cbnZhciBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPSc7XG5cbmZ1bmN0aW9uIEUoKSB7XG4gIHRoaXMubWVzc2FnZSA9ICdTdHJpbmcgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXInO1xufVxuRS5wcm90b3R5cGUgPSBuZXcgRXJyb3I7XG5FLnByb3RvdHlwZS5jb2RlID0gNTtcbkUucHJvdG90eXBlLm5hbWUgPSAnSW52YWxpZENoYXJhY3RlckVycm9yJztcblxuZnVuY3Rpb24gYnRvYShpbnB1dCkge1xuICB2YXIgc3RyID0gU3RyaW5nKGlucHV0KTtcbiAgdmFyIG91dHB1dCA9ICcnO1xuICBmb3IgKFxuICAgIC8vIGluaXRpYWxpemUgcmVzdWx0IGFuZCBjb3VudGVyXG4gICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnM7XG4gICAgLy8gaWYgdGhlIG5leHQgc3RyIGluZGV4IGRvZXMgbm90IGV4aXN0OlxuICAgIC8vICAgY2hhbmdlIHRoZSBtYXBwaW5nIHRhYmxlIHRvIFwiPVwiXG4gICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xuICAgIHN0ci5jaGFyQXQoaWR4IHwgMCkgfHwgKG1hcCA9ICc9JywgaWR4ICUgMSk7XG4gICAgLy8gXCI4IC0gaWR4ICUgMSAqIDhcIiBnZW5lcmF0ZXMgdGhlIHNlcXVlbmNlIDIsIDQsIDYsIDhcbiAgICBvdXRwdXQgKz0gbWFwLmNoYXJBdCg2MyAmIGJsb2NrID4+IDggLSBpZHggJSAxICogOClcbiAgKSB7XG4gICAgY2hhckNvZGUgPSBzdHIuY2hhckNvZGVBdChpZHggKz0gMyAvIDQpO1xuICAgIGlmIChjaGFyQ29kZSA+IDB4RkYpIHtcbiAgICAgIHRocm93IG5ldyBFKCk7XG4gICAgfVxuICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xuICB9XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnRvYTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5mdW5jdGlvbiBlbmNvZGUodmFsKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsKS5cbiAgICByZXBsYWNlKC8lNDAvZ2ksICdAJykuXG4gICAgcmVwbGFjZSgvJTNBL2dpLCAnOicpLlxuICAgIHJlcGxhY2UoLyUyNC9nLCAnJCcpLlxuICAgIHJlcGxhY2UoLyUyQy9naSwgJywnKS5cbiAgICByZXBsYWNlKC8lMjAvZywgJysnKS5cbiAgICByZXBsYWNlKC8lNUIvZ2ksICdbJykuXG4gICAgcmVwbGFjZSgvJTVEL2dpLCAnXScpO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgVVJMIGJ5IGFwcGVuZGluZyBwYXJhbXMgdG8gdGhlIGVuZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIGJhc2Ugb2YgdGhlIHVybCAoZS5nLiwgaHR0cDovL3d3dy5nb29nbGUuY29tKVxuICogQHBhcmFtIHtvYmplY3R9IFtwYXJhbXNdIFRoZSBwYXJhbXMgdG8gYmUgYXBwZW5kZWRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgdXJsXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVpbGRVUkwodXJsLCBwYXJhbXMsIHBhcmFtc1NlcmlhbGl6ZXIpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIGlmICghcGFyYW1zKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIHZhciBzZXJpYWxpemVkUGFyYW1zO1xuICBpZiAocGFyYW1zU2VyaWFsaXplcikge1xuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXNTZXJpYWxpemVyKHBhcmFtcyk7XG4gIH0gZWxzZSBpZiAodXRpbHMuaXNVUkxTZWFyY2hQYXJhbXMocGFyYW1zKSkge1xuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcGFydHMgPSBbXTtcblxuICAgIHV0aWxzLmZvckVhY2gocGFyYW1zLCBmdW5jdGlvbiBzZXJpYWxpemUodmFsLCBrZXkpIHtcbiAgICAgIGlmICh2YWwgPT09IG51bGwgfHwgdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodXRpbHMuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGtleSA9IGtleSArICdbXSc7XG4gICAgICB9XG5cbiAgICAgIGlmICghdXRpbHMuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIHZhbCA9IFt2YWxdO1xuICAgICAgfVxuXG4gICAgICB1dGlscy5mb3JFYWNoKHZhbCwgZnVuY3Rpb24gcGFyc2VWYWx1ZSh2KSB7XG4gICAgICAgIGlmICh1dGlscy5pc0RhdGUodikpIHtcbiAgICAgICAgICB2ID0gdi50b0lTT1N0cmluZygpO1xuICAgICAgICB9IGVsc2UgaWYgKHV0aWxzLmlzT2JqZWN0KHYpKSB7XG4gICAgICAgICAgdiA9IEpTT04uc3RyaW5naWZ5KHYpO1xuICAgICAgICB9XG4gICAgICAgIHBhcnRzLnB1c2goZW5jb2RlKGtleSkgKyAnPScgKyBlbmNvZGUodikpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFydHMuam9pbignJicpO1xuICB9XG5cbiAgaWYgKHNlcmlhbGl6ZWRQYXJhbXMpIHtcbiAgICB1cmwgKz0gKHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnKSArIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIH1cblxuICByZXR1cm4gdXJsO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIFVSTFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbWJpbmVVUkxzKGJhc2VVUkwsIHJlbGF0aXZlVVJMKSB7XG4gIHJldHVybiByZWxhdGl2ZVVSTFxuICAgID8gYmFzZVVSTC5yZXBsYWNlKC9cXC8rJC8sICcnKSArICcvJyArIHJlbGF0aXZlVVJMLnJlcGxhY2UoL15cXC8rLywgJycpXG4gICAgOiBiYXNlVVJMO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XG5cbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIHN1cHBvcnQgZG9jdW1lbnQuY29va2llXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZShuYW1lLCB2YWx1ZSwgZXhwaXJlcywgcGF0aCwgZG9tYWluLCBzZWN1cmUpIHtcbiAgICAgICAgdmFyIGNvb2tpZSA9IFtdO1xuICAgICAgICBjb29raWUucHVzaChuYW1lICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKGV4cGlyZXMpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2V4cGlyZXM9JyArIG5ldyBEYXRlKGV4cGlyZXMpLnRvR01UU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKHBhdGgpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ3BhdGg9JyArIHBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKGRvbWFpbikpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnZG9tYWluPScgKyBkb21haW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdzZWN1cmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZS5qb2luKCc7ICcpO1xuICAgICAgfSxcblxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZChuYW1lKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IGRvY3VtZW50LmNvb2tpZS5tYXRjaChuZXcgUmVnRXhwKCcoXnw7XFxcXHMqKSgnICsgbmFtZSArICcpPShbXjtdKiknKSk7XG4gICAgICAgIHJldHVybiAobWF0Y2ggPyBkZWNvZGVVUklDb21wb25lbnQobWF0Y2hbM10pIDogbnVsbCk7XG4gICAgICB9LFxuXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZShuYW1lKSB7XG4gICAgICAgIHRoaXMud3JpdGUobmFtZSwgJycsIERhdGUubm93KCkgLSA4NjQwMDAwMCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKSA6XG5cbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52ICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUoKSB7fSxcbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQoKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7fVxuICAgIH07XG4gIH0pKClcbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0Fic29sdXRlVVJMKHVybCkge1xuICAvLyBBIFVSTCBpcyBjb25zaWRlcmVkIGFic29sdXRlIGlmIGl0IGJlZ2lucyB3aXRoIFwiPHNjaGVtZT46Ly9cIiBvciBcIi8vXCIgKHByb3RvY29sLXJlbGF0aXZlIFVSTCkuXG4gIC8vIFJGQyAzOTg2IGRlZmluZXMgc2NoZW1lIG5hbWUgYXMgYSBzZXF1ZW5jZSBvZiBjaGFyYWN0ZXJzIGJlZ2lubmluZyB3aXRoIGEgbGV0dGVyIGFuZCBmb2xsb3dlZFxuICAvLyBieSBhbnkgY29tYmluYXRpb24gb2YgbGV0dGVycywgZGlnaXRzLCBwbHVzLCBwZXJpb2QsIG9yIGh5cGhlbi5cbiAgcmV0dXJuIC9eKFthLXpdW2EtelxcZFxcK1xcLVxcLl0qOik/XFwvXFwvL2kudGVzdCh1cmwpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IChcbiAgdXRpbHMuaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSA/XG5cbiAgLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIGhhdmUgZnVsbCBzdXBwb3J0IG9mIHRoZSBBUElzIG5lZWRlZCB0byB0ZXN0XG4gIC8vIHdoZXRoZXIgdGhlIHJlcXVlc3QgVVJMIGlzIG9mIHRoZSBzYW1lIG9yaWdpbiBhcyBjdXJyZW50IGxvY2F0aW9uLlxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHZhciBtc2llID0gLyhtc2llfHRyaWRlbnQpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgICB2YXIgdXJsUGFyc2luZ05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgdmFyIG9yaWdpblVSTDtcblxuICAgIC8qKlxuICAgICogUGFyc2UgYSBVUkwgdG8gZGlzY292ZXIgaXQncyBjb21wb25lbnRzXG4gICAgKlxuICAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIGJlIHBhcnNlZFxuICAgICogQHJldHVybnMge09iamVjdH1cbiAgICAqL1xuICAgIGZ1bmN0aW9uIHJlc29sdmVVUkwodXJsKSB7XG4gICAgICB2YXIgaHJlZiA9IHVybDtcblxuICAgICAgaWYgKG1zaWUpIHtcbiAgICAgICAgLy8gSUUgbmVlZHMgYXR0cmlidXRlIHNldCB0d2ljZSB0byBub3JtYWxpemUgcHJvcGVydGllc1xuICAgICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcbiAgICAgICAgaHJlZiA9IHVybFBhcnNpbmdOb2RlLmhyZWY7XG4gICAgICB9XG5cbiAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuXG4gICAgICAvLyB1cmxQYXJzaW5nTm9kZSBwcm92aWRlcyB0aGUgVXJsVXRpbHMgaW50ZXJmYWNlIC0gaHR0cDovL3VybC5zcGVjLndoYXR3Zy5vcmcvI3VybHV0aWxzXG4gICAgICByZXR1cm4ge1xuICAgICAgICBocmVmOiB1cmxQYXJzaW5nTm9kZS5ocmVmLFxuICAgICAgICBwcm90b2NvbDogdXJsUGFyc2luZ05vZGUucHJvdG9jb2wgPyB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbC5yZXBsYWNlKC86JC8sICcnKSA6ICcnLFxuICAgICAgICBob3N0OiB1cmxQYXJzaW5nTm9kZS5ob3N0LFxuICAgICAgICBzZWFyY2g6IHVybFBhcnNpbmdOb2RlLnNlYXJjaCA/IHVybFBhcnNpbmdOb2RlLnNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpIDogJycsXG4gICAgICAgIGhhc2g6IHVybFBhcnNpbmdOb2RlLmhhc2ggPyB1cmxQYXJzaW5nTm9kZS5oYXNoLnJlcGxhY2UoL14jLywgJycpIDogJycsXG4gICAgICAgIGhvc3RuYW1lOiB1cmxQYXJzaW5nTm9kZS5ob3N0bmFtZSxcbiAgICAgICAgcG9ydDogdXJsUGFyc2luZ05vZGUucG9ydCxcbiAgICAgICAgcGF0aG5hbWU6ICh1cmxQYXJzaW5nTm9kZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJykgP1xuICAgICAgICAgICAgICAgICAgdXJsUGFyc2luZ05vZGUucGF0aG5hbWUgOlxuICAgICAgICAgICAgICAgICAgJy8nICsgdXJsUGFyc2luZ05vZGUucGF0aG5hbWVcbiAgICAgIH07XG4gICAgfVxuXG4gICAgb3JpZ2luVVJMID0gcmVzb2x2ZVVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG5cbiAgICAvKipcbiAgICAqIERldGVybWluZSBpZiBhIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luIGFzIHRoZSBjdXJyZW50IGxvY2F0aW9uXG4gICAgKlxuICAgICogQHBhcmFtIHtTdHJpbmd9IHJlcXVlc3RVUkwgVGhlIFVSTCB0byB0ZXN0XG4gICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgKi9cbiAgICByZXR1cm4gZnVuY3Rpb24gaXNVUkxTYW1lT3JpZ2luKHJlcXVlc3RVUkwpIHtcbiAgICAgIHZhciBwYXJzZWQgPSAodXRpbHMuaXNTdHJpbmcocmVxdWVzdFVSTCkpID8gcmVzb2x2ZVVSTChyZXF1ZXN0VVJMKSA6IHJlcXVlc3RVUkw7XG4gICAgICByZXR1cm4gKHBhcnNlZC5wcm90b2NvbCA9PT0gb3JpZ2luVVJMLnByb3RvY29sICYmXG4gICAgICAgICAgICBwYXJzZWQuaG9zdCA9PT0gb3JpZ2luVVJMLmhvc3QpO1xuICAgIH07XG4gIH0pKCkgOlxuXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudnMgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbigpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gIH0pKClcbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCBub3JtYWxpemVkTmFtZSkge1xuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMsIGZ1bmN0aW9uIHByb2Nlc3NIZWFkZXIodmFsdWUsIG5hbWUpIHtcbiAgICBpZiAobmFtZSAhPT0gbm9ybWFsaXplZE5hbWUgJiYgbmFtZS50b1VwcGVyQ2FzZSgpID09PSBub3JtYWxpemVkTmFtZS50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICBoZWFkZXJzW25vcm1hbGl6ZWROYW1lXSA9IHZhbHVlO1xuICAgICAgZGVsZXRlIGhlYWRlcnNbbmFtZV07XG4gICAgfVxuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuLy8gSGVhZGVycyB3aG9zZSBkdXBsaWNhdGVzIGFyZSBpZ25vcmVkIGJ5IG5vZGVcbi8vIGMuZi4gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9odHRwLmh0bWwjaHR0cF9tZXNzYWdlX2hlYWRlcnNcbnZhciBpZ25vcmVEdXBsaWNhdGVPZiA9IFtcbiAgJ2FnZScsICdhdXRob3JpemF0aW9uJywgJ2NvbnRlbnQtbGVuZ3RoJywgJ2NvbnRlbnQtdHlwZScsICdldGFnJyxcbiAgJ2V4cGlyZXMnLCAnZnJvbScsICdob3N0JywgJ2lmLW1vZGlmaWVkLXNpbmNlJywgJ2lmLXVubW9kaWZpZWQtc2luY2UnLFxuICAnbGFzdC1tb2RpZmllZCcsICdsb2NhdGlvbicsICdtYXgtZm9yd2FyZHMnLCAncHJveHktYXV0aG9yaXphdGlvbicsXG4gICdyZWZlcmVyJywgJ3JldHJ5LWFmdGVyJywgJ3VzZXItYWdlbnQnXG5dO1xuXG4vKipcbiAqIFBhcnNlIGhlYWRlcnMgaW50byBhbiBvYmplY3RcbiAqXG4gKiBgYGBcbiAqIERhdGU6IFdlZCwgMjcgQXVnIDIwMTQgMDg6NTg6NDkgR01UXG4gKiBDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cbiAqIENvbm5lY3Rpb246IGtlZXAtYWxpdmVcbiAqIFRyYW5zZmVyLUVuY29kaW5nOiBjaHVua2VkXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVycyBIZWFkZXJzIG5lZWRpbmcgdG8gYmUgcGFyc2VkXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBIZWFkZXJzIHBhcnNlZCBpbnRvIGFuIG9iamVjdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhoZWFkZXJzKSB7XG4gIHZhciBwYXJzZWQgPSB7fTtcbiAgdmFyIGtleTtcbiAgdmFyIHZhbDtcbiAgdmFyIGk7XG5cbiAgaWYgKCFoZWFkZXJzKSB7IHJldHVybiBwYXJzZWQ7IH1cblxuICB1dGlscy5mb3JFYWNoKGhlYWRlcnMuc3BsaXQoJ1xcbicpLCBmdW5jdGlvbiBwYXJzZXIobGluZSkge1xuICAgIGkgPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBrZXkgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKDAsIGkpKS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbCA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoaSArIDEpKTtcblxuICAgIGlmIChrZXkpIHtcbiAgICAgIGlmIChwYXJzZWRba2V5XSAmJiBpZ25vcmVEdXBsaWNhdGVPZi5pbmRleE9mKGtleSkgPj0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoa2V5ID09PSAnc2V0LWNvb2tpZScpIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSAocGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSA6IFtdKS5jb25jYXQoW3ZhbF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSBwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldICsgJywgJyArIHZhbCA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwYXJzZWQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFN5bnRhY3RpYyBzdWdhciBmb3IgaW52b2tpbmcgYSBmdW5jdGlvbiBhbmQgZXhwYW5kaW5nIGFuIGFycmF5IGZvciBhcmd1bWVudHMuXG4gKlxuICogQ29tbW9uIHVzZSBjYXNlIHdvdWxkIGJlIHRvIHVzZSBgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5YC5cbiAqXG4gKiAgYGBganNcbiAqICBmdW5jdGlvbiBmKHgsIHksIHopIHt9XG4gKiAgdmFyIGFyZ3MgPSBbMSwgMiwgM107XG4gKiAgZi5hcHBseShudWxsLCBhcmdzKTtcbiAqICBgYGBcbiAqXG4gKiBXaXRoIGBzcHJlYWRgIHRoaXMgZXhhbXBsZSBjYW4gYmUgcmUtd3JpdHRlbi5cbiAqXG4gKiAgYGBganNcbiAqICBzcHJlYWQoZnVuY3Rpb24oeCwgeSwgeikge30pKFsxLCAyLCAzXSk7XG4gKiAgYGBgXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzcHJlYWQoY2FsbGJhY2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoYXJyKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFycik7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZCA9IHJlcXVpcmUoJy4vaGVscGVycy9iaW5kJyk7XG52YXIgaXNCdWZmZXIgPSByZXF1aXJlKCdpcy1idWZmZXInKTtcblxuLypnbG9iYWwgdG9TdHJpbmc6dHJ1ZSovXG5cbi8vIHV0aWxzIGlzIGEgbGlicmFyeSBvZiBnZW5lcmljIGhlbHBlciBmdW5jdGlvbnMgbm9uLXNwZWNpZmljIHRvIGF4aW9zXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXkodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGb3JtRGF0YVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEZvcm1EYXRhLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGb3JtRGF0YSh2YWwpIHtcbiAgcmV0dXJuICh0eXBlb2YgRm9ybURhdGEgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsIGluc3RhbmNlb2YgRm9ybURhdGEpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3KHZhbCkge1xuICB2YXIgcmVzdWx0O1xuICBpZiAoKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpICYmIChBcnJheUJ1ZmZlci5pc1ZpZXcpKSB7XG4gICAgcmVzdWx0ID0gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbCk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ID0gKHZhbCkgJiYgKHZhbC5idWZmZXIpICYmICh2YWwuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJpbmdcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmluZywgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBOdW1iZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIE51bWJlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgdW5kZWZpbmVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gT2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gT2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XG4gIHJldHVybiB2YWwgIT09IG51bGwgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBEYXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBEYXRlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNEYXRlKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGaWxlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGaWxlKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGaWxlXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBCbG9iXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBCbG9iLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNCbG9iKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBCbG9iXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGdW5jdGlvblxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRnVuY3Rpb24sIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyZWFtXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJlYW0sIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N0cmVhbSh2YWwpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbCkgJiYgaXNGdW5jdGlvbih2YWwucGlwZSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBVUkxTZWFyY2hQYXJhbXMgb2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNVUkxTZWFyY2hQYXJhbXModmFsKSB7XG4gIHJldHVybiB0eXBlb2YgVVJMU2VhcmNoUGFyYW1zICE9PSAndW5kZWZpbmVkJyAmJiB2YWwgaW5zdGFuY2VvZiBVUkxTZWFyY2hQYXJhbXM7XG59XG5cbi8qKlxuICogVHJpbSBleGNlc3Mgd2hpdGVzcGFjZSBvZmYgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIGEgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgU3RyaW5nIHRvIHRyaW1cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBTdHJpbmcgZnJlZWQgb2YgZXhjZXNzIHdoaXRlc3BhY2VcbiAqL1xuZnVuY3Rpb24gdHJpbShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzKi8sICcnKS5yZXBsYWNlKC9cXHMqJC8sICcnKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2UncmUgcnVubmluZyBpbiBhIHN0YW5kYXJkIGJyb3dzZXIgZW52aXJvbm1lbnRcbiAqXG4gKiBUaGlzIGFsbG93cyBheGlvcyB0byBydW4gaW4gYSB3ZWIgd29ya2VyLCBhbmQgcmVhY3QtbmF0aXZlLlxuICogQm90aCBlbnZpcm9ubWVudHMgc3VwcG9ydCBYTUxIdHRwUmVxdWVzdCwgYnV0IG5vdCBmdWxseSBzdGFuZGFyZCBnbG9iYWxzLlxuICpcbiAqIHdlYiB3b3JrZXJzOlxuICogIHR5cGVvZiB3aW5kb3cgLT4gdW5kZWZpbmVkXG4gKiAgdHlwZW9mIGRvY3VtZW50IC0+IHVuZGVmaW5lZFxuICpcbiAqIHJlYWN0LW5hdGl2ZTpcbiAqICBuYXZpZ2F0b3IucHJvZHVjdCAtPiAnUmVhY3ROYXRpdmUnXG4gKi9cbmZ1bmN0aW9uIGlzU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnByb2R1Y3QgPT09ICdSZWFjdE5hdGl2ZScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIChcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgKTtcbn1cblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gQXJyYXkgb3IgYW4gT2JqZWN0IGludm9raW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiBgb2JqYCBpcyBhbiBBcnJheSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXG4gKiB0aGUgdmFsdWUsIGluZGV4LCBhbmQgY29tcGxldGUgYXJyYXkgZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiAnb2JqJyBpcyBhbiBPYmplY3QgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBrZXksIGFuZCBjb21wbGV0ZSBvYmplY3QgZm9yIGVhY2ggcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iaiBUaGUgb2JqZWN0IHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbVxuICovXG5mdW5jdGlvbiBmb3JFYWNoKG9iaiwgZm4pIHtcbiAgLy8gRG9uJ3QgYm90aGVyIGlmIG5vIHZhbHVlIHByb3ZpZGVkXG4gIGlmIChvYmogPT09IG51bGwgfHwgdHlwZW9mIG9iaiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBGb3JjZSBhbiBhcnJheSBpZiBub3QgYWxyZWFkeSBzb21ldGhpbmcgaXRlcmFibGVcbiAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgb2JqID0gW29ial07XG4gIH1cblxuICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFycmF5IHZhbHVlc1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZm4uY2FsbChudWxsLCBvYmpbaV0sIGksIG9iaik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBvYmplY3Qga2V5c1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2tleV0sIGtleSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBY2NlcHRzIHZhcmFyZ3MgZXhwZWN0aW5nIGVhY2ggYXJndW1lbnQgdG8gYmUgYW4gb2JqZWN0LCB0aGVuXG4gKiBpbW11dGFibHkgbWVyZ2VzIHRoZSBwcm9wZXJ0aWVzIG9mIGVhY2ggb2JqZWN0IGFuZCByZXR1cm5zIHJlc3VsdC5cbiAqXG4gKiBXaGVuIG11bHRpcGxlIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBrZXkgdGhlIGxhdGVyIG9iamVjdCBpblxuICogdGhlIGFyZ3VtZW50cyBsaXN0IHdpbGwgdGFrZSBwcmVjZWRlbmNlLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIHZhciByZXN1bHQgPSBtZXJnZSh7Zm9vOiAxMjN9LCB7Zm9vOiA0NTZ9KTtcbiAqIGNvbnNvbGUubG9nKHJlc3VsdC5mb28pOyAvLyBvdXRwdXRzIDQ1NlxuICogYGBgXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iajEgT2JqZWN0IHRvIG1lcmdlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXN1bHQgb2YgYWxsIG1lcmdlIHByb3BlcnRpZXNcbiAqL1xuZnVuY3Rpb24gbWVyZ2UoLyogb2JqMSwgb2JqMiwgb2JqMywgLi4uICovKSB7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcbiAgICBpZiAodHlwZW9mIHJlc3VsdFtrZXldID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jykge1xuICAgICAgcmVzdWx0W2tleV0gPSBtZXJnZShyZXN1bHRba2V5XSwgdmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W2tleV0gPSB2YWw7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZm9yRWFjaChhcmd1bWVudHNbaV0sIGFzc2lnblZhbHVlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEV4dGVuZHMgb2JqZWN0IGEgYnkgbXV0YWJseSBhZGRpbmcgdG8gaXQgdGhlIHByb3BlcnRpZXMgb2Ygb2JqZWN0IGIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGEgVGhlIG9iamVjdCB0byBiZSBleHRlbmRlZFxuICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtPYmplY3R9IHRoaXNBcmcgVGhlIG9iamVjdCB0byBiaW5kIGZ1bmN0aW9uIHRvXG4gKiBAcmV0dXJuIHtPYmplY3R9IFRoZSByZXN1bHRpbmcgdmFsdWUgb2Ygb2JqZWN0IGFcbiAqL1xuZnVuY3Rpb24gZXh0ZW5kKGEsIGIsIHRoaXNBcmcpIHtcbiAgZm9yRWFjaChiLCBmdW5jdGlvbiBhc3NpZ25WYWx1ZSh2YWwsIGtleSkge1xuICAgIGlmICh0aGlzQXJnICYmIHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFba2V5XSA9IGJpbmQodmFsLCB0aGlzQXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYVtrZXldID0gdmFsO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBhO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNBcnJheTogaXNBcnJheSxcbiAgaXNBcnJheUJ1ZmZlcjogaXNBcnJheUJ1ZmZlcixcbiAgaXNCdWZmZXI6IGlzQnVmZmVyLFxuICBpc0Zvcm1EYXRhOiBpc0Zvcm1EYXRhLFxuICBpc0FycmF5QnVmZmVyVmlldzogaXNBcnJheUJ1ZmZlclZpZXcsXG4gIGlzU3RyaW5nOiBpc1N0cmluZyxcbiAgaXNOdW1iZXI6IGlzTnVtYmVyLFxuICBpc09iamVjdDogaXNPYmplY3QsXG4gIGlzVW5kZWZpbmVkOiBpc1VuZGVmaW5lZCxcbiAgaXNEYXRlOiBpc0RhdGUsXG4gIGlzRmlsZTogaXNGaWxlLFxuICBpc0Jsb2I6IGlzQmxvYixcbiAgaXNGdW5jdGlvbjogaXNGdW5jdGlvbixcbiAgaXNTdHJlYW06IGlzU3RyZWFtLFxuICBpc1VSTFNlYXJjaFBhcmFtczogaXNVUkxTZWFyY2hQYXJhbXMsXG4gIGlzU3RhbmRhcmRCcm93c2VyRW52OiBpc1N0YW5kYXJkQnJvd3NlckVudixcbiAgZm9yRWFjaDogZm9yRWFjaCxcbiAgbWVyZ2U6IG1lcmdlLFxuICBleHRlbmQ6IGV4dGVuZCxcbiAgdHJpbTogdHJpbVxufTtcbiIsIi8qIEBwcmVzZXJ2ZVxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxMy0yMDE3IFBldGthIEFudG9ub3ZcbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqIFxuICovXG4vKipcbiAqIGJsdWViaXJkIGJ1aWxkIHZlcnNpb24gMy41LjFcbiAqIEZlYXR1cmVzIGVuYWJsZWQ6IGNvcmUsIHJhY2UsIGNhbGxfZ2V0LCBnZW5lcmF0b3JzLCBtYXAsIG5vZGVpZnksIHByb21pc2lmeSwgcHJvcHMsIHJlZHVjZSwgc2V0dGxlLCBzb21lLCB1c2luZywgdGltZXJzLCBmaWx0ZXIsIGFueSwgZWFjaFxuKi9cbiFmdW5jdGlvbihlKXtpZihcIm9iamVjdFwiPT10eXBlb2YgZXhwb3J0cyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG1vZHVsZSltb2R1bGUuZXhwb3J0cz1lKCk7ZWxzZSBpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtdLGUpO2Vsc2V7dmFyIGY7XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz9mPXdpbmRvdzpcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsP2Y9Z2xvYmFsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZWxmJiYoZj1zZWxmKSxmLlByb21pc2U9ZSgpfX0oZnVuY3Rpb24oKXt2YXIgZGVmaW5lLG1vZHVsZSxleHBvcnRzO3JldHVybiAoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIF9kZXJlcV89PVwiZnVuY3Rpb25cIiYmX2RlcmVxXztpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgX2RlcmVxXz09XCJmdW5jdGlvblwiJiZfZGVyZXFfO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xudmFyIFNvbWVQcm9taXNlQXJyYXkgPSBQcm9taXNlLl9Tb21lUHJvbWlzZUFycmF5O1xuZnVuY3Rpb24gYW55KHByb21pc2VzKSB7XG4gICAgdmFyIHJldCA9IG5ldyBTb21lUHJvbWlzZUFycmF5KHByb21pc2VzKTtcbiAgICB2YXIgcHJvbWlzZSA9IHJldC5wcm9taXNlKCk7XG4gICAgcmV0LnNldEhvd01hbnkoMSk7XG4gICAgcmV0LnNldFVud3JhcCgpO1xuICAgIHJldC5pbml0KCk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cblByb21pc2UuYW55ID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIGFueShwcm9taXNlcyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5hbnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGFueSh0aGlzKTtcbn07XG5cbn07XG5cbn0se31dLDI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZmlyc3RMaW5lRXJyb3I7XG50cnkge3Rocm93IG5ldyBFcnJvcigpOyB9IGNhdGNoIChlKSB7Zmlyc3RMaW5lRXJyb3IgPSBlO31cbnZhciBzY2hlZHVsZSA9IF9kZXJlcV8oXCIuL3NjaGVkdWxlXCIpO1xudmFyIFF1ZXVlID0gX2RlcmVxXyhcIi4vcXVldWVcIik7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG5cbmZ1bmN0aW9uIEFzeW5jKCkge1xuICAgIHRoaXMuX2N1c3RvbVNjaGVkdWxlciA9IGZhbHNlO1xuICAgIHRoaXMuX2lzVGlja1VzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9sYXRlUXVldWUgPSBuZXcgUXVldWUoMTYpO1xuICAgIHRoaXMuX25vcm1hbFF1ZXVlID0gbmV3IFF1ZXVlKDE2KTtcbiAgICB0aGlzLl9oYXZlRHJhaW5lZFF1ZXVlcyA9IGZhbHNlO1xuICAgIHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkID0gdHJ1ZTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5kcmFpblF1ZXVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fZHJhaW5RdWV1ZXMoKTtcbiAgICB9O1xuICAgIHRoaXMuX3NjaGVkdWxlID0gc2NoZWR1bGU7XG59XG5cbkFzeW5jLnByb3RvdHlwZS5zZXRTY2hlZHVsZXIgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBwcmV2ID0gdGhpcy5fc2NoZWR1bGU7XG4gICAgdGhpcy5fc2NoZWR1bGUgPSBmbjtcbiAgICB0aGlzLl9jdXN0b21TY2hlZHVsZXIgPSB0cnVlO1xuICAgIHJldHVybiBwcmV2O1xufTtcblxuQXN5bmMucHJvdG90eXBlLmhhc0N1c3RvbVNjaGVkdWxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jdXN0b21TY2hlZHVsZXI7XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuZW5hYmxlVHJhbXBvbGluZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkID0gdHJ1ZTtcbn07XG5cbkFzeW5jLnByb3RvdHlwZS5kaXNhYmxlVHJhbXBvbGluZUlmTmVjZXNzYXJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHV0aWwuaGFzRGV2VG9vbHMpIHtcbiAgICAgICAgdGhpcy5fdHJhbXBvbGluZUVuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuaGF2ZUl0ZW1zUXVldWVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9pc1RpY2tVc2VkIHx8IHRoaXMuX2hhdmVEcmFpbmVkUXVldWVzO1xufTtcblxuXG5Bc3luYy5wcm90b3R5cGUuZmF0YWxFcnJvciA9IGZ1bmN0aW9uKGUsIGlzTm9kZSkge1xuICAgIGlmIChpc05vZGUpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXCJGYXRhbCBcIiArIChlIGluc3RhbmNlb2YgRXJyb3IgPyBlLnN0YWNrIDogZSkgK1xuICAgICAgICAgICAgXCJcXG5cIik7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRocm93TGF0ZXIoZSk7XG4gICAgfVxufTtcblxuQXN5bmMucHJvdG90eXBlLnRocm93TGF0ZXIgPSBmdW5jdGlvbihmbiwgYXJnKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgYXJnID0gZm47XG4gICAgICAgIGZuID0gZnVuY3Rpb24gKCkgeyB0aHJvdyBhcmc7IH07XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm4oYXJnKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSBlbHNlIHRyeSB7XG4gICAgICAgIHRoaXMuX3NjaGVkdWxlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm4oYXJnKTtcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBhc3luYyBzY2hlZHVsZXIgYXZhaWxhYmxlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBBc3luY0ludm9rZUxhdGVyKGZuLCByZWNlaXZlciwgYXJnKSB7XG4gICAgdGhpcy5fbGF0ZVF1ZXVlLnB1c2goZm4sIHJlY2VpdmVyLCBhcmcpO1xuICAgIHRoaXMuX3F1ZXVlVGljaygpO1xufVxuXG5mdW5jdGlvbiBBc3luY0ludm9rZShmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgIHRoaXMuX25vcm1hbFF1ZXVlLnB1c2goZm4sIHJlY2VpdmVyLCBhcmcpO1xuICAgIHRoaXMuX3F1ZXVlVGljaygpO1xufVxuXG5mdW5jdGlvbiBBc3luY1NldHRsZVByb21pc2VzKHByb21pc2UpIHtcbiAgICB0aGlzLl9ub3JtYWxRdWV1ZS5fcHVzaE9uZShwcm9taXNlKTtcbiAgICB0aGlzLl9xdWV1ZVRpY2soKTtcbn1cblxuaWYgKCF1dGlsLmhhc0RldlRvb2xzKSB7XG4gICAgQXN5bmMucHJvdG90eXBlLmludm9rZUxhdGVyID0gQXN5bmNJbnZva2VMYXRlcjtcbiAgICBBc3luYy5wcm90b3R5cGUuaW52b2tlID0gQXN5bmNJbnZva2U7XG4gICAgQXN5bmMucHJvdG90eXBlLnNldHRsZVByb21pc2VzID0gQXN5bmNTZXR0bGVQcm9taXNlcztcbn0gZWxzZSB7XG4gICAgQXN5bmMucHJvdG90eXBlLmludm9rZUxhdGVyID0gZnVuY3Rpb24gKGZuLCByZWNlaXZlciwgYXJnKSB7XG4gICAgICAgIGlmICh0aGlzLl90cmFtcG9saW5lRW5hYmxlZCkge1xuICAgICAgICAgICAgQXN5bmNJbnZva2VMYXRlci5jYWxsKHRoaXMsIGZuLCByZWNlaXZlciwgYXJnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuLmNhbGwocmVjZWl2ZXIsIGFyZyk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEFzeW5jLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbiAoZm4sIHJlY2VpdmVyLCBhcmcpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkKSB7XG4gICAgICAgICAgICBBc3luY0ludm9rZS5jYWxsKHRoaXMsIGZuLCByZWNlaXZlciwgYXJnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZuLmNhbGwocmVjZWl2ZXIsIGFyZyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBBc3luYy5wcm90b3R5cGUuc2V0dGxlUHJvbWlzZXMgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgICAgIGlmICh0aGlzLl90cmFtcG9saW5lRW5hYmxlZCkge1xuICAgICAgICAgICAgQXN5bmNTZXR0bGVQcm9taXNlcy5jYWxsKHRoaXMsIHByb21pc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2NoZWR1bGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcHJvbWlzZS5fc2V0dGxlUHJvbWlzZXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuQXN5bmMucHJvdG90eXBlLl9kcmFpblF1ZXVlID0gZnVuY3Rpb24ocXVldWUpIHtcbiAgICB3aGlsZSAocXVldWUubGVuZ3RoKCkgPiAwKSB7XG4gICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgZm4uX3NldHRsZVByb21pc2VzKCk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVjZWl2ZXIgPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICB2YXIgYXJnID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgZm4uY2FsbChyZWNlaXZlciwgYXJnKTtcbiAgICB9XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuX2RyYWluUXVldWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2RyYWluUXVldWUodGhpcy5fbm9ybWFsUXVldWUpO1xuICAgIHRoaXMuX3Jlc2V0KCk7XG4gICAgdGhpcy5faGF2ZURyYWluZWRRdWV1ZXMgPSB0cnVlO1xuICAgIHRoaXMuX2RyYWluUXVldWUodGhpcy5fbGF0ZVF1ZXVlKTtcbn07XG5cbkFzeW5jLnByb3RvdHlwZS5fcXVldWVUaWNrID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5faXNUaWNrVXNlZCkge1xuICAgICAgICB0aGlzLl9pc1RpY2tVc2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fc2NoZWR1bGUodGhpcy5kcmFpblF1ZXVlcyk7XG4gICAgfVxufTtcblxuQXN5bmMucHJvdG90eXBlLl9yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pc1RpY2tVc2VkID0gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFzeW5jO1xubW9kdWxlLmV4cG9ydHMuZmlyc3RMaW5lRXJyb3IgPSBmaXJzdExpbmVFcnJvcjtcblxufSx7XCIuL3F1ZXVlXCI6MjYsXCIuL3NjaGVkdWxlXCI6MjksXCIuL3V0aWxcIjozNn1dLDM6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBkZWJ1Zykge1xudmFyIGNhbGxlZEJpbmQgPSBmYWxzZTtcbnZhciByZWplY3RUaGlzID0gZnVuY3Rpb24oXywgZSkge1xuICAgIHRoaXMuX3JlamVjdChlKTtcbn07XG5cbnZhciB0YXJnZXRSZWplY3RlZCA9IGZ1bmN0aW9uKGUsIGNvbnRleHQpIHtcbiAgICBjb250ZXh0LnByb21pc2VSZWplY3Rpb25RdWV1ZWQgPSB0cnVlO1xuICAgIGNvbnRleHQuYmluZGluZ1Byb21pc2UuX3RoZW4ocmVqZWN0VGhpcywgcmVqZWN0VGhpcywgbnVsbCwgdGhpcywgZSk7XG59O1xuXG52YXIgYmluZGluZ1Jlc29sdmVkID0gZnVuY3Rpb24odGhpc0FyZywgY29udGV4dCkge1xuICAgIGlmICgoKHRoaXMuX2JpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICB0aGlzLl9yZXNvbHZlQ2FsbGJhY2soY29udGV4dC50YXJnZXQpO1xuICAgIH1cbn07XG5cbnZhciBiaW5kaW5nUmVqZWN0ZWQgPSBmdW5jdGlvbihlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFjb250ZXh0LnByb21pc2VSZWplY3Rpb25RdWV1ZWQpIHRoaXMuX3JlamVjdChlKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAodGhpc0FyZykge1xuICAgIGlmICghY2FsbGVkQmluZCkge1xuICAgICAgICBjYWxsZWRCaW5kID0gdHJ1ZTtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX3Byb3BhZ2F0ZUZyb20gPSBkZWJ1Zy5wcm9wYWdhdGVGcm9tRnVuY3Rpb24oKTtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2JvdW5kVmFsdWUgPSBkZWJ1Zy5ib3VuZFZhbHVlRnVuY3Rpb24oKTtcbiAgICB9XG4gICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UodGhpc0FyZyk7XG4gICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICByZXQuX3Byb3BhZ2F0ZUZyb20odGhpcywgMSk7XG4gICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldCgpO1xuICAgIHJldC5fc2V0Qm91bmRUbyhtYXliZVByb21pc2UpO1xuICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHZhciBjb250ZXh0ID0ge1xuICAgICAgICAgICAgcHJvbWlzZVJlamVjdGlvblF1ZXVlZDogZmFsc2UsXG4gICAgICAgICAgICBwcm9taXNlOiByZXQsXG4gICAgICAgICAgICB0YXJnZXQ6IHRhcmdldCxcbiAgICAgICAgICAgIGJpbmRpbmdQcm9taXNlOiBtYXliZVByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0Ll90aGVuKElOVEVSTkFMLCB0YXJnZXRSZWplY3RlZCwgdW5kZWZpbmVkLCByZXQsIGNvbnRleHQpO1xuICAgICAgICBtYXliZVByb21pc2UuX3RoZW4oXG4gICAgICAgICAgICBiaW5kaW5nUmVzb2x2ZWQsIGJpbmRpbmdSZWplY3RlZCwgdW5kZWZpbmVkLCByZXQsIGNvbnRleHQpO1xuICAgICAgICByZXQuX3NldE9uQ2FuY2VsKG1heWJlUHJvbWlzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0Ll9yZXNvbHZlQ2FsbGJhY2sodGFyZ2V0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRCb3VuZFRvID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGlmIChvYmogIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMjA5NzE1MjtcbiAgICAgICAgdGhpcy5fYm91bmRUbyA9IG9iajtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH4yMDk3MTUyKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faXNCb3VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMjA5NzE1MikgPT09IDIwOTcxNTI7XG59O1xuXG5Qcm9taXNlLmJpbmQgPSBmdW5jdGlvbiAodGhpc0FyZywgdmFsdWUpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS5iaW5kKHRoaXNBcmcpO1xufTtcbn07XG5cbn0se31dLDQ6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgb2xkO1xuaWYgKHR5cGVvZiBQcm9taXNlICE9PSBcInVuZGVmaW5lZFwiKSBvbGQgPSBQcm9taXNlO1xuZnVuY3Rpb24gbm9Db25mbGljdCgpIHtcbiAgICB0cnkgeyBpZiAoUHJvbWlzZSA9PT0gYmx1ZWJpcmQpIFByb21pc2UgPSBvbGQ7IH1cbiAgICBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gYmx1ZWJpcmQ7XG59XG52YXIgYmx1ZWJpcmQgPSBfZGVyZXFfKFwiLi9wcm9taXNlXCIpKCk7XG5ibHVlYmlyZC5ub0NvbmZsaWN0ID0gbm9Db25mbGljdDtcbm1vZHVsZS5leHBvcnRzID0gYmx1ZWJpcmQ7XG5cbn0se1wiLi9wcm9taXNlXCI6MjJ9XSw1OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIGNyID0gT2JqZWN0LmNyZWF0ZTtcbmlmIChjcikge1xuICAgIHZhciBjYWxsZXJDYWNoZSA9IGNyKG51bGwpO1xuICAgIHZhciBnZXR0ZXJDYWNoZSA9IGNyKG51bGwpO1xuICAgIGNhbGxlckNhY2hlW1wiIHNpemVcIl0gPSBnZXR0ZXJDYWNoZVtcIiBzaXplXCJdID0gMDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgY2FuRXZhbHVhdGUgPSB1dGlsLmNhbkV2YWx1YXRlO1xudmFyIGlzSWRlbnRpZmllciA9IHV0aWwuaXNJZGVudGlmaWVyO1xuXG52YXIgZ2V0TWV0aG9kQ2FsbGVyO1xudmFyIGdldEdldHRlcjtcbmlmICghdHJ1ZSkge1xudmFyIG1ha2VNZXRob2RDYWxsZXIgPSBmdW5jdGlvbiAobWV0aG9kTmFtZSkge1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJlbnN1cmVNZXRob2RcIiwgXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgJ3VzZSBzdHJpY3QnICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgZW5zdXJlTWV0aG9kKG9iaiwgJ21ldGhvZE5hbWUnKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgc3dpdGNoKGxlbikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGNhc2UgMTogcmV0dXJuIG9iai5tZXRob2ROYW1lKHRoaXNbMF0pOyAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIG9iai5tZXRob2ROYW1lKHRoaXNbMF0sIHRoaXNbMV0pOyAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGNhc2UgMzogcmV0dXJuIG9iai5tZXRob2ROYW1lKHRoaXNbMF0sIHRoaXNbMV0sIHRoaXNbMl0pOyAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGNhc2UgMDogcmV0dXJuIG9iai5tZXRob2ROYW1lKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqLm1ldGhvZE5hbWUuYXBwbHkob2JqLCB0aGlzKTsgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICB9OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIi5yZXBsYWNlKC9tZXRob2ROYW1lL2csIG1ldGhvZE5hbWUpKShlbnN1cmVNZXRob2QpO1xufTtcblxudmFyIG1ha2VHZXR0ZXIgPSBmdW5jdGlvbiAocHJvcGVydHlOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcIm9ialwiLCBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICd1c2Ugc3RyaWN0JzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgIHJldHVybiBvYmoucHJvcGVydHlOYW1lOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgIFwiLnJlcGxhY2UoXCJwcm9wZXJ0eU5hbWVcIiwgcHJvcGVydHlOYW1lKSk7XG59O1xuXG52YXIgZ2V0Q29tcGlsZWQgPSBmdW5jdGlvbihuYW1lLCBjb21waWxlciwgY2FjaGUpIHtcbiAgICB2YXIgcmV0ID0gY2FjaGVbbmFtZV07XG4gICAgaWYgKHR5cGVvZiByZXQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoIWlzSWRlbnRpZmllcihuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0ID0gY29tcGlsZXIobmFtZSk7XG4gICAgICAgIGNhY2hlW25hbWVdID0gcmV0O1xuICAgICAgICBjYWNoZVtcIiBzaXplXCJdKys7XG4gICAgICAgIGlmIChjYWNoZVtcIiBzaXplXCJdID4gNTEyKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGNhY2hlKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyArK2kpIGRlbGV0ZSBjYWNoZVtrZXlzW2ldXTtcbiAgICAgICAgICAgIGNhY2hlW1wiIHNpemVcIl0gPSBrZXlzLmxlbmd0aCAtIDI1NjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxuZ2V0TWV0aG9kQ2FsbGVyID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBnZXRDb21waWxlZChuYW1lLCBtYWtlTWV0aG9kQ2FsbGVyLCBjYWxsZXJDYWNoZSk7XG59O1xuXG5nZXRHZXR0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIGdldENvbXBpbGVkKG5hbWUsIG1ha2VHZXR0ZXIsIGdldHRlckNhY2hlKTtcbn07XG59XG5cbmZ1bmN0aW9uIGVuc3VyZU1ldGhvZChvYmosIG1ldGhvZE5hbWUpIHtcbiAgICB2YXIgZm47XG4gICAgaWYgKG9iaiAhPSBudWxsKSBmbiA9IG9ialttZXRob2ROYW1lXTtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBcIk9iamVjdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcob2JqKSArIFwiIGhhcyBubyBtZXRob2QgJ1wiICtcbiAgICAgICAgICAgIHV0aWwudG9TdHJpbmcobWV0aG9kTmFtZSkgKyBcIidcIjtcbiAgICAgICAgdGhyb3cgbmV3IFByb21pc2UuVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbiAgICByZXR1cm4gZm47XG59XG5cbmZ1bmN0aW9uIGNhbGxlcihvYmopIHtcbiAgICB2YXIgbWV0aG9kTmFtZSA9IHRoaXMucG9wKCk7XG4gICAgdmFyIGZuID0gZW5zdXJlTWV0aG9kKG9iaiwgbWV0aG9kTmFtZSk7XG4gICAgcmV0dXJuIGZuLmFwcGx5KG9iaiwgdGhpcyk7XG59XG5Qcm9taXNlLnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKG1ldGhvZE5hbWUpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTs7XG4gICAgaWYgKCF0cnVlKSB7XG4gICAgICAgIGlmIChjYW5FdmFsdWF0ZSkge1xuICAgICAgICAgICAgdmFyIG1heWJlQ2FsbGVyID0gZ2V0TWV0aG9kQ2FsbGVyKG1ldGhvZE5hbWUpO1xuICAgICAgICAgICAgaWYgKG1heWJlQ2FsbGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RoZW4oXG4gICAgICAgICAgICAgICAgICAgIG1heWJlQ2FsbGVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXJncywgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBhcmdzLnB1c2gobWV0aG9kTmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4oY2FsbGVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXJncywgdW5kZWZpbmVkKTtcbn07XG5cbmZ1bmN0aW9uIG5hbWVkR2V0dGVyKG9iaikge1xuICAgIHJldHVybiBvYmpbdGhpc107XG59XG5mdW5jdGlvbiBpbmRleGVkR2V0dGVyKG9iaikge1xuICAgIHZhciBpbmRleCA9ICt0aGlzO1xuICAgIGlmIChpbmRleCA8IDApIGluZGV4ID0gTWF0aC5tYXgoMCwgaW5kZXggKyBvYmoubGVuZ3RoKTtcbiAgICByZXR1cm4gb2JqW2luZGV4XTtcbn1cblByb21pc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwcm9wZXJ0eU5hbWUpIHtcbiAgICB2YXIgaXNJbmRleCA9ICh0eXBlb2YgcHJvcGVydHlOYW1lID09PSBcIm51bWJlclwiKTtcbiAgICB2YXIgZ2V0dGVyO1xuICAgIGlmICghaXNJbmRleCkge1xuICAgICAgICBpZiAoY2FuRXZhbHVhdGUpIHtcbiAgICAgICAgICAgIHZhciBtYXliZUdldHRlciA9IGdldEdldHRlcihwcm9wZXJ0eU5hbWUpO1xuICAgICAgICAgICAgZ2V0dGVyID0gbWF5YmVHZXR0ZXIgIT09IG51bGwgPyBtYXliZUdldHRlciA6IG5hbWVkR2V0dGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2V0dGVyID0gbmFtZWRHZXR0ZXI7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBnZXR0ZXIgPSBpbmRleGVkR2V0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdGhlbihnZXR0ZXIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwcm9wZXJ0eU5hbWUsIHVuZGVmaW5lZCk7XG59O1xufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIFByb21pc2VBcnJheSwgYXBpUmVqZWN0aW9uLCBkZWJ1Zykge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgYXN5bmMgPSBQcm9taXNlLl9hc3luYztcblxuUHJvbWlzZS5wcm90b3R5cGVbXCJicmVha1wiXSA9IFByb21pc2UucHJvdG90eXBlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghZGVidWcuY2FuY2VsbGF0aW9uKCkpIHJldHVybiB0aGlzLl93YXJuKFwiY2FuY2VsbGF0aW9uIGlzIGRpc2FibGVkXCIpO1xuXG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciBjaGlsZCA9IHByb21pc2U7XG4gICAgd2hpbGUgKHByb21pc2UuX2lzQ2FuY2VsbGFibGUoKSkge1xuICAgICAgICBpZiAoIXByb21pc2UuX2NhbmNlbEJ5KGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKGNoaWxkLl9pc0ZvbGxvd2luZygpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQuX2ZvbGxvd2VlKCkuY2FuY2VsKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNoaWxkLl9jYW5jZWxCcmFuY2hlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGFyZW50ID0gcHJvbWlzZS5fY2FuY2VsbGF0aW9uUGFyZW50O1xuICAgICAgICBpZiAocGFyZW50ID09IG51bGwgfHwgIXBhcmVudC5faXNDYW5jZWxsYWJsZSgpKSB7XG4gICAgICAgICAgICBpZiAocHJvbWlzZS5faXNGb2xsb3dpbmcoKSkge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX2ZvbGxvd2VlKCkuY2FuY2VsKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX2NhbmNlbEJyYW5jaGVkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChwcm9taXNlLl9pc0ZvbGxvd2luZygpKSBwcm9taXNlLl9mb2xsb3dlZSgpLmNhbmNlbCgpO1xuICAgICAgICAgICAgcHJvbWlzZS5fc2V0V2lsbEJlQ2FuY2VsbGVkKCk7XG4gICAgICAgICAgICBjaGlsZCA9IHByb21pc2U7XG4gICAgICAgICAgICBwcm9taXNlID0gcGFyZW50O1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2JyYW5jaEhhc0NhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2JyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwtLTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9lbm91Z2hCcmFuY2hlc0hhdmVDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fYnJhbmNoZXNSZW1haW5pbmdUb0NhbmNlbCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgIHRoaXMuX2JyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgPD0gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9jYW5jZWxCeSA9IGZ1bmN0aW9uKGNhbmNlbGxlcikge1xuICAgIGlmIChjYW5jZWxsZXIgPT09IHRoaXMpIHtcbiAgICAgICAgdGhpcy5fYnJhbmNoZXNSZW1haW5pbmdUb0NhbmNlbCA9IDA7XG4gICAgICAgIHRoaXMuX2ludm9rZU9uQ2FuY2VsKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2JyYW5jaEhhc0NhbmNlbGxlZCgpO1xuICAgICAgICBpZiAodGhpcy5fZW5vdWdoQnJhbmNoZXNIYXZlQ2FuY2VsbGVkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2ludm9rZU9uQ2FuY2VsKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fY2FuY2VsQnJhbmNoZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fZW5vdWdoQnJhbmNoZXNIYXZlQ2FuY2VsbGVkKCkpIHtcbiAgICAgICAgdGhpcy5fY2FuY2VsKCk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5faXNDYW5jZWxsYWJsZSgpKSByZXR1cm47XG4gICAgdGhpcy5fc2V0Q2FuY2VsbGVkKCk7XG4gICAgYXN5bmMuaW52b2tlKHRoaXMuX2NhbmNlbFByb21pc2VzLCB0aGlzLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NhbmNlbFByb21pc2VzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2xlbmd0aCgpID4gMCkgdGhpcy5fc2V0dGxlUHJvbWlzZXMoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl91bnNldE9uQ2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fb25DYW5jZWxGaWVsZCA9IHVuZGVmaW5lZDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc0NhbmNlbGxhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNQZW5kaW5nKCkgJiYgIXRoaXMuX2lzQ2FuY2VsbGVkKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0NhbmNlbGxhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNQZW5kaW5nKCkgJiYgIXRoaXMuaXNDYW5jZWxsZWQoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9kb0ludm9rZU9uQ2FuY2VsID0gZnVuY3Rpb24ob25DYW5jZWxDYWxsYmFjaywgaW50ZXJuYWxPbmx5KSB7XG4gICAgaWYgKHV0aWwuaXNBcnJheShvbkNhbmNlbENhbGxiYWNrKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9uQ2FuY2VsQ2FsbGJhY2subGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHRoaXMuX2RvSW52b2tlT25DYW5jZWwob25DYW5jZWxDYWxsYmFja1tpXSwgaW50ZXJuYWxPbmx5KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAob25DYW5jZWxDYWxsYmFjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb25DYW5jZWxDYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBpZiAoIWludGVybmFsT25seSkge1xuICAgICAgICAgICAgICAgIHZhciBlID0gdHJ5Q2F0Y2gob25DYW5jZWxDYWxsYmFjaykuY2FsbCh0aGlzLl9ib3VuZFZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChlID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9hdHRhY2hFeHRyYVRyYWNlKGUuZSk7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZS5lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvbkNhbmNlbENhbGxiYWNrLl9yZXN1bHRDYW5jZWxsZWQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faW52b2tlT25DYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb25DYW5jZWxDYWxsYmFjayA9IHRoaXMuX29uQ2FuY2VsKCk7XG4gICAgdGhpcy5fdW5zZXRPbkNhbmNlbCgpO1xuICAgIGFzeW5jLmludm9rZSh0aGlzLl9kb0ludm9rZU9uQ2FuY2VsLCB0aGlzLCBvbkNhbmNlbENhbGxiYWNrKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pbnZva2VJbnRlcm5hbE9uQ2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2lzQ2FuY2VsbGFibGUoKSkge1xuICAgICAgICB0aGlzLl9kb0ludm9rZU9uQ2FuY2VsKHRoaXMuX29uQ2FuY2VsKCksIHRydWUpO1xuICAgICAgICB0aGlzLl91bnNldE9uQ2FuY2VsKCk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Jlc3VsdENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY2FuY2VsKCk7XG59O1xuXG59O1xuXG59LHtcIi4vdXRpbFwiOjM2fV0sNzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oTkVYVF9GSUxURVIpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBnZXRLZXlzID0gX2RlcmVxXyhcIi4vZXM1XCIpLmtleXM7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIGVycm9yT2JqID0gdXRpbC5lcnJvck9iajtcblxuZnVuY3Rpb24gY2F0Y2hGaWx0ZXIoaW5zdGFuY2VzLCBjYiwgcHJvbWlzZSkge1xuICAgIHJldHVybiBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBib3VuZFRvID0gcHJvbWlzZS5fYm91bmRWYWx1ZSgpO1xuICAgICAgICBwcmVkaWNhdGVMb29wOiBmb3IgKHZhciBpID0gMDsgaSA8IGluc3RhbmNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBpbnN0YW5jZXNbaV07XG5cbiAgICAgICAgICAgIGlmIChpdGVtID09PSBFcnJvciB8fFxuICAgICAgICAgICAgICAgIChpdGVtICE9IG51bGwgJiYgaXRlbS5wcm90b3R5cGUgaW5zdGFuY2VvZiBFcnJvcikpIHtcbiAgICAgICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRyeUNhdGNoKGNiKS5jYWxsKGJvdW5kVG8sIGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzUHJlZGljYXRlID0gdHJ5Q2F0Y2goaXRlbSkuY2FsbChib3VuZFRvLCBlKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlc1ByZWRpY2F0ZSA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoZXNQcmVkaWNhdGU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaGVzUHJlZGljYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnlDYXRjaChjYikuY2FsbChib3VuZFRvLCBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHV0aWwuaXNPYmplY3QoZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5cyA9IGdldEtleXMoaXRlbSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbVtrZXldICE9IGVba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgcHJlZGljYXRlTG9vcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ5Q2F0Y2goY2IpLmNhbGwoYm91bmRUbywgZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5FWFRfRklMVEVSO1xuICAgIH07XG59XG5cbnJldHVybiBjYXRjaEZpbHRlcjtcbn07XG5cbn0se1wiLi9lczVcIjoxMyxcIi4vdXRpbFwiOjM2fV0sODpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xudmFyIGxvbmdTdGFja1RyYWNlcyA9IGZhbHNlO1xudmFyIGNvbnRleHRTdGFjayA9IFtdO1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcHJvbWlzZUNyZWF0ZWQgPSBmdW5jdGlvbigpIHt9O1xuUHJvbWlzZS5wcm90b3R5cGUuX3B1c2hDb250ZXh0ID0gZnVuY3Rpb24oKSB7fTtcblByb21pc2UucHJvdG90eXBlLl9wb3BDb250ZXh0ID0gZnVuY3Rpb24oKSB7cmV0dXJuIG51bGw7fTtcblByb21pc2UuX3BlZWtDb250ZXh0ID0gUHJvbWlzZS5wcm90b3R5cGUuX3BlZWtDb250ZXh0ID0gZnVuY3Rpb24oKSB7fTtcblxuZnVuY3Rpb24gQ29udGV4dCgpIHtcbiAgICB0aGlzLl90cmFjZSA9IG5ldyBDb250ZXh0LkNhcHR1cmVkVHJhY2UocGVla0NvbnRleHQoKSk7XG59XG5Db250ZXh0LnByb3RvdHlwZS5fcHVzaENvbnRleHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX3RyYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fdHJhY2UuX3Byb21pc2VDcmVhdGVkID0gbnVsbDtcbiAgICAgICAgY29udGV4dFN0YWNrLnB1c2godGhpcy5fdHJhY2UpO1xuICAgIH1cbn07XG5cbkNvbnRleHQucHJvdG90eXBlLl9wb3BDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl90cmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciB0cmFjZSA9IGNvbnRleHRTdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIHJldCA9IHRyYWNlLl9wcm9taXNlQ3JlYXRlZDtcbiAgICAgICAgdHJhY2UuX3Byb21pc2VDcmVhdGVkID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVDb250ZXh0KCkge1xuICAgIGlmIChsb25nU3RhY2tUcmFjZXMpIHJldHVybiBuZXcgQ29udGV4dCgpO1xufVxuXG5mdW5jdGlvbiBwZWVrQ29udGV4dCgpIHtcbiAgICB2YXIgbGFzdEluZGV4ID0gY29udGV4dFN0YWNrLmxlbmd0aCAtIDE7XG4gICAgaWYgKGxhc3RJbmRleCA+PSAwKSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0U3RhY2tbbGFzdEluZGV4XTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbkNvbnRleHQuQ2FwdHVyZWRUcmFjZSA9IG51bGw7XG5Db250ZXh0LmNyZWF0ZSA9IGNyZWF0ZUNvbnRleHQ7XG5Db250ZXh0LmRlYWN0aXZhdGVMb25nU3RhY2tUcmFjZXMgPSBmdW5jdGlvbigpIHt9O1xuQ29udGV4dC5hY3RpdmF0ZUxvbmdTdGFja1RyYWNlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBQcm9taXNlX3B1c2hDb250ZXh0ID0gUHJvbWlzZS5wcm90b3R5cGUuX3B1c2hDb250ZXh0O1xuICAgIHZhciBQcm9taXNlX3BvcENvbnRleHQgPSBQcm9taXNlLnByb3RvdHlwZS5fcG9wQ29udGV4dDtcbiAgICB2YXIgUHJvbWlzZV9QZWVrQ29udGV4dCA9IFByb21pc2UuX3BlZWtDb250ZXh0O1xuICAgIHZhciBQcm9taXNlX3BlZWtDb250ZXh0ID0gUHJvbWlzZS5wcm90b3R5cGUuX3BlZWtDb250ZXh0O1xuICAgIHZhciBQcm9taXNlX3Byb21pc2VDcmVhdGVkID0gUHJvbWlzZS5wcm90b3R5cGUuX3Byb21pc2VDcmVhdGVkO1xuICAgIENvbnRleHQuZGVhY3RpdmF0ZUxvbmdTdGFja1RyYWNlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fcHVzaENvbnRleHQgPSBQcm9taXNlX3B1c2hDb250ZXh0O1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fcG9wQ29udGV4dCA9IFByb21pc2VfcG9wQ29udGV4dDtcbiAgICAgICAgUHJvbWlzZS5fcGVla0NvbnRleHQgPSBQcm9taXNlX1BlZWtDb250ZXh0O1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fcGVla0NvbnRleHQgPSBQcm9taXNlX3BlZWtDb250ZXh0O1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fcHJvbWlzZUNyZWF0ZWQgPSBQcm9taXNlX3Byb21pc2VDcmVhdGVkO1xuICAgICAgICBsb25nU3RhY2tUcmFjZXMgPSBmYWxzZTtcbiAgICB9O1xuICAgIGxvbmdTdGFja1RyYWNlcyA9IHRydWU7XG4gICAgUHJvbWlzZS5wcm90b3R5cGUuX3B1c2hDb250ZXh0ID0gQ29udGV4dC5wcm90b3R5cGUuX3B1c2hDb250ZXh0O1xuICAgIFByb21pc2UucHJvdG90eXBlLl9wb3BDb250ZXh0ID0gQ29udGV4dC5wcm90b3R5cGUuX3BvcENvbnRleHQ7XG4gICAgUHJvbWlzZS5fcGVla0NvbnRleHQgPSBQcm9taXNlLnByb3RvdHlwZS5fcGVla0NvbnRleHQgPSBwZWVrQ29udGV4dDtcbiAgICBQcm9taXNlLnByb3RvdHlwZS5fcHJvbWlzZUNyZWF0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGN0eCA9IHRoaXMuX3BlZWtDb250ZXh0KCk7XG4gICAgICAgIGlmIChjdHggJiYgY3R4Ll9wcm9taXNlQ3JlYXRlZCA9PSBudWxsKSBjdHguX3Byb21pc2VDcmVhdGVkID0gdGhpcztcbiAgICB9O1xufTtcbnJldHVybiBDb250ZXh0O1xufTtcblxufSx7fV0sOTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgQ29udGV4dCkge1xudmFyIGdldERvbWFpbiA9IFByb21pc2UuX2dldERvbWFpbjtcbnZhciBhc3luYyA9IFByb21pc2UuX2FzeW5jO1xudmFyIFdhcm5pbmcgPSBfZGVyZXFfKFwiLi9lcnJvcnNcIikuV2FybmluZztcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBjYW5BdHRhY2hUcmFjZSA9IHV0aWwuY2FuQXR0YWNoVHJhY2U7XG52YXIgdW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZDtcbnZhciBwb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbjtcbnZhciBibHVlYmlyZEZyYW1lUGF0dGVybiA9XG4gICAgL1tcXFxcXFwvXWJsdWViaXJkW1xcXFxcXC9danNbXFxcXFxcL10ocmVsZWFzZXxkZWJ1Z3xpbnN0cnVtZW50ZWQpLztcbnZhciBub2RlRnJhbWVQYXR0ZXJuID0gL1xcKCg/OnRpbWVyc1xcLmpzKTpcXGQrOlxcZCtcXCkvO1xudmFyIHBhcnNlTGluZVBhdHRlcm4gPSAvW1xcLzxcXChdKC4rPyk6KFxcZCspOihcXGQrKVxcKT9cXHMqJC87XG52YXIgc3RhY2tGcmFtZVBhdHRlcm4gPSBudWxsO1xudmFyIGZvcm1hdFN0YWNrID0gbnVsbDtcbnZhciBpbmRlbnRTdGFja0ZyYW1lcyA9IGZhbHNlO1xudmFyIHByaW50V2FybmluZztcbnZhciBkZWJ1Z2dpbmcgPSAhISh1dGlsLmVudihcIkJMVUVCSVJEX0RFQlVHXCIpICE9IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICh0cnVlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC5lbnYoXCJCTFVFQklSRF9ERUJVR1wiKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwuZW52KFwiTk9ERV9FTlZcIikgPT09IFwiZGV2ZWxvcG1lbnRcIikpO1xuXG52YXIgd2FybmluZ3MgPSAhISh1dGlsLmVudihcIkJMVUVCSVJEX1dBUk5JTkdTXCIpICE9IDAgJiZcbiAgICAoZGVidWdnaW5nIHx8IHV0aWwuZW52KFwiQkxVRUJJUkRfV0FSTklOR1NcIikpKTtcblxudmFyIGxvbmdTdGFja1RyYWNlcyA9ICEhKHV0aWwuZW52KFwiQkxVRUJJUkRfTE9OR19TVEFDS19UUkFDRVNcIikgIT0gMCAmJlxuICAgIChkZWJ1Z2dpbmcgfHwgdXRpbC5lbnYoXCJCTFVFQklSRF9MT05HX1NUQUNLX1RSQUNFU1wiKSkpO1xuXG52YXIgd0ZvcmdvdHRlblJldHVybiA9IHV0aWwuZW52KFwiQkxVRUJJUkRfV19GT1JHT1RURU5fUkVUVVJOXCIpICE9IDAgJiZcbiAgICAod2FybmluZ3MgfHwgISF1dGlsLmVudihcIkJMVUVCSVJEX1dfRk9SR09UVEVOX1JFVFVSTlwiKSk7XG5cblByb21pc2UucHJvdG90eXBlLnN1cHByZXNzVW5oYW5kbGVkUmVqZWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXQoKTtcbiAgICB0YXJnZXQuX2JpdEZpZWxkID0gKCh0YXJnZXQuX2JpdEZpZWxkICYgKH4xMDQ4NTc2KSkgfFxuICAgICAgICAgICAgICAgICAgICAgIDUyNDI4OCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZW5zdXJlUG9zc2libGVSZWplY3Rpb25IYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICgodGhpcy5fYml0RmllbGQgJiA1MjQyODgpICE9PSAwKSByZXR1cm47XG4gICAgdGhpcy5fc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uKCk7XG4gICAgfSwgMSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uSXNIYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIGZpcmVSZWplY3Rpb25FdmVudChcInJlamVjdGlvbkhhbmRsZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkLCB1bmRlZmluZWQsIHRoaXMpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldFJldHVybmVkTm9uVW5kZWZpbmVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDI2ODQzNTQ1Njtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZXR1cm5lZE5vblVuZGVmaW5lZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAyNjg0MzU0NTYpICE9PSAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX25vdGlmeVVuaGFuZGxlZFJlamVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5faXNSZWplY3Rpb25VbmhhbmRsZWQoKSkge1xuICAgICAgICB2YXIgcmVhc29uID0gdGhpcy5fc2V0dGxlZFZhbHVlKCk7XG4gICAgICAgIHRoaXMuX3NldFVuaGFuZGxlZFJlamVjdGlvbklzTm90aWZpZWQoKTtcbiAgICAgICAgZmlyZVJlamVjdGlvbkV2ZW50KFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc3NpYmx5VW5oYW5kbGVkUmVqZWN0aW9uLCByZWFzb24sIHRoaXMpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRVbmhhbmRsZWRSZWplY3Rpb25Jc05vdGlmaWVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAyNjIxNDQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fdW5zZXRVbmhhbmRsZWRSZWplY3Rpb25Jc05vdGlmaWVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgJiAofjI2MjE0NCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faXNVbmhhbmRsZWRSZWplY3Rpb25Ob3RpZmllZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMjYyMTQ0KSA+IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDEwNDg1NzY7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fdW5zZXRSZWplY3Rpb25Jc1VuaGFuZGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH4xMDQ4NTc2KTtcbiAgICBpZiAodGhpcy5faXNVbmhhbmRsZWRSZWplY3Rpb25Ob3RpZmllZCgpKSB7XG4gICAgICAgIHRoaXMuX3Vuc2V0VW5oYW5kbGVkUmVqZWN0aW9uSXNOb3RpZmllZCgpO1xuICAgICAgICB0aGlzLl9ub3RpZnlVbmhhbmRsZWRSZWplY3Rpb25Jc0hhbmRsZWQoKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faXNSZWplY3Rpb25VbmhhbmRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDEwNDg1NzYpID4gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl93YXJuID0gZnVuY3Rpb24obWVzc2FnZSwgc2hvdWxkVXNlT3duVHJhY2UsIHByb21pc2UpIHtcbiAgICByZXR1cm4gd2FybihtZXNzYWdlLCBzaG91bGRVc2VPd25UcmFjZSwgcHJvbWlzZSB8fCB0aGlzKTtcbn07XG5cblByb21pc2Uub25Qb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICBwb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbiA9XG4gICAgICAgIHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gKGRvbWFpbiA9PT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuIDogdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgZm4pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG59O1xuXG5Qcm9taXNlLm9uVW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICB1bmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkID1cbiAgICAgICAgdHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIgPyAoZG9tYWluID09PSBudWxsID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm4gOiB1dGlsLmRvbWFpbkJpbmQoZG9tYWluLCBmbikpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZDtcbn07XG5cbnZhciBkaXNhYmxlTG9uZ1N0YWNrVHJhY2VzID0gZnVuY3Rpb24oKSB7fTtcblByb21pc2UubG9uZ1N0YWNrVHJhY2VzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChhc3luYy5oYXZlSXRlbXNRdWV1ZWQoKSAmJiAhY29uZmlnLmxvbmdTdGFja1RyYWNlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYW5ub3QgZW5hYmxlIGxvbmcgc3RhY2sgdHJhY2VzIGFmdGVyIHByb21pc2VzIGhhdmUgYmVlbiBjcmVhdGVkXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgaWYgKCFjb25maWcubG9uZ1N0YWNrVHJhY2VzICYmIGxvbmdTdGFja1RyYWNlc0lzU3VwcG9ydGVkKCkpIHtcbiAgICAgICAgdmFyIFByb21pc2VfY2FwdHVyZVN0YWNrVHJhY2UgPSBQcm9taXNlLnByb3RvdHlwZS5fY2FwdHVyZVN0YWNrVHJhY2U7XG4gICAgICAgIHZhciBQcm9taXNlX2F0dGFjaEV4dHJhVHJhY2UgPSBQcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoRXh0cmFUcmFjZTtcbiAgICAgICAgY29uZmlnLmxvbmdTdGFja1RyYWNlcyA9IHRydWU7XG4gICAgICAgIGRpc2FibGVMb25nU3RhY2tUcmFjZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChhc3luYy5oYXZlSXRlbXNRdWV1ZWQoKSAmJiAhY29uZmlnLmxvbmdTdGFja1RyYWNlcykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhbm5vdCBlbmFibGUgbG9uZyBzdGFjayB0cmFjZXMgYWZ0ZXIgcHJvbWlzZXMgaGF2ZSBiZWVuIGNyZWF0ZWRcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2NhcHR1cmVTdGFja1RyYWNlID0gUHJvbWlzZV9jYXB0dXJlU3RhY2tUcmFjZTtcbiAgICAgICAgICAgIFByb21pc2UucHJvdG90eXBlLl9hdHRhY2hFeHRyYVRyYWNlID0gUHJvbWlzZV9hdHRhY2hFeHRyYVRyYWNlO1xuICAgICAgICAgICAgQ29udGV4dC5kZWFjdGl2YXRlTG9uZ1N0YWNrVHJhY2VzKCk7XG4gICAgICAgICAgICBhc3luYy5lbmFibGVUcmFtcG9saW5lKCk7XG4gICAgICAgICAgICBjb25maWcubG9uZ1N0YWNrVHJhY2VzID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9jYXB0dXJlU3RhY2tUcmFjZSA9IGxvbmdTdGFja1RyYWNlc0NhcHR1cmVTdGFja1RyYWNlO1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoRXh0cmFUcmFjZSA9IGxvbmdTdGFja1RyYWNlc0F0dGFjaEV4dHJhVHJhY2U7XG4gICAgICAgIENvbnRleHQuYWN0aXZhdGVMb25nU3RhY2tUcmFjZXMoKTtcbiAgICAgICAgYXN5bmMuZGlzYWJsZVRyYW1wb2xpbmVJZk5lY2Vzc2FyeSgpO1xuICAgIH1cbn07XG5cblByb21pc2UuaGFzTG9uZ1N0YWNrVHJhY2VzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBjb25maWcubG9uZ1N0YWNrVHJhY2VzICYmIGxvbmdTdGFja1RyYWNlc0lzU3VwcG9ydGVkKCk7XG59O1xuXG52YXIgZmlyZURvbUV2ZW50ID0gKGZ1bmN0aW9uKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgQ3VzdG9tRXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gICAgICAgICAgICB1dGlsLmdsb2JhbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihuYW1lLCBldmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBkb21FdmVudCA9IG5ldyBDdXN0b21FdmVudChuYW1lLnRvTG93ZXJDYXNlKCksIHtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBldmVudCxcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbC5nbG9iYWwuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBFdmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcbiAgICAgICAgICAgIHV0aWwuZ2xvYmFsLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUsIGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvbUV2ZW50ID0gbmV3IEV2ZW50KG5hbWUudG9Mb3dlckNhc2UoKSwge1xuICAgICAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZG9tRXZlbnQuZGV0YWlsID0gZXZlbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuICF1dGlsLmdsb2JhbC5kaXNwYXRjaEV2ZW50KGRvbUV2ZW50KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEN1c3RvbUV2ZW50KFwidGVzdGluZ3RoZWV2ZW50XCIsIGZhbHNlLCB0cnVlLCB7fSk7XG4gICAgICAgICAgICB1dGlsLmdsb2JhbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihuYW1lLCBldmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBkb21FdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gICAgICAgICAgICAgICAgZG9tRXZlbnQuaW5pdEN1c3RvbUV2ZW50KG5hbWUudG9Mb3dlckNhc2UoKSwgZmFsc2UsIHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWwuZ2xvYmFsLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbn0pKCk7XG5cbnZhciBmaXJlR2xvYmFsRXZlbnQgPSAoZnVuY3Rpb24oKSB7XG4gICAgaWYgKHV0aWwuaXNOb2RlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9jZXNzLmVtaXQuYXBwbHkocHJvY2VzcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXV0aWwuZ2xvYmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBcIm9uXCIgKyBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gdXRpbC5nbG9iYWxbbWV0aG9kTmFtZV07XG4gICAgICAgICAgICBpZiAoIW1ldGhvZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgbWV0aG9kLmFwcGx5KHV0aWwuZ2xvYmFsLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG4gICAgfVxufSkoKTtcblxuZnVuY3Rpb24gZ2VuZXJhdGVQcm9taXNlTGlmZWN5Y2xlRXZlbnRPYmplY3QobmFtZSwgcHJvbWlzZSkge1xuICAgIHJldHVybiB7cHJvbWlzZTogcHJvbWlzZX07XG59XG5cbnZhciBldmVudFRvT2JqZWN0R2VuZXJhdG9yID0ge1xuICAgIHByb21pc2VDcmVhdGVkOiBnZW5lcmF0ZVByb21pc2VMaWZlY3ljbGVFdmVudE9iamVjdCxcbiAgICBwcm9taXNlRnVsZmlsbGVkOiBnZW5lcmF0ZVByb21pc2VMaWZlY3ljbGVFdmVudE9iamVjdCxcbiAgICBwcm9taXNlUmVqZWN0ZWQ6IGdlbmVyYXRlUHJvbWlzZUxpZmVjeWNsZUV2ZW50T2JqZWN0LFxuICAgIHByb21pc2VSZXNvbHZlZDogZ2VuZXJhdGVQcm9taXNlTGlmZWN5Y2xlRXZlbnRPYmplY3QsXG4gICAgcHJvbWlzZUNhbmNlbGxlZDogZ2VuZXJhdGVQcm9taXNlTGlmZWN5Y2xlRXZlbnRPYmplY3QsXG4gICAgcHJvbWlzZUNoYWluZWQ6IGZ1bmN0aW9uKG5hbWUsIHByb21pc2UsIGNoaWxkKSB7XG4gICAgICAgIHJldHVybiB7cHJvbWlzZTogcHJvbWlzZSwgY2hpbGQ6IGNoaWxkfTtcbiAgICB9LFxuICAgIHdhcm5pbmc6IGZ1bmN0aW9uKG5hbWUsIHdhcm5pbmcpIHtcbiAgICAgICAgcmV0dXJuIHt3YXJuaW5nOiB3YXJuaW5nfTtcbiAgICB9LFxuICAgIHVuaGFuZGxlZFJlamVjdGlvbjogZnVuY3Rpb24gKG5hbWUsIHJlYXNvbiwgcHJvbWlzZSkge1xuICAgICAgICByZXR1cm4ge3JlYXNvbjogcmVhc29uLCBwcm9taXNlOiBwcm9taXNlfTtcbiAgICB9LFxuICAgIHJlamVjdGlvbkhhbmRsZWQ6IGdlbmVyYXRlUHJvbWlzZUxpZmVjeWNsZUV2ZW50T2JqZWN0XG59O1xuXG52YXIgYWN0aXZlRmlyZUV2ZW50ID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgZ2xvYmFsRXZlbnRGaXJlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICAgIGdsb2JhbEV2ZW50RmlyZWQgPSBmaXJlR2xvYmFsRXZlbnQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZSk7XG4gICAgICAgIGdsb2JhbEV2ZW50RmlyZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHZhciBkb21FdmVudEZpcmVkID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgICAgZG9tRXZlbnRGaXJlZCA9IGZpcmVEb21FdmVudChuYW1lLFxuICAgICAgICAgICAgICAgICAgICBldmVudFRvT2JqZWN0R2VuZXJhdG9yW25hbWVdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgYXN5bmMudGhyb3dMYXRlcihlKTtcbiAgICAgICAgZG9tRXZlbnRGaXJlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvbUV2ZW50RmlyZWQgfHwgZ2xvYmFsRXZlbnRGaXJlZDtcbn07XG5cblByb21pc2UuY29uZmlnID0gZnVuY3Rpb24ob3B0cykge1xuICAgIG9wdHMgPSBPYmplY3Qob3B0cyk7XG4gICAgaWYgKFwibG9uZ1N0YWNrVHJhY2VzXCIgaW4gb3B0cykge1xuICAgICAgICBpZiAob3B0cy5sb25nU3RhY2tUcmFjZXMpIHtcbiAgICAgICAgICAgIFByb21pc2UubG9uZ1N0YWNrVHJhY2VzKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIW9wdHMubG9uZ1N0YWNrVHJhY2VzICYmIFByb21pc2UuaGFzTG9uZ1N0YWNrVHJhY2VzKCkpIHtcbiAgICAgICAgICAgIGRpc2FibGVMb25nU3RhY2tUcmFjZXMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoXCJ3YXJuaW5nc1wiIGluIG9wdHMpIHtcbiAgICAgICAgdmFyIHdhcm5pbmdzT3B0aW9uID0gb3B0cy53YXJuaW5ncztcbiAgICAgICAgY29uZmlnLndhcm5pbmdzID0gISF3YXJuaW5nc09wdGlvbjtcbiAgICAgICAgd0ZvcmdvdHRlblJldHVybiA9IGNvbmZpZy53YXJuaW5ncztcblxuICAgICAgICBpZiAodXRpbC5pc09iamVjdCh3YXJuaW5nc09wdGlvbikpIHtcbiAgICAgICAgICAgIGlmIChcIndGb3Jnb3R0ZW5SZXR1cm5cIiBpbiB3YXJuaW5nc09wdGlvbikge1xuICAgICAgICAgICAgICAgIHdGb3Jnb3R0ZW5SZXR1cm4gPSAhIXdhcm5pbmdzT3B0aW9uLndGb3Jnb3R0ZW5SZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKFwiY2FuY2VsbGF0aW9uXCIgaW4gb3B0cyAmJiBvcHRzLmNhbmNlbGxhdGlvbiAmJiAhY29uZmlnLmNhbmNlbGxhdGlvbikge1xuICAgICAgICBpZiAoYXN5bmMuaGF2ZUl0ZW1zUXVldWVkKCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcImNhbm5vdCBlbmFibGUgY2FuY2VsbGF0aW9uIGFmdGVyIHByb21pc2VzIGFyZSBpbiB1c2VcIik7XG4gICAgICAgIH1cbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2NsZWFyQ2FuY2VsbGF0aW9uRGF0YSA9XG4gICAgICAgICAgICBjYW5jZWxsYXRpb25DbGVhckNhbmNlbGxhdGlvbkRhdGE7XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9wcm9wYWdhdGVGcm9tID0gY2FuY2VsbGF0aW9uUHJvcGFnYXRlRnJvbTtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX29uQ2FuY2VsID0gY2FuY2VsbGF0aW9uT25DYW5jZWw7XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9zZXRPbkNhbmNlbCA9IGNhbmNlbGxhdGlvblNldE9uQ2FuY2VsO1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2sgPVxuICAgICAgICAgICAgY2FuY2VsbGF0aW9uQXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2s7XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9leGVjdXRlID0gY2FuY2VsbGF0aW9uRXhlY3V0ZTtcbiAgICAgICAgcHJvcGFnYXRlRnJvbUZ1bmN0aW9uID0gY2FuY2VsbGF0aW9uUHJvcGFnYXRlRnJvbTtcbiAgICAgICAgY29uZmlnLmNhbmNlbGxhdGlvbiA9IHRydWU7XG4gICAgfVxuICAgIGlmIChcIm1vbml0b3JpbmdcIiBpbiBvcHRzKSB7XG4gICAgICAgIGlmIChvcHRzLm1vbml0b3JpbmcgJiYgIWNvbmZpZy5tb25pdG9yaW5nKSB7XG4gICAgICAgICAgICBjb25maWcubW9uaXRvcmluZyA9IHRydWU7XG4gICAgICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fZmlyZUV2ZW50ID0gYWN0aXZlRmlyZUV2ZW50O1xuICAgICAgICB9IGVsc2UgaWYgKCFvcHRzLm1vbml0b3JpbmcgJiYgY29uZmlnLm1vbml0b3JpbmcpIHtcbiAgICAgICAgICAgIGNvbmZpZy5tb25pdG9yaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fZmlyZUV2ZW50ID0gZGVmYXVsdEZpcmVFdmVudDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZTtcbn07XG5cbmZ1bmN0aW9uIGRlZmF1bHRGaXJlRXZlbnQoKSB7IHJldHVybiBmYWxzZTsgfVxuXG5Qcm9taXNlLnByb3RvdHlwZS5fZmlyZUV2ZW50ID0gZGVmYXVsdEZpcmVFdmVudDtcblByb21pc2UucHJvdG90eXBlLl9leGVjdXRlID0gZnVuY3Rpb24oZXhlY3V0b3IsIHJlc29sdmUsIHJlamVjdCkge1xuICAgIHRyeSB7XG4gICAgICAgIGV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9XG59O1xuUHJvbWlzZS5wcm90b3R5cGUuX29uQ2FuY2VsID0gZnVuY3Rpb24gKCkge307XG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0T25DYW5jZWwgPSBmdW5jdGlvbiAoaGFuZGxlcikgeyA7IH07XG5Qcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2sgPSBmdW5jdGlvbihvbkNhbmNlbCkge1xuICAgIDtcbn07XG5Qcm9taXNlLnByb3RvdHlwZS5fY2FwdHVyZVN0YWNrVHJhY2UgPSBmdW5jdGlvbiAoKSB7fTtcblByb21pc2UucHJvdG90eXBlLl9hdHRhY2hFeHRyYVRyYWNlID0gZnVuY3Rpb24gKCkge307XG5Qcm9taXNlLnByb3RvdHlwZS5fY2xlYXJDYW5jZWxsYXRpb25EYXRhID0gZnVuY3Rpb24oKSB7fTtcblByb21pc2UucHJvdG90eXBlLl9wcm9wYWdhdGVGcm9tID0gZnVuY3Rpb24gKHBhcmVudCwgZmxhZ3MpIHtcbiAgICA7XG4gICAgO1xufTtcblxuZnVuY3Rpb24gY2FuY2VsbGF0aW9uRXhlY3V0ZShleGVjdXRvciwgcmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICAgIGV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdCwgZnVuY3Rpb24ob25DYW5jZWwpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb25DYW5jZWwgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJvbkNhbmNlbCBtdXN0IGJlIGEgZnVuY3Rpb24sIGdvdDogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC50b1N0cmluZyhvbkNhbmNlbCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJvbWlzZS5fYXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2sob25DYW5jZWwpO1xuICAgICAgICB9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2FuY2VsbGF0aW9uQXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2sob25DYW5jZWwpIHtcbiAgICBpZiAoIXRoaXMuX2lzQ2FuY2VsbGFibGUoKSkgcmV0dXJuIHRoaXM7XG5cbiAgICB2YXIgcHJldmlvdXNPbkNhbmNlbCA9IHRoaXMuX29uQ2FuY2VsKCk7XG4gICAgaWYgKHByZXZpb3VzT25DYW5jZWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodXRpbC5pc0FycmF5KHByZXZpb3VzT25DYW5jZWwpKSB7XG4gICAgICAgICAgICBwcmV2aW91c09uQ2FuY2VsLnB1c2gob25DYW5jZWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2V0T25DYW5jZWwoW3ByZXZpb3VzT25DYW5jZWwsIG9uQ2FuY2VsXSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRPbkNhbmNlbChvbkNhbmNlbCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjYW5jZWxsYXRpb25PbkNhbmNlbCgpIHtcbiAgICByZXR1cm4gdGhpcy5fb25DYW5jZWxGaWVsZDtcbn1cblxuZnVuY3Rpb24gY2FuY2VsbGF0aW9uU2V0T25DYW5jZWwob25DYW5jZWwpIHtcbiAgICB0aGlzLl9vbkNhbmNlbEZpZWxkID0gb25DYW5jZWw7XG59XG5cbmZ1bmN0aW9uIGNhbmNlbGxhdGlvbkNsZWFyQ2FuY2VsbGF0aW9uRGF0YSgpIHtcbiAgICB0aGlzLl9jYW5jZWxsYXRpb25QYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fb25DYW5jZWxGaWVsZCA9IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gY2FuY2VsbGF0aW9uUHJvcGFnYXRlRnJvbShwYXJlbnQsIGZsYWdzKSB7XG4gICAgaWYgKChmbGFncyAmIDEpICE9PSAwKSB7XG4gICAgICAgIHRoaXMuX2NhbmNlbGxhdGlvblBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgdmFyIGJyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgPSBwYXJlbnQuX2JyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWw7XG4gICAgICAgIGlmIChicmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGJyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudC5fYnJhbmNoZXNSZW1haW5pbmdUb0NhbmNlbCA9IGJyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgKyAxO1xuICAgIH1cbiAgICBpZiAoKGZsYWdzICYgMikgIT09IDAgJiYgcGFyZW50Ll9pc0JvdW5kKCkpIHtcbiAgICAgICAgdGhpcy5fc2V0Qm91bmRUbyhwYXJlbnQuX2JvdW5kVG8pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYmluZGluZ1Byb3BhZ2F0ZUZyb20ocGFyZW50LCBmbGFncykge1xuICAgIGlmICgoZmxhZ3MgJiAyKSAhPT0gMCAmJiBwYXJlbnQuX2lzQm91bmQoKSkge1xuICAgICAgICB0aGlzLl9zZXRCb3VuZFRvKHBhcmVudC5fYm91bmRUbyk7XG4gICAgfVxufVxudmFyIHByb3BhZ2F0ZUZyb21GdW5jdGlvbiA9IGJpbmRpbmdQcm9wYWdhdGVGcm9tO1xuXG5mdW5jdGlvbiBib3VuZFZhbHVlRnVuY3Rpb24oKSB7XG4gICAgdmFyIHJldCA9IHRoaXMuX2JvdW5kVG87XG4gICAgaWYgKHJldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChyZXQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICBpZiAocmV0LmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0LnZhbHVlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gbG9uZ1N0YWNrVHJhY2VzQ2FwdHVyZVN0YWNrVHJhY2UoKSB7XG4gICAgdGhpcy5fdHJhY2UgPSBuZXcgQ2FwdHVyZWRUcmFjZSh0aGlzLl9wZWVrQ29udGV4dCgpKTtcbn1cblxuZnVuY3Rpb24gbG9uZ1N0YWNrVHJhY2VzQXR0YWNoRXh0cmFUcmFjZShlcnJvciwgaWdub3JlU2VsZikge1xuICAgIGlmIChjYW5BdHRhY2hUcmFjZShlcnJvcikpIHtcbiAgICAgICAgdmFyIHRyYWNlID0gdGhpcy5fdHJhY2U7XG4gICAgICAgIGlmICh0cmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoaWdub3JlU2VsZikgdHJhY2UgPSB0cmFjZS5fcGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0cmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0cmFjZS5hdHRhY2hFeHRyYVRyYWNlKGVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICghZXJyb3IuX19zdGFja0NsZWFuZWRfXykge1xuICAgICAgICAgICAgdmFyIHBhcnNlZCA9IHBhcnNlU3RhY2tBbmRNZXNzYWdlKGVycm9yKTtcbiAgICAgICAgICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AoZXJyb3IsIFwic3RhY2tcIixcbiAgICAgICAgICAgICAgICBwYXJzZWQubWVzc2FnZSArIFwiXFxuXCIgKyBwYXJzZWQuc3RhY2suam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKGVycm9yLCBcIl9fc3RhY2tDbGVhbmVkX19cIiwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrRm9yZ290dGVuUmV0dXJucyhyZXR1cm5WYWx1ZSwgcHJvbWlzZUNyZWF0ZWQsIG5hbWUsIHByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50KSB7XG4gICAgaWYgKHJldHVyblZhbHVlID09PSB1bmRlZmluZWQgJiYgcHJvbWlzZUNyZWF0ZWQgIT09IG51bGwgJiZcbiAgICAgICAgd0ZvcmdvdHRlblJldHVybikge1xuICAgICAgICBpZiAocGFyZW50ICE9PSB1bmRlZmluZWQgJiYgcGFyZW50Ll9yZXR1cm5lZE5vblVuZGVmaW5lZCgpKSByZXR1cm47XG4gICAgICAgIGlmICgocHJvbWlzZS5fYml0RmllbGQgJiA2NTUzNSkgPT09IDApIHJldHVybjtcblxuICAgICAgICBpZiAobmFtZSkgbmFtZSA9IG5hbWUgKyBcIiBcIjtcbiAgICAgICAgdmFyIGhhbmRsZXJMaW5lID0gXCJcIjtcbiAgICAgICAgdmFyIGNyZWF0b3JMaW5lID0gXCJcIjtcbiAgICAgICAgaWYgKHByb21pc2VDcmVhdGVkLl90cmFjZSkge1xuICAgICAgICAgICAgdmFyIHRyYWNlTGluZXMgPSBwcm9taXNlQ3JlYXRlZC5fdHJhY2Uuc3RhY2suc3BsaXQoXCJcXG5cIik7XG4gICAgICAgICAgICB2YXIgc3RhY2sgPSBjbGVhblN0YWNrKHRyYWNlTGluZXMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHN0YWNrLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmUgPSBzdGFja1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGVGcmFtZVBhdHRlcm4udGVzdChsaW5lKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGluZU1hdGNoZXMgPSBsaW5lLm1hdGNoKHBhcnNlTGluZVBhdHRlcm4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZU1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJMaW5lICA9IFwiYXQgXCIgKyBsaW5lTWF0Y2hlc1sxXSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCI6XCIgKyBsaW5lTWF0Y2hlc1syXSArIFwiOlwiICsgbGluZU1hdGNoZXNbM10gKyBcIiBcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0VXNlckxpbmUgPSBzdGFja1swXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyYWNlTGluZXMubGVuZ3RoOyArK2kpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhY2VMaW5lc1tpXSA9PT0gZmlyc3RVc2VyTGluZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRvckxpbmUgPSBcIlxcblwiICsgdHJhY2VMaW5lc1tpIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBtc2cgPSBcImEgcHJvbWlzZSB3YXMgY3JlYXRlZCBpbiBhIFwiICsgbmFtZSArXG4gICAgICAgICAgICBcImhhbmRsZXIgXCIgKyBoYW5kbGVyTGluZSArIFwiYnV0IHdhcyBub3QgcmV0dXJuZWQgZnJvbSBpdCwgXCIgK1xuICAgICAgICAgICAgXCJzZWUgaHR0cDovL2dvby5nbC9yUnFNVXdcIiArXG4gICAgICAgICAgICBjcmVhdG9yTGluZTtcbiAgICAgICAgcHJvbWlzZS5fd2Fybihtc2csIHRydWUsIHByb21pc2VDcmVhdGVkKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRlcHJlY2F0ZWQobmFtZSwgcmVwbGFjZW1lbnQpIHtcbiAgICB2YXIgbWVzc2FnZSA9IG5hbWUgK1xuICAgICAgICBcIiBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYSBmdXR1cmUgdmVyc2lvbi5cIjtcbiAgICBpZiAocmVwbGFjZW1lbnQpIG1lc3NhZ2UgKz0gXCIgVXNlIFwiICsgcmVwbGFjZW1lbnQgKyBcIiBpbnN0ZWFkLlwiO1xuICAgIHJldHVybiB3YXJuKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiB3YXJuKG1lc3NhZ2UsIHNob3VsZFVzZU93blRyYWNlLCBwcm9taXNlKSB7XG4gICAgaWYgKCFjb25maWcud2FybmluZ3MpIHJldHVybjtcbiAgICB2YXIgd2FybmluZyA9IG5ldyBXYXJuaW5nKG1lc3NhZ2UpO1xuICAgIHZhciBjdHg7XG4gICAgaWYgKHNob3VsZFVzZU93blRyYWNlKSB7XG4gICAgICAgIHByb21pc2UuX2F0dGFjaEV4dHJhVHJhY2Uod2FybmluZyk7XG4gICAgfSBlbHNlIGlmIChjb25maWcubG9uZ1N0YWNrVHJhY2VzICYmIChjdHggPSBQcm9taXNlLl9wZWVrQ29udGV4dCgpKSkge1xuICAgICAgICBjdHguYXR0YWNoRXh0cmFUcmFjZSh3YXJuaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyc2VkID0gcGFyc2VTdGFja0FuZE1lc3NhZ2Uod2FybmluZyk7XG4gICAgICAgIHdhcm5pbmcuc3RhY2sgPSBwYXJzZWQubWVzc2FnZSArIFwiXFxuXCIgKyBwYXJzZWQuc3RhY2suam9pbihcIlxcblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIWFjdGl2ZUZpcmVFdmVudChcIndhcm5pbmdcIiwgd2FybmluZykpIHtcbiAgICAgICAgZm9ybWF0QW5kTG9nRXJyb3Iod2FybmluZywgXCJcIiwgdHJ1ZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWNvbnN0cnVjdFN0YWNrKG1lc3NhZ2UsIHN0YWNrcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhY2tzLmxlbmd0aCAtIDE7ICsraSkge1xuICAgICAgICBzdGFja3NbaV0ucHVzaChcIkZyb20gcHJldmlvdXMgZXZlbnQ6XCIpO1xuICAgICAgICBzdGFja3NbaV0gPSBzdGFja3NbaV0uam9pbihcIlxcblwiKTtcbiAgICB9XG4gICAgaWYgKGkgPCBzdGFja3MubGVuZ3RoKSB7XG4gICAgICAgIHN0YWNrc1tpXSA9IHN0YWNrc1tpXS5qb2luKFwiXFxuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbWVzc2FnZSArIFwiXFxuXCIgKyBzdGFja3Muam9pbihcIlxcblwiKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRHVwbGljYXRlT3JFbXB0eUp1bXBzKHN0YWNrcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGlmIChzdGFja3NbaV0ubGVuZ3RoID09PSAwIHx8XG4gICAgICAgICAgICAoKGkgKyAxIDwgc3RhY2tzLmxlbmd0aCkgJiYgc3RhY2tzW2ldWzBdID09PSBzdGFja3NbaSsxXVswXSkpIHtcbiAgICAgICAgICAgIHN0YWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNvbW1vblJvb3RzKHN0YWNrcykge1xuICAgIHZhciBjdXJyZW50ID0gc3RhY2tzWzBdO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgc3RhY2tzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBwcmV2ID0gc3RhY2tzW2ldO1xuICAgICAgICB2YXIgY3VycmVudExhc3RJbmRleCA9IGN1cnJlbnQubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGN1cnJlbnRMYXN0TGluZSA9IGN1cnJlbnRbY3VycmVudExhc3RJbmRleF07XG4gICAgICAgIHZhciBjb21tb25Sb290TWVldFBvaW50ID0gLTE7XG5cbiAgICAgICAgZm9yICh2YXIgaiA9IHByZXYubGVuZ3RoIC0gMTsgaiA+PSAwOyAtLWopIHtcbiAgICAgICAgICAgIGlmIChwcmV2W2pdID09PSBjdXJyZW50TGFzdExpbmUpIHtcbiAgICAgICAgICAgICAgICBjb21tb25Sb290TWVldFBvaW50ID0gajtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGogPSBjb21tb25Sb290TWVldFBvaW50OyBqID49IDA7IC0taikge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSBwcmV2W2pdO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRbY3VycmVudExhc3RJbmRleF0gPT09IGxpbmUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50LnBvcCgpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRMYXN0SW5kZXgtLTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudCA9IHByZXY7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjbGVhblN0YWNrKHN0YWNrKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhY2subGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGxpbmUgPSBzdGFja1tpXTtcbiAgICAgICAgdmFyIGlzVHJhY2VMaW5lID0gXCIgICAgKE5vIHN0YWNrIHRyYWNlKVwiID09PSBsaW5lIHx8XG4gICAgICAgICAgICBzdGFja0ZyYW1lUGF0dGVybi50ZXN0KGxpbmUpO1xuICAgICAgICB2YXIgaXNJbnRlcm5hbEZyYW1lID0gaXNUcmFjZUxpbmUgJiYgc2hvdWxkSWdub3JlKGxpbmUpO1xuICAgICAgICBpZiAoaXNUcmFjZUxpbmUgJiYgIWlzSW50ZXJuYWxGcmFtZSkge1xuICAgICAgICAgICAgaWYgKGluZGVudFN0YWNrRnJhbWVzICYmIGxpbmUuY2hhckF0KDApICE9PSBcIiBcIikge1xuICAgICAgICAgICAgICAgIGxpbmUgPSBcIiAgICBcIiArIGxpbmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXQucHVzaChsaW5lKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBzdGFja0ZyYW1lc0FzQXJyYXkoZXJyb3IpIHtcbiAgICB2YXIgc3RhY2sgPSBlcnJvci5zdGFjay5yZXBsYWNlKC9cXHMrJC9nLCBcIlwiKS5zcGxpdChcIlxcblwiKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBsaW5lID0gc3RhY2tbaV07XG4gICAgICAgIGlmIChcIiAgICAoTm8gc3RhY2sgdHJhY2UpXCIgPT09IGxpbmUgfHwgc3RhY2tGcmFtZVBhdHRlcm4udGVzdChsaW5lKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGkgPiAwICYmIGVycm9yLm5hbWUgIT0gXCJTeW50YXhFcnJvclwiKSB7XG4gICAgICAgIHN0YWNrID0gc3RhY2suc2xpY2UoaSk7XG4gICAgfVxuICAgIHJldHVybiBzdGFjaztcbn1cblxuZnVuY3Rpb24gcGFyc2VTdGFja0FuZE1lc3NhZ2UoZXJyb3IpIHtcbiAgICB2YXIgc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgICB2YXIgbWVzc2FnZSA9IGVycm9yLnRvU3RyaW5nKCk7XG4gICAgc3RhY2sgPSB0eXBlb2Ygc3RhY2sgPT09IFwic3RyaW5nXCIgJiYgc3RhY2subGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgID8gc3RhY2tGcmFtZXNBc0FycmF5KGVycm9yKSA6IFtcIiAgICAoTm8gc3RhY2sgdHJhY2UpXCJdO1xuICAgIHJldHVybiB7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIHN0YWNrOiBlcnJvci5uYW1lID09IFwiU3ludGF4RXJyb3JcIiA/IHN0YWNrIDogY2xlYW5TdGFjayhzdGFjaylcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRBbmRMb2dFcnJvcihlcnJvciwgdGl0bGUsIGlzU29mdCkge1xuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB2YXIgbWVzc2FnZTtcbiAgICAgICAgaWYgKHV0aWwuaXNPYmplY3QoZXJyb3IpKSB7XG4gICAgICAgICAgICB2YXIgc3RhY2sgPSBlcnJvci5zdGFjaztcbiAgICAgICAgICAgIG1lc3NhZ2UgPSB0aXRsZSArIGZvcm1hdFN0YWNrKHN0YWNrLCBlcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gdGl0bGUgKyBTdHJpbmcoZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcHJpbnRXYXJuaW5nID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHByaW50V2FybmluZyhtZXNzYWdlLCBpc1NvZnQpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25zb2xlLmxvZyA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgICAgICAgICB0eXBlb2YgY29uc29sZS5sb2cgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBmaXJlUmVqZWN0aW9uRXZlbnQobmFtZSwgbG9jYWxIYW5kbGVyLCByZWFzb24sIHByb21pc2UpIHtcbiAgICB2YXIgbG9jYWxFdmVudEZpcmVkID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsb2NhbEhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgbG9jYWxFdmVudEZpcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBcInJlamVjdGlvbkhhbmRsZWRcIikge1xuICAgICAgICAgICAgICAgIGxvY2FsSGFuZGxlcihwcm9taXNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9jYWxIYW5kbGVyKHJlYXNvbiwgcHJvbWlzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZSk7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgPT09IFwidW5oYW5kbGVkUmVqZWN0aW9uXCIpIHtcbiAgICAgICAgaWYgKCFhY3RpdmVGaXJlRXZlbnQobmFtZSwgcmVhc29uLCBwcm9taXNlKSAmJiAhbG9jYWxFdmVudEZpcmVkKSB7XG4gICAgICAgICAgICBmb3JtYXRBbmRMb2dFcnJvcihyZWFzb24sIFwiVW5oYW5kbGVkIHJlamVjdGlvbiBcIik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBhY3RpdmVGaXJlRXZlbnQobmFtZSwgcHJvbWlzZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBmb3JtYXROb25FcnJvcihvYmopIHtcbiAgICB2YXIgc3RyO1xuICAgIGlmICh0eXBlb2Ygb2JqID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgc3RyID0gXCJbZnVuY3Rpb24gXCIgK1xuICAgICAgICAgICAgKG9iai5uYW1lIHx8IFwiYW5vbnltb3VzXCIpICtcbiAgICAgICAgICAgIFwiXVwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IG9iaiAmJiB0eXBlb2Ygb2JqLnRvU3RyaW5nID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICAgID8gb2JqLnRvU3RyaW5nKCkgOiB1dGlsLnRvU3RyaW5nKG9iaik7XG4gICAgICAgIHZhciBydXNlbGVzc1RvU3RyaW5nID0gL1xcW29iamVjdCBbYS16QS1aMC05JF9dK1xcXS87XG4gICAgICAgIGlmIChydXNlbGVzc1RvU3RyaW5nLnRlc3Qoc3RyKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3U3RyID0gSlNPTi5zdHJpbmdpZnkob2JqKTtcbiAgICAgICAgICAgICAgICBzdHIgPSBuZXdTdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKSB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgc3RyID0gXCIoZW1wdHkgYXJyYXkpXCI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChcIig8XCIgKyBzbmlwKHN0cikgKyBcIj4sIG5vIHN0YWNrIHRyYWNlKVwiKTtcbn1cblxuZnVuY3Rpb24gc25pcChzdHIpIHtcbiAgICB2YXIgbWF4Q2hhcnMgPSA0MTtcbiAgICBpZiAoc3RyLmxlbmd0aCA8IG1heENoYXJzKSB7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIG1heENoYXJzIC0gMykgKyBcIi4uLlwiO1xufVxuXG5mdW5jdGlvbiBsb25nU3RhY2tUcmFjZXNJc1N1cHBvcnRlZCgpIHtcbiAgICByZXR1cm4gdHlwZW9mIGNhcHR1cmVTdGFja1RyYWNlID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbnZhciBzaG91bGRJZ25vcmUgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9O1xudmFyIHBhcnNlTGluZUluZm9SZWdleCA9IC9bXFwvPFxcKF0oW146XFwvXSspOihcXGQrKTooPzpcXGQrKVxcKT9cXHMqJC87XG5mdW5jdGlvbiBwYXJzZUxpbmVJbmZvKGxpbmUpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IGxpbmUubWF0Y2gocGFyc2VMaW5lSW5mb1JlZ2V4KTtcbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZmlsZU5hbWU6IG1hdGNoZXNbMV0sXG4gICAgICAgICAgICBsaW5lOiBwYXJzZUludChtYXRjaGVzWzJdLCAxMClcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldEJvdW5kcyhmaXJzdExpbmVFcnJvciwgbGFzdExpbmVFcnJvcikge1xuICAgIGlmICghbG9uZ1N0YWNrVHJhY2VzSXNTdXBwb3J0ZWQoKSkgcmV0dXJuO1xuICAgIHZhciBmaXJzdFN0YWNrTGluZXMgPSBmaXJzdExpbmVFcnJvci5zdGFjay5zcGxpdChcIlxcblwiKTtcbiAgICB2YXIgbGFzdFN0YWNrTGluZXMgPSBsYXN0TGluZUVycm9yLnN0YWNrLnNwbGl0KFwiXFxuXCIpO1xuICAgIHZhciBmaXJzdEluZGV4ID0gLTE7XG4gICAgdmFyIGxhc3RJbmRleCA9IC0xO1xuICAgIHZhciBmaXJzdEZpbGVOYW1lO1xuICAgIHZhciBsYXN0RmlsZU5hbWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaXJzdFN0YWNrTGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlTGluZUluZm8oZmlyc3RTdGFja0xpbmVzW2ldKTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgZmlyc3RGaWxlTmFtZSA9IHJlc3VsdC5maWxlTmFtZTtcbiAgICAgICAgICAgIGZpcnN0SW5kZXggPSByZXN1bHQubGluZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFzdFN0YWNrTGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlTGluZUluZm8obGFzdFN0YWNrTGluZXNbaV0pO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICBsYXN0RmlsZU5hbWUgPSByZXN1bHQuZmlsZU5hbWU7XG4gICAgICAgICAgICBsYXN0SW5kZXggPSByZXN1bHQubGluZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChmaXJzdEluZGV4IDwgMCB8fCBsYXN0SW5kZXggPCAwIHx8ICFmaXJzdEZpbGVOYW1lIHx8ICFsYXN0RmlsZU5hbWUgfHxcbiAgICAgICAgZmlyc3RGaWxlTmFtZSAhPT0gbGFzdEZpbGVOYW1lIHx8IGZpcnN0SW5kZXggPj0gbGFzdEluZGV4KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzaG91bGRJZ25vcmUgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgIGlmIChibHVlYmlyZEZyYW1lUGF0dGVybi50ZXN0KGxpbmUpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgdmFyIGluZm8gPSBwYXJzZUxpbmVJbmZvKGxpbmUpO1xuICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgaWYgKGluZm8uZmlsZU5hbWUgPT09IGZpcnN0RmlsZU5hbWUgJiZcbiAgICAgICAgICAgICAgICAoZmlyc3RJbmRleCA8PSBpbmZvLmxpbmUgJiYgaW5mby5saW5lIDw9IGxhc3RJbmRleCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gQ2FwdHVyZWRUcmFjZShwYXJlbnQpIHtcbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5fcHJvbWlzZXNDcmVhdGVkID0gMDtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGVuZ3RoID0gMSArIChwYXJlbnQgPT09IHVuZGVmaW5lZCA/IDAgOiBwYXJlbnQuX2xlbmd0aCk7XG4gICAgY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgQ2FwdHVyZWRUcmFjZSk7XG4gICAgaWYgKGxlbmd0aCA+IDMyKSB0aGlzLnVuY3ljbGUoKTtcbn1cbnV0aWwuaW5oZXJpdHMoQ2FwdHVyZWRUcmFjZSwgRXJyb3IpO1xuQ29udGV4dC5DYXB0dXJlZFRyYWNlID0gQ2FwdHVyZWRUcmFjZTtcblxuQ2FwdHVyZWRUcmFjZS5wcm90b3R5cGUudW5jeWNsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsZW5ndGggPSB0aGlzLl9sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA8IDIpIHJldHVybjtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICB2YXIgc3RhY2tUb0luZGV4ID0ge307XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbm9kZSA9IHRoaXM7IG5vZGUgIT09IHVuZGVmaW5lZDsgKytpKSB7XG4gICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XG4gICAgICAgIG5vZGUgPSBub2RlLl9wYXJlbnQ7XG4gICAgfVxuICAgIGxlbmd0aCA9IHRoaXMuX2xlbmd0aCA9IGk7XG4gICAgZm9yICh2YXIgaSA9IGxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBzdGFjayA9IG5vZGVzW2ldLnN0YWNrO1xuICAgICAgICBpZiAoc3RhY2tUb0luZGV4W3N0YWNrXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzdGFja1RvSW5kZXhbc3RhY2tdID0gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjdXJyZW50U3RhY2sgPSBub2Rlc1tpXS5zdGFjaztcbiAgICAgICAgdmFyIGluZGV4ID0gc3RhY2tUb0luZGV4W2N1cnJlbnRTdGFja107XG4gICAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkICYmIGluZGV4ICE9PSBpKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgICAgICAgICAgbm9kZXNbaW5kZXggLSAxXS5fcGFyZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIG5vZGVzW2luZGV4IC0gMV0uX2xlbmd0aCA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2Rlc1tpXS5fcGFyZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgbm9kZXNbaV0uX2xlbmd0aCA9IDE7XG4gICAgICAgICAgICB2YXIgY3ljbGVFZGdlTm9kZSA9IGkgPiAwID8gbm9kZXNbaSAtIDFdIDogdGhpcztcblxuICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIGN5Y2xlRWRnZU5vZGUuX3BhcmVudCA9IG5vZGVzW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fcGFyZW50LnVuY3ljbGUoKTtcbiAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9sZW5ndGggPVxuICAgICAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9wYXJlbnQuX2xlbmd0aCArIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGN5Y2xlRWRnZU5vZGUuX3BhcmVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9sZW5ndGggPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGN1cnJlbnRDaGlsZExlbmd0aCA9IGN5Y2xlRWRnZU5vZGUuX2xlbmd0aCArIDE7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gaSAtIDI7IGogPj0gMDsgLS1qKSB7XG4gICAgICAgICAgICAgICAgbm9kZXNbal0uX2xlbmd0aCA9IGN1cnJlbnRDaGlsZExlbmd0aDtcbiAgICAgICAgICAgICAgICBjdXJyZW50Q2hpbGRMZW5ndGgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkNhcHR1cmVkVHJhY2UucHJvdG90eXBlLmF0dGFjaEV4dHJhVHJhY2UgPSBmdW5jdGlvbihlcnJvcikge1xuICAgIGlmIChlcnJvci5fX3N0YWNrQ2xlYW5lZF9fKSByZXR1cm47XG4gICAgdGhpcy51bmN5Y2xlKCk7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlU3RhY2tBbmRNZXNzYWdlKGVycm9yKTtcbiAgICB2YXIgbWVzc2FnZSA9IHBhcnNlZC5tZXNzYWdlO1xuICAgIHZhciBzdGFja3MgPSBbcGFyc2VkLnN0YWNrXTtcblxuICAgIHZhciB0cmFjZSA9IHRoaXM7XG4gICAgd2hpbGUgKHRyYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3RhY2tzLnB1c2goY2xlYW5TdGFjayh0cmFjZS5zdGFjay5zcGxpdChcIlxcblwiKSkpO1xuICAgICAgICB0cmFjZSA9IHRyYWNlLl9wYXJlbnQ7XG4gICAgfVxuICAgIHJlbW92ZUNvbW1vblJvb3RzKHN0YWNrcyk7XG4gICAgcmVtb3ZlRHVwbGljYXRlT3JFbXB0eUp1bXBzKHN0YWNrcyk7XG4gICAgdXRpbC5ub3RFbnVtZXJhYmxlUHJvcChlcnJvciwgXCJzdGFja1wiLCByZWNvbnN0cnVjdFN0YWNrKG1lc3NhZ2UsIHN0YWNrcykpO1xuICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AoZXJyb3IsIFwiX19zdGFja0NsZWFuZWRfX1wiLCB0cnVlKTtcbn07XG5cbnZhciBjYXB0dXJlU3RhY2tUcmFjZSA9IChmdW5jdGlvbiBzdGFja0RldGVjdGlvbigpIHtcbiAgICB2YXIgdjhzdGFja0ZyYW1lUGF0dGVybiA9IC9eXFxzKmF0XFxzKi87XG4gICAgdmFyIHY4c3RhY2tGb3JtYXR0ZXIgPSBmdW5jdGlvbihzdGFjaywgZXJyb3IpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdGFjayA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHN0YWNrO1xuXG4gICAgICAgIGlmIChlcnJvci5uYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGVycm9yLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdE5vbkVycm9yKGVycm9yKTtcbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBFcnJvci5zdGFja1RyYWNlTGltaXQgPT09IFwibnVtYmVyXCIgJiZcbiAgICAgICAgdHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ICs9IDY7XG4gICAgICAgIHN0YWNrRnJhbWVQYXR0ZXJuID0gdjhzdGFja0ZyYW1lUGF0dGVybjtcbiAgICAgICAgZm9ybWF0U3RhY2sgPSB2OHN0YWNrRm9ybWF0dGVyO1xuICAgICAgICB2YXIgY2FwdHVyZVN0YWNrVHJhY2UgPSBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZTtcblxuICAgICAgICBzaG91bGRJZ25vcmUgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gYmx1ZWJpcmRGcmFtZVBhdHRlcm4udGVzdChsaW5lKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHJlY2VpdmVyLCBpZ25vcmVVbnRpbCkge1xuICAgICAgICAgICAgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ICs9IDY7XG4gICAgICAgICAgICBjYXB0dXJlU3RhY2tUcmFjZShyZWNlaXZlciwgaWdub3JlVW50aWwpO1xuICAgICAgICAgICAgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0IC09IDY7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcblxuICAgIGlmICh0eXBlb2YgZXJyLnN0YWNrID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgIGVyci5zdGFjay5zcGxpdChcIlxcblwiKVswXS5pbmRleE9mKFwic3RhY2tEZXRlY3Rpb25AXCIpID49IDApIHtcbiAgICAgICAgc3RhY2tGcmFtZVBhdHRlcm4gPSAvQC87XG4gICAgICAgIGZvcm1hdFN0YWNrID0gdjhzdGFja0Zvcm1hdHRlcjtcbiAgICAgICAgaW5kZW50U3RhY2tGcmFtZXMgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gY2FwdHVyZVN0YWNrVHJhY2Uobykge1xuICAgICAgICAgICAgby5zdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHZhciBoYXNTdGFja0FmdGVyVGhyb3c7XG4gICAgdHJ5IHsgdGhyb3cgbmV3IEVycm9yKCk7IH1cbiAgICBjYXRjaChlKSB7XG4gICAgICAgIGhhc1N0YWNrQWZ0ZXJUaHJvdyA9IChcInN0YWNrXCIgaW4gZSk7XG4gICAgfVxuICAgIGlmICghKFwic3RhY2tcIiBpbiBlcnIpICYmIGhhc1N0YWNrQWZ0ZXJUaHJvdyAmJlxuICAgICAgICB0eXBlb2YgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIHN0YWNrRnJhbWVQYXR0ZXJuID0gdjhzdGFja0ZyYW1lUGF0dGVybjtcbiAgICAgICAgZm9ybWF0U3RhY2sgPSB2OHN0YWNrRm9ybWF0dGVyO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gY2FwdHVyZVN0YWNrVHJhY2Uobykge1xuICAgICAgICAgICAgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ICs9IDY7XG4gICAgICAgICAgICB0cnkgeyB0aHJvdyBuZXcgRXJyb3IoKTsgfVxuICAgICAgICAgICAgY2F0Y2goZSkgeyBvLnN0YWNrID0gZS5zdGFjazsgfVxuICAgICAgICAgICAgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0IC09IDY7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZm9ybWF0U3RhY2sgPSBmdW5jdGlvbihzdGFjaywgZXJyb3IpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdGFjayA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHN0YWNrO1xuXG4gICAgICAgIGlmICgodHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiIHx8XG4gICAgICAgICAgICB0eXBlb2YgZXJyb3IgPT09IFwiZnVuY3Rpb25cIikgJiZcbiAgICAgICAgICAgIGVycm9yLm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgZXJyb3IubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0Tm9uRXJyb3IoZXJyb3IpO1xuICAgIH07XG5cbiAgICByZXR1cm4gbnVsbDtcblxufSkoW10pO1xuXG5pZiAodHlwZW9mIGNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIGNvbnNvbGUud2FybiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHByaW50V2FybmluZyA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihtZXNzYWdlKTtcbiAgICB9O1xuICAgIGlmICh1dGlsLmlzTm9kZSAmJiBwcm9jZXNzLnN0ZGVyci5pc1RUWSkge1xuICAgICAgICBwcmludFdhcm5pbmcgPSBmdW5jdGlvbihtZXNzYWdlLCBpc1NvZnQpIHtcbiAgICAgICAgICAgIHZhciBjb2xvciA9IGlzU29mdCA/IFwiXFx1MDAxYlszM21cIiA6IFwiXFx1MDAxYlszMW1cIjtcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybihjb2xvciArIG1lc3NhZ2UgKyBcIlxcdTAwMWJbMG1cXG5cIik7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmICghdXRpbC5pc05vZGUgJiYgdHlwZW9mIChuZXcgRXJyb3IoKS5zdGFjaykgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcHJpbnRXYXJuaW5nID0gZnVuY3Rpb24obWVzc2FnZSwgaXNTb2Z0KSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCIlY1wiICsgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU29mdCA/IFwiY29sb3I6IGRhcmtvcmFuZ2VcIiA6IFwiY29sb3I6IHJlZFwiKTtcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbnZhciBjb25maWcgPSB7XG4gICAgd2FybmluZ3M6IHdhcm5pbmdzLFxuICAgIGxvbmdTdGFja1RyYWNlczogZmFsc2UsXG4gICAgY2FuY2VsbGF0aW9uOiBmYWxzZSxcbiAgICBtb25pdG9yaW5nOiBmYWxzZVxufTtcblxuaWYgKGxvbmdTdGFja1RyYWNlcykgUHJvbWlzZS5sb25nU3RhY2tUcmFjZXMoKTtcblxucmV0dXJuIHtcbiAgICBsb25nU3RhY2tUcmFjZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLmxvbmdTdGFja1RyYWNlcztcbiAgICB9LFxuICAgIHdhcm5pbmdzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy53YXJuaW5ncztcbiAgICB9LFxuICAgIGNhbmNlbGxhdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb25maWcuY2FuY2VsbGF0aW9uO1xuICAgIH0sXG4gICAgbW9uaXRvcmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb25maWcubW9uaXRvcmluZztcbiAgICB9LFxuICAgIHByb3BhZ2F0ZUZyb21GdW5jdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9wYWdhdGVGcm9tRnVuY3Rpb247XG4gICAgfSxcbiAgICBib3VuZFZhbHVlRnVuY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gYm91bmRWYWx1ZUZ1bmN0aW9uO1xuICAgIH0sXG4gICAgY2hlY2tGb3Jnb3R0ZW5SZXR1cm5zOiBjaGVja0ZvcmdvdHRlblJldHVybnMsXG4gICAgc2V0Qm91bmRzOiBzZXRCb3VuZHMsXG4gICAgd2Fybjogd2FybixcbiAgICBkZXByZWNhdGVkOiBkZXByZWNhdGVkLFxuICAgIENhcHR1cmVkVHJhY2U6IENhcHR1cmVkVHJhY2UsXG4gICAgZmlyZURvbUV2ZW50OiBmaXJlRG9tRXZlbnQsXG4gICAgZmlyZUdsb2JhbEV2ZW50OiBmaXJlR2xvYmFsRXZlbnRcbn07XG59O1xuXG59LHtcIi4vZXJyb3JzXCI6MTIsXCIuL3V0aWxcIjozNn1dLDEwOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG5mdW5jdGlvbiByZXR1cm5lcigpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZTtcbn1cbmZ1bmN0aW9uIHRocm93ZXIoKSB7XG4gICAgdGhyb3cgdGhpcy5yZWFzb247XG59XG5cblByb21pc2UucHJvdG90eXBlW1wicmV0dXJuXCJdID1cblByb21pc2UucHJvdG90eXBlLnRoZW5SZXR1cm4gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB2YWx1ZS5zdXBwcmVzc1VuaGFuZGxlZFJlamVjdGlvbnMoKTtcbiAgICByZXR1cm4gdGhpcy5fdGhlbihcbiAgICAgICAgcmV0dXJuZXIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB7dmFsdWU6IHZhbHVlfSwgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlW1widGhyb3dcIl0gPVxuUHJvbWlzZS5wcm90b3R5cGUudGhlblRocm93ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLl90aGVuKFxuICAgICAgICB0aHJvd2VyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwge3JlYXNvbjogcmVhc29ufSwgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmNhdGNoVGhyb3cgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGhlbihcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgdGhyb3dlciwgdW5kZWZpbmVkLCB7cmVhc29uOiByZWFzb259LCB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBfcmVhc29uID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uKCkge3Rocm93IF9yZWFzb247fTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2F1Z2h0KHJlYXNvbiwgaGFuZGxlcik7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuY2F0Y2hSZXR1cm4gPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHZhbHVlLnN1cHByZXNzVW5oYW5kbGVkUmVqZWN0aW9ucygpO1xuICAgICAgICByZXR1cm4gdGhpcy5fdGhlbihcbiAgICAgICAgICAgIHVuZGVmaW5lZCwgcmV0dXJuZXIsIHVuZGVmaW5lZCwge3ZhbHVlOiB2YWx1ZX0sIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIF92YWx1ZSA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgaWYgKF92YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIF92YWx1ZS5zdXBwcmVzc1VuaGFuZGxlZFJlamVjdGlvbnMoKTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbigpIHtyZXR1cm4gX3ZhbHVlO307XG4gICAgICAgIHJldHVybiB0aGlzLmNhdWdodCh2YWx1ZSwgaGFuZGxlcik7XG4gICAgfVxufTtcbn07XG5cbn0se31dLDExOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCkge1xudmFyIFByb21pc2VSZWR1Y2UgPSBQcm9taXNlLnJlZHVjZTtcbnZhciBQcm9taXNlQWxsID0gUHJvbWlzZS5hbGw7XG5cbmZ1bmN0aW9uIHByb21pc2VBbGxUaGlzKCkge1xuICAgIHJldHVybiBQcm9taXNlQWxsKHRoaXMpO1xufVxuXG5mdW5jdGlvbiBQcm9taXNlTWFwU2VyaWVzKHByb21pc2VzLCBmbikge1xuICAgIHJldHVybiBQcm9taXNlUmVkdWNlKHByb21pc2VzLCBmbiwgSU5URVJOQUwsIElOVEVSTkFMKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUuZWFjaCA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBQcm9taXNlUmVkdWNlKHRoaXMsIGZuLCBJTlRFUk5BTCwgMClcbiAgICAgICAgICAgICAgLl90aGVuKHByb21pc2VBbGxUaGlzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcywgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLm1hcFNlcmllcyA9IGZ1bmN0aW9uIChmbikge1xuICAgIHJldHVybiBQcm9taXNlUmVkdWNlKHRoaXMsIGZuLCBJTlRFUk5BTCwgSU5URVJOQUwpO1xufTtcblxuUHJvbWlzZS5lYWNoID0gZnVuY3Rpb24gKHByb21pc2VzLCBmbikge1xuICAgIHJldHVybiBQcm9taXNlUmVkdWNlKHByb21pc2VzLCBmbiwgSU5URVJOQUwsIDApXG4gICAgICAgICAgICAgIC5fdGhlbihwcm9taXNlQWxsVGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHByb21pc2VzLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5tYXBTZXJpZXMgPSBQcm9taXNlTWFwU2VyaWVzO1xufTtcblxuXG59LHt9XSwxMjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciBlczUgPSBfZGVyZXFfKFwiLi9lczVcIik7XG52YXIgT2JqZWN0ZnJlZXplID0gZXM1LmZyZWV6ZTtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBpbmhlcml0cyA9IHV0aWwuaW5oZXJpdHM7XG52YXIgbm90RW51bWVyYWJsZVByb3AgPSB1dGlsLm5vdEVudW1lcmFibGVQcm9wO1xuXG5mdW5jdGlvbiBzdWJFcnJvcihuYW1lUHJvcGVydHksIGRlZmF1bHRNZXNzYWdlKSB7XG4gICAgZnVuY3Rpb24gU3ViRXJyb3IobWVzc2FnZSkge1xuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ViRXJyb3IpKSByZXR1cm4gbmV3IFN1YkVycm9yKG1lc3NhZ2UpO1xuICAgICAgICBub3RFbnVtZXJhYmxlUHJvcCh0aGlzLCBcIm1lc3NhZ2VcIixcbiAgICAgICAgICAgIHR5cGVvZiBtZXNzYWdlID09PSBcInN0cmluZ1wiID8gbWVzc2FnZSA6IGRlZmF1bHRNZXNzYWdlKTtcbiAgICAgICAgbm90RW51bWVyYWJsZVByb3AodGhpcywgXCJuYW1lXCIsIG5hbWVQcm9wZXJ0eSk7XG4gICAgICAgIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBFcnJvci5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGluaGVyaXRzKFN1YkVycm9yLCBFcnJvcik7XG4gICAgcmV0dXJuIFN1YkVycm9yO1xufVxuXG52YXIgX1R5cGVFcnJvciwgX1JhbmdlRXJyb3I7XG52YXIgV2FybmluZyA9IHN1YkVycm9yKFwiV2FybmluZ1wiLCBcIndhcm5pbmdcIik7XG52YXIgQ2FuY2VsbGF0aW9uRXJyb3IgPSBzdWJFcnJvcihcIkNhbmNlbGxhdGlvbkVycm9yXCIsIFwiY2FuY2VsbGF0aW9uIGVycm9yXCIpO1xudmFyIFRpbWVvdXRFcnJvciA9IHN1YkVycm9yKFwiVGltZW91dEVycm9yXCIsIFwidGltZW91dCBlcnJvclwiKTtcbnZhciBBZ2dyZWdhdGVFcnJvciA9IHN1YkVycm9yKFwiQWdncmVnYXRlRXJyb3JcIiwgXCJhZ2dyZWdhdGUgZXJyb3JcIik7XG50cnkge1xuICAgIF9UeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gICAgX1JhbmdlRXJyb3IgPSBSYW5nZUVycm9yO1xufSBjYXRjaChlKSB7XG4gICAgX1R5cGVFcnJvciA9IHN1YkVycm9yKFwiVHlwZUVycm9yXCIsIFwidHlwZSBlcnJvclwiKTtcbiAgICBfUmFuZ2VFcnJvciA9IHN1YkVycm9yKFwiUmFuZ2VFcnJvclwiLCBcInJhbmdlIGVycm9yXCIpO1xufVxuXG52YXIgbWV0aG9kcyA9IChcImpvaW4gcG9wIHB1c2ggc2hpZnQgdW5zaGlmdCBzbGljZSBmaWx0ZXIgZm9yRWFjaCBzb21lIFwiICtcbiAgICBcImV2ZXJ5IG1hcCBpbmRleE9mIGxhc3RJbmRleE9mIHJlZHVjZSByZWR1Y2VSaWdodCBzb3J0IHJldmVyc2VcIikuc3BsaXQoXCIgXCIpO1xuXG5mb3IgKHZhciBpID0gMDsgaSA8IG1ldGhvZHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAodHlwZW9mIEFycmF5LnByb3RvdHlwZVttZXRob2RzW2ldXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIEFnZ3JlZ2F0ZUVycm9yLnByb3RvdHlwZVttZXRob2RzW2ldXSA9IEFycmF5LnByb3RvdHlwZVttZXRob2RzW2ldXTtcbiAgICB9XG59XG5cbmVzNS5kZWZpbmVQcm9wZXJ0eShBZ2dyZWdhdGVFcnJvci5wcm90b3R5cGUsIFwibGVuZ3RoXCIsIHtcbiAgICB2YWx1ZTogMCxcbiAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWVcbn0pO1xuQWdncmVnYXRlRXJyb3IucHJvdG90eXBlW1wiaXNPcGVyYXRpb25hbFwiXSA9IHRydWU7XG52YXIgbGV2ZWwgPSAwO1xuQWdncmVnYXRlRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluZGVudCA9IEFycmF5KGxldmVsICogNCArIDEpLmpvaW4oXCIgXCIpO1xuICAgIHZhciByZXQgPSBcIlxcblwiICsgaW5kZW50ICsgXCJBZ2dyZWdhdGVFcnJvciBvZjpcIiArIFwiXFxuXCI7XG4gICAgbGV2ZWwrKztcbiAgICBpbmRlbnQgPSBBcnJheShsZXZlbCAqIDQgKyAxKS5qb2luKFwiIFwiKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHN0ciA9IHRoaXNbaV0gPT09IHRoaXMgPyBcIltDaXJjdWxhciBBZ2dyZWdhdGVFcnJvcl1cIiA6IHRoaXNbaV0gKyBcIlwiO1xuICAgICAgICB2YXIgbGluZXMgPSBzdHIuc3BsaXQoXCJcXG5cIik7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGluZXMubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICAgIGxpbmVzW2pdID0gaW5kZW50ICsgbGluZXNbal07XG4gICAgICAgIH1cbiAgICAgICAgc3RyID0gbGluZXMuam9pbihcIlxcblwiKTtcbiAgICAgICAgcmV0ICs9IHN0ciArIFwiXFxuXCI7XG4gICAgfVxuICAgIGxldmVsLS07XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIE9wZXJhdGlvbmFsRXJyb3IobWVzc2FnZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBPcGVyYXRpb25hbEVycm9yKSlcbiAgICAgICAgcmV0dXJuIG5ldyBPcGVyYXRpb25hbEVycm9yKG1lc3NhZ2UpO1xuICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibmFtZVwiLCBcIk9wZXJhdGlvbmFsRXJyb3JcIik7XG4gICAgbm90RW51bWVyYWJsZVByb3AodGhpcywgXCJtZXNzYWdlXCIsIG1lc3NhZ2UpO1xuICAgIHRoaXMuY2F1c2UgPSBtZXNzYWdlO1xuICAgIHRoaXNbXCJpc09wZXJhdGlvbmFsXCJdID0gdHJ1ZTtcblxuICAgIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgbm90RW51bWVyYWJsZVByb3AodGhpcywgXCJtZXNzYWdlXCIsIG1lc3NhZ2UubWVzc2FnZSk7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwic3RhY2tcIiwgbWVzc2FnZS5zdGFjayk7XG4gICAgfSBlbHNlIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgICAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgICB9XG5cbn1cbmluaGVyaXRzKE9wZXJhdGlvbmFsRXJyb3IsIEVycm9yKTtcblxudmFyIGVycm9yVHlwZXMgPSBFcnJvcltcIl9fQmx1ZWJpcmRFcnJvclR5cGVzX19cIl07XG5pZiAoIWVycm9yVHlwZXMpIHtcbiAgICBlcnJvclR5cGVzID0gT2JqZWN0ZnJlZXplKHtcbiAgICAgICAgQ2FuY2VsbGF0aW9uRXJyb3I6IENhbmNlbGxhdGlvbkVycm9yLFxuICAgICAgICBUaW1lb3V0RXJyb3I6IFRpbWVvdXRFcnJvcixcbiAgICAgICAgT3BlcmF0aW9uYWxFcnJvcjogT3BlcmF0aW9uYWxFcnJvcixcbiAgICAgICAgUmVqZWN0aW9uRXJyb3I6IE9wZXJhdGlvbmFsRXJyb3IsXG4gICAgICAgIEFnZ3JlZ2F0ZUVycm9yOiBBZ2dyZWdhdGVFcnJvclxuICAgIH0pO1xuICAgIGVzNS5kZWZpbmVQcm9wZXJ0eShFcnJvciwgXCJfX0JsdWViaXJkRXJyb3JUeXBlc19fXCIsIHtcbiAgICAgICAgdmFsdWU6IGVycm9yVHlwZXMsXG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgRXJyb3I6IEVycm9yLFxuICAgIFR5cGVFcnJvcjogX1R5cGVFcnJvcixcbiAgICBSYW5nZUVycm9yOiBfUmFuZ2VFcnJvcixcbiAgICBDYW5jZWxsYXRpb25FcnJvcjogZXJyb3JUeXBlcy5DYW5jZWxsYXRpb25FcnJvcixcbiAgICBPcGVyYXRpb25hbEVycm9yOiBlcnJvclR5cGVzLk9wZXJhdGlvbmFsRXJyb3IsXG4gICAgVGltZW91dEVycm9yOiBlcnJvclR5cGVzLlRpbWVvdXRFcnJvcixcbiAgICBBZ2dyZWdhdGVFcnJvcjogZXJyb3JUeXBlcy5BZ2dyZWdhdGVFcnJvcixcbiAgICBXYXJuaW5nOiBXYXJuaW5nXG59O1xuXG59LHtcIi4vZXM1XCI6MTMsXCIuL3V0aWxcIjozNn1dLDEzOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbnZhciBpc0VTNSA9IChmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHJldHVybiB0aGlzID09PSB1bmRlZmluZWQ7XG59KSgpO1xuXG5pZiAoaXNFUzUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgZnJlZXplOiBPYmplY3QuZnJlZXplLFxuICAgICAgICBkZWZpbmVQcm9wZXJ0eTogT2JqZWN0LmRlZmluZVByb3BlcnR5LFxuICAgICAgICBnZXREZXNjcmlwdG9yOiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgICAgICBrZXlzOiBPYmplY3Qua2V5cyxcbiAgICAgICAgbmFtZXM6IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgICAgICBnZXRQcm90b3R5cGVPZjogT2JqZWN0LmdldFByb3RvdHlwZU9mLFxuICAgICAgICBpc0FycmF5OiBBcnJheS5pc0FycmF5LFxuICAgICAgICBpc0VTNTogaXNFUzUsXG4gICAgICAgIHByb3BlcnR5SXNXcml0YWJsZTogZnVuY3Rpb24ob2JqLCBwcm9wKSB7XG4gICAgICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKTtcbiAgICAgICAgICAgIHJldHVybiAhISghZGVzY3JpcHRvciB8fCBkZXNjcmlwdG9yLndyaXRhYmxlIHx8IGRlc2NyaXB0b3Iuc2V0KTtcbiAgICAgICAgfVxuICAgIH07XG59IGVsc2Uge1xuICAgIHZhciBoYXMgPSB7fS5oYXNPd25Qcm9wZXJ0eTtcbiAgICB2YXIgc3RyID0ge30udG9TdHJpbmc7XG4gICAgdmFyIHByb3RvID0ge30uY29uc3RydWN0b3IucHJvdG90eXBlO1xuXG4gICAgdmFyIE9iamVjdEtleXMgPSBmdW5jdGlvbiAobykge1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvKSB7XG4gICAgICAgICAgICBpZiAoaGFzLmNhbGwobywga2V5KSkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuXG4gICAgdmFyIE9iamVjdEdldERlc2NyaXB0b3IgPSBmdW5jdGlvbihvLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuIHt2YWx1ZTogb1trZXldfTtcbiAgICB9O1xuXG4gICAgdmFyIE9iamVjdERlZmluZVByb3BlcnR5ID0gZnVuY3Rpb24gKG8sIGtleSwgZGVzYykge1xuICAgICAgICBvW2tleV0gPSBkZXNjLnZhbHVlO1xuICAgICAgICByZXR1cm4gbztcbiAgICB9O1xuXG4gICAgdmFyIE9iamVjdEZyZWV6ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuXG4gICAgdmFyIE9iamVjdEdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdChvYmopLmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3RvO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBBcnJheUlzQXJyYXkgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAgICAgaXNBcnJheTogQXJyYXlJc0FycmF5LFxuICAgICAgICBrZXlzOiBPYmplY3RLZXlzLFxuICAgICAgICBuYW1lczogT2JqZWN0S2V5cyxcbiAgICAgICAgZGVmaW5lUHJvcGVydHk6IE9iamVjdERlZmluZVByb3BlcnR5LFxuICAgICAgICBnZXREZXNjcmlwdG9yOiBPYmplY3RHZXREZXNjcmlwdG9yLFxuICAgICAgICBmcmVlemU6IE9iamVjdEZyZWV6ZSxcbiAgICAgICAgZ2V0UHJvdG90eXBlT2Y6IE9iamVjdEdldFByb3RvdHlwZU9mLFxuICAgICAgICBpc0VTNTogaXNFUzUsXG4gICAgICAgIHByb3BlcnR5SXNXcml0YWJsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbn0se31dLDE0OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCkge1xudmFyIFByb21pc2VNYXAgPSBQcm9taXNlLm1hcDtcblxuUHJvbWlzZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGZuLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIFByb21pc2VNYXAodGhpcywgZm4sIG9wdGlvbnMsIElOVEVSTkFMKTtcbn07XG5cblByb21pc2UuZmlsdGVyID0gZnVuY3Rpb24gKHByb21pc2VzLCBmbiwgb3B0aW9ucykge1xuICAgIHJldHVybiBQcm9taXNlTWFwKHByb21pc2VzLCBmbiwgb3B0aW9ucywgSU5URVJOQUwpO1xufTtcbn07XG5cbn0se31dLDE1OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBORVhUX0ZJTFRFUikge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIENhbmNlbGxhdGlvbkVycm9yID0gUHJvbWlzZS5DYW5jZWxsYXRpb25FcnJvcjtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgY2F0Y2hGaWx0ZXIgPSBfZGVyZXFfKFwiLi9jYXRjaF9maWx0ZXJcIikoTkVYVF9GSUxURVIpO1xuXG5mdW5jdGlvbiBQYXNzVGhyb3VnaEhhbmRsZXJDb250ZXh0KHByb21pc2UsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB0aGlzLnByb21pc2UgPSBwcm9taXNlO1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcbiAgICB0aGlzLmNhbGxlZCA9IGZhbHNlO1xuICAgIHRoaXMuY2FuY2VsUHJvbWlzZSA9IG51bGw7XG59XG5cblBhc3NUaHJvdWdoSGFuZGxlckNvbnRleHQucHJvdG90eXBlLmlzRmluYWxseUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50eXBlID09PSAwO1xufTtcblxuZnVuY3Rpb24gRmluYWxseUhhbmRsZXJDYW5jZWxSZWFjdGlvbihmaW5hbGx5SGFuZGxlcikge1xuICAgIHRoaXMuZmluYWxseUhhbmRsZXIgPSBmaW5hbGx5SGFuZGxlcjtcbn1cblxuRmluYWxseUhhbmRsZXJDYW5jZWxSZWFjdGlvbi5wcm90b3R5cGUuX3Jlc3VsdENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGNoZWNrQ2FuY2VsKHRoaXMuZmluYWxseUhhbmRsZXIpO1xufTtcblxuZnVuY3Rpb24gY2hlY2tDYW5jZWwoY3R4LCByZWFzb24pIHtcbiAgICBpZiAoY3R4LmNhbmNlbFByb21pc2UgIT0gbnVsbCkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGN0eC5jYW5jZWxQcm9taXNlLl9yZWplY3QocmVhc29uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN0eC5jYW5jZWxQcm9taXNlLl9jYW5jZWwoKTtcbiAgICAgICAgfVxuICAgICAgICBjdHguY2FuY2VsUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHN1Y2NlZWQoKSB7XG4gICAgcmV0dXJuIGZpbmFsbHlIYW5kbGVyLmNhbGwodGhpcywgdGhpcy5wcm9taXNlLl90YXJnZXQoKS5fc2V0dGxlZFZhbHVlKCkpO1xufVxuZnVuY3Rpb24gZmFpbChyZWFzb24pIHtcbiAgICBpZiAoY2hlY2tDYW5jZWwodGhpcywgcmVhc29uKSkgcmV0dXJuO1xuICAgIGVycm9yT2JqLmUgPSByZWFzb247XG4gICAgcmV0dXJuIGVycm9yT2JqO1xufVxuZnVuY3Rpb24gZmluYWxseUhhbmRsZXIocmVhc29uT3JWYWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuICAgIHZhciBoYW5kbGVyID0gdGhpcy5oYW5kbGVyO1xuXG4gICAgaWYgKCF0aGlzLmNhbGxlZCkge1xuICAgICAgICB0aGlzLmNhbGxlZCA9IHRydWU7XG4gICAgICAgIHZhciByZXQgPSB0aGlzLmlzRmluYWxseUhhbmRsZXIoKVxuICAgICAgICAgICAgPyBoYW5kbGVyLmNhbGwocHJvbWlzZS5fYm91bmRWYWx1ZSgpKVxuICAgICAgICAgICAgOiBoYW5kbGVyLmNhbGwocHJvbWlzZS5fYm91bmRWYWx1ZSgpLCByZWFzb25PclZhbHVlKTtcbiAgICAgICAgaWYgKHJldCA9PT0gTkVYVF9GSUxURVIpIHtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHByb21pc2UuX3NldFJldHVybmVkTm9uVW5kZWZpbmVkKCk7XG4gICAgICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShyZXQsIHByb21pc2UpO1xuICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5jZWxQcm9taXNlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZS5faXNDYW5jZWxsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYXNvbiA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IENhbmNlbGxhdGlvbkVycm9yKFwibGF0ZSBjYW5jZWxsYXRpb24gb2JzZXJ2ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlLl9hdHRhY2hFeHRyYVRyYWNlKHJlYXNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvck9iai5lID0gcmVhc29uO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1heWJlUHJvbWlzZS5pc1BlbmRpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9hdHRhY2hDYW5jZWxsYXRpb25DYWxsYmFjayhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgRmluYWxseUhhbmRsZXJDYW5jZWxSZWFjdGlvbih0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1heWJlUHJvbWlzZS5fdGhlbihcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VlZCwgZmFpbCwgdW5kZWZpbmVkLCB0aGlzLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UuaXNSZWplY3RlZCgpKSB7XG4gICAgICAgIGNoZWNrQ2FuY2VsKHRoaXMpO1xuICAgICAgICBlcnJvck9iai5lID0gcmVhc29uT3JWYWx1ZTtcbiAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNoZWNrQ2FuY2VsKHRoaXMpO1xuICAgICAgICByZXR1cm4gcmVhc29uT3JWYWx1ZTtcbiAgICB9XG59XG5cblByb21pc2UucHJvdG90eXBlLl9wYXNzVGhyb3VnaCA9IGZ1bmN0aW9uKGhhbmRsZXIsIHR5cGUsIHN1Y2Nlc3MsIGZhaWwpIHtcbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRoaXMudGhlbigpO1xuICAgIHJldHVybiB0aGlzLl90aGVuKHN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgZmFpbCxcbiAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgbmV3IFBhc3NUaHJvdWdoSGFuZGxlckNvbnRleHQodGhpcywgdHlwZSwgaGFuZGxlciksXG4gICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmxhc3RseSA9XG5Qcm9taXNlLnByb3RvdHlwZVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgIHJldHVybiB0aGlzLl9wYXNzVGhyb3VnaChoYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbGx5SGFuZGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxseUhhbmRsZXIpO1xufTtcblxuXG5Qcm9taXNlLnByb3RvdHlwZS50YXAgPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgIHJldHVybiB0aGlzLl9wYXNzVGhyb3VnaChoYW5kbGVyLCAxLCBmaW5hbGx5SGFuZGxlcik7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50YXBDYXRjaCA9IGZ1bmN0aW9uIChoYW5kbGVyT3JQcmVkaWNhdGUpIHtcbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZihsZW4gPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bhc3NUaHJvdWdoKGhhbmRsZXJPclByZWRpY2F0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbGx5SGFuZGxlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgIHZhciBjYXRjaEluc3RhbmNlcyA9IG5ldyBBcnJheShsZW4gLSAxKSxcbiAgICAgICAgICAgIGogPSAwLCBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuIC0gMTsgKytpKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGlmICh1dGlsLmlzT2JqZWN0KGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgY2F0Y2hJbnN0YW5jZXNbaisrXSA9IGl0ZW07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgICBcInRhcENhdGNoIHN0YXRlbWVudCBwcmVkaWNhdGU6IFwiXG4gICAgICAgICAgICAgICAgICAgICsgXCJleHBlY3RpbmcgYW4gb2JqZWN0IGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGl0ZW0pXG4gICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2hJbnN0YW5jZXMubGVuZ3RoID0gajtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXNzVGhyb3VnaChjYXRjaEZpbHRlcihjYXRjaEluc3RhbmNlcywgaGFuZGxlciwgdGhpcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxseUhhbmRsZXIpO1xuICAgIH1cblxufTtcblxucmV0dXJuIFBhc3NUaHJvdWdoSGFuZGxlckNvbnRleHQ7XG59O1xuXG59LHtcIi4vY2F0Y2hfZmlsdGVyXCI6NyxcIi4vdXRpbFwiOjM2fV0sMTY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVJlamVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSU5URVJOQUwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRyeUNvbnZlcnRUb1Byb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFByb3h5YWJsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcpIHtcbnZhciBlcnJvcnMgPSBfZGVyZXFfKFwiLi9lcnJvcnNcIik7XG52YXIgVHlwZUVycm9yID0gZXJyb3JzLlR5cGVFcnJvcjtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIHlpZWxkSGFuZGxlcnMgPSBbXTtcblxuZnVuY3Rpb24gcHJvbWlzZUZyb21ZaWVsZEhhbmRsZXIodmFsdWUsIHlpZWxkSGFuZGxlcnMsIHRyYWNlUGFyZW50KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB5aWVsZEhhbmRsZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHRyYWNlUGFyZW50Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2goeWllbGRIYW5kbGVyc1tpXSkodmFsdWUpO1xuICAgICAgICB0cmFjZVBhcmVudC5fcG9wQ29udGV4dCgpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgdHJhY2VQYXJlbnQuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgICAgICB2YXIgcmV0ID0gUHJvbWlzZS5yZWplY3QoZXJyb3JPYmouZSk7XG4gICAgICAgICAgICB0cmFjZVBhcmVudC5fcG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShyZXN1bHQsIHRyYWNlUGFyZW50KTtcbiAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHJldHVybiBtYXliZVByb21pc2U7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBQcm9taXNlU3Bhd24oZ2VuZXJhdG9yRnVuY3Rpb24sIHJlY2VpdmVyLCB5aWVsZEhhbmRsZXIsIHN0YWNrKSB7XG4gICAgaWYgKGRlYnVnLmNhbmNlbGxhdGlvbigpKSB7XG4gICAgICAgIHZhciBpbnRlcm5hbCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgdmFyIF9maW5hbGx5UHJvbWlzZSA9IHRoaXMuX2ZpbmFsbHlQcm9taXNlID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICB0aGlzLl9wcm9taXNlID0gaW50ZXJuYWwubGFzdGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9maW5hbGx5UHJvbWlzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGludGVybmFsLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgICAgICBpbnRlcm5hbC5fc2V0T25DYW5jZWwodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICBwcm9taXNlLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIH1cbiAgICB0aGlzLl9zdGFjayA9IHN0YWNrO1xuICAgIHRoaXMuX2dlbmVyYXRvckZ1bmN0aW9uID0gZ2VuZXJhdG9yRnVuY3Rpb247XG4gICAgdGhpcy5fcmVjZWl2ZXIgPSByZWNlaXZlcjtcbiAgICB0aGlzLl9nZW5lcmF0b3IgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5feWllbGRIYW5kbGVycyA9IHR5cGVvZiB5aWVsZEhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICA/IFt5aWVsZEhhbmRsZXJdLmNvbmNhdCh5aWVsZEhhbmRsZXJzKVxuICAgICAgICA6IHlpZWxkSGFuZGxlcnM7XG4gICAgdGhpcy5feWllbGRlZFByb21pc2UgPSBudWxsO1xuICAgIHRoaXMuX2NhbmNlbGxhdGlvblBoYXNlID0gZmFsc2U7XG59XG51dGlsLmluaGVyaXRzKFByb21pc2VTcGF3biwgUHJveHlhYmxlKTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5faXNSZXNvbHZlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlID09PSBudWxsO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fY2xlYW51cCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3Byb21pc2UgPSB0aGlzLl9nZW5lcmF0b3IgPSBudWxsO1xuICAgIGlmIChkZWJ1Zy5jYW5jZWxsYXRpb24oKSAmJiB0aGlzLl9maW5hbGx5UHJvbWlzZSAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9maW5hbGx5UHJvbWlzZS5fZnVsZmlsbCgpO1xuICAgICAgICB0aGlzLl9maW5hbGx5UHJvbWlzZSA9IG51bGw7XG4gICAgfVxufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fcHJvbWlzZUNhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9pc1Jlc29sdmVkKCkpIHJldHVybjtcbiAgICB2YXIgaW1wbGVtZW50c1JldHVybiA9IHR5cGVvZiB0aGlzLl9nZW5lcmF0b3JbXCJyZXR1cm5cIl0gIT09IFwidW5kZWZpbmVkXCI7XG5cbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmICghaW1wbGVtZW50c1JldHVybikge1xuICAgICAgICB2YXIgcmVhc29uID0gbmV3IFByb21pc2UuQ2FuY2VsbGF0aW9uRXJyb3IoXG4gICAgICAgICAgICBcImdlbmVyYXRvciAucmV0dXJuKCkgc2VudGluZWxcIik7XG4gICAgICAgIFByb21pc2UuY29yb3V0aW5lLnJldHVyblNlbnRpbmVsID0gcmVhc29uO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9hdHRhY2hFeHRyYVRyYWNlKHJlYXNvbik7XG4gICAgICAgIHRoaXMuX3Byb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgIHJlc3VsdCA9IHRyeUNhdGNoKHRoaXMuX2dlbmVyYXRvcltcInRocm93XCJdKS5jYWxsKHRoaXMuX2dlbmVyYXRvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbik7XG4gICAgICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgICAgICByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9nZW5lcmF0b3JbXCJyZXR1cm5cIl0pLmNhbGwodGhpcy5fZ2VuZXJhdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICB9XG4gICAgdGhpcy5fY2FuY2VsbGF0aW9uUGhhc2UgPSB0cnVlO1xuICAgIHRoaXMuX3lpZWxkZWRQcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLl9jb250aW51ZShyZXN1bHQpO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5feWllbGRlZFByb21pc2UgPSBudWxsO1xuICAgIHRoaXMuX3Byb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHRoaXMuX2dlbmVyYXRvci5uZXh0KS5jYWxsKHRoaXMuX2dlbmVyYXRvciwgdmFsdWUpO1xuICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICB0aGlzLl9jb250aW51ZShyZXN1bHQpO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fcHJvbWlzZVJlamVjdGVkID0gZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgdGhpcy5feWllbGRlZFByb21pc2UgPSBudWxsO1xuICAgIHRoaXMuX3Byb21pc2UuX2F0dGFjaEV4dHJhVHJhY2UocmVhc29uKTtcbiAgICB0aGlzLl9wcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9nZW5lcmF0b3JbXCJ0aHJvd1wiXSlcbiAgICAgICAgLmNhbGwodGhpcy5fZ2VuZXJhdG9yLCByZWFzb24pO1xuICAgIHRoaXMuX3Byb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICB0aGlzLl9jb250aW51ZShyZXN1bHQpO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fcmVzdWx0Q2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3lpZWxkZWRQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXMuX3lpZWxkZWRQcm9taXNlO1xuICAgICAgICB0aGlzLl95aWVsZGVkUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHByb21pc2UuY2FuY2VsKCk7XG4gICAgfVxufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5wcm9taXNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fcnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2dlbmVyYXRvciA9IHRoaXMuX2dlbmVyYXRvckZ1bmN0aW9uLmNhbGwodGhpcy5fcmVjZWl2ZXIpO1xuICAgIHRoaXMuX3JlY2VpdmVyID1cbiAgICAgICAgdGhpcy5fZ2VuZXJhdG9yRnVuY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcHJvbWlzZUZ1bGZpbGxlZCh1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZVNwYXduLnByb3RvdHlwZS5fY29udGludWUgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlO1xuICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHRoaXMuX2NsZWFudXAoKTtcbiAgICAgICAgaWYgKHRoaXMuX2NhbmNlbGxhdGlvblBoYXNlKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZS5jYW5jZWwoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhyZXN1bHQuZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlID0gcmVzdWx0LnZhbHVlO1xuICAgIGlmIChyZXN1bHQuZG9uZSA9PT0gdHJ1ZSkge1xuICAgICAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgICAgIGlmICh0aGlzLl9jYW5jZWxsYXRpb25QaGFzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuY2FuY2VsKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHZhbHVlLCB0aGlzLl9wcm9taXNlKTtcbiAgICAgICAgaWYgKCEobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgICAgIG1heWJlUHJvbWlzZSA9XG4gICAgICAgICAgICAgICAgcHJvbWlzZUZyb21ZaWVsZEhhbmRsZXIobWF5YmVQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3lpZWxkSGFuZGxlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHJvbWlzZSk7XG4gICAgICAgICAgICBpZiAobWF5YmVQcm9taXNlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvbWlzZVJlamVjdGVkKFxuICAgICAgICAgICAgICAgICAgICBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJBIHZhbHVlICVzIHdhcyB5aWVsZGVkIHRoYXQgY291bGQgbm90IGJlIHRyZWF0ZWQgYXMgYSBwcm9taXNlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVxcdTAwMGFcIi5yZXBsYWNlKFwiJXNcIiwgU3RyaW5nKHZhbHVlKSkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJGcm9tIGNvcm91dGluZTpcXHUwMDBhXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc3RhY2suc3BsaXQoXCJcXG5cIikuc2xpY2UoMSwgLTcpLmpvaW4oXCJcXG5cIilcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG1heWJlUHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgIHZhciBiaXRGaWVsZCA9IG1heWJlUHJvbWlzZS5fYml0RmllbGQ7XG4gICAgICAgIDtcbiAgICAgICAgaWYgKCgoYml0RmllbGQgJiA1MDM5NzE4NCkgPT09IDApKSB7XG4gICAgICAgICAgICB0aGlzLl95aWVsZGVkUHJvbWlzZSA9IG1heWJlUHJvbWlzZTtcbiAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fcHJveHkodGhpcywgbnVsbCk7XG4gICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDMzNTU0NDMyKSAhPT0gMCkpIHtcbiAgICAgICAgICAgIFByb21pc2UuX2FzeW5jLmludm9rZShcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9taXNlRnVsZmlsbGVkLCB0aGlzLCBtYXliZVByb21pc2UuX3ZhbHVlKClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgICAgIFByb21pc2UuX2FzeW5jLmludm9rZShcbiAgICAgICAgICAgICAgICB0aGlzLl9wcm9taXNlUmVqZWN0ZWQsIHRoaXMsIG1heWJlUHJvbWlzZS5fcmVhc29uKClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9wcm9taXNlQ2FuY2VsbGVkKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Qcm9taXNlLmNvcm91dGluZSA9IGZ1bmN0aW9uIChnZW5lcmF0b3JGdW5jdGlvbiwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZ2VuZXJhdG9yRnVuY3Rpb24gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZ2VuZXJhdG9yRnVuY3Rpb24gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgdmFyIHlpZWxkSGFuZGxlciA9IE9iamVjdChvcHRpb25zKS55aWVsZEhhbmRsZXI7XG4gICAgdmFyIFByb21pc2VTcGF3biQgPSBQcm9taXNlU3Bhd247XG4gICAgdmFyIHN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGdlbmVyYXRvciA9IGdlbmVyYXRvckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBzcGF3biA9IG5ldyBQcm9taXNlU3Bhd24kKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB5aWVsZEhhbmRsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrKTtcbiAgICAgICAgdmFyIHJldCA9IHNwYXduLnByb21pc2UoKTtcbiAgICAgICAgc3Bhd24uX2dlbmVyYXRvciA9IGdlbmVyYXRvcjtcbiAgICAgICAgc3Bhd24uX3Byb21pc2VGdWxmaWxsZWQodW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5jb3JvdXRpbmUuYWRkWWllbGRIYW5kbGVyID0gZnVuY3Rpb24oZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGZuKSk7XG4gICAgfVxuICAgIHlpZWxkSGFuZGxlcnMucHVzaChmbik7XG59O1xuXG5Qcm9taXNlLnNwYXduID0gZnVuY3Rpb24gKGdlbmVyYXRvckZ1bmN0aW9uKSB7XG4gICAgZGVidWcuZGVwcmVjYXRlZChcIlByb21pc2Uuc3Bhd24oKVwiLCBcIlByb21pc2UuY29yb3V0aW5lKClcIik7XG4gICAgaWYgKHR5cGVvZiBnZW5lcmF0b3JGdW5jdGlvbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJnZW5lcmF0b3JGdW5jdGlvbiBtdXN0IGJlIGEgZnVuY3Rpb25cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xuICAgIH1cbiAgICB2YXIgc3Bhd24gPSBuZXcgUHJvbWlzZVNwYXduKGdlbmVyYXRvckZ1bmN0aW9uLCB0aGlzKTtcbiAgICB2YXIgcmV0ID0gc3Bhd24ucHJvbWlzZSgpO1xuICAgIHNwYXduLl9ydW4oUHJvbWlzZS5zcGF3bik7XG4gICAgcmV0dXJuIHJldDtcbn07XG59O1xuXG59LHtcIi4vZXJyb3JzXCI6MTIsXCIuL3V0aWxcIjozNn1dLDE3OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPVxuZnVuY3Rpb24oUHJvbWlzZSwgUHJvbWlzZUFycmF5LCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBJTlRFUk5BTCwgYXN5bmMsXG4gICAgICAgICBnZXREb21haW4pIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBjYW5FdmFsdWF0ZSA9IHV0aWwuY2FuRXZhbHVhdGU7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIGVycm9yT2JqID0gdXRpbC5lcnJvck9iajtcbnZhciByZWplY3Q7XG5cbmlmICghdHJ1ZSkge1xuaWYgKGNhbkV2YWx1YXRlKSB7XG4gICAgdmFyIHRoZW5DYWxsYmFjayA9IGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInZhbHVlXCIsIFwiaG9sZGVyXCIsIFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaG9sZGVyLnBJbmRleCA9IHZhbHVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaG9sZGVyLmNoZWNrRnVsZmlsbG1lbnQodGhpcyk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgXCIucmVwbGFjZSgvSW5kZXgvZywgaSkpO1xuICAgIH07XG5cbiAgICB2YXIgcHJvbWlzZVNldHRlciA9IGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInByb21pc2VcIiwgXCJob2xkZXJcIiwgXCIgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaG9sZGVyLnBJbmRleCA9IHByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgXCIucmVwbGFjZSgvSW5kZXgvZywgaSkpO1xuICAgIH07XG5cbiAgICB2YXIgZ2VuZXJhdGVIb2xkZXJDbGFzcyA9IGZ1bmN0aW9uKHRvdGFsKSB7XG4gICAgICAgIHZhciBwcm9wcyA9IG5ldyBBcnJheSh0b3RhbCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHByb3BzW2ldID0gXCJ0aGlzLnBcIiArIChpKzEpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhc3NpZ25tZW50ID0gcHJvcHMuam9pbihcIiA9IFwiKSArIFwiID0gbnVsbDtcIjtcbiAgICAgICAgdmFyIGNhbmNlbGxhdGlvbkNvZGU9IFwidmFyIHByb21pc2U7XFxuXCIgKyBwcm9wcy5tYXAoZnVuY3Rpb24ocHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBwcm9taXNlID0gXCIgKyBwcm9wICsgXCI7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGlmIChwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLmNhbmNlbCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgXCI7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIik7XG4gICAgICAgIHZhciBwYXNzZWRBcmd1bWVudHMgPSBwcm9wcy5qb2luKFwiLCBcIik7XG4gICAgICAgIHZhciBuYW1lID0gXCJIb2xkZXIkXCIgKyB0b3RhbDtcblxuXG4gICAgICAgIHZhciBjb2RlID0gXCJyZXR1cm4gZnVuY3Rpb24odHJ5Q2F0Y2gsIGVycm9yT2JqLCBQcm9taXNlLCBhc3luYykgeyAgICBcXG5cXFxuICAgICAgICAgICAgJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgZnVuY3Rpb24gW1RoZU5hbWVdKGZuKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIFtUaGVQcm9wZXJ0aWVzXSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHRoaXMuZm4gPSBmbjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHRoaXMuYXN5bmNOZWVkZWQgPSB0cnVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHRoaXMubm93ID0gMDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgW1RoZU5hbWVdLnByb3RvdHlwZS5fY2FsbEZ1bmN0aW9uID0gZnVuY3Rpb24ocHJvbWlzZSkgeyAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHByb21pc2UuX3B1c2hDb250ZXh0KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHZhciByZXQgPSB0cnlDYXRjaCh0aGlzLmZuKShbVGhlUGFzc2VkQXJndW1lbnRzXSk7ICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHByb21pc2UuX3BvcENvbnRleHQoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IGVycm9yT2JqKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhyZXQuZSwgZmFsc2UpOyAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2socmV0KTsgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgW1RoZU5hbWVdLnByb3RvdHlwZS5jaGVja0Z1bGZpbGxtZW50ID0gZnVuY3Rpb24ocHJvbWlzZSkgeyAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHZhciBub3cgPSArK3RoaXMubm93OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIGlmIChub3cgPT09IFtUaGVUb3RhbF0pIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5hc3luY05lZWRlZCkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMuaW52b2tlKHRoaXMuX2NhbGxGdW5jdGlvbiwgdGhpcywgcHJvbWlzZSk7ICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2FsbEZ1bmN0aW9uKHByb21pc2UpOyAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgW1RoZU5hbWVdLnByb3RvdHlwZS5fcmVzdWx0Q2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7ICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIFtDYW5jZWxsYXRpb25Db2RlXSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgcmV0dXJuIFtUaGVOYW1lXTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICB9KHRyeUNhdGNoLCBlcnJvck9iaiwgUHJvbWlzZSwgYXN5bmMpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIjtcblxuICAgICAgICBjb2RlID0gY29kZS5yZXBsYWNlKC9cXFtUaGVOYW1lXFxdL2csIG5hbWUpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxbVGhlVG90YWxcXF0vZywgdG90YWwpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxbVGhlUGFzc2VkQXJndW1lbnRzXFxdL2csIHBhc3NlZEFyZ3VtZW50cylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXFtUaGVQcm9wZXJ0aWVzXFxdL2csIGFzc2lnbm1lbnQpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxbQ2FuY2VsbGF0aW9uQ29kZVxcXS9nLCBjYW5jZWxsYXRpb25Db2RlKTtcblxuICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwidHJ5Q2F0Y2hcIiwgXCJlcnJvck9ialwiLCBcIlByb21pc2VcIiwgXCJhc3luY1wiLCBjb2RlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRyeUNhdGNoLCBlcnJvck9iaiwgUHJvbWlzZSwgYXN5bmMpO1xuICAgIH07XG5cbiAgICB2YXIgaG9sZGVyQ2xhc3NlcyA9IFtdO1xuICAgIHZhciB0aGVuQ2FsbGJhY2tzID0gW107XG4gICAgdmFyIHByb21pc2VTZXR0ZXJzID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDg7ICsraSkge1xuICAgICAgICBob2xkZXJDbGFzc2VzLnB1c2goZ2VuZXJhdGVIb2xkZXJDbGFzcyhpICsgMSkpO1xuICAgICAgICB0aGVuQ2FsbGJhY2tzLnB1c2godGhlbkNhbGxiYWNrKGkgKyAxKSk7XG4gICAgICAgIHByb21pc2VTZXR0ZXJzLnB1c2gocHJvbWlzZVNldHRlcihpICsgMSkpO1xuICAgIH1cblxuICAgIHJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgdGhpcy5fcmVqZWN0KHJlYXNvbik7XG4gICAgfTtcbn19XG5cblByb21pc2Uuam9pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbGFzdCA9IGFyZ3VtZW50cy5sZW5ndGggLSAxO1xuICAgIHZhciBmbjtcbiAgICBpZiAobGFzdCA+IDAgJiYgdHlwZW9mIGFyZ3VtZW50c1tsYXN0XSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGZuID0gYXJndW1lbnRzW2xhc3RdO1xuICAgICAgICBpZiAoIXRydWUpIHtcbiAgICAgICAgICAgIGlmIChsYXN0IDw9IDggJiYgY2FuRXZhbHVhdGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICAgICAgICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICAgICAgICAgICAgICB2YXIgSG9sZGVyQ2xhc3MgPSBob2xkZXJDbGFzc2VzW2xhc3QgLSAxXTtcbiAgICAgICAgICAgICAgICB2YXIgaG9sZGVyID0gbmV3IEhvbGRlckNsYXNzKGZuKTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gdGhlbkNhbGxiYWNrcztcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFzdDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKGFyZ3VtZW50c1tpXSwgcmV0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYml0RmllbGQgPSBtYXliZVByb21pc2UuX2JpdEZpZWxkO1xuICAgICAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCgoYml0RmllbGQgJiA1MDM5NzE4NCkgPT09IDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl90aGVuKGNhbGxiYWNrc1tpXSwgcmVqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsIHJldCwgaG9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlU2V0dGVyc1tpXShtYXliZVByb21pc2UsIGhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGVyLmFzeW5jTmVlZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmNhbGwocmV0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fdmFsdWUoKSwgaG9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQuX3JlamVjdChtYXliZVByb21pc2UuX3JlYXNvbigpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0Ll9jYW5jZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5jYWxsKHJldCwgbWF5YmVQcm9taXNlLCBob2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFyZXQuX2lzRmF0ZVNlYWxlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChob2xkZXIuYXN5bmNOZWVkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkb21haW4gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob2xkZXIuZm4gPSB1dGlsLmRvbWFpbkJpbmQoZG9tYWluLCBob2xkZXIuZm4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldC5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldC5fc2V0T25DYW5jZWwoaG9sZGVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTs7XG4gICAgaWYgKGZuKSBhcmdzLnBvcCgpO1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZUFycmF5KGFyZ3MpLnByb21pc2UoKTtcbiAgICByZXR1cm4gZm4gIT09IHVuZGVmaW5lZCA/IHJldC5zcHJlYWQoZm4pIDogcmV0O1xufTtcblxufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDE4OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBQcm9taXNlQXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVJlamVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5Q29udmVydFRvUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSU5URVJOQUwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKSB7XG52YXIgZ2V0RG9tYWluID0gUHJvbWlzZS5fZ2V0RG9tYWluO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgYXN5bmMgPSBQcm9taXNlLl9hc3luYztcblxuZnVuY3Rpb24gTWFwcGluZ1Byb21pc2VBcnJheShwcm9taXNlcywgZm4sIGxpbWl0LCBfZmlsdGVyKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3RvciQocHJvbWlzZXMpO1xuICAgIHRoaXMuX3Byb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgdmFyIGRvbWFpbiA9IGdldERvbWFpbigpO1xuICAgIHRoaXMuX2NhbGxiYWNrID0gZG9tYWluID09PSBudWxsID8gZm4gOiB1dGlsLmRvbWFpbkJpbmQoZG9tYWluLCBmbik7XG4gICAgdGhpcy5fcHJlc2VydmVkVmFsdWVzID0gX2ZpbHRlciA9PT0gSU5URVJOQUxcbiAgICAgICAgPyBuZXcgQXJyYXkodGhpcy5sZW5ndGgoKSlcbiAgICAgICAgOiBudWxsO1xuICAgIHRoaXMuX2xpbWl0ID0gbGltaXQ7XG4gICAgdGhpcy5faW5GbGlnaHQgPSAwO1xuICAgIHRoaXMuX3F1ZXVlID0gW107XG4gICAgYXN5bmMuaW52b2tlKHRoaXMuX2FzeW5jSW5pdCwgdGhpcywgdW5kZWZpbmVkKTtcbn1cbnV0aWwuaW5oZXJpdHMoTWFwcGluZ1Byb21pc2VBcnJheSwgUHJvbWlzZUFycmF5KTtcblxuTWFwcGluZ1Byb21pc2VBcnJheS5wcm90b3R5cGUuX2FzeW5jSW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2luaXQkKHVuZGVmaW5lZCwgLTIpO1xufTtcblxuTWFwcGluZ1Byb21pc2VBcnJheS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuTWFwcGluZ1Byb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VGdWxmaWxsZWQgPSBmdW5jdGlvbiAodmFsdWUsIGluZGV4KSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMuX3ZhbHVlcztcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcbiAgICB2YXIgcHJlc2VydmVkVmFsdWVzID0gdGhpcy5fcHJlc2VydmVkVmFsdWVzO1xuICAgIHZhciBsaW1pdCA9IHRoaXMuX2xpbWl0O1xuXG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgICBpbmRleCA9IChpbmRleCAqIC0xKSAtIDE7XG4gICAgICAgIHZhbHVlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgaWYgKGxpbWl0ID49IDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2luRmxpZ2h0LS07XG4gICAgICAgICAgICB0aGlzLl9kcmFpblF1ZXVlKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNSZXNvbHZlZCgpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChsaW1pdCA+PSAxICYmIHRoaXMuX2luRmxpZ2h0ID49IGxpbWl0KSB7XG4gICAgICAgICAgICB2YWx1ZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9xdWV1ZS5wdXNoKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc2VydmVkVmFsdWVzICE9PSBudWxsKSBwcmVzZXJ2ZWRWYWx1ZXNbaW5kZXhdID0gdmFsdWU7XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9jYWxsYmFjaztcbiAgICAgICAgdmFyIHJlY2VpdmVyID0gcHJvbWlzZS5fYm91bmRWYWx1ZSgpO1xuICAgICAgICBwcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2goY2FsbGJhY2spLmNhbGwocmVjZWl2ZXIsIHZhbHVlLCBpbmRleCwgbGVuZ3RoKTtcbiAgICAgICAgdmFyIHByb21pc2VDcmVhdGVkID0gcHJvbWlzZS5fcG9wQ29udGV4dCgpO1xuICAgICAgICBkZWJ1Zy5jaGVja0ZvcmdvdHRlblJldHVybnMoXG4gICAgICAgICAgICByZXQsXG4gICAgICAgICAgICBwcm9taXNlQ3JlYXRlZCxcbiAgICAgICAgICAgIHByZXNlcnZlZFZhbHVlcyAhPT0gbnVsbCA/IFwiUHJvbWlzZS5maWx0ZXJcIiA6IFwiUHJvbWlzZS5tYXBcIixcbiAgICAgICAgICAgIHByb21pc2VcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgIHRoaXMuX3JlamVjdChyZXQuZSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHJldCwgdGhpcy5fcHJvbWlzZSk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICBtYXliZVByb21pc2UgPSBtYXliZVByb21pc2UuX3RhcmdldCgpO1xuICAgICAgICAgICAgdmFyIGJpdEZpZWxkID0gbWF5YmVQcm9taXNlLl9iaXRGaWVsZDtcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmICgoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICAgICAgICAgIGlmIChsaW1pdCA+PSAxKSB0aGlzLl9pbkZsaWdodCsrO1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpbmRleF0gPSBtYXliZVByb21pc2U7XG4gICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9wcm94eSh0aGlzLCAoaW5kZXggKyAxKSAqIC0xKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgICAgICAgICAgcmV0ID0gbWF5YmVQcm9taXNlLl92YWx1ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMTY3NzcyMTYpICE9PSAwKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlamVjdChtYXliZVByb21pc2UuX3JlYXNvbigpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWVzW2luZGV4XSA9IHJldDtcbiAgICB9XG4gICAgdmFyIHRvdGFsUmVzb2x2ZWQgPSArK3RoaXMuX3RvdGFsUmVzb2x2ZWQ7XG4gICAgaWYgKHRvdGFsUmVzb2x2ZWQgPj0gbGVuZ3RoKSB7XG4gICAgICAgIGlmIChwcmVzZXJ2ZWRWYWx1ZXMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZpbHRlcih2YWx1ZXMsIHByZXNlcnZlZFZhbHVlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlKHZhbHVlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbk1hcHBpbmdQcm9taXNlQXJyYXkucHJvdG90eXBlLl9kcmFpblF1ZXVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBxdWV1ZSA9IHRoaXMuX3F1ZXVlO1xuICAgIHZhciBsaW1pdCA9IHRoaXMuX2xpbWl0O1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG4gICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDAgJiYgdGhpcy5faW5GbGlnaHQgPCBsaW1pdCkge1xuICAgICAgICBpZiAodGhpcy5faXNSZXNvbHZlZCgpKSByZXR1cm47XG4gICAgICAgIHZhciBpbmRleCA9IHF1ZXVlLnBvcCgpO1xuICAgICAgICB0aGlzLl9wcm9taXNlRnVsZmlsbGVkKHZhbHVlc1tpbmRleF0sIGluZGV4KTtcbiAgICB9XG59O1xuXG5NYXBwaW5nUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fZmlsdGVyID0gZnVuY3Rpb24gKGJvb2xlYW5zLCB2YWx1ZXMpIHtcbiAgICB2YXIgbGVuID0gdmFsdWVzLmxlbmd0aDtcbiAgICB2YXIgcmV0ID0gbmV3IEFycmF5KGxlbik7XG4gICAgdmFyIGogPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgaWYgKGJvb2xlYW5zW2ldKSByZXRbaisrXSA9IHZhbHVlc1tpXTtcbiAgICB9XG4gICAgcmV0Lmxlbmd0aCA9IGo7XG4gICAgdGhpcy5fcmVzb2x2ZShyZXQpO1xufTtcblxuTWFwcGluZ1Byb21pc2VBcnJheS5wcm90b3R5cGUucHJlc2VydmVkVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wcmVzZXJ2ZWRWYWx1ZXM7XG59O1xuXG5mdW5jdGlvbiBtYXAocHJvbWlzZXMsIGZuLCBvcHRpb25zLCBfZmlsdGVyKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJleHBlY3RpbmcgYSBmdW5jdGlvbiBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhmbikpO1xuICAgIH1cblxuICAgIHZhciBsaW1pdCA9IDA7XG4gICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwib2JqZWN0XCIgJiYgb3B0aW9ucyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNvbmN1cnJlbmN5ICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxuICAgICAgICAgICAgICAgICAgICBuZXcgVHlwZUVycm9yKFwiJ2NvbmN1cnJlbmN5JyBtdXN0IGJlIGEgbnVtYmVyIGJ1dCBpdCBpcyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlsLmNsYXNzU3RyaW5nKG9wdGlvbnMuY29uY3VycmVuY3kpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW1pdCA9IG9wdGlvbnMuY29uY3VycmVuY3k7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9wdGlvbnMgYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgYnV0IGl0IGlzIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC5jbGFzc1N0cmluZyhvcHRpb25zKSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxpbWl0ID0gdHlwZW9mIGxpbWl0ID09PSBcIm51bWJlclwiICYmXG4gICAgICAgIGlzRmluaXRlKGxpbWl0KSAmJiBsaW1pdCA+PSAxID8gbGltaXQgOiAwO1xuICAgIHJldHVybiBuZXcgTWFwcGluZ1Byb21pc2VBcnJheShwcm9taXNlcywgZm4sIGxpbWl0LCBfZmlsdGVyKS5wcm9taXNlKCk7XG59XG5cblByb21pc2UucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuICAgIHJldHVybiBtYXAodGhpcywgZm4sIG9wdGlvbnMsIG51bGwpO1xufTtcblxuUHJvbWlzZS5tYXAgPSBmdW5jdGlvbiAocHJvbWlzZXMsIGZuLCBvcHRpb25zLCBfZmlsdGVyKSB7XG4gICAgcmV0dXJuIG1hcChwcm9taXNlcywgZm4sIG9wdGlvbnMsIF9maWx0ZXIpO1xufTtcblxuXG59O1xuXG59LHtcIi4vdXRpbFwiOjM2fV0sMTk6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9XG5mdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uLCBkZWJ1Zykge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcblxuUHJvbWlzZS5tZXRob2QgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFByb21pc2UuVHlwZUVycm9yKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgcmV0Ll9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgICAgICByZXQuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRyeUNhdGNoKGZuKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgcHJvbWlzZUNyZWF0ZWQgPSByZXQuX3BvcENvbnRleHQoKTtcbiAgICAgICAgZGVidWcuY2hlY2tGb3Jnb3R0ZW5SZXR1cm5zKFxuICAgICAgICAgICAgdmFsdWUsIHByb21pc2VDcmVhdGVkLCBcIlByb21pc2UubWV0aG9kXCIsIHJldCk7XG4gICAgICAgIHJldC5fcmVzb2x2ZUZyb21TeW5jVmFsdWUodmFsdWUpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG59O1xuXG5Qcm9taXNlLmF0dGVtcHQgPSBQcm9taXNlW1widHJ5XCJdID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJleHBlY3RpbmcgYSBmdW5jdGlvbiBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhmbikpO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICByZXQuX3B1c2hDb250ZXh0KCk7XG4gICAgdmFyIHZhbHVlO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBkZWJ1Zy5kZXByZWNhdGVkKFwiY2FsbGluZyBQcm9taXNlLnRyeSB3aXRoIG1vcmUgdGhhbiAxIGFyZ3VtZW50XCIpO1xuICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgY3R4ID0gYXJndW1lbnRzWzJdO1xuICAgICAgICB2YWx1ZSA9IHV0aWwuaXNBcnJheShhcmcpID8gdHJ5Q2F0Y2goZm4pLmFwcGx5KGN0eCwgYXJnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdHJ5Q2F0Y2goZm4pLmNhbGwoY3R4LCBhcmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gdHJ5Q2F0Y2goZm4pKCk7XG4gICAgfVxuICAgIHZhciBwcm9taXNlQ3JlYXRlZCA9IHJldC5fcG9wQ29udGV4dCgpO1xuICAgIGRlYnVnLmNoZWNrRm9yZ290dGVuUmV0dXJucyhcbiAgICAgICAgdmFsdWUsIHByb21pc2VDcmVhdGVkLCBcIlByb21pc2UudHJ5XCIsIHJldCk7XG4gICAgcmV0Ll9yZXNvbHZlRnJvbVN5bmNWYWx1ZSh2YWx1ZSk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZXNvbHZlRnJvbVN5bmNWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdXRpbC5lcnJvck9iaikge1xuICAgICAgICB0aGlzLl9yZWplY3RDYWxsYmFjayh2YWx1ZS5lLCBmYWxzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlLCB0cnVlKTtcbiAgICB9XG59O1xufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDIwOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIG1heWJlV3JhcEFzRXJyb3IgPSB1dGlsLm1heWJlV3JhcEFzRXJyb3I7XG52YXIgZXJyb3JzID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpO1xudmFyIE9wZXJhdGlvbmFsRXJyb3IgPSBlcnJvcnMuT3BlcmF0aW9uYWxFcnJvcjtcbnZhciBlczUgPSBfZGVyZXFfKFwiLi9lczVcIik7XG5cbmZ1bmN0aW9uIGlzVW50eXBlZEVycm9yKG9iaikge1xuICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBFcnJvciAmJlxuICAgICAgICBlczUuZ2V0UHJvdG90eXBlT2Yob2JqKSA9PT0gRXJyb3IucHJvdG90eXBlO1xufVxuXG52YXIgckVycm9yS2V5ID0gL14oPzpuYW1lfG1lc3NhZ2V8c3RhY2t8Y2F1c2UpJC87XG5mdW5jdGlvbiB3cmFwQXNPcGVyYXRpb25hbEVycm9yKG9iaikge1xuICAgIHZhciByZXQ7XG4gICAgaWYgKGlzVW50eXBlZEVycm9yKG9iaikpIHtcbiAgICAgICAgcmV0ID0gbmV3IE9wZXJhdGlvbmFsRXJyb3Iob2JqKTtcbiAgICAgICAgcmV0Lm5hbWUgPSBvYmoubmFtZTtcbiAgICAgICAgcmV0Lm1lc3NhZ2UgPSBvYmoubWVzc2FnZTtcbiAgICAgICAgcmV0LnN0YWNrID0gb2JqLnN0YWNrO1xuICAgICAgICB2YXIga2V5cyA9IGVzNS5rZXlzKG9iaik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBpZiAoIXJFcnJvcktleS50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHV0aWwubWFya0FzT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gbm9kZWJhY2tGb3JQcm9taXNlKHByb21pc2UsIG11bHRpQXJncykge1xuICAgIHJldHVybiBmdW5jdGlvbihlcnIsIHZhbHVlKSB7XG4gICAgICAgIGlmIChwcm9taXNlID09PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHZhciB3cmFwcGVkID0gd3JhcEFzT3BlcmF0aW9uYWxFcnJvcihtYXliZVdyYXBBc0Vycm9yKGVycikpO1xuICAgICAgICAgICAgcHJvbWlzZS5fYXR0YWNoRXh0cmFUcmFjZSh3cmFwcGVkKTtcbiAgICAgICAgICAgIHByb21pc2UuX3JlamVjdCh3cmFwcGVkKTtcbiAgICAgICAgfSBlbHNlIGlmICghbXVsdGlBcmdzKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9mdWxmaWxsKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpOztcbiAgICAgICAgICAgIHByb21pc2UuX2Z1bGZpbGwoYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBub2RlYmFja0ZvclByb21pc2U7XG5cbn0se1wiLi9lcnJvcnNcIjoxMixcIi4vZXM1XCI6MTMsXCIuL3V0aWxcIjozNn1dLDIxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgYXN5bmMgPSBQcm9taXNlLl9hc3luYztcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xuXG5mdW5jdGlvbiBzcHJlYWRBZGFwdGVyKHZhbCwgbm9kZWJhY2spIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgaWYgKCF1dGlsLmlzQXJyYXkodmFsKSkgcmV0dXJuIHN1Y2Nlc3NBZGFwdGVyLmNhbGwocHJvbWlzZSwgdmFsLCBub2RlYmFjayk7XG4gICAgdmFyIHJldCA9XG4gICAgICAgIHRyeUNhdGNoKG5vZGViYWNrKS5hcHBseShwcm9taXNlLl9ib3VuZFZhbHVlKCksIFtudWxsXS5jb25jYXQodmFsKSk7XG4gICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgYXN5bmMudGhyb3dMYXRlcihyZXQuZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdWNjZXNzQWRhcHRlcih2YWwsIG5vZGViYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciByZWNlaXZlciA9IHByb21pc2UuX2JvdW5kVmFsdWUoKTtcbiAgICB2YXIgcmV0ID0gdmFsID09PSB1bmRlZmluZWRcbiAgICAgICAgPyB0cnlDYXRjaChub2RlYmFjaykuY2FsbChyZWNlaXZlciwgbnVsbClcbiAgICAgICAgOiB0cnlDYXRjaChub2RlYmFjaykuY2FsbChyZWNlaXZlciwgbnVsbCwgdmFsKTtcbiAgICBpZiAocmV0ID09PSBlcnJvck9iaikge1xuICAgICAgICBhc3luYy50aHJvd0xhdGVyKHJldC5lKTtcbiAgICB9XG59XG5mdW5jdGlvbiBlcnJvckFkYXB0ZXIocmVhc29uLCBub2RlYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICBpZiAoIXJlYXNvbikge1xuICAgICAgICB2YXIgbmV3UmVhc29uID0gbmV3IEVycm9yKHJlYXNvbiArIFwiXCIpO1xuICAgICAgICBuZXdSZWFzb24uY2F1c2UgPSByZWFzb247XG4gICAgICAgIHJlYXNvbiA9IG5ld1JlYXNvbjtcbiAgICB9XG4gICAgdmFyIHJldCA9IHRyeUNhdGNoKG5vZGViYWNrKS5jYWxsKHByb21pc2UuX2JvdW5kVmFsdWUoKSwgcmVhc29uKTtcbiAgICBpZiAocmV0ID09PSBlcnJvck9iaikge1xuICAgICAgICBhc3luYy50aHJvd0xhdGVyKHJldC5lKTtcbiAgICB9XG59XG5cblByb21pc2UucHJvdG90eXBlLmFzQ2FsbGJhY2sgPSBQcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKG5vZGViYWNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygbm9kZWJhY2sgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHZhciBhZGFwdGVyID0gc3VjY2Vzc0FkYXB0ZXI7XG4gICAgICAgIGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQgJiYgT2JqZWN0KG9wdGlvbnMpLnNwcmVhZCkge1xuICAgICAgICAgICAgYWRhcHRlciA9IHNwcmVhZEFkYXB0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdGhlbihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICBlcnJvckFkYXB0ZXIsXG4gICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgbm9kZWJhY2tcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDIyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbnZhciBtYWtlU2VsZlJlc29sdXRpb25FcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFR5cGVFcnJvcihcImNpcmN1bGFyIHByb21pc2UgcmVzb2x1dGlvbiBjaGFpblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG59O1xudmFyIHJlZmxlY3RIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlLlByb21pc2VJbnNwZWN0aW9uKHRoaXMuX3RhcmdldCgpKTtcbn07XG52YXIgYXBpUmVqZWN0aW9uID0gZnVuY3Rpb24obXNnKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IobXNnKSk7XG59O1xuZnVuY3Rpb24gUHJveHlhYmxlKCkge31cbnZhciBVTkRFRklORURfQklORElORyA9IHt9O1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xuXG52YXIgZ2V0RG9tYWluO1xuaWYgKHV0aWwuaXNOb2RlKSB7XG4gICAgZ2V0RG9tYWluID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZXQgPSBwcm9jZXNzLmRvbWFpbjtcbiAgICAgICAgaWYgKHJldCA9PT0gdW5kZWZpbmVkKSByZXQgPSBudWxsO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG59IGVsc2Uge1xuICAgIGdldERvbWFpbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xufVxudXRpbC5ub3RFbnVtZXJhYmxlUHJvcChQcm9taXNlLCBcIl9nZXREb21haW5cIiwgZ2V0RG9tYWluKTtcblxudmFyIGVzNSA9IF9kZXJlcV8oXCIuL2VzNVwiKTtcbnZhciBBc3luYyA9IF9kZXJlcV8oXCIuL2FzeW5jXCIpO1xudmFyIGFzeW5jID0gbmV3IEFzeW5jKCk7XG5lczUuZGVmaW5lUHJvcGVydHkoUHJvbWlzZSwgXCJfYXN5bmNcIiwge3ZhbHVlOiBhc3luY30pO1xudmFyIGVycm9ycyA9IF9kZXJlcV8oXCIuL2Vycm9yc1wiKTtcbnZhciBUeXBlRXJyb3IgPSBQcm9taXNlLlR5cGVFcnJvciA9IGVycm9ycy5UeXBlRXJyb3I7XG5Qcm9taXNlLlJhbmdlRXJyb3IgPSBlcnJvcnMuUmFuZ2VFcnJvcjtcbnZhciBDYW5jZWxsYXRpb25FcnJvciA9IFByb21pc2UuQ2FuY2VsbGF0aW9uRXJyb3IgPSBlcnJvcnMuQ2FuY2VsbGF0aW9uRXJyb3I7XG5Qcm9taXNlLlRpbWVvdXRFcnJvciA9IGVycm9ycy5UaW1lb3V0RXJyb3I7XG5Qcm9taXNlLk9wZXJhdGlvbmFsRXJyb3IgPSBlcnJvcnMuT3BlcmF0aW9uYWxFcnJvcjtcblByb21pc2UuUmVqZWN0aW9uRXJyb3IgPSBlcnJvcnMuT3BlcmF0aW9uYWxFcnJvcjtcblByb21pc2UuQWdncmVnYXRlRXJyb3IgPSBlcnJvcnMuQWdncmVnYXRlRXJyb3I7XG52YXIgSU5URVJOQUwgPSBmdW5jdGlvbigpe307XG52YXIgQVBQTFkgPSB7fTtcbnZhciBORVhUX0ZJTFRFUiA9IHt9O1xudmFyIHRyeUNvbnZlcnRUb1Byb21pc2UgPSBfZGVyZXFfKFwiLi90aGVuYWJsZXNcIikoUHJvbWlzZSwgSU5URVJOQUwpO1xudmFyIFByb21pc2VBcnJheSA9XG4gICAgX2RlcmVxXyhcIi4vcHJvbWlzZV9hcnJheVwiKShQcm9taXNlLCBJTlRFUk5BTCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnlDb252ZXJ0VG9Qcm9taXNlLCBhcGlSZWplY3Rpb24sIFByb3h5YWJsZSk7XG52YXIgQ29udGV4dCA9IF9kZXJlcV8oXCIuL2NvbnRleHRcIikoUHJvbWlzZSk7XG4gLypqc2hpbnQgdW51c2VkOmZhbHNlKi9cbnZhciBjcmVhdGVDb250ZXh0ID0gQ29udGV4dC5jcmVhdGU7XG52YXIgZGVidWcgPSBfZGVyZXFfKFwiLi9kZWJ1Z2dhYmlsaXR5XCIpKFByb21pc2UsIENvbnRleHQpO1xudmFyIENhcHR1cmVkVHJhY2UgPSBkZWJ1Zy5DYXB0dXJlZFRyYWNlO1xudmFyIFBhc3NUaHJvdWdoSGFuZGxlckNvbnRleHQgPVxuICAgIF9kZXJlcV8oXCIuL2ZpbmFsbHlcIikoUHJvbWlzZSwgdHJ5Q29udmVydFRvUHJvbWlzZSwgTkVYVF9GSUxURVIpO1xudmFyIGNhdGNoRmlsdGVyID0gX2RlcmVxXyhcIi4vY2F0Y2hfZmlsdGVyXCIpKE5FWFRfRklMVEVSKTtcbnZhciBub2RlYmFja0ZvclByb21pc2UgPSBfZGVyZXFfKFwiLi9ub2RlYmFja1wiKTtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xuZnVuY3Rpb24gY2hlY2soc2VsZiwgZXhlY3V0b3IpIHtcbiAgICBpZiAoc2VsZiA9PSBudWxsIHx8IHNlbGYuY29uc3RydWN0b3IgIT09IFByb21pc2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInRoZSBwcm9taXNlIGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBpbnZva2VkIGRpcmVjdGx5XFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBleGVjdXRvciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJleHBlY3RpbmcgYSBmdW5jdGlvbiBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhleGVjdXRvcikpO1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBQcm9taXNlKGV4ZWN1dG9yKSB7XG4gICAgaWYgKGV4ZWN1dG9yICE9PSBJTlRFUk5BTCkge1xuICAgICAgICBjaGVjayh0aGlzLCBleGVjdXRvcik7XG4gICAgfVxuICAgIHRoaXMuX2JpdEZpZWxkID0gMDtcbiAgICB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3JlamVjdGlvbkhhbmRsZXIwID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3Byb21pc2UwID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3JlY2VpdmVyMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9yZXNvbHZlRnJvbUV4ZWN1dG9yKGV4ZWN1dG9yKTtcbiAgICB0aGlzLl9wcm9taXNlQ3JlYXRlZCgpO1xuICAgIHRoaXMuX2ZpcmVFdmVudChcInByb21pc2VDcmVhdGVkXCIsIHRoaXMpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXCJbb2JqZWN0IFByb21pc2VdXCI7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5jYXVnaHQgPSBQcm9taXNlLnByb3RvdHlwZVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKGxlbiA+IDEpIHtcbiAgICAgICAgdmFyIGNhdGNoSW5zdGFuY2VzID0gbmV3IEFycmF5KGxlbiAtIDEpLFxuICAgICAgICAgICAgaiA9IDAsIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW4gLSAxOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKHV0aWwuaXNPYmplY3QoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICBjYXRjaEluc3RhbmNlc1tqKytdID0gaXRlbTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFwaVJlamVjdGlvbihcIkNhdGNoIHN0YXRlbWVudCBwcmVkaWNhdGU6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJleHBlY3RpbmcgYW4gb2JqZWN0IGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGl0ZW0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaEluc3RhbmNlcy5sZW5ndGggPSBqO1xuICAgICAgICBmbiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIGNhdGNoRmlsdGVyKGNhdGNoSW5zdGFuY2VzLCBmbiwgdGhpcykpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgZm4pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUucmVmbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGhlbihyZWZsZWN0SGFuZGxlcixcbiAgICAgICAgcmVmbGVjdEhhbmRsZXIsIHVuZGVmaW5lZCwgdGhpcywgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbiAoZGlkRnVsZmlsbCwgZGlkUmVqZWN0KSB7XG4gICAgaWYgKGRlYnVnLndhcm5pbmdzKCkgJiYgYXJndW1lbnRzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgdHlwZW9mIGRpZEZ1bGZpbGwgIT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICB0eXBlb2YgZGlkUmVqZWN0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdmFyIG1zZyA9IFwiLnRoZW4oKSBvbmx5IGFjY2VwdHMgZnVuY3Rpb25zIGJ1dCB3YXMgcGFzc2VkOiBcIiArXG4gICAgICAgICAgICAgICAgdXRpbC5jbGFzc1N0cmluZyhkaWRGdWxmaWxsKTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBtc2cgKz0gXCIsIFwiICsgdXRpbC5jbGFzc1N0cmluZyhkaWRSZWplY3QpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3dhcm4obXNnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4oZGlkRnVsZmlsbCwgZGlkUmVqZWN0LCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAoZGlkRnVsZmlsbCwgZGlkUmVqZWN0KSB7XG4gICAgdmFyIHByb21pc2UgPVxuICAgICAgICB0aGlzLl90aGVuKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG4gICAgcHJvbWlzZS5fc2V0SXNGaW5hbCgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc3ByZWFkID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJleHBlY3RpbmcgYSBmdW5jdGlvbiBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhmbikpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbGwoKS5fdGhlbihmbiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIEFQUExZLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXQgPSB7XG4gICAgICAgIGlzRnVsZmlsbGVkOiBmYWxzZSxcbiAgICAgICAgaXNSZWplY3RlZDogZmFsc2UsXG4gICAgICAgIGZ1bGZpbGxtZW50VmFsdWU6IHVuZGVmaW5lZCxcbiAgICAgICAgcmVqZWN0aW9uUmVhc29uOiB1bmRlZmluZWRcbiAgICB9O1xuICAgIGlmICh0aGlzLmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgcmV0LmZ1bGZpbGxtZW50VmFsdWUgPSB0aGlzLnZhbHVlKCk7XG4gICAgICAgIHJldC5pc0Z1bGZpbGxlZCA9IHRydWU7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzUmVqZWN0ZWQoKSkge1xuICAgICAgICByZXQucmVqZWN0aW9uUmVhc29uID0gdGhpcy5yZWFzb24oKTtcbiAgICAgICAgcmV0LmlzUmVqZWN0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuYWxsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl93YXJuKFwiLmFsbCgpIHdhcyBwYXNzZWQgYXJndW1lbnRzIGJ1dCBpdCBkb2VzIG5vdCB0YWtlIGFueVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlQXJyYXkodGhpcykucHJvbWlzZSgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gdGhpcy5jYXVnaHQodXRpbC5vcmlnaW5hdGVzRnJvbVJlamVjdGlvbiwgZm4pO1xufTtcblxuUHJvbWlzZS5nZXROZXdMaWJyYXJ5Q29weSA9IG1vZHVsZS5leHBvcnRzO1xuXG5Qcm9taXNlLmlzID0gZnVuY3Rpb24gKHZhbCkge1xuICAgIHJldHVybiB2YWwgaW5zdGFuY2VvZiBQcm9taXNlO1xufTtcblxuUHJvbWlzZS5mcm9tTm9kZSA9IFByb21pc2UuZnJvbUNhbGxiYWNrID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB2YXIgbXVsdGlBcmdzID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyAhIU9iamVjdChhcmd1bWVudHNbMV0pLm11bHRpQXJnc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGZhbHNlO1xuICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaChmbikobm9kZWJhY2tGb3JQcm9taXNlKHJldCwgbXVsdGlBcmdzKSk7XG4gICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgcmV0Ll9yZWplY3RDYWxsYmFjayhyZXN1bHQuZSwgdHJ1ZSk7XG4gICAgfVxuICAgIGlmICghcmV0Ll9pc0ZhdGVTZWFsZWQoKSkgcmV0Ll9zZXRBc3luY0d1YXJhbnRlZWQoKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5hbGwgPSBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2VBcnJheShwcm9taXNlcykucHJvbWlzZSgpO1xufTtcblxuUHJvbWlzZS5jYXN0ID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXQgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKG9iaik7XG4gICAgaWYgKCEocmV0IGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICByZXQuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgICAgIHJldC5fc2V0RnVsZmlsbGVkKCk7XG4gICAgICAgIHJldC5fcmVqZWN0aW9uSGFuZGxlcjAgPSBvYmo7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG5Qcm9taXNlLnJlc29sdmUgPSBQcm9taXNlLmZ1bGZpbGxlZCA9IFByb21pc2UuY2FzdDtcblxuUHJvbWlzZS5yZWplY3QgPSBQcm9taXNlLnJlamVjdGVkID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgcmV0Ll9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIHJldC5fcmVqZWN0Q2FsbGJhY2socmVhc29uLCB0cnVlKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5zZXRTY2hlZHVsZXIgPSBmdW5jdGlvbihmbikge1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICB9XG4gICAgcmV0dXJuIGFzeW5jLnNldFNjaGVkdWxlcihmbik7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fdGhlbiA9IGZ1bmN0aW9uIChcbiAgICBkaWRGdWxmaWxsLFxuICAgIGRpZFJlamVjdCxcbiAgICBfLCAgICByZWNlaXZlcixcbiAgICBpbnRlcm5hbERhdGFcbikge1xuICAgIHZhciBoYXZlSW50ZXJuYWxEYXRhID0gaW50ZXJuYWxEYXRhICE9PSB1bmRlZmluZWQ7XG4gICAgdmFyIHByb21pc2UgPSBoYXZlSW50ZXJuYWxEYXRhID8gaW50ZXJuYWxEYXRhIDogbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXQoKTtcbiAgICB2YXIgYml0RmllbGQgPSB0YXJnZXQuX2JpdEZpZWxkO1xuXG4gICAgaWYgKCFoYXZlSW50ZXJuYWxEYXRhKSB7XG4gICAgICAgIHByb21pc2UuX3Byb3BhZ2F0ZUZyb20odGhpcywgMyk7XG4gICAgICAgIHByb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgICAgIGlmIChyZWNlaXZlciA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAoKHRoaXMuX2JpdEZpZWxkICYgMjA5NzE1MikgIT09IDApKSB7XG4gICAgICAgICAgICBpZiAoISgoYml0RmllbGQgJiA1MDM5NzE4NCkgPT09IDApKSB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZXIgPSB0aGlzLl9ib3VuZFZhbHVlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlY2VpdmVyID0gdGFyZ2V0ID09PSB0aGlzID8gdW5kZWZpbmVkIDogdGhpcy5fYm91bmRUbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9maXJlRXZlbnQoXCJwcm9taXNlQ2hhaW5lZFwiLCB0aGlzLCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICB2YXIgZG9tYWluID0gZ2V0RG9tYWluKCk7XG4gICAgaWYgKCEoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICB2YXIgaGFuZGxlciwgdmFsdWUsIHNldHRsZXIgPSB0YXJnZXQuX3NldHRsZVByb21pc2VDdHg7XG4gICAgICAgIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB0YXJnZXQuX3JlamVjdGlvbkhhbmRsZXIwO1xuICAgICAgICAgICAgaGFuZGxlciA9IGRpZEZ1bGZpbGw7XG4gICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGFyZ2V0Ll9mdWxmaWxsbWVudEhhbmRsZXIwO1xuICAgICAgICAgICAgaGFuZGxlciA9IGRpZFJlamVjdDtcbiAgICAgICAgICAgIHRhcmdldC5fdW5zZXRSZWplY3Rpb25Jc1VuaGFuZGxlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0dGxlciA9IHRhcmdldC5fc2V0dGxlUHJvbWlzZUxhdGVDYW5jZWxsYXRpb25PYnNlcnZlcjtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3IENhbmNlbGxhdGlvbkVycm9yKFwibGF0ZSBjYW5jZWxsYXRpb24gb2JzZXJ2ZXJcIik7XG4gICAgICAgICAgICB0YXJnZXQuX2F0dGFjaEV4dHJhVHJhY2UodmFsdWUpO1xuICAgICAgICAgICAgaGFuZGxlciA9IGRpZFJlamVjdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jLmludm9rZShzZXR0bGVyLCB0YXJnZXQsIHtcbiAgICAgICAgICAgIGhhbmRsZXI6IGRvbWFpbiA9PT0gbnVsbCA/IGhhbmRsZXJcbiAgICAgICAgICAgICAgICA6ICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAgICAgICAgIHV0aWwuZG9tYWluQmluZChkb21haW4sIGhhbmRsZXIpKSxcbiAgICAgICAgICAgIHByb21pc2U6IHByb21pc2UsXG4gICAgICAgICAgICByZWNlaXZlcjogcmVjZWl2ZXIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGFyZ2V0Ll9hZGRDYWxsYmFja3MoZGlkRnVsZmlsbCwgZGlkUmVqZWN0LCBwcm9taXNlLCByZWNlaXZlciwgZG9tYWluKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9sZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2JpdEZpZWxkICYgNjU1MzU7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faXNGYXRlU2VhbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAxMTc1MDYwNDgpICE9PSAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzRm9sbG93aW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA2NzEwODg2NCkgPT09IDY3MTA4ODY0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldExlbmd0aCA9IGZ1bmN0aW9uIChsZW4pIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9ICh0aGlzLl9iaXRGaWVsZCAmIC02NTUzNikgfFxuICAgICAgICAobGVuICYgNjU1MzUpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldEZ1bGZpbGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMzM1NTQ0MzI7XG4gICAgdGhpcy5fZmlyZUV2ZW50KFwicHJvbWlzZUZ1bGZpbGxlZFwiLCB0aGlzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRSZWplY3RlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMTY3NzcyMTY7XG4gICAgdGhpcy5fZmlyZUV2ZW50KFwicHJvbWlzZVJlamVjdGVkXCIsIHRoaXMpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldEZvbGxvd2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgNjcxMDg4NjQ7XG4gICAgdGhpcy5fZmlyZUV2ZW50KFwicHJvbWlzZVJlc29sdmVkXCIsIHRoaXMpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldElzRmluYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDQxOTQzMDQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faXNGaW5hbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgNDE5NDMwNCkgPiAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0Q2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCAmICh+NjU1MzYpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCA2NTUzNjtcbiAgICB0aGlzLl9maXJlRXZlbnQoXCJwcm9taXNlQ2FuY2VsbGVkXCIsIHRoaXMpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldFdpbGxCZUNhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCA4Mzg4NjA4O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldEFzeW5jR3VhcmFudGVlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChhc3luYy5oYXNDdXN0b21TY2hlZHVsZXIoKSkgcmV0dXJuO1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAxMzQyMTc3Mjg7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVjZWl2ZXJBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHZhciByZXQgPSBpbmRleCA9PT0gMCA/IHRoaXMuX3JlY2VpdmVyMCA6IHRoaXNbXG4gICAgICAgICAgICBpbmRleCAqIDQgLSA0ICsgM107XG4gICAgaWYgKHJldCA9PT0gVU5ERUZJTkVEX0JJTkRJTkcpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHJldCA9PT0gdW5kZWZpbmVkICYmIHRoaXMuX2lzQm91bmQoKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm91bmRWYWx1ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb21pc2VBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHJldHVybiB0aGlzW1xuICAgICAgICAgICAgaW5kZXggKiA0IC0gNCArIDJdO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2Z1bGZpbGxtZW50SGFuZGxlckF0ID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXNbXG4gICAgICAgICAgICBpbmRleCAqIDQgLSA0ICsgMF07XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVqZWN0aW9uSGFuZGxlckF0ID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXNbXG4gICAgICAgICAgICBpbmRleCAqIDQgLSA0ICsgMV07XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fYm91bmRWYWx1ZSA9IGZ1bmN0aW9uKCkge307XG5cblByb21pc2UucHJvdG90eXBlLl9taWdyYXRlQ2FsbGJhY2swID0gZnVuY3Rpb24gKGZvbGxvd2VyKSB7XG4gICAgdmFyIGJpdEZpZWxkID0gZm9sbG93ZXIuX2JpdEZpZWxkO1xuICAgIHZhciBmdWxmaWxsID0gZm9sbG93ZXIuX2Z1bGZpbGxtZW50SGFuZGxlcjA7XG4gICAgdmFyIHJlamVjdCA9IGZvbGxvd2VyLl9yZWplY3Rpb25IYW5kbGVyMDtcbiAgICB2YXIgcHJvbWlzZSA9IGZvbGxvd2VyLl9wcm9taXNlMDtcbiAgICB2YXIgcmVjZWl2ZXIgPSBmb2xsb3dlci5fcmVjZWl2ZXJBdCgwKTtcbiAgICBpZiAocmVjZWl2ZXIgPT09IHVuZGVmaW5lZCkgcmVjZWl2ZXIgPSBVTkRFRklORURfQklORElORztcbiAgICB0aGlzLl9hZGRDYWxsYmFja3MoZnVsZmlsbCwgcmVqZWN0LCBwcm9taXNlLCByZWNlaXZlciwgbnVsbCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fbWlncmF0ZUNhbGxiYWNrQXQgPSBmdW5jdGlvbiAoZm9sbG93ZXIsIGluZGV4KSB7XG4gICAgdmFyIGZ1bGZpbGwgPSBmb2xsb3dlci5fZnVsZmlsbG1lbnRIYW5kbGVyQXQoaW5kZXgpO1xuICAgIHZhciByZWplY3QgPSBmb2xsb3dlci5fcmVqZWN0aW9uSGFuZGxlckF0KGluZGV4KTtcbiAgICB2YXIgcHJvbWlzZSA9IGZvbGxvd2VyLl9wcm9taXNlQXQoaW5kZXgpO1xuICAgIHZhciByZWNlaXZlciA9IGZvbGxvd2VyLl9yZWNlaXZlckF0KGluZGV4KTtcbiAgICBpZiAocmVjZWl2ZXIgPT09IHVuZGVmaW5lZCkgcmVjZWl2ZXIgPSBVTkRFRklORURfQklORElORztcbiAgICB0aGlzLl9hZGRDYWxsYmFja3MoZnVsZmlsbCwgcmVqZWN0LCBwcm9taXNlLCByZWNlaXZlciwgbnVsbCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fYWRkQ2FsbGJhY2tzID0gZnVuY3Rpb24gKFxuICAgIGZ1bGZpbGwsXG4gICAgcmVqZWN0LFxuICAgIHByb21pc2UsXG4gICAgcmVjZWl2ZXIsXG4gICAgZG9tYWluXG4pIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9sZW5ndGgoKTtcblxuICAgIGlmIChpbmRleCA+PSA2NTUzNSAtIDQpIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9zZXRMZW5ndGgoMCk7XG4gICAgfVxuXG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgIHRoaXMuX3Byb21pc2UwID0gcHJvbWlzZTtcbiAgICAgICAgdGhpcy5fcmVjZWl2ZXIwID0gcmVjZWl2ZXI7XG4gICAgICAgIGlmICh0eXBlb2YgZnVsZmlsbCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyBmdWxmaWxsIDogdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgZnVsZmlsbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiByZWplY3QgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAgPVxuICAgICAgICAgICAgICAgIGRvbWFpbiA9PT0gbnVsbCA/IHJlamVjdCA6IHV0aWwuZG9tYWluQmluZChkb21haW4sIHJlamVjdCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYmFzZSA9IGluZGV4ICogNCAtIDQ7XG4gICAgICAgIHRoaXNbYmFzZSArIDJdID0gcHJvbWlzZTtcbiAgICAgICAgdGhpc1tiYXNlICsgM10gPSByZWNlaXZlcjtcbiAgICAgICAgaWYgKHR5cGVvZiBmdWxmaWxsID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRoaXNbYmFzZSArIDBdID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyBmdWxmaWxsIDogdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgZnVsZmlsbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiByZWplY3QgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhpc1tiYXNlICsgMV0gPVxuICAgICAgICAgICAgICAgIGRvbWFpbiA9PT0gbnVsbCA/IHJlamVjdCA6IHV0aWwuZG9tYWluQmluZChkb21haW4sIHJlamVjdCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fc2V0TGVuZ3RoKGluZGV4ICsgMSk7XG4gICAgcmV0dXJuIGluZGV4O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb3h5ID0gZnVuY3Rpb24gKHByb3h5YWJsZSwgYXJnKSB7XG4gICAgdGhpcy5fYWRkQ2FsbGJhY2tzKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBhcmcsIHByb3h5YWJsZSwgbnVsbCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVzb2x2ZUNhbGxiYWNrID0gZnVuY3Rpb24odmFsdWUsIHNob3VsZEJpbmQpIHtcbiAgICBpZiAoKCh0aGlzLl9iaXRGaWVsZCAmIDExNzUwNjA0OCkgIT09IDApKSByZXR1cm47XG4gICAgaWYgKHZhbHVlID09PSB0aGlzKVxuICAgICAgICByZXR1cm4gdGhpcy5fcmVqZWN0Q2FsbGJhY2sobWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IoKSwgZmFsc2UpO1xuICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHZhbHVlLCB0aGlzKTtcbiAgICBpZiAoIShtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSkgcmV0dXJuIHRoaXMuX2Z1bGZpbGwodmFsdWUpO1xuXG4gICAgaWYgKHNob3VsZEJpbmQpIHRoaXMuX3Byb3BhZ2F0ZUZyb20obWF5YmVQcm9taXNlLCAyKTtcblxuICAgIHZhciBwcm9taXNlID0gbWF5YmVQcm9taXNlLl90YXJnZXQoKTtcblxuICAgIGlmIChwcm9taXNlID09PSB0aGlzKSB7XG4gICAgICAgIHRoaXMuX3JlamVjdChtYWtlU2VsZlJlc29sdXRpb25FcnJvcigpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBiaXRGaWVsZCA9IHByb21pc2UuX2JpdEZpZWxkO1xuICAgIGlmICgoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5fbGVuZ3RoKCk7XG4gICAgICAgIGlmIChsZW4gPiAwKSBwcm9taXNlLl9taWdyYXRlQ2FsbGJhY2swKHRoaXMpO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9taWdyYXRlQ2FsbGJhY2tBdCh0aGlzLCBpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zZXRGb2xsb3dpbmcoKTtcbiAgICAgICAgdGhpcy5fc2V0TGVuZ3RoKDApO1xuICAgICAgICB0aGlzLl9zZXRGb2xsb3dlZShwcm9taXNlKTtcbiAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgIHRoaXMuX2Z1bGZpbGwocHJvbWlzZS5fdmFsdWUoKSk7XG4gICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMTY3NzcyMTYpICE9PSAwKSkge1xuICAgICAgICB0aGlzLl9yZWplY3QocHJvbWlzZS5fcmVhc29uKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciByZWFzb24gPSBuZXcgQ2FuY2VsbGF0aW9uRXJyb3IoXCJsYXRlIGNhbmNlbGxhdGlvbiBvYnNlcnZlclwiKTtcbiAgICAgICAgcHJvbWlzZS5fYXR0YWNoRXh0cmFUcmFjZShyZWFzb24pO1xuICAgICAgICB0aGlzLl9yZWplY3QocmVhc29uKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVqZWN0Q2FsbGJhY2sgPVxuZnVuY3Rpb24ocmVhc29uLCBzeW5jaHJvbm91cywgaWdub3JlTm9uRXJyb3JXYXJuaW5ncykge1xuICAgIHZhciB0cmFjZSA9IHV0aWwuZW5zdXJlRXJyb3JPYmplY3QocmVhc29uKTtcbiAgICB2YXIgaGFzU3RhY2sgPSB0cmFjZSA9PT0gcmVhc29uO1xuICAgIGlmICghaGFzU3RhY2sgJiYgIWlnbm9yZU5vbkVycm9yV2FybmluZ3MgJiYgZGVidWcud2FybmluZ3MoKSkge1xuICAgICAgICB2YXIgbWVzc2FnZSA9IFwiYSBwcm9taXNlIHdhcyByZWplY3RlZCB3aXRoIGEgbm9uLWVycm9yOiBcIiArXG4gICAgICAgICAgICB1dGlsLmNsYXNzU3RyaW5nKHJlYXNvbik7XG4gICAgICAgIHRoaXMuX3dhcm4obWVzc2FnZSwgdHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuX2F0dGFjaEV4dHJhVHJhY2UodHJhY2UsIHN5bmNocm9ub3VzID8gaGFzU3RhY2sgOiBmYWxzZSk7XG4gICAgdGhpcy5fcmVqZWN0KHJlYXNvbik7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVzb2x2ZUZyb21FeGVjdXRvciA9IGZ1bmN0aW9uIChleGVjdXRvcikge1xuICAgIGlmIChleGVjdXRvciA9PT0gSU5URVJOQUwpIHJldHVybjtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgdGhpcy5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB0aGlzLl9wdXNoQ29udGV4dCgpO1xuICAgIHZhciBzeW5jaHJvbm91cyA9IHRydWU7XG4gICAgdmFyIHIgPSB0aGlzLl9leGVjdXRlKGV4ZWN1dG9yLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBwcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2sodmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVhc29uLCBzeW5jaHJvbm91cyk7XG4gICAgfSk7XG4gICAgc3luY2hyb25vdXMgPSBmYWxzZTtcbiAgICB0aGlzLl9wb3BDb250ZXh0KCk7XG5cbiAgICBpZiAociAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHIsIHRydWUpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXR0bGVQcm9taXNlRnJvbUhhbmRsZXIgPSBmdW5jdGlvbiAoXG4gICAgaGFuZGxlciwgcmVjZWl2ZXIsIHZhbHVlLCBwcm9taXNlXG4pIHtcbiAgICB2YXIgYml0RmllbGQgPSBwcm9taXNlLl9iaXRGaWVsZDtcbiAgICBpZiAoKChiaXRGaWVsZCAmIDY1NTM2KSAhPT0gMCkpIHJldHVybjtcbiAgICBwcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgIHZhciB4O1xuICAgIGlmIChyZWNlaXZlciA9PT0gQVBQTFkpIHtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUubGVuZ3RoICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB4ID0gZXJyb3JPYmo7XG4gICAgICAgICAgICB4LmUgPSBuZXcgVHlwZUVycm9yKFwiY2Fubm90IC5zcHJlYWQoKSBhIG5vbi1hcnJheTogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC5jbGFzc1N0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeCA9IHRyeUNhdGNoKGhhbmRsZXIpLmFwcGx5KHRoaXMuX2JvdW5kVmFsdWUoKSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeCA9IHRyeUNhdGNoKGhhbmRsZXIpLmNhbGwocmVjZWl2ZXIsIHZhbHVlKTtcbiAgICB9XG4gICAgdmFyIHByb21pc2VDcmVhdGVkID0gcHJvbWlzZS5fcG9wQ29udGV4dCgpO1xuICAgIGJpdEZpZWxkID0gcHJvbWlzZS5fYml0RmllbGQ7XG4gICAgaWYgKCgoYml0RmllbGQgJiA2NTUzNikgIT09IDApKSByZXR1cm47XG5cbiAgICBpZiAoeCA9PT0gTkVYVF9GSUxURVIpIHtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0KHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKHggPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHguZSwgZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRlYnVnLmNoZWNrRm9yZ290dGVuUmV0dXJucyh4LCBwcm9taXNlQ3JlYXRlZCwgXCJcIiwgIHByb21pc2UsIHRoaXMpO1xuICAgICAgICBwcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2soeCk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3RhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXQgPSB0aGlzO1xuICAgIHdoaWxlIChyZXQuX2lzRm9sbG93aW5nKCkpIHJldCA9IHJldC5fZm9sbG93ZWUoKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2ZvbGxvd2VlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlamVjdGlvbkhhbmRsZXIwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldEZvbGxvd2VlID0gZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgIHRoaXMuX3JlamVjdGlvbkhhbmRsZXIwID0gcHJvbWlzZTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXR0bGVQcm9taXNlID0gZnVuY3Rpb24ocHJvbWlzZSwgaGFuZGxlciwgcmVjZWl2ZXIsIHZhbHVlKSB7XG4gICAgdmFyIGlzUHJvbWlzZSA9IHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlO1xuICAgIHZhciBiaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkO1xuICAgIHZhciBhc3luY0d1YXJhbnRlZWQgPSAoKGJpdEZpZWxkICYgMTM0MjE3NzI4KSAhPT0gMCk7XG4gICAgaWYgKCgoYml0RmllbGQgJiA2NTUzNikgIT09IDApKSB7XG4gICAgICAgIGlmIChpc1Byb21pc2UpIHByb21pc2UuX2ludm9rZUludGVybmFsT25DYW5jZWwoKTtcblxuICAgICAgICBpZiAocmVjZWl2ZXIgaW5zdGFuY2VvZiBQYXNzVGhyb3VnaEhhbmRsZXJDb250ZXh0ICYmXG4gICAgICAgICAgICByZWNlaXZlci5pc0ZpbmFsbHlIYW5kbGVyKCkpIHtcbiAgICAgICAgICAgIHJlY2VpdmVyLmNhbmNlbFByb21pc2UgPSBwcm9taXNlO1xuICAgICAgICAgICAgaWYgKHRyeUNhdGNoKGhhbmRsZXIpLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlLl9yZWplY3QoZXJyb3JPYmouZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaGFuZGxlciA9PT0gcmVmbGVjdEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHByb21pc2UuX2Z1bGZpbGwocmVmbGVjdEhhbmRsZXIuY2FsbChyZWNlaXZlcikpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlY2VpdmVyIGluc3RhbmNlb2YgUHJveHlhYmxlKSB7XG4gICAgICAgICAgICByZWNlaXZlci5fcHJvbWlzZUNhbmNlbGxlZChwcm9taXNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1Byb21pc2UgfHwgcHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2VBcnJheSkge1xuICAgICAgICAgICAgcHJvbWlzZS5fY2FuY2VsKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWNlaXZlci5jYW5jZWwoKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoIWlzUHJvbWlzZSkge1xuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHJlY2VpdmVyLCB2YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoYXN5bmNHdWFyYW50ZWVkKSBwcm9taXNlLl9zZXRBc3luY0d1YXJhbnRlZWQoKTtcbiAgICAgICAgICAgIHRoaXMuX3NldHRsZVByb21pc2VGcm9tSGFuZGxlcihoYW5kbGVyLCByZWNlaXZlciwgdmFsdWUsIHByb21pc2UpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWNlaXZlciBpbnN0YW5jZW9mIFByb3h5YWJsZSkge1xuICAgICAgICBpZiAoIXJlY2VpdmVyLl9pc1Jlc29sdmVkKCkpIHtcbiAgICAgICAgICAgIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICAgICAgICAgIHJlY2VpdmVyLl9wcm9taXNlRnVsZmlsbGVkKHZhbHVlLCBwcm9taXNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVjZWl2ZXIuX3Byb21pc2VSZWplY3RlZCh2YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzUHJvbWlzZSkge1xuICAgICAgICBpZiAoYXN5bmNHdWFyYW50ZWVkKSBwcm9taXNlLl9zZXRBc3luY0d1YXJhbnRlZWQoKTtcbiAgICAgICAgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9mdWxmaWxsKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb21pc2UuX3JlamVjdCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZUxhdGVDYW5jZWxsYXRpb25PYnNlcnZlciA9IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciBoYW5kbGVyID0gY3R4LmhhbmRsZXI7XG4gICAgdmFyIHByb21pc2UgPSBjdHgucHJvbWlzZTtcbiAgICB2YXIgcmVjZWl2ZXIgPSBjdHgucmVjZWl2ZXI7XG4gICAgdmFyIHZhbHVlID0gY3R4LnZhbHVlO1xuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGlmICghKHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHJlY2VpdmVyLCB2YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zZXR0bGVQcm9taXNlRnJvbUhhbmRsZXIoaGFuZGxlciwgcmVjZWl2ZXIsIHZhbHVlLCBwcm9taXNlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0KHZhbHVlKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZUN0eCA9IGZ1bmN0aW9uKGN0eCkge1xuICAgIHRoaXMuX3NldHRsZVByb21pc2UoY3R4LnByb21pc2UsIGN0eC5oYW5kbGVyLCBjdHgucmVjZWl2ZXIsIGN0eC52YWx1ZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZTAgPSBmdW5jdGlvbihoYW5kbGVyLCB2YWx1ZSwgYml0RmllbGQpIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXMuX3Byb21pc2UwO1xuICAgIHZhciByZWNlaXZlciA9IHRoaXMuX3JlY2VpdmVyQXQoMCk7XG4gICAgdGhpcy5fcHJvbWlzZTAgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcmVjZWl2ZXIwID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3NldHRsZVByb21pc2UocHJvbWlzZSwgaGFuZGxlciwgcmVjZWl2ZXIsIHZhbHVlKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9jbGVhckNhbGxiYWNrRGF0YUF0SW5kZXggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHZhciBiYXNlID0gaW5kZXggKiA0IC0gNDtcbiAgICB0aGlzW2Jhc2UgKyAyXSA9XG4gICAgdGhpc1tiYXNlICsgM10gPVxuICAgIHRoaXNbYmFzZSArIDBdID1cbiAgICB0aGlzW2Jhc2UgKyAxXSA9IHVuZGVmaW5lZDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9mdWxmaWxsID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGJpdEZpZWxkID0gdGhpcy5fYml0RmllbGQ7XG4gICAgaWYgKCgoYml0RmllbGQgJiAxMTc1MDYwNDgpID4+PiAxNikpIHJldHVybjtcbiAgICBpZiAodmFsdWUgPT09IHRoaXMpIHtcbiAgICAgICAgdmFyIGVyciA9IG1ha2VTZWxmUmVzb2x1dGlvbkVycm9yKCk7XG4gICAgICAgIHRoaXMuX2F0dGFjaEV4dHJhVHJhY2UoZXJyKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlamVjdChlcnIpO1xuICAgIH1cbiAgICB0aGlzLl9zZXRGdWxmaWxsZWQoKTtcbiAgICB0aGlzLl9yZWplY3Rpb25IYW5kbGVyMCA9IHZhbHVlO1xuXG4gICAgaWYgKChiaXRGaWVsZCAmIDY1NTM1KSA+IDApIHtcbiAgICAgICAgaWYgKCgoYml0RmllbGQgJiAxMzQyMTc3MjgpICE9PSAwKSkge1xuICAgICAgICAgICAgdGhpcy5fc2V0dGxlUHJvbWlzZXMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFzeW5jLnNldHRsZVByb21pc2VzKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB2YXIgYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZDtcbiAgICBpZiAoKChiaXRGaWVsZCAmIDExNzUwNjA0OCkgPj4+IDE2KSkgcmV0dXJuO1xuICAgIHRoaXMuX3NldFJlamVjdGVkKCk7XG4gICAgdGhpcy5fZnVsZmlsbG1lbnRIYW5kbGVyMCA9IHJlYXNvbjtcblxuICAgIGlmICh0aGlzLl9pc0ZpbmFsKCkpIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmZhdGFsRXJyb3IocmVhc29uLCB1dGlsLmlzTm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKChiaXRGaWVsZCAmIDY1NTM1KSA+IDApIHtcbiAgICAgICAgYXN5bmMuc2V0dGxlUHJvbWlzZXModGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZW5zdXJlUG9zc2libGVSZWplY3Rpb25IYW5kbGVkKCk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2Z1bGZpbGxQcm9taXNlcyA9IGZ1bmN0aW9uIChsZW4sIHZhbHVlKSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlckF0KGkpO1xuICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXMuX3Byb21pc2VBdChpKTtcbiAgICAgICAgdmFyIHJlY2VpdmVyID0gdGhpcy5fcmVjZWl2ZXJBdChpKTtcbiAgICAgICAgdGhpcy5fY2xlYXJDYWxsYmFja0RhdGFBdEluZGV4KGkpO1xuICAgICAgICB0aGlzLl9zZXR0bGVQcm9taXNlKHByb21pc2UsIGhhbmRsZXIsIHJlY2VpdmVyLCB2YWx1ZSk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlamVjdFByb21pc2VzID0gZnVuY3Rpb24gKGxlbiwgcmVhc29uKSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMuX3JlamVjdGlvbkhhbmRsZXJBdChpKTtcbiAgICAgICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlQXQoaSk7XG4gICAgICAgIHZhciByZWNlaXZlciA9IHRoaXMuX3JlY2VpdmVyQXQoaSk7XG4gICAgICAgIHRoaXMuX2NsZWFyQ2FsbGJhY2tEYXRhQXRJbmRleChpKTtcbiAgICAgICAgdGhpcy5fc2V0dGxlUHJvbWlzZShwcm9taXNlLCBoYW5kbGVyLCByZWNlaXZlciwgcmVhc29uKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJpdEZpZWxkID0gdGhpcy5fYml0RmllbGQ7XG4gICAgdmFyIGxlbiA9IChiaXRGaWVsZCAmIDY1NTM1KTtcblxuICAgIGlmIChsZW4gPiAwKSB7XG4gICAgICAgIGlmICgoKGJpdEZpZWxkICYgMTY4NDI3NTIpICE9PSAwKSkge1xuICAgICAgICAgICAgdmFyIHJlYXNvbiA9IHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjA7XG4gICAgICAgICAgICB0aGlzLl9zZXR0bGVQcm9taXNlMCh0aGlzLl9yZWplY3Rpb25IYW5kbGVyMCwgcmVhc29uLCBiaXRGaWVsZCk7XG4gICAgICAgICAgICB0aGlzLl9yZWplY3RQcm9taXNlcyhsZW4sIHJlYXNvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLl9yZWplY3Rpb25IYW5kbGVyMDtcbiAgICAgICAgICAgIHRoaXMuX3NldHRsZVByb21pc2UwKHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjAsIHZhbHVlLCBiaXRGaWVsZCk7XG4gICAgICAgICAgICB0aGlzLl9mdWxmaWxsUHJvbWlzZXMobGVuLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc2V0TGVuZ3RoKDApO1xuICAgIH1cbiAgICB0aGlzLl9jbGVhckNhbmNlbGxhdGlvbkRhdGEoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXR0bGVkVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZDtcbiAgICBpZiAoKChiaXRGaWVsZCAmIDMzNTU0NDMyKSAhPT0gMCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlamVjdGlvbkhhbmRsZXIwO1xuICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjA7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gZGVmZXJSZXNvbHZlKHYpIHt0aGlzLnByb21pc2UuX3Jlc29sdmVDYWxsYmFjayh2KTt9XG5mdW5jdGlvbiBkZWZlclJlamVjdCh2KSB7dGhpcy5wcm9taXNlLl9yZWplY3RDYWxsYmFjayh2LCBmYWxzZSk7fVxuXG5Qcm9taXNlLmRlZmVyID0gUHJvbWlzZS5wZW5kaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgZGVidWcuZGVwcmVjYXRlZChcIlByb21pc2UuZGVmZXJcIiwgXCJuZXcgUHJvbWlzZVwiKTtcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBwcm9taXNlOiBwcm9taXNlLFxuICAgICAgICByZXNvbHZlOiBkZWZlclJlc29sdmUsXG4gICAgICAgIHJlamVjdDogZGVmZXJSZWplY3RcbiAgICB9O1xufTtcblxudXRpbC5ub3RFbnVtZXJhYmxlUHJvcChQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICBcIl9tYWtlU2VsZlJlc29sdXRpb25FcnJvclwiLFxuICAgICAgICAgICAgICAgICAgICAgICBtYWtlU2VsZlJlc29sdXRpb25FcnJvcik7XG5cbl9kZXJlcV8oXCIuL21ldGhvZFwiKShQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uLFxuICAgIGRlYnVnKTtcbl9kZXJlcV8oXCIuL2JpbmRcIikoUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsIGRlYnVnKTtcbl9kZXJlcV8oXCIuL2NhbmNlbFwiKShQcm9taXNlLCBQcm9taXNlQXJyYXksIGFwaVJlamVjdGlvbiwgZGVidWcpO1xuX2RlcmVxXyhcIi4vZGlyZWN0X3Jlc29sdmVcIikoUHJvbWlzZSk7XG5fZGVyZXFfKFwiLi9zeW5jaHJvbm91c19pbnNwZWN0aW9uXCIpKFByb21pc2UpO1xuX2RlcmVxXyhcIi4vam9pblwiKShcbiAgICBQcm9taXNlLCBQcm9taXNlQXJyYXksIHRyeUNvbnZlcnRUb1Byb21pc2UsIElOVEVSTkFMLCBhc3luYywgZ2V0RG9tYWluKTtcblByb21pc2UuUHJvbWlzZSA9IFByb21pc2U7XG5Qcm9taXNlLnZlcnNpb24gPSBcIjMuNS4xXCI7XG5fZGVyZXFfKCcuL21hcC5qcycpKFByb21pc2UsIFByb21pc2VBcnJheSwgYXBpUmVqZWN0aW9uLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBJTlRFUk5BTCwgZGVidWcpO1xuX2RlcmVxXygnLi9jYWxsX2dldC5qcycpKFByb21pc2UpO1xuX2RlcmVxXygnLi91c2luZy5qcycpKFByb21pc2UsIGFwaVJlamVjdGlvbiwgdHJ5Q29udmVydFRvUHJvbWlzZSwgY3JlYXRlQ29udGV4dCwgSU5URVJOQUwsIGRlYnVnKTtcbl9kZXJlcV8oJy4vdGltZXJzLmpzJykoUHJvbWlzZSwgSU5URVJOQUwsIGRlYnVnKTtcbl9kZXJlcV8oJy4vZ2VuZXJhdG9ycy5qcycpKFByb21pc2UsIGFwaVJlamVjdGlvbiwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsIFByb3h5YWJsZSwgZGVidWcpO1xuX2RlcmVxXygnLi9ub2RlaWZ5LmpzJykoUHJvbWlzZSk7XG5fZGVyZXFfKCcuL3Byb21pc2lmeS5qcycpKFByb21pc2UsIElOVEVSTkFMKTtcbl9kZXJlcV8oJy4vcHJvcHMuanMnKShQcm9taXNlLCBQcm9taXNlQXJyYXksIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbik7XG5fZGVyZXFfKCcuL3JhY2UuanMnKShQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uKTtcbl9kZXJlcV8oJy4vcmVkdWNlLmpzJykoUHJvbWlzZSwgUHJvbWlzZUFycmF5LCBhcGlSZWplY3Rpb24sIHRyeUNvbnZlcnRUb1Byb21pc2UsIElOVEVSTkFMLCBkZWJ1Zyk7XG5fZGVyZXFfKCcuL3NldHRsZS5qcycpKFByb21pc2UsIFByb21pc2VBcnJheSwgZGVidWcpO1xuX2RlcmVxXygnLi9zb21lLmpzJykoUHJvbWlzZSwgUHJvbWlzZUFycmF5LCBhcGlSZWplY3Rpb24pO1xuX2RlcmVxXygnLi9maWx0ZXIuanMnKShQcm9taXNlLCBJTlRFUk5BTCk7XG5fZGVyZXFfKCcuL2VhY2guanMnKShQcm9taXNlLCBJTlRFUk5BTCk7XG5fZGVyZXFfKCcuL2FueS5qcycpKFByb21pc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgdXRpbC50b0Zhc3RQcm9wZXJ0aWVzKFByb21pc2UpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIHV0aWwudG9GYXN0UHJvcGVydGllcyhQcm9taXNlLnByb3RvdHlwZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmdW5jdGlvbiBmaWxsVHlwZXModmFsdWUpIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoSU5URVJOQUwpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBwLl9mdWxmaWxsbWVudEhhbmRsZXIwID0gdmFsdWU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcC5fcmVqZWN0aW9uSGFuZGxlcjAgPSB2YWx1ZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHAuX3Byb21pc2UwID0gdmFsdWU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBwLl9yZWNlaXZlcjAgPSB2YWx1ZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgLy8gQ29tcGxldGUgc2xhY2sgdHJhY2tpbmcsIG9wdCBvdXQgb2YgZmllbGQtdHlwZSB0cmFja2luZyBhbmQgICAgICAgICAgIFxuICAgIC8vIHN0YWJpbGl6ZSBtYXAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXMoe2E6IDF9KTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKHtiOiAyfSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyh7YzogM30pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXMoMSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKGZ1bmN0aW9uKCl7fSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyh1bmRlZmluZWQpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXMoZmFsc2UpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKG5ldyBQcm9taXNlKElOVEVSTkFMKSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGRlYnVnLnNldEJvdW5kcyhBc3luYy5maXJzdExpbmVFcnJvciwgdXRpbC5sYXN0TGluZUVycm9yKTsgICAgICAgICAgICAgICBcbiAgICByZXR1cm4gUHJvbWlzZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5cbn07XG5cbn0se1wiLi9hbnkuanNcIjoxLFwiLi9hc3luY1wiOjIsXCIuL2JpbmRcIjozLFwiLi9jYWxsX2dldC5qc1wiOjUsXCIuL2NhbmNlbFwiOjYsXCIuL2NhdGNoX2ZpbHRlclwiOjcsXCIuL2NvbnRleHRcIjo4LFwiLi9kZWJ1Z2dhYmlsaXR5XCI6OSxcIi4vZGlyZWN0X3Jlc29sdmVcIjoxMCxcIi4vZWFjaC5qc1wiOjExLFwiLi9lcnJvcnNcIjoxMixcIi4vZXM1XCI6MTMsXCIuL2ZpbHRlci5qc1wiOjE0LFwiLi9maW5hbGx5XCI6MTUsXCIuL2dlbmVyYXRvcnMuanNcIjoxNixcIi4vam9pblwiOjE3LFwiLi9tYXAuanNcIjoxOCxcIi4vbWV0aG9kXCI6MTksXCIuL25vZGViYWNrXCI6MjAsXCIuL25vZGVpZnkuanNcIjoyMSxcIi4vcHJvbWlzZV9hcnJheVwiOjIzLFwiLi9wcm9taXNpZnkuanNcIjoyNCxcIi4vcHJvcHMuanNcIjoyNSxcIi4vcmFjZS5qc1wiOjI3LFwiLi9yZWR1Y2UuanNcIjoyOCxcIi4vc2V0dGxlLmpzXCI6MzAsXCIuL3NvbWUuanNcIjozMSxcIi4vc3luY2hyb25vdXNfaW5zcGVjdGlvblwiOjMyLFwiLi90aGVuYWJsZXNcIjozMyxcIi4vdGltZXJzLmpzXCI6MzQsXCIuL3VzaW5nLmpzXCI6MzUsXCIuL3V0aWxcIjozNn1dLDIzOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSxcbiAgICBhcGlSZWplY3Rpb24sIFByb3h5YWJsZSkge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIGlzQXJyYXkgPSB1dGlsLmlzQXJyYXk7XG5cbmZ1bmN0aW9uIHRvUmVzb2x1dGlvblZhbHVlKHZhbCkge1xuICAgIHN3aXRjaCh2YWwpIHtcbiAgICBjYXNlIC0yOiByZXR1cm4gW107XG4gICAgY2FzZSAtMzogcmV0dXJuIHt9O1xuICAgIGNhc2UgLTY6IHJldHVybiBuZXcgTWFwKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBQcm9taXNlQXJyYXkodmFsdWVzKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIGlmICh2YWx1ZXMgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHByb21pc2UuX3Byb3BhZ2F0ZUZyb20odmFsdWVzLCAzKTtcbiAgICB9XG4gICAgcHJvbWlzZS5fc2V0T25DYW5jZWwodGhpcyk7XG4gICAgdGhpcy5fdmFsdWVzID0gdmFsdWVzO1xuICAgIHRoaXMuX2xlbmd0aCA9IDA7XG4gICAgdGhpcy5fdG90YWxSZXNvbHZlZCA9IDA7XG4gICAgdGhpcy5faW5pdCh1bmRlZmluZWQsIC0yKTtcbn1cbnV0aWwuaW5oZXJpdHMoUHJvbWlzZUFycmF5LCBQcm94eWFibGUpO1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGVuZ3RoO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5wcm9taXNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uIGluaXQoXywgcmVzb2x2ZVZhbHVlSWZFbXB0eSkge1xuICAgIHZhciB2YWx1ZXMgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHRoaXMuX3ZhbHVlcywgdGhpcy5fcHJvbWlzZSk7XG4gICAgaWYgKHZhbHVlcyBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgdmFsdWVzID0gdmFsdWVzLl90YXJnZXQoKTtcbiAgICAgICAgdmFyIGJpdEZpZWxkID0gdmFsdWVzLl9iaXRGaWVsZDtcbiAgICAgICAgO1xuICAgICAgICB0aGlzLl92YWx1ZXMgPSB2YWx1ZXM7XG5cbiAgICAgICAgaWYgKCgoYml0RmllbGQgJiA1MDM5NzE4NCkgPT09IDApKSB7XG4gICAgICAgICAgICB0aGlzLl9wcm9taXNlLl9zZXRBc3luY0d1YXJhbnRlZWQoKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMuX3RoZW4oXG4gICAgICAgICAgICAgICAgaW5pdCxcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWplY3QsXG4gICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVZhbHVlSWZFbXB0eVxuICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB2YWx1ZXMuX3ZhbHVlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWplY3QodmFsdWVzLl9yZWFzb24oKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFsdWVzID0gdXRpbC5hc0FycmF5KHZhbHVlcyk7XG4gICAgaWYgKHZhbHVlcyA9PT0gbnVsbCkge1xuICAgICAgICB2YXIgZXJyID0gYXBpUmVqZWN0aW9uKFxuICAgICAgICAgICAgXCJleHBlY3RpbmcgYW4gYXJyYXkgb3IgYW4gaXRlcmFibGUgb2JqZWN0IGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKHZhbHVlcykpLnJlYXNvbigpO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9yZWplY3RDYWxsYmFjayhlcnIsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChyZXNvbHZlVmFsdWVJZkVtcHR5ID09PSAtNSkge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZUVtcHR5QXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmUodG9SZXNvbHV0aW9uVmFsdWUocmVzb2x2ZVZhbHVlSWZFbXB0eSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faXRlcmF0ZSh2YWx1ZXMpO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faXRlcmF0ZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgIHZhciBsZW4gPSB0aGlzLmdldEFjdHVhbExlbmd0aCh2YWx1ZXMubGVuZ3RoKTtcbiAgICB0aGlzLl9sZW5ndGggPSBsZW47XG4gICAgdGhpcy5fdmFsdWVzID0gdGhpcy5zaG91bGRDb3B5VmFsdWVzKCkgPyBuZXcgQXJyYXkobGVuKSA6IHRoaXMuX3ZhbHVlcztcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy5fcHJvbWlzZTtcbiAgICB2YXIgaXNSZXNvbHZlZCA9IGZhbHNlO1xuICAgIHZhciBiaXRGaWVsZCA9IG51bGw7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh2YWx1ZXNbaV0sIHJlc3VsdCk7XG5cbiAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgIG1heWJlUHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgICAgICBiaXRGaWVsZCA9IG1heWJlUHJvbWlzZS5fYml0RmllbGQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBiaXRGaWVsZCA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNSZXNvbHZlZCkge1xuICAgICAgICAgICAgaWYgKGJpdEZpZWxkICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLnN1cHByZXNzVW5oYW5kbGVkUmVqZWN0aW9ucygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJpdEZpZWxkICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoKChiaXRGaWVsZCAmIDUwMzk3MTg0KSA9PT0gMCkpIHtcbiAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX3Byb3h5KHRoaXMsIGkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3ZhbHVlc1tpXSA9IG1heWJlUHJvbWlzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDMzNTU0NDMyKSAhPT0gMCkpIHtcbiAgICAgICAgICAgICAgICBpc1Jlc29sdmVkID0gdGhpcy5fcHJvbWlzZUZ1bGZpbGxlZChtYXliZVByb21pc2UuX3ZhbHVlKCksIGkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMTY3NzcyMTYpICE9PSAwKSkge1xuICAgICAgICAgICAgICAgIGlzUmVzb2x2ZWQgPSB0aGlzLl9wcm9taXNlUmVqZWN0ZWQobWF5YmVQcm9taXNlLl9yZWFzb24oKSwgaSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlzUmVzb2x2ZWQgPSB0aGlzLl9wcm9taXNlQ2FuY2VsbGVkKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNSZXNvbHZlZCA9IHRoaXMuX3Byb21pc2VGdWxmaWxsZWQobWF5YmVQcm9taXNlLCBpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWlzUmVzb2x2ZWQpIHJlc3VsdC5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9pc1Jlc29sdmVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZXMgPT09IG51bGw7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fdmFsdWVzID0gbnVsbDtcbiAgICB0aGlzLl9wcm9taXNlLl9mdWxmaWxsKHZhbHVlKTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuX2NhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9pc1Jlc29sdmVkKCkgfHwgIXRoaXMuX3Byb21pc2UuX2lzQ2FuY2VsbGFibGUoKSkgcmV0dXJuO1xuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGw7XG4gICAgdGhpcy5fcHJvbWlzZS5fY2FuY2VsKCk7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9yZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhpcy5fdmFsdWVzID0gbnVsbDtcbiAgICB0aGlzLl9wcm9taXNlLl9yZWplY3RDYWxsYmFjayhyZWFzb24sIGZhbHNlKTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VGdWxmaWxsZWQgPSBmdW5jdGlvbiAodmFsdWUsIGluZGV4KSB7XG4gICAgdGhpcy5fdmFsdWVzW2luZGV4XSA9IHZhbHVlO1xuICAgIHZhciB0b3RhbFJlc29sdmVkID0gKyt0aGlzLl90b3RhbFJlc29sdmVkO1xuICAgIGlmICh0b3RhbFJlc29sdmVkID49IHRoaXMuX2xlbmd0aCkge1xuICAgICAgICB0aGlzLl9yZXNvbHZlKHRoaXMuX3ZhbHVlcyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlQ2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FuY2VsKCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUmVqZWN0ZWQgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhpcy5fdG90YWxSZXNvbHZlZCsrO1xuICAgIHRoaXMuX3JlamVjdChyZWFzb24pO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzdWx0Q2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2lzUmVzb2x2ZWQoKSkgcmV0dXJuO1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG4gICAgdGhpcy5fY2FuY2VsKCk7XG4gICAgaWYgKHZhbHVlcyBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgdmFsdWVzLmNhbmNlbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzW2ldIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5jYW5jZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuc2hvdWxkQ29weVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuZ2V0QWN0dWFsTGVuZ3RoID0gZnVuY3Rpb24gKGxlbikge1xuICAgIHJldHVybiBsZW47XG59O1xuXG5yZXR1cm4gUHJvbWlzZUFycmF5O1xufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDI0OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCkge1xudmFyIFRISVMgPSB7fTtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBub2RlYmFja0ZvclByb21pc2UgPSBfZGVyZXFfKFwiLi9ub2RlYmFja1wiKTtcbnZhciB3aXRoQXBwZW5kZWQgPSB1dGlsLndpdGhBcHBlbmRlZDtcbnZhciBtYXliZVdyYXBBc0Vycm9yID0gdXRpbC5tYXliZVdyYXBBc0Vycm9yO1xudmFyIGNhbkV2YWx1YXRlID0gdXRpbC5jYW5FdmFsdWF0ZTtcbnZhciBUeXBlRXJyb3IgPSBfZGVyZXFfKFwiLi9lcnJvcnNcIikuVHlwZUVycm9yO1xudmFyIGRlZmF1bHRTdWZmaXggPSBcIkFzeW5jXCI7XG52YXIgZGVmYXVsdFByb21pc2lmaWVkID0ge19faXNQcm9taXNpZmllZF9fOiB0cnVlfTtcbnZhciBub0NvcHlQcm9wcyA9IFtcbiAgICBcImFyaXR5XCIsICAgIFwibGVuZ3RoXCIsXG4gICAgXCJuYW1lXCIsXG4gICAgXCJhcmd1bWVudHNcIixcbiAgICBcImNhbGxlclwiLFxuICAgIFwiY2FsbGVlXCIsXG4gICAgXCJwcm90b3R5cGVcIixcbiAgICBcIl9faXNQcm9taXNpZmllZF9fXCJcbl07XG52YXIgbm9Db3B5UHJvcHNQYXR0ZXJuID0gbmV3IFJlZ0V4cChcIl4oPzpcIiArIG5vQ29weVByb3BzLmpvaW4oXCJ8XCIpICsgXCIpJFwiKTtcblxudmFyIGRlZmF1bHRGaWx0ZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHV0aWwuaXNJZGVudGlmaWVyKG5hbWUpICYmXG4gICAgICAgIG5hbWUuY2hhckF0KDApICE9PSBcIl9cIiAmJlxuICAgICAgICBuYW1lICE9PSBcImNvbnN0cnVjdG9yXCI7XG59O1xuXG5mdW5jdGlvbiBwcm9wc0ZpbHRlcihrZXkpIHtcbiAgICByZXR1cm4gIW5vQ29weVByb3BzUGF0dGVybi50ZXN0KGtleSk7XG59XG5cbmZ1bmN0aW9uIGlzUHJvbWlzaWZpZWQoZm4pIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZm4uX19pc1Byb21pc2lmaWVkX18gPT09IHRydWU7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1Byb21pc2lmaWVkKG9iaiwga2V5LCBzdWZmaXgpIHtcbiAgICB2YXIgdmFsID0gdXRpbC5nZXREYXRhUHJvcGVydHlPckRlZmF1bHQob2JqLCBrZXkgKyBzdWZmaXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRQcm9taXNpZmllZCk7XG4gICAgcmV0dXJuIHZhbCA/IGlzUHJvbWlzaWZpZWQodmFsKSA6IGZhbHNlO1xufVxuZnVuY3Rpb24gY2hlY2tWYWxpZChyZXQsIHN1ZmZpeCwgc3VmZml4UmVnZXhwKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgdmFyIGtleSA9IHJldFtpXTtcbiAgICAgICAgaWYgKHN1ZmZpeFJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgIHZhciBrZXlXaXRob3V0QXN5bmNTdWZmaXggPSBrZXkucmVwbGFjZShzdWZmaXhSZWdleHAsIFwiXCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByZXQubGVuZ3RoOyBqICs9IDIpIHtcbiAgICAgICAgICAgICAgICBpZiAocmV0W2pdID09PSBrZXlXaXRob3V0QXN5bmNTdWZmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBwcm9taXNpZnkgYW4gQVBJIHRoYXQgaGFzIG5vcm1hbCBtZXRob2RzIHdpdGggJyVzJy1zdWZmaXhcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKFwiJXNcIiwgc3VmZml4KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwcm9taXNpZmlhYmxlTWV0aG9kcyhvYmosIHN1ZmZpeCwgc3VmZml4UmVnZXhwLCBmaWx0ZXIpIHtcbiAgICB2YXIga2V5cyA9IHV0aWwuaW5oZXJpdGVkRGF0YUtleXMob2JqKTtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSBvYmpba2V5XTtcbiAgICAgICAgdmFyIHBhc3Nlc0RlZmF1bHRGaWx0ZXIgPSBmaWx0ZXIgPT09IGRlZmF1bHRGaWx0ZXJcbiAgICAgICAgICAgID8gdHJ1ZSA6IGRlZmF1bHRGaWx0ZXIoa2V5LCB2YWx1ZSwgb2JqKTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAhaXNQcm9taXNpZmllZCh2YWx1ZSkgJiZcbiAgICAgICAgICAgICFoYXNQcm9taXNpZmllZChvYmosIGtleSwgc3VmZml4KSAmJlxuICAgICAgICAgICAgZmlsdGVyKGtleSwgdmFsdWUsIG9iaiwgcGFzc2VzRGVmYXVsdEZpbHRlcikpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNoZWNrVmFsaWQocmV0LCBzdWZmaXgsIHN1ZmZpeFJlZ2V4cCk7XG4gICAgcmV0dXJuIHJldDtcbn1cblxudmFyIGVzY2FwZUlkZW50UmVnZXggPSBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbJF0pLywgXCJcXFxcJFwiKTtcbn07XG5cbnZhciBtYWtlTm9kZVByb21pc2lmaWVkRXZhbDtcbmlmICghdHJ1ZSkge1xudmFyIHN3aXRjaENhc2VBcmd1bWVudE9yZGVyID0gZnVuY3Rpb24obGlrZWx5QXJndW1lbnRDb3VudCkge1xuICAgIHZhciByZXQgPSBbbGlrZWx5QXJndW1lbnRDb3VudF07XG4gICAgdmFyIG1pbiA9IE1hdGgubWF4KDAsIGxpa2VseUFyZ3VtZW50Q291bnQgLSAxIC0gMyk7XG4gICAgZm9yKHZhciBpID0gbGlrZWx5QXJndW1lbnRDb3VudCAtIDE7IGkgPj0gbWluOyAtLWkpIHtcbiAgICAgICAgcmV0LnB1c2goaSk7XG4gICAgfVxuICAgIGZvcih2YXIgaSA9IGxpa2VseUFyZ3VtZW50Q291bnQgKyAxOyBpIDw9IDM7ICsraSkge1xuICAgICAgICByZXQucHVzaChpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBhcmd1bWVudFNlcXVlbmNlID0gZnVuY3Rpb24oYXJndW1lbnRDb3VudCkge1xuICAgIHJldHVybiB1dGlsLmZpbGxlZFJhbmdlKGFyZ3VtZW50Q291bnQsIFwiX2FyZ1wiLCBcIlwiKTtcbn07XG5cbnZhciBwYXJhbWV0ZXJEZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKHBhcmFtZXRlckNvdW50KSB7XG4gICAgcmV0dXJuIHV0aWwuZmlsbGVkUmFuZ2UoXG4gICAgICAgIE1hdGgubWF4KHBhcmFtZXRlckNvdW50LCAzKSwgXCJfYXJnXCIsIFwiXCIpO1xufTtcblxudmFyIHBhcmFtZXRlckNvdW50ID0gZnVuY3Rpb24oZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuLmxlbmd0aCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5taW4oZm4ubGVuZ3RoLCAxMDIzICsgMSksIDApO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn07XG5cbm1ha2VOb2RlUHJvbWlzaWZpZWRFdmFsID1cbmZ1bmN0aW9uKGNhbGxiYWNrLCByZWNlaXZlciwgb3JpZ2luYWxOYW1lLCBmbiwgXywgbXVsdGlBcmdzKSB7XG4gICAgdmFyIG5ld1BhcmFtZXRlckNvdW50ID0gTWF0aC5tYXgoMCwgcGFyYW1ldGVyQ291bnQoZm4pIC0gMSk7XG4gICAgdmFyIGFyZ3VtZW50T3JkZXIgPSBzd2l0Y2hDYXNlQXJndW1lbnRPcmRlcihuZXdQYXJhbWV0ZXJDb3VudCk7XG4gICAgdmFyIHNob3VsZFByb3h5VGhpcyA9IHR5cGVvZiBjYWxsYmFjayA9PT0gXCJzdHJpbmdcIiB8fCByZWNlaXZlciA9PT0gVEhJUztcblxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlQ2FsbEZvckFyZ3VtZW50Q291bnQoY291bnQpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudFNlcXVlbmNlKGNvdW50KS5qb2luKFwiLCBcIik7XG4gICAgICAgIHZhciBjb21tYSA9IGNvdW50ID4gMCA/IFwiLCBcIiA6IFwiXCI7XG4gICAgICAgIHZhciByZXQ7XG4gICAgICAgIGlmIChzaG91bGRQcm94eVRoaXMpIHtcbiAgICAgICAgICAgIHJldCA9IFwicmV0ID0gY2FsbGJhY2suY2FsbCh0aGlzLCB7e2FyZ3N9fSwgbm9kZWJhY2spOyBicmVhaztcXG5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldCA9IHJlY2VpdmVyID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICA/IFwicmV0ID0gY2FsbGJhY2soe3thcmdzfX0sIG5vZGViYWNrKTsgYnJlYWs7XFxuXCJcbiAgICAgICAgICAgICAgICA6IFwicmV0ID0gY2FsbGJhY2suY2FsbChyZWNlaXZlciwge3thcmdzfX0sIG5vZGViYWNrKTsgYnJlYWs7XFxuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldC5yZXBsYWNlKFwie3thcmdzfX1cIiwgYXJncykucmVwbGFjZShcIiwgXCIsIGNvbW1hKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUFyZ3VtZW50U3dpdGNoQ2FzZSgpIHtcbiAgICAgICAgdmFyIHJldCA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRPcmRlci5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmV0ICs9IFwiY2FzZSBcIiArIGFyZ3VtZW50T3JkZXJbaV0gK1wiOlwiICtcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUNhbGxGb3JBcmd1bWVudENvdW50KGFyZ3VtZW50T3JkZXJbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0ICs9IFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgIGRlZmF1bHQ6ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsZW4gKyAxKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICB2YXIgaSA9IDA7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICBhcmdzW2ldID0gbm9kZWJhY2s7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICBbQ29kZUZvckNhbGxdICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICBicmVhazsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgIFwiLnJlcGxhY2UoXCJbQ29kZUZvckNhbGxdXCIsIChzaG91bGRQcm94eVRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBcInJldCA9IGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3MpO1xcblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogXCJyZXQgPSBjYWxsYmFjay5hcHBseShyZWNlaXZlciwgYXJncyk7XFxuXCIpKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB2YXIgZ2V0RnVuY3Rpb25Db2RlID0gdHlwZW9mIGNhbGxiYWNrID09PSBcInN0cmluZ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gKFwidGhpcyAhPSBudWxsID8gdGhpc1snXCIrY2FsbGJhY2srXCInXSA6IGZuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogXCJmblwiO1xuICAgIHZhciBib2R5ID0gXCIndXNlIHN0cmljdCc7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgdmFyIHJldCA9IGZ1bmN0aW9uIChQYXJhbWV0ZXJzKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoSU5URVJOQUwpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHByb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBub2RlYmFjayA9IG5vZGViYWNrRm9yUHJvbWlzZShwcm9taXNlLCBcIiArIG11bHRpQXJncyArIFwiKTsgICBcXG5cXFxuICAgICAgICAgICAgdmFyIHJldDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gdHJ5Q2F0Y2goW0dldEZ1bmN0aW9uQ29kZV0pOyAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgc3dpdGNoKGxlbikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIFtDb2RlRm9yU3dpdGNoQ2FzZV0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKG1heWJlV3JhcEFzRXJyb3IocmV0LmUpLCB0cnVlLCB0cnVlKTtcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgaWYgKCFwcm9taXNlLl9pc0ZhdGVTZWFsZWQoKSkgcHJvbWlzZS5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7ICAgICBcXG5cXFxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICB9OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBub3RFbnVtZXJhYmxlUHJvcChyZXQsICdfX2lzUHJvbWlzaWZpZWRfXycsIHRydWUpOyAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICByZXR1cm4gcmV0OyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgIFwiLnJlcGxhY2UoXCJbQ29kZUZvclN3aXRjaENhc2VdXCIsIGdlbmVyYXRlQXJndW1lbnRTd2l0Y2hDYXNlKCkpXG4gICAgICAgIC5yZXBsYWNlKFwiW0dldEZ1bmN0aW9uQ29kZV1cIiwgZ2V0RnVuY3Rpb25Db2RlKTtcbiAgICBib2R5ID0gYm9keS5yZXBsYWNlKFwiUGFyYW1ldGVyc1wiLCBwYXJhbWV0ZXJEZWNsYXJhdGlvbihuZXdQYXJhbWV0ZXJDb3VudCkpO1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJQcm9taXNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImZuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInJlY2VpdmVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIndpdGhBcHBlbmRlZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtYXliZVdyYXBBc0Vycm9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5vZGViYWNrRm9yUHJvbWlzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cnlDYXRjaFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJlcnJvck9ialwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJub3RFbnVtZXJhYmxlUHJvcFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJJTlRFUk5BTFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9keSkoXG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgIGZuLFxuICAgICAgICAgICAgICAgICAgICByZWNlaXZlcixcbiAgICAgICAgICAgICAgICAgICAgd2l0aEFwcGVuZGVkLFxuICAgICAgICAgICAgICAgICAgICBtYXliZVdyYXBBc0Vycm9yLFxuICAgICAgICAgICAgICAgICAgICBub2RlYmFja0ZvclByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgIHV0aWwudHJ5Q2F0Y2gsXG4gICAgICAgICAgICAgICAgICAgIHV0aWwuZXJyb3JPYmosXG4gICAgICAgICAgICAgICAgICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AsXG4gICAgICAgICAgICAgICAgICAgIElOVEVSTkFMKTtcbn07XG59XG5cbmZ1bmN0aW9uIG1ha2VOb2RlUHJvbWlzaWZpZWRDbG9zdXJlKGNhbGxiYWNrLCByZWNlaXZlciwgXywgZm4sIF9fLCBtdWx0aUFyZ3MpIHtcbiAgICB2YXIgZGVmYXVsdFRoaXMgPSAoZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXM7fSkoKTtcbiAgICB2YXIgbWV0aG9kID0gY2FsbGJhY2s7XG4gICAgaWYgKHR5cGVvZiBtZXRob2QgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBmbjtcbiAgICB9XG4gICAgZnVuY3Rpb24gcHJvbWlzaWZpZWQoKSB7XG4gICAgICAgIHZhciBfcmVjZWl2ZXIgPSByZWNlaXZlcjtcbiAgICAgICAgaWYgKHJlY2VpdmVyID09PSBUSElTKSBfcmVjZWl2ZXIgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgcHJvbWlzZS5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICAgICAgdmFyIGNiID0gdHlwZW9mIG1ldGhvZCA9PT0gXCJzdHJpbmdcIiAmJiB0aGlzICE9PSBkZWZhdWx0VGhpc1xuICAgICAgICAgICAgPyB0aGlzW21ldGhvZF0gOiBjYWxsYmFjaztcbiAgICAgICAgdmFyIGZuID0gbm9kZWJhY2tGb3JQcm9taXNlKHByb21pc2UsIG11bHRpQXJncyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjYi5hcHBseShfcmVjZWl2ZXIsIHdpdGhBcHBlbmRlZChhcmd1bWVudHMsIGZuKSk7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2sobWF5YmVXcmFwQXNFcnJvcihlKSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwcm9taXNlLl9pc0ZhdGVTZWFsZWQoKSkgcHJvbWlzZS5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKHByb21pc2lmaWVkLCBcIl9faXNQcm9taXNpZmllZF9fXCIsIHRydWUpO1xuICAgIHJldHVybiBwcm9taXNpZmllZDtcbn1cblxudmFyIG1ha2VOb2RlUHJvbWlzaWZpZWQgPSBjYW5FdmFsdWF0ZVxuICAgID8gbWFrZU5vZGVQcm9taXNpZmllZEV2YWxcbiAgICA6IG1ha2VOb2RlUHJvbWlzaWZpZWRDbG9zdXJlO1xuXG5mdW5jdGlvbiBwcm9taXNpZnlBbGwob2JqLCBzdWZmaXgsIGZpbHRlciwgcHJvbWlzaWZpZXIsIG11bHRpQXJncykge1xuICAgIHZhciBzdWZmaXhSZWdleHAgPSBuZXcgUmVnRXhwKGVzY2FwZUlkZW50UmVnZXgoc3VmZml4KSArIFwiJFwiKTtcbiAgICB2YXIgbWV0aG9kcyA9XG4gICAgICAgIHByb21pc2lmaWFibGVNZXRob2RzKG9iaiwgc3VmZml4LCBzdWZmaXhSZWdleHAsIGZpbHRlcik7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbWV0aG9kcy5sZW5ndGg7IGkgPCBsZW47IGkrPSAyKSB7XG4gICAgICAgIHZhciBrZXkgPSBtZXRob2RzW2ldO1xuICAgICAgICB2YXIgZm4gPSBtZXRob2RzW2krMV07XG4gICAgICAgIHZhciBwcm9taXNpZmllZEtleSA9IGtleSArIHN1ZmZpeDtcbiAgICAgICAgaWYgKHByb21pc2lmaWVyID09PSBtYWtlTm9kZVByb21pc2lmaWVkKSB7XG4gICAgICAgICAgICBvYmpbcHJvbWlzaWZpZWRLZXldID1cbiAgICAgICAgICAgICAgICBtYWtlTm9kZVByb21pc2lmaWVkKGtleSwgVEhJUywga2V5LCBmbiwgc3VmZml4LCBtdWx0aUFyZ3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByb21pc2lmaWVkID0gcHJvbWlzaWZpZXIoZm4sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYWtlTm9kZVByb21pc2lmaWVkKGtleSwgVEhJUywga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuLCBzdWZmaXgsIG11bHRpQXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AocHJvbWlzaWZpZWQsIFwiX19pc1Byb21pc2lmaWVkX19cIiwgdHJ1ZSk7XG4gICAgICAgICAgICBvYmpbcHJvbWlzaWZpZWRLZXldID0gcHJvbWlzaWZpZWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdXRpbC50b0Zhc3RQcm9wZXJ0aWVzKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gcHJvbWlzaWZ5KGNhbGxiYWNrLCByZWNlaXZlciwgbXVsdGlBcmdzKSB7XG4gICAgcmV0dXJuIG1ha2VOb2RlUHJvbWlzaWZpZWQoY2FsbGJhY2ssIHJlY2VpdmVyLCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLCBudWxsLCBtdWx0aUFyZ3MpO1xufVxuXG5Qcm9taXNlLnByb21pc2lmeSA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICB9XG4gICAgaWYgKGlzUHJvbWlzaWZpZWQoZm4pKSB7XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdChvcHRpb25zKTtcbiAgICB2YXIgcmVjZWl2ZXIgPSBvcHRpb25zLmNvbnRleHQgPT09IHVuZGVmaW5lZCA/IFRISVMgOiBvcHRpb25zLmNvbnRleHQ7XG4gICAgdmFyIG11bHRpQXJncyA9ICEhb3B0aW9ucy5tdWx0aUFyZ3M7XG4gICAgdmFyIHJldCA9IHByb21pc2lmeShmbiwgcmVjZWl2ZXIsIG11bHRpQXJncyk7XG4gICAgdXRpbC5jb3B5RGVzY3JpcHRvcnMoZm4sIHJldCwgcHJvcHNGaWx0ZXIpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5Qcm9taXNlLnByb21pc2lmeUFsbCA9IGZ1bmN0aW9uICh0YXJnZXQsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInRoZSB0YXJnZXQgb2YgcHJvbWlzaWZ5QWxsIG11c3QgYmUgYW4gb2JqZWN0IG9yIGEgZnVuY3Rpb25cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xuICAgIH1cbiAgICBvcHRpb25zID0gT2JqZWN0KG9wdGlvbnMpO1xuICAgIHZhciBtdWx0aUFyZ3MgPSAhIW9wdGlvbnMubXVsdGlBcmdzO1xuICAgIHZhciBzdWZmaXggPSBvcHRpb25zLnN1ZmZpeDtcbiAgICBpZiAodHlwZW9mIHN1ZmZpeCAhPT0gXCJzdHJpbmdcIikgc3VmZml4ID0gZGVmYXVsdFN1ZmZpeDtcbiAgICB2YXIgZmlsdGVyID0gb3B0aW9ucy5maWx0ZXI7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgIT09IFwiZnVuY3Rpb25cIikgZmlsdGVyID0gZGVmYXVsdEZpbHRlcjtcbiAgICB2YXIgcHJvbWlzaWZpZXIgPSBvcHRpb25zLnByb21pc2lmaWVyO1xuICAgIGlmICh0eXBlb2YgcHJvbWlzaWZpZXIgIT09IFwiZnVuY3Rpb25cIikgcHJvbWlzaWZpZXIgPSBtYWtlTm9kZVByb21pc2lmaWVkO1xuXG4gICAgaWYgKCF1dGlsLmlzSWRlbnRpZmllcihzdWZmaXgpKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwic3VmZml4IG11c3QgYmUgYSB2YWxpZCBpZGVudGlmaWVyXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IHV0aWwuaW5oZXJpdGVkRGF0YUtleXModGFyZ2V0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGFyZ2V0W2tleXNbaV1dO1xuICAgICAgICBpZiAoa2V5c1tpXSAhPT0gXCJjb25zdHJ1Y3RvclwiICYmXG4gICAgICAgICAgICB1dGlsLmlzQ2xhc3ModmFsdWUpKSB7XG4gICAgICAgICAgICBwcm9taXNpZnlBbGwodmFsdWUucHJvdG90eXBlLCBzdWZmaXgsIGZpbHRlciwgcHJvbWlzaWZpZXIsXG4gICAgICAgICAgICAgICAgbXVsdGlBcmdzKTtcbiAgICAgICAgICAgIHByb21pc2lmeUFsbCh2YWx1ZSwgc3VmZml4LCBmaWx0ZXIsIHByb21pc2lmaWVyLCBtdWx0aUFyZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2lmeUFsbCh0YXJnZXQsIHN1ZmZpeCwgZmlsdGVyLCBwcm9taXNpZmllciwgbXVsdGlBcmdzKTtcbn07XG59O1xuXG5cbn0se1wiLi9lcnJvcnNcIjoxMixcIi4vbm9kZWJhY2tcIjoyMCxcIi4vdXRpbFwiOjM2fV0sMjU6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFxuICAgIFByb21pc2UsIFByb21pc2VBcnJheSwgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgaXNPYmplY3QgPSB1dGlsLmlzT2JqZWN0O1xudmFyIGVzNSA9IF9kZXJlcV8oXCIuL2VzNVwiKTtcbnZhciBFczZNYXA7XG5pZiAodHlwZW9mIE1hcCA9PT0gXCJmdW5jdGlvblwiKSBFczZNYXAgPSBNYXA7XG5cbnZhciBtYXBUb0VudHJpZXMgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2l6ZSA9IDA7XG5cbiAgICBmdW5jdGlvbiBleHRyYWN0RW50cnkodmFsdWUsIGtleSkge1xuICAgICAgICB0aGlzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICB0aGlzW2luZGV4ICsgc2l6ZV0gPSBrZXk7XG4gICAgICAgIGluZGV4Kys7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG1hcFRvRW50cmllcyhtYXApIHtcbiAgICAgICAgc2l6ZSA9IG1hcC5zaXplO1xuICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIHZhciByZXQgPSBuZXcgQXJyYXkobWFwLnNpemUgKiAyKTtcbiAgICAgICAgbWFwLmZvckVhY2goZXh0cmFjdEVudHJ5LCByZXQpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG59KSgpO1xuXG52YXIgZW50cmllc1RvTWFwID0gZnVuY3Rpb24oZW50cmllcykge1xuICAgIHZhciByZXQgPSBuZXcgRXM2TWFwKCk7XG4gICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoIC8gMiB8IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0gZW50cmllc1tsZW5ndGggKyBpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gZW50cmllc1tpXTtcbiAgICAgICAgcmV0LnNldChrZXksIHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIFByb3BlcnRpZXNQcm9taXNlQXJyYXkob2JqKSB7XG4gICAgdmFyIGlzTWFwID0gZmFsc2U7XG4gICAgdmFyIGVudHJpZXM7XG4gICAgaWYgKEVzNk1hcCAhPT0gdW5kZWZpbmVkICYmIG9iaiBpbnN0YW5jZW9mIEVzNk1hcCkge1xuICAgICAgICBlbnRyaWVzID0gbWFwVG9FbnRyaWVzKG9iaik7XG4gICAgICAgIGlzTWFwID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IGVzNS5rZXlzKG9iaik7XG4gICAgICAgIHZhciBsZW4gPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZW50cmllcyA9IG5ldyBBcnJheShsZW4gKiAyKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBlbnRyaWVzW2ldID0gb2JqW2tleV07XG4gICAgICAgICAgICBlbnRyaWVzW2kgKyBsZW5dID0ga2V5O1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuY29uc3RydWN0b3IkKGVudHJpZXMpO1xuICAgIHRoaXMuX2lzTWFwID0gaXNNYXA7XG4gICAgdGhpcy5faW5pdCQodW5kZWZpbmVkLCBpc01hcCA/IC02IDogLTMpO1xufVxudXRpbC5pbmhlcml0cyhQcm9wZXJ0aWVzUHJvbWlzZUFycmF5LCBQcm9taXNlQXJyYXkpO1xuXG5Qcm9wZXJ0aWVzUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uICgpIHt9O1xuXG5Qcm9wZXJ0aWVzUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICB0aGlzLl92YWx1ZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgdmFyIHRvdGFsUmVzb2x2ZWQgPSArK3RoaXMuX3RvdGFsUmVzb2x2ZWQ7XG4gICAgaWYgKHRvdGFsUmVzb2x2ZWQgPj0gdGhpcy5fbGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWw7XG4gICAgICAgIGlmICh0aGlzLl9pc01hcCkge1xuICAgICAgICAgICAgdmFsID0gZW50cmllc1RvTWFwKHRoaXMuX3ZhbHVlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWwgPSB7fTtcbiAgICAgICAgICAgIHZhciBrZXlPZmZzZXQgPSB0aGlzLmxlbmd0aCgpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGVuZ3RoKCk7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAgIHZhbFt0aGlzLl92YWx1ZXNbaSArIGtleU9mZnNldF1dID0gdGhpcy5fdmFsdWVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3Jlc29sdmUodmFsKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cblByb3BlcnRpZXNQcm9taXNlQXJyYXkucHJvdG90eXBlLnNob3VsZENvcHlWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuUHJvcGVydGllc1Byb21pc2VBcnJheS5wcm90b3R5cGUuZ2V0QWN0dWFsTGVuZ3RoID0gZnVuY3Rpb24gKGxlbikge1xuICAgIHJldHVybiBsZW4gPj4gMTtcbn07XG5cbmZ1bmN0aW9uIHByb3BzKHByb21pc2VzKSB7XG4gICAgdmFyIHJldDtcbiAgICB2YXIgY2FzdFZhbHVlID0gdHJ5Q29udmVydFRvUHJvbWlzZShwcm9taXNlcyk7XG5cbiAgICBpZiAoIWlzT2JqZWN0KGNhc3RWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIGFwaVJlamVjdGlvbihcImNhbm5vdCBhd2FpdCBwcm9wZXJ0aWVzIG9mIGEgbm9uLW9iamVjdFxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfSBlbHNlIGlmIChjYXN0VmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldCA9IGNhc3RWYWx1ZS5fdGhlbihcbiAgICAgICAgICAgIFByb21pc2UucHJvcHMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0ID0gbmV3IFByb3BlcnRpZXNQcm9taXNlQXJyYXkoY2FzdFZhbHVlKS5wcm9taXNlKCk7XG4gICAgfVxuXG4gICAgaWYgKGNhc3RWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0Ll9wcm9wYWdhdGVGcm9tKGNhc3RWYWx1ZSwgMik7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cblByb21pc2UucHJvdG90eXBlLnByb3BzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9wcyh0aGlzKTtcbn07XG5cblByb21pc2UucHJvcHMgPSBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gcHJvcHMocHJvbWlzZXMpO1xufTtcbn07XG5cbn0se1wiLi9lczVcIjoxMyxcIi4vdXRpbFwiOjM2fV0sMjY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBhcnJheU1vdmUoc3JjLCBzcmNJbmRleCwgZHN0LCBkc3RJbmRleCwgbGVuKSB7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBsZW47ICsraikge1xuICAgICAgICBkc3RbaiArIGRzdEluZGV4XSA9IHNyY1tqICsgc3JjSW5kZXhdO1xuICAgICAgICBzcmNbaiArIHNyY0luZGV4XSA9IHZvaWQgMDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIFF1ZXVlKGNhcGFjaXR5KSB7XG4gICAgdGhpcy5fY2FwYWNpdHkgPSBjYXBhY2l0eTtcbiAgICB0aGlzLl9sZW5ndGggPSAwO1xuICAgIHRoaXMuX2Zyb250ID0gMDtcbn1cblxuUXVldWUucHJvdG90eXBlLl93aWxsQmVPdmVyQ2FwYWNpdHkgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICAgIHJldHVybiB0aGlzLl9jYXBhY2l0eSA8IHNpemU7XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUuX3B1c2hPbmUgPSBmdW5jdGlvbiAoYXJnKSB7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XG4gICAgdGhpcy5fY2hlY2tDYXBhY2l0eShsZW5ndGggKyAxKTtcbiAgICB2YXIgaSA9ICh0aGlzLl9mcm9udCArIGxlbmd0aCkgJiAodGhpcy5fY2FwYWNpdHkgLSAxKTtcbiAgICB0aGlzW2ldID0gYXJnO1xuICAgIHRoaXMuX2xlbmd0aCA9IGxlbmd0aCArIDE7XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpICsgMztcbiAgICBpZiAodGhpcy5fd2lsbEJlT3ZlckNhcGFjaXR5KGxlbmd0aCkpIHtcbiAgICAgICAgdGhpcy5fcHVzaE9uZShmbik7XG4gICAgICAgIHRoaXMuX3B1c2hPbmUocmVjZWl2ZXIpO1xuICAgICAgICB0aGlzLl9wdXNoT25lKGFyZyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGogPSB0aGlzLl9mcm9udCArIGxlbmd0aCAtIDM7XG4gICAgdGhpcy5fY2hlY2tDYXBhY2l0eShsZW5ndGgpO1xuICAgIHZhciB3cmFwTWFzayA9IHRoaXMuX2NhcGFjaXR5IC0gMTtcbiAgICB0aGlzWyhqICsgMCkgJiB3cmFwTWFza10gPSBmbjtcbiAgICB0aGlzWyhqICsgMSkgJiB3cmFwTWFza10gPSByZWNlaXZlcjtcbiAgICB0aGlzWyhqICsgMikgJiB3cmFwTWFza10gPSBhcmc7XG4gICAgdGhpcy5fbGVuZ3RoID0gbGVuZ3RoO1xufTtcblxuUXVldWUucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmcm9udCA9IHRoaXMuX2Zyb250LFxuICAgICAgICByZXQgPSB0aGlzW2Zyb250XTtcblxuICAgIHRoaXNbZnJvbnRdID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2Zyb250ID0gKGZyb250ICsgMSkgJiAodGhpcy5fY2FwYWNpdHkgLSAxKTtcbiAgICB0aGlzLl9sZW5ndGgtLTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUXVldWUucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGVuZ3RoO1xufTtcblxuUXVldWUucHJvdG90eXBlLl9jaGVja0NhcGFjaXR5ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICBpZiAodGhpcy5fY2FwYWNpdHkgPCBzaXplKSB7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZVRvKHRoaXMuX2NhcGFjaXR5IDw8IDEpO1xuICAgIH1cbn07XG5cblF1ZXVlLnByb3RvdHlwZS5fcmVzaXplVG8gPSBmdW5jdGlvbiAoY2FwYWNpdHkpIHtcbiAgICB2YXIgb2xkQ2FwYWNpdHkgPSB0aGlzLl9jYXBhY2l0eTtcbiAgICB0aGlzLl9jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICAgIHZhciBmcm9udCA9IHRoaXMuX2Zyb250O1xuICAgIHZhciBsZW5ndGggPSB0aGlzLl9sZW5ndGg7XG4gICAgdmFyIG1vdmVJdGVtc0NvdW50ID0gKGZyb250ICsgbGVuZ3RoKSAmIChvbGRDYXBhY2l0eSAtIDEpO1xuICAgIGFycmF5TW92ZSh0aGlzLCAwLCB0aGlzLCBvbGRDYXBhY2l0eSwgbW92ZUl0ZW1zQ291bnQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWV1ZTtcblxufSx7fV0sMjc6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFxuICAgIFByb21pc2UsIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBhcGlSZWplY3Rpb24pIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcblxudmFyIHJhY2VMYXRlciA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbihhcnJheSkge1xuICAgICAgICByZXR1cm4gcmFjZShhcnJheSwgcHJvbWlzZSk7XG4gICAgfSk7XG59O1xuXG5mdW5jdGlvbiByYWNlKHByb21pc2VzLCBwYXJlbnQpIHtcbiAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShwcm9taXNlcyk7XG5cbiAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gcmFjZUxhdGVyKG1heWJlUHJvbWlzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcHJvbWlzZXMgPSB1dGlsLmFzQXJyYXkocHJvbWlzZXMpO1xuICAgICAgICBpZiAocHJvbWlzZXMgPT09IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGFuIGFycmF5IG9yIGFuIGl0ZXJhYmxlIG9iamVjdCBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhwcm9taXNlcykpO1xuICAgIH1cblxuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgaWYgKHBhcmVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldC5fcHJvcGFnYXRlRnJvbShwYXJlbnQsIDMpO1xuICAgIH1cbiAgICB2YXIgZnVsZmlsbCA9IHJldC5fZnVsZmlsbDtcbiAgICB2YXIgcmVqZWN0ID0gcmV0Ll9yZWplY3Q7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHByb21pc2VzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHZhciB2YWwgPSBwcm9taXNlc1tpXTtcblxuICAgICAgICBpZiAodmFsID09PSB1bmRlZmluZWQgJiYgIShpIGluIHByb21pc2VzKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBQcm9taXNlLmNhc3QodmFsKS5fdGhlbihmdWxmaWxsLCByZWplY3QsIHVuZGVmaW5lZCwgcmV0LCBudWxsKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxuUHJvbWlzZS5yYWNlID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIHJhY2UocHJvbWlzZXMsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5yYWNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiByYWNlKHRoaXMsIHVuZGVmaW5lZCk7XG59O1xuXG59O1xuXG59LHtcIi4vdXRpbFwiOjM2fV0sMjg6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFByb21pc2VBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpUmVqZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cnlDb252ZXJ0VG9Qcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBJTlRFUk5BTCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWcpIHtcbnZhciBnZXREb21haW4gPSBQcm9taXNlLl9nZXREb21haW47XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xuXG5mdW5jdGlvbiBSZWR1Y3Rpb25Qcm9taXNlQXJyYXkocHJvbWlzZXMsIGZuLCBpbml0aWFsVmFsdWUsIF9lYWNoKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3RvciQocHJvbWlzZXMpO1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICB0aGlzLl9mbiA9IGRvbWFpbiA9PT0gbnVsbCA/IGZuIDogdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgZm4pO1xuICAgIGlmIChpbml0aWFsVmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbml0aWFsVmFsdWUgPSBQcm9taXNlLnJlc29sdmUoaW5pdGlhbFZhbHVlKTtcbiAgICAgICAgaW5pdGlhbFZhbHVlLl9hdHRhY2hDYW5jZWxsYXRpb25DYWxsYmFjayh0aGlzKTtcbiAgICB9XG4gICAgdGhpcy5faW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlO1xuICAgIHRoaXMuX2N1cnJlbnRDYW5jZWxsYWJsZSA9IG51bGw7XG4gICAgaWYoX2VhY2ggPT09IElOVEVSTkFMKSB7XG4gICAgICAgIHRoaXMuX2VhY2hWYWx1ZXMgPSBBcnJheSh0aGlzLl9sZW5ndGgpO1xuICAgIH0gZWxzZSBpZiAoX2VhY2ggPT09IDApIHtcbiAgICAgICAgdGhpcy5fZWFjaFZhbHVlcyA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZWFjaFZhbHVlcyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5fcHJvbWlzZS5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB0aGlzLl9pbml0JCh1bmRlZmluZWQsIC01KTtcbn1cbnV0aWwuaW5oZXJpdHMoUmVkdWN0aW9uUHJvbWlzZUFycmF5LCBQcm9taXNlQXJyYXkpO1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9nb3RBY2N1bSA9IGZ1bmN0aW9uKGFjY3VtKSB7XG4gICAgaWYgKHRoaXMuX2VhY2hWYWx1ZXMgIT09IHVuZGVmaW5lZCAmJiBcbiAgICAgICAgdGhpcy5fZWFjaFZhbHVlcyAhPT0gbnVsbCAmJiBcbiAgICAgICAgYWNjdW0gIT09IElOVEVSTkFMKSB7XG4gICAgICAgIHRoaXMuX2VhY2hWYWx1ZXMucHVzaChhY2N1bSk7XG4gICAgfVxufTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fZWFjaENvbXBsZXRlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5fZWFjaFZhbHVlcyAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9lYWNoVmFsdWVzLnB1c2godmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZWFjaFZhbHVlcztcbn07XG5cblJlZHVjdGlvblByb21pc2VBcnJheS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHt9O1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9yZXNvbHZlRW1wdHlBcnJheSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3Jlc29sdmUodGhpcy5fZWFjaFZhbHVlcyAhPT0gdW5kZWZpbmVkID8gdGhpcy5fZWFjaFZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdGhpcy5faW5pdGlhbFZhbHVlKTtcbn07XG5cblJlZHVjdGlvblByb21pc2VBcnJheS5wcm90b3R5cGUuc2hvdWxkQ29weVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9yZXNvbHZlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLl9wcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2sodmFsdWUpO1xuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGw7XG59O1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9yZXN1bHRDYW5jZWxsZWQgPSBmdW5jdGlvbihzZW5kZXIpIHtcbiAgICBpZiAoc2VuZGVyID09PSB0aGlzLl9pbml0aWFsVmFsdWUpIHJldHVybiB0aGlzLl9jYW5jZWwoKTtcbiAgICBpZiAodGhpcy5faXNSZXNvbHZlZCgpKSByZXR1cm47XG4gICAgdGhpcy5fcmVzdWx0Q2FuY2VsbGVkJCgpO1xuICAgIGlmICh0aGlzLl9jdXJyZW50Q2FuY2VsbGFibGUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRDYW5jZWxsYWJsZS5jYW5jZWwoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX2luaXRpYWxWYWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgdGhpcy5faW5pdGlhbFZhbHVlLmNhbmNlbCgpO1xuICAgIH1cbn07XG5cblJlZHVjdGlvblByb21pc2VBcnJheS5wcm90b3R5cGUuX2l0ZXJhdGUgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgdGhpcy5fdmFsdWVzID0gdmFsdWVzO1xuICAgIHZhciB2YWx1ZTtcbiAgICB2YXIgaTtcbiAgICB2YXIgbGVuZ3RoID0gdmFsdWVzLmxlbmd0aDtcbiAgICBpZiAodGhpcy5faW5pdGlhbFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFsdWUgPSB0aGlzLl9pbml0aWFsVmFsdWU7XG4gICAgICAgIGkgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gUHJvbWlzZS5yZXNvbHZlKHZhbHVlc1swXSk7XG4gICAgICAgIGkgPSAxO1xuICAgIH1cblxuICAgIHRoaXMuX2N1cnJlbnRDYW5jZWxsYWJsZSA9IHZhbHVlO1xuXG4gICAgaWYgKCF2YWx1ZS5pc1JlamVjdGVkKCkpIHtcbiAgICAgICAgZm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IHtcbiAgICAgICAgICAgICAgICBhY2N1bTogbnVsbCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVzW2ldLFxuICAgICAgICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgICAgICAgIGxlbmd0aDogbGVuZ3RoLFxuICAgICAgICAgICAgICAgIGFycmF5OiB0aGlzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5fdGhlbihnb3RBY2N1bSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGN0eCwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9lYWNoVmFsdWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZVxuICAgICAgICAgICAgLl90aGVuKHRoaXMuX2VhY2hDb21wbGV0ZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMsIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHZhbHVlLl90aGVuKGNvbXBsZXRlZCwgY29tcGxldGVkLCB1bmRlZmluZWQsIHZhbHVlLCB0aGlzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChmbiwgaW5pdGlhbFZhbHVlKSB7XG4gICAgcmV0dXJuIHJlZHVjZSh0aGlzLCBmbiwgaW5pdGlhbFZhbHVlLCBudWxsKTtcbn07XG5cblByb21pc2UucmVkdWNlID0gZnVuY3Rpb24gKHByb21pc2VzLCBmbiwgaW5pdGlhbFZhbHVlLCBfZWFjaCkge1xuICAgIHJldHVybiByZWR1Y2UocHJvbWlzZXMsIGZuLCBpbml0aWFsVmFsdWUsIF9lYWNoKTtcbn07XG5cbmZ1bmN0aW9uIGNvbXBsZXRlZCh2YWx1ZU9yUmVhc29uLCBhcnJheSkge1xuICAgIGlmICh0aGlzLmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgYXJyYXkuX3Jlc29sdmUodmFsdWVPclJlYXNvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXJyYXkuX3JlamVjdCh2YWx1ZU9yUmVhc29uKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlZHVjZShwcm9taXNlcywgZm4sIGluaXRpYWxWYWx1ZSwgX2VhY2gpIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGFwaVJlamVjdGlvbihcImV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGZuKSk7XG4gICAgfVxuICAgIHZhciBhcnJheSA9IG5ldyBSZWR1Y3Rpb25Qcm9taXNlQXJyYXkocHJvbWlzZXMsIGZuLCBpbml0aWFsVmFsdWUsIF9lYWNoKTtcbiAgICByZXR1cm4gYXJyYXkucHJvbWlzZSgpO1xufVxuXG5mdW5jdGlvbiBnb3RBY2N1bShhY2N1bSkge1xuICAgIHRoaXMuYWNjdW0gPSBhY2N1bTtcbiAgICB0aGlzLmFycmF5Ll9nb3RBY2N1bShhY2N1bSk7XG4gICAgdmFyIHZhbHVlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh0aGlzLnZhbHVlLCB0aGlzLmFycmF5Ll9wcm9taXNlKTtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHRoaXMuYXJyYXkuX2N1cnJlbnRDYW5jZWxsYWJsZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdmFsdWUuX3RoZW4oZ290VmFsdWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzLCB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBnb3RWYWx1ZS5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdvdFZhbHVlKHZhbHVlKSB7XG4gICAgdmFyIGFycmF5ID0gdGhpcy5hcnJheTtcbiAgICB2YXIgcHJvbWlzZSA9IGFycmF5Ll9wcm9taXNlO1xuICAgIHZhciBmbiA9IHRyeUNhdGNoKGFycmF5Ll9mbik7XG4gICAgcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICB2YXIgcmV0O1xuICAgIGlmIChhcnJheS5fZWFjaFZhbHVlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldCA9IGZuLmNhbGwocHJvbWlzZS5fYm91bmRWYWx1ZSgpLCB2YWx1ZSwgdGhpcy5pbmRleCwgdGhpcy5sZW5ndGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCA9IGZuLmNhbGwocHJvbWlzZS5fYm91bmRWYWx1ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hY2N1bSwgdmFsdWUsIHRoaXMuaW5kZXgsIHRoaXMubGVuZ3RoKTtcbiAgICB9XG4gICAgaWYgKHJldCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgYXJyYXkuX2N1cnJlbnRDYW5jZWxsYWJsZSA9IHJldDtcbiAgICB9XG4gICAgdmFyIHByb21pc2VDcmVhdGVkID0gcHJvbWlzZS5fcG9wQ29udGV4dCgpO1xuICAgIGRlYnVnLmNoZWNrRm9yZ290dGVuUmV0dXJucyhcbiAgICAgICAgcmV0LFxuICAgICAgICBwcm9taXNlQ3JlYXRlZCxcbiAgICAgICAgYXJyYXkuX2VhY2hWYWx1ZXMgIT09IHVuZGVmaW5lZCA/IFwiUHJvbWlzZS5lYWNoXCIgOiBcIlByb21pc2UucmVkdWNlXCIsXG4gICAgICAgIHByb21pc2VcbiAgICApO1xuICAgIHJldHVybiByZXQ7XG59XG59O1xuXG59LHtcIi4vdXRpbFwiOjM2fV0sMjk6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgc2NoZWR1bGU7XG52YXIgbm9Bc3luY1NjaGVkdWxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGFzeW5jIHNjaGVkdWxlciBhdmFpbGFibGVcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xufTtcbnZhciBOYXRpdmVQcm9taXNlID0gdXRpbC5nZXROYXRpdmVQcm9taXNlKCk7XG5pZiAodXRpbC5pc05vZGUgJiYgdHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgR2xvYmFsU2V0SW1tZWRpYXRlID0gZ2xvYmFsLnNldEltbWVkaWF0ZTtcbiAgICB2YXIgUHJvY2Vzc05leHRUaWNrID0gcHJvY2Vzcy5uZXh0VGljaztcbiAgICBzY2hlZHVsZSA9IHV0aWwuaXNSZWNlbnROb2RlXG4gICAgICAgICAgICAgICAgPyBmdW5jdGlvbihmbikgeyBHbG9iYWxTZXRJbW1lZGlhdGUuY2FsbChnbG9iYWwsIGZuKTsgfVxuICAgICAgICAgICAgICAgIDogZnVuY3Rpb24oZm4pIHsgUHJvY2Vzc05leHRUaWNrLmNhbGwocHJvY2VzcywgZm4pOyB9O1xufSBlbHNlIGlmICh0eXBlb2YgTmF0aXZlUHJvbWlzZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgIHR5cGVvZiBOYXRpdmVQcm9taXNlLnJlc29sdmUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHZhciBuYXRpdmVQcm9taXNlID0gTmF0aXZlUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgc2NoZWR1bGUgPSBmdW5jdGlvbihmbikge1xuICAgICAgICBuYXRpdmVQcm9taXNlLnRoZW4oZm4pO1xuICAgIH07XG59IGVsc2UgaWYgKCh0eXBlb2YgTXV0YXRpb25PYnNlcnZlciAhPT0gXCJ1bmRlZmluZWRcIikgJiZcbiAgICAgICAgICAhKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgICAgIHdpbmRvdy5uYXZpZ2F0b3IgJiZcbiAgICAgICAgICAgICh3aW5kb3cubmF2aWdhdG9yLnN0YW5kYWxvbmUgfHwgd2luZG93LmNvcmRvdmEpKSkge1xuICAgIHNjaGVkdWxlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9wdHMgPSB7YXR0cmlidXRlczogdHJ1ZX07XG4gICAgICAgIHZhciB0b2dnbGVTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIGRpdjIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgbzIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGRpdi5jbGFzc0xpc3QudG9nZ2xlKFwiZm9vXCIpO1xuICAgICAgICAgICAgdG9nZ2xlU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBvMi5vYnNlcnZlKGRpdjIsIG9wdHMpO1xuXG4gICAgICAgIHZhciBzY2hlZHVsZVRvZ2dsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRvZ2dsZVNjaGVkdWxlZCkgcmV0dXJuO1xuICAgICAgICAgICAgdG9nZ2xlU2NoZWR1bGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGRpdjIuY2xhc3NMaXN0LnRvZ2dsZShcImZvb1wiKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gc2NoZWR1bGUoZm4pIHtcbiAgICAgICAgICAgIHZhciBvID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgby5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgby5vYnNlcnZlKGRpdiwgb3B0cyk7XG4gICAgICAgICAgICBzY2hlZHVsZVRvZ2dsZSgpO1xuICAgICAgICB9O1xuICAgIH0pKCk7XG59IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBzY2hlZHVsZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgIH07XG59IGVsc2UgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgc2NoZWR1bGUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0gZWxzZSB7XG4gICAgc2NoZWR1bGUgPSBub0FzeW5jU2NoZWR1bGVyO1xufVxubW9kdWxlLmV4cG9ydHMgPSBzY2hlZHVsZTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDMwOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPVxuICAgIGZ1bmN0aW9uKFByb21pc2UsIFByb21pc2VBcnJheSwgZGVidWcpIHtcbnZhciBQcm9taXNlSW5zcGVjdGlvbiA9IFByb21pc2UuUHJvbWlzZUluc3BlY3Rpb247XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG5cbmZ1bmN0aW9uIFNldHRsZWRQcm9taXNlQXJyYXkodmFsdWVzKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3RvciQodmFsdWVzKTtcbn1cbnV0aWwuaW5oZXJpdHMoU2V0dGxlZFByb21pc2VBcnJheSwgUHJvbWlzZUFycmF5KTtcblxuU2V0dGxlZFByb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VSZXNvbHZlZCA9IGZ1bmN0aW9uIChpbmRleCwgaW5zcGVjdGlvbikge1xuICAgIHRoaXMuX3ZhbHVlc1tpbmRleF0gPSBpbnNwZWN0aW9uO1xuICAgIHZhciB0b3RhbFJlc29sdmVkID0gKyt0aGlzLl90b3RhbFJlc29sdmVkO1xuICAgIGlmICh0b3RhbFJlc29sdmVkID49IHRoaXMuX2xlbmd0aCkge1xuICAgICAgICB0aGlzLl9yZXNvbHZlKHRoaXMuX3ZhbHVlcyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5TZXR0bGVkUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgpIHtcbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2VJbnNwZWN0aW9uKCk7XG4gICAgcmV0Ll9iaXRGaWVsZCA9IDMzNTU0NDMyO1xuICAgIHJldC5fc2V0dGxlZFZhbHVlRmllbGQgPSB2YWx1ZTtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZVJlc29sdmVkKGluZGV4LCByZXQpO1xufTtcblNldHRsZWRQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUmVqZWN0ZWQgPSBmdW5jdGlvbiAocmVhc29uLCBpbmRleCkge1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZUluc3BlY3Rpb24oKTtcbiAgICByZXQuX2JpdEZpZWxkID0gMTY3NzcyMTY7XG4gICAgcmV0Ll9zZXR0bGVkVmFsdWVGaWVsZCA9IHJlYXNvbjtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZVJlc29sdmVkKGluZGV4LCByZXQpO1xufTtcblxuUHJvbWlzZS5zZXR0bGUgPSBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICBkZWJ1Zy5kZXByZWNhdGVkKFwiLnNldHRsZSgpXCIsIFwiLnJlZmxlY3QoKVwiKTtcbiAgICByZXR1cm4gbmV3IFNldHRsZWRQcm9taXNlQXJyYXkocHJvbWlzZXMpLnByb21pc2UoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNldHRsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5zZXR0bGUodGhpcyk7XG59O1xufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDMxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPVxuZnVuY3Rpb24oUHJvbWlzZSwgUHJvbWlzZUFycmF5LCBhcGlSZWplY3Rpb24pIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBSYW5nZUVycm9yID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpLlJhbmdlRXJyb3I7XG52YXIgQWdncmVnYXRlRXJyb3IgPSBfZGVyZXFfKFwiLi9lcnJvcnNcIikuQWdncmVnYXRlRXJyb3I7XG52YXIgaXNBcnJheSA9IHV0aWwuaXNBcnJheTtcbnZhciBDQU5DRUxMQVRJT04gPSB7fTtcblxuXG5mdW5jdGlvbiBTb21lUHJvbWlzZUFycmF5KHZhbHVlcykge1xuICAgIHRoaXMuY29uc3RydWN0b3IkKHZhbHVlcyk7XG4gICAgdGhpcy5faG93TWFueSA9IDA7XG4gICAgdGhpcy5fdW53cmFwID0gZmFsc2U7XG4gICAgdGhpcy5faW5pdGlhbGl6ZWQgPSBmYWxzZTtcbn1cbnV0aWwuaW5oZXJpdHMoU29tZVByb21pc2VBcnJheSwgUHJvbWlzZUFycmF5KTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9pbml0aWFsaXplZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLl9ob3dNYW55ID09PSAwKSB7XG4gICAgICAgIHRoaXMuX3Jlc29sdmUoW10pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2luaXQkKHVuZGVmaW5lZCwgLTUpO1xuICAgIHZhciBpc0FycmF5UmVzb2x2ZWQgPSBpc0FycmF5KHRoaXMuX3ZhbHVlcyk7XG4gICAgaWYgKCF0aGlzLl9pc1Jlc29sdmVkKCkgJiZcbiAgICAgICAgaXNBcnJheVJlc29sdmVkICYmXG4gICAgICAgIHRoaXMuX2hvd01hbnkgPiB0aGlzLl9jYW5Qb3NzaWJseUZ1bGZpbGwoKSkge1xuICAgICAgICB0aGlzLl9yZWplY3QodGhpcy5fZ2V0UmFuZ2VFcnJvcih0aGlzLmxlbmd0aCgpKSk7XG4gICAgfVxufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9pbml0aWFsaXplZCA9IHRydWU7XG4gICAgdGhpcy5faW5pdCgpO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuc2V0VW53cmFwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3Vud3JhcCA9IHRydWU7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5ob3dNYW55ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9ob3dNYW55O1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuc2V0SG93TWFueSA9IGZ1bmN0aW9uIChjb3VudCkge1xuICAgIHRoaXMuX2hvd01hbnkgPSBjb3VudDtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlRnVsZmlsbGVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fYWRkRnVsZmlsbGVkKHZhbHVlKTtcbiAgICBpZiAodGhpcy5fZnVsZmlsbGVkKCkgPT09IHRoaXMuaG93TWFueSgpKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlcy5sZW5ndGggPSB0aGlzLmhvd01hbnkoKTtcbiAgICAgICAgaWYgKHRoaXMuaG93TWFueSgpID09PSAxICYmIHRoaXMuX3Vud3JhcCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZSh0aGlzLl92YWx1ZXNbMF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZSh0aGlzLl92YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG5cbn07XG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZVJlamVjdGVkID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuX2FkZFJlamVjdGVkKHJlYXNvbik7XG4gICAgcmV0dXJuIHRoaXMuX2NoZWNrT3V0Y29tZSgpO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VDYW5jZWxsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX3ZhbHVlcyBpbnN0YW5jZW9mIFByb21pc2UgfHwgdGhpcy5fdmFsdWVzID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhbmNlbCgpO1xuICAgIH1cbiAgICB0aGlzLl9hZGRSZWplY3RlZChDQU5DRUxMQVRJT04pO1xuICAgIHJldHVybiB0aGlzLl9jaGVja091dGNvbWUoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9jaGVja091dGNvbWUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5ob3dNYW55KCkgPiB0aGlzLl9jYW5Qb3NzaWJseUZ1bGZpbGwoKSkge1xuICAgICAgICB2YXIgZSA9IG5ldyBBZ2dyZWdhdGVFcnJvcigpO1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGgoKTsgaSA8IHRoaXMuX3ZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3ZhbHVlc1tpXSAhPT0gQ0FOQ0VMTEFUSU9OKSB7XG4gICAgICAgICAgICAgICAgZS5wdXNoKHRoaXMuX3ZhbHVlc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fcmVqZWN0KGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9mdWxmaWxsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RvdGFsUmVzb2x2ZWQ7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ZhbHVlcy5sZW5ndGggLSB0aGlzLmxlbmd0aCgpO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX2FkZFJlamVjdGVkID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuX3ZhbHVlcy5wdXNoKHJlYXNvbik7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fYWRkRnVsZmlsbGVkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5fdmFsdWVzW3RoaXMuX3RvdGFsUmVzb2x2ZWQrK10gPSB2YWx1ZTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9jYW5Qb3NzaWJseUZ1bGZpbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoKCkgLSB0aGlzLl9yZWplY3RlZCgpO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX2dldFJhbmdlRXJyb3IgPSBmdW5jdGlvbiAoY291bnQpIHtcbiAgICB2YXIgbWVzc2FnZSA9IFwiSW5wdXQgYXJyYXkgbXVzdCBjb250YWluIGF0IGxlYXN0IFwiICtcbiAgICAgICAgICAgIHRoaXMuX2hvd01hbnkgKyBcIiBpdGVtcyBidXQgY29udGFpbnMgb25seSBcIiArIGNvdW50ICsgXCIgaXRlbXNcIjtcbiAgICByZXR1cm4gbmV3IFJhbmdlRXJyb3IobWVzc2FnZSk7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzb2x2ZUVtcHR5QXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcmVqZWN0KHRoaXMuX2dldFJhbmdlRXJyb3IoMCkpO1xufTtcblxuZnVuY3Rpb24gc29tZShwcm9taXNlcywgaG93TWFueSkge1xuICAgIGlmICgoaG93TWFueSB8IDApICE9PSBob3dNYW55IHx8IGhvd01hbnkgPCAwKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJleHBlY3RpbmcgYSBwb3NpdGl2ZSBpbnRlZ2VyXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgdmFyIHJldCA9IG5ldyBTb21lUHJvbWlzZUFycmF5KHByb21pc2VzKTtcbiAgICB2YXIgcHJvbWlzZSA9IHJldC5wcm9taXNlKCk7XG4gICAgcmV0LnNldEhvd01hbnkoaG93TWFueSk7XG4gICAgcmV0LmluaXQoKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuUHJvbWlzZS5zb21lID0gZnVuY3Rpb24gKHByb21pc2VzLCBob3dNYW55KSB7XG4gICAgcmV0dXJuIHNvbWUocHJvbWlzZXMsIGhvd01hbnkpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIChob3dNYW55KSB7XG4gICAgcmV0dXJuIHNvbWUodGhpcywgaG93TWFueSk7XG59O1xuXG5Qcm9taXNlLl9Tb21lUHJvbWlzZUFycmF5ID0gU29tZVByb21pc2VBcnJheTtcbn07XG5cbn0se1wiLi9lcnJvcnNcIjoxMixcIi4vdXRpbFwiOjM2fV0sMzI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UpIHtcbmZ1bmN0aW9uIFByb21pc2VJbnNwZWN0aW9uKHByb21pc2UpIHtcbiAgICBpZiAocHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByb21pc2UgPSBwcm9taXNlLl90YXJnZXQoKTtcbiAgICAgICAgdGhpcy5fYml0RmllbGQgPSBwcm9taXNlLl9iaXRGaWVsZDtcbiAgICAgICAgdGhpcy5fc2V0dGxlZFZhbHVlRmllbGQgPSBwcm9taXNlLl9pc0ZhdGVTZWFsZWQoKVxuICAgICAgICAgICAgPyBwcm9taXNlLl9zZXR0bGVkVmFsdWUoKSA6IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2JpdEZpZWxkID0gMDtcbiAgICAgICAgdGhpcy5fc2V0dGxlZFZhbHVlRmllbGQgPSB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5Qcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUuX3NldHRsZWRWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXR0bGVkVmFsdWVGaWVsZDtcbn07XG5cbnZhciB2YWx1ZSA9IFByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNGdWxmaWxsZWQoKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IGdldCBmdWxmaWxsbWVudCB2YWx1ZSBvZiBhIG5vbi1mdWxmaWxsZWQgcHJvbWlzZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9zZXR0bGVkVmFsdWUoKTtcbn07XG5cbnZhciByZWFzb24gPSBQcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUuZXJyb3IgPVxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLnJlYXNvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNSZWplY3RlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgZ2V0IHJlamVjdGlvbiByZWFzb24gb2YgYSBub24tcmVqZWN0ZWQgcHJvbWlzZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9zZXR0bGVkVmFsdWUoKTtcbn07XG5cbnZhciBpc0Z1bGZpbGxlZCA9IFByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDA7XG59O1xuXG52YXIgaXNSZWplY3RlZCA9IFByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5pc1JlamVjdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAxNjc3NzIxNikgIT09IDA7XG59O1xuXG52YXIgaXNQZW5kaW5nID0gUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmlzUGVuZGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgNTAzOTcxODQpID09PSAwO1xufTtcblxudmFyIGlzUmVzb2x2ZWQgPSBQcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUuaXNSZXNvbHZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgNTAzMzE2NDgpICE9PSAwO1xufTtcblxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmlzQ2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDg0NTQxNDQpICE9PSAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX19pc0NhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA2NTUzNikgPT09IDY1NTM2O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzQ2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldCgpLl9faXNDYW5jZWxsZWQoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmlzQ2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLl90YXJnZXQoKS5fYml0RmllbGQgJiA4NDU0MTQ0KSAhPT0gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmlzUGVuZGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBpc1BlbmRpbmcuY2FsbCh0aGlzLl90YXJnZXQoKSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc1JlamVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGlzUmVqZWN0ZWQuY2FsbCh0aGlzLl90YXJnZXQoKSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBpc0Z1bGZpbGxlZC5jYWxsKHRoaXMuX3RhcmdldCgpKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmlzUmVzb2x2ZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaXNSZXNvbHZlZC5jYWxsKHRoaXMuX3RhcmdldCgpKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHZhbHVlLmNhbGwodGhpcy5fdGFyZ2V0KCkpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUucmVhc29uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRhcmdldCA9IHRoaXMuX3RhcmdldCgpO1xuICAgIHRhcmdldC5fdW5zZXRSZWplY3Rpb25Jc1VuaGFuZGxlZCgpO1xuICAgIHJldHVybiByZWFzb24uY2FsbCh0YXJnZXQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3ZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NldHRsZWRWYWx1ZSgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlYXNvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3Vuc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQoKTtcbiAgICByZXR1cm4gdGhpcy5fc2V0dGxlZFZhbHVlKCk7XG59O1xuXG5Qcm9taXNlLlByb21pc2VJbnNwZWN0aW9uID0gUHJvbWlzZUluc3BlY3Rpb247XG59O1xuXG59LHt9XSwzMzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgaXNPYmplY3QgPSB1dGlsLmlzT2JqZWN0O1xuXG5mdW5jdGlvbiB0cnlDb252ZXJ0VG9Qcm9taXNlKG9iaiwgY29udGV4dCkge1xuICAgIGlmIChpc09iamVjdChvYmopKSB7XG4gICAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gb2JqO1xuICAgICAgICB2YXIgdGhlbiA9IGdldFRoZW4ob2JqKTtcbiAgICAgICAgaWYgKHRoZW4gPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICBpZiAoY29udGV4dCkgY29udGV4dC5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgICAgIHZhciByZXQgPSBQcm9taXNlLnJlamVjdCh0aGVuLmUpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIGNvbnRleHQuX3BvcENvbnRleHQoKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoZW4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgaWYgKGlzQW55Qmx1ZWJpcmRQcm9taXNlKG9iaikpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICAgICAgICAgIG9iai5fdGhlbihcbiAgICAgICAgICAgICAgICAgICAgcmV0Ll9mdWxmaWxsLFxuICAgICAgICAgICAgICAgICAgICByZXQuX3JlamVjdCxcbiAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICByZXQsXG4gICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZG9UaGVuYWJsZShvYmosIHRoZW4sIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIGRvR2V0VGhlbihvYmopIHtcbiAgICByZXR1cm4gb2JqLnRoZW47XG59XG5cbmZ1bmN0aW9uIGdldFRoZW4ob2JqKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGRvR2V0VGhlbihvYmopO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3JPYmouZSA9IGU7XG4gICAgICAgIHJldHVybiBlcnJvck9iajtcbiAgICB9XG59XG5cbnZhciBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5mdW5jdGlvbiBpc0FueUJsdWViaXJkUHJvbWlzZShvYmopIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gaGFzUHJvcC5jYWxsKG9iaiwgXCJfcHJvbWlzZTBcIik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkb1RoZW5hYmxlKHgsIHRoZW4sIGNvbnRleHQpIHtcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICB2YXIgcmV0ID0gcHJvbWlzZTtcbiAgICBpZiAoY29udGV4dCkgY29udGV4dC5fcHVzaENvbnRleHQoKTtcbiAgICBwcm9taXNlLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIGlmIChjb250ZXh0KSBjb250ZXh0Ll9wb3BDb250ZXh0KCk7XG4gICAgdmFyIHN5bmNocm9ub3VzID0gdHJ1ZTtcbiAgICB2YXIgcmVzdWx0ID0gdXRpbC50cnlDYXRjaCh0aGVuKS5jYWxsKHgsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgc3luY2hyb25vdXMgPSBmYWxzZTtcblxuICAgIGlmIChwcm9taXNlICYmIHJlc3VsdCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVzdWx0LmUsIHRydWUsIHRydWUpO1xuICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlKHZhbHVlKSB7XG4gICAgICAgIGlmICghcHJvbWlzZSkgcmV0dXJuO1xuICAgICAgICBwcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2sodmFsdWUpO1xuICAgICAgICBwcm9taXNlID0gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWplY3QocmVhc29uKSB7XG4gICAgICAgIGlmICghcHJvbWlzZSkgcmV0dXJuO1xuICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhyZWFzb24sIHN5bmNocm9ub3VzLCB0cnVlKTtcbiAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbnJldHVybiB0cnlDb252ZXJ0VG9Qcm9taXNlO1xufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDM0OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCwgZGVidWcpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBUaW1lb3V0RXJyb3IgPSBQcm9taXNlLlRpbWVvdXRFcnJvcjtcblxuZnVuY3Rpb24gSGFuZGxlV3JhcHBlcihoYW5kbGUpICB7XG4gICAgdGhpcy5oYW5kbGUgPSBoYW5kbGU7XG59XG5cbkhhbmRsZVdyYXBwZXIucHJvdG90eXBlLl9yZXN1bHRDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5oYW5kbGUpO1xufTtcblxudmFyIGFmdGVyVmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gZGVsYXkoK3RoaXMpLnRoZW5SZXR1cm4odmFsdWUpOyB9O1xudmFyIGRlbGF5ID0gUHJvbWlzZS5kZWxheSA9IGZ1bmN0aW9uIChtcywgdmFsdWUpIHtcbiAgICB2YXIgcmV0O1xuICAgIHZhciBoYW5kbGU7XG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0ID0gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKVxuICAgICAgICAgICAgICAgIC5fdGhlbihhZnRlclZhbHVlLCBudWxsLCBudWxsLCBtcywgdW5kZWZpbmVkKTtcbiAgICAgICAgaWYgKGRlYnVnLmNhbmNlbGxhdGlvbigpICYmIHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgcmV0Ll9zZXRPbkNhbmNlbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIGhhbmRsZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHJldC5fZnVsZmlsbCgpOyB9LCArbXMpO1xuICAgICAgICBpZiAoZGVidWcuY2FuY2VsbGF0aW9uKCkpIHtcbiAgICAgICAgICAgIHJldC5fc2V0T25DYW5jZWwobmV3IEhhbmRsZVdyYXBwZXIoaGFuZGxlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0Ll9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIH1cbiAgICByZXQuX3NldEFzeW5jR3VhcmFudGVlZCgpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uIChtcykge1xuICAgIHJldHVybiBkZWxheShtcywgdGhpcyk7XG59O1xuXG52YXIgYWZ0ZXJUaW1lb3V0ID0gZnVuY3Rpb24gKHByb21pc2UsIG1lc3NhZ2UsIHBhcmVudCkge1xuICAgIHZhciBlcnI7XG4gICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGVyciA9IG1lc3NhZ2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnIgPSBuZXcgVGltZW91dEVycm9yKFwib3BlcmF0aW9uIHRpbWVkIG91dFwiKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGVyciA9IG5ldyBUaW1lb3V0RXJyb3IobWVzc2FnZSk7XG4gICAgfVxuICAgIHV0aWwubWFya0FzT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uKGVycik7XG4gICAgcHJvbWlzZS5fYXR0YWNoRXh0cmFUcmFjZShlcnIpO1xuICAgIHByb21pc2UuX3JlamVjdChlcnIpO1xuXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICAgIHBhcmVudC5jYW5jZWwoKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBzdWNjZXNzQ2xlYXIodmFsdWUpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5oYW5kbGUpO1xuICAgIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZmFpbHVyZUNsZWFyKHJlYXNvbikge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLmhhbmRsZSk7XG4gICAgdGhyb3cgcmVhc29uO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKG1zLCBtZXNzYWdlKSB7XG4gICAgbXMgPSArbXM7XG4gICAgdmFyIHJldCwgcGFyZW50O1xuXG4gICAgdmFyIGhhbmRsZVdyYXBwZXIgPSBuZXcgSGFuZGxlV3JhcHBlcihzZXRUaW1lb3V0KGZ1bmN0aW9uIHRpbWVvdXRUaW1lb3V0KCkge1xuICAgICAgICBpZiAocmV0LmlzUGVuZGluZygpKSB7XG4gICAgICAgICAgICBhZnRlclRpbWVvdXQocmV0LCBtZXNzYWdlLCBwYXJlbnQpO1xuICAgICAgICB9XG4gICAgfSwgbXMpKTtcblxuICAgIGlmIChkZWJ1Zy5jYW5jZWxsYXRpb24oKSkge1xuICAgICAgICBwYXJlbnQgPSB0aGlzLnRoZW4oKTtcbiAgICAgICAgcmV0ID0gcGFyZW50Ll90aGVuKHN1Y2Nlc3NDbGVhciwgZmFpbHVyZUNsZWFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCwgaGFuZGxlV3JhcHBlciwgdW5kZWZpbmVkKTtcbiAgICAgICAgcmV0Ll9zZXRPbkNhbmNlbChoYW5kbGVXcmFwcGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSB0aGlzLl90aGVuKHN1Y2Nlc3NDbGVhciwgZmFpbHVyZUNsZWFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCwgaGFuZGxlV3JhcHBlciwgdW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xufTtcblxufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDM1OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoUHJvbWlzZSwgYXBpUmVqZWN0aW9uLCB0cnlDb252ZXJ0VG9Qcm9taXNlLFxuICAgIGNyZWF0ZUNvbnRleHQsIElOVEVSTkFMLCBkZWJ1Zykge1xuICAgIHZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbiAgICB2YXIgVHlwZUVycm9yID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpLlR5cGVFcnJvcjtcbiAgICB2YXIgaW5oZXJpdHMgPSBfZGVyZXFfKFwiLi91dGlsXCIpLmluaGVyaXRzO1xuICAgIHZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG4gICAgdmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbiAgICB2YXIgTlVMTCA9IHt9O1xuXG4gICAgZnVuY3Rpb24gdGhyb3dlcihlKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXt0aHJvdyBlO30sIDApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhc3RQcmVzZXJ2aW5nRGlzcG9zYWJsZSh0aGVuYWJsZSkge1xuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh0aGVuYWJsZSk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UgIT09IHRoZW5hYmxlICYmXG4gICAgICAgICAgICB0eXBlb2YgdGhlbmFibGUuX2lzRGlzcG9zYWJsZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICB0eXBlb2YgdGhlbmFibGUuX2dldERpc3Bvc2VyID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgIHRoZW5hYmxlLl9pc0Rpc3Bvc2FibGUoKSkge1xuICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9zZXREaXNwb3NhYmxlKHRoZW5hYmxlLl9nZXREaXNwb3NlcigpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF5YmVQcm9taXNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkaXNwb3NlKHJlc291cmNlcywgaW5zcGVjdGlvbikge1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHZhciBsZW4gPSByZXNvdXJjZXMubGVuZ3RoO1xuICAgICAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICAgICAgICAgIGlmIChpID49IGxlbikgcmV0dXJuIHJldC5fZnVsZmlsbCgpO1xuICAgICAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IGNhc3RQcmVzZXJ2aW5nRGlzcG9zYWJsZShyZXNvdXJjZXNbaSsrXSk7XG4gICAgICAgICAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSAmJlxuICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5faXNEaXNwb3NhYmxlKCkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9nZXREaXNwb3NlcigpLnRyeURpc3Bvc2UoaW5zcGVjdGlvbiksXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXMucHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhyb3dlcihlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1heWJlUHJvbWlzZS5fdGhlbihpdGVyYXRvciwgdGhyb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLCBudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpdGVyYXRvcigpO1xuICAgICAgICB9XG4gICAgICAgIGl0ZXJhdG9yKCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gRGlzcG9zZXIoZGF0YSwgcHJvbWlzZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZSA9IHByb21pc2U7XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIH1cblxuICAgIERpc3Bvc2VyLnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGF0YTtcbiAgICB9O1xuXG4gICAgRGlzcG9zZXIucHJvdG90eXBlLnByb21pc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xuICAgIH07XG5cbiAgICBEaXNwb3Nlci5wcm90b3R5cGUucmVzb3VyY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnByb21pc2UoKS5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9taXNlKCkudmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTlVMTDtcbiAgICB9O1xuXG4gICAgRGlzcG9zZXIucHJvdG90eXBlLnRyeURpc3Bvc2UgPSBmdW5jdGlvbihpbnNwZWN0aW9uKSB7XG4gICAgICAgIHZhciByZXNvdXJjZSA9IHRoaXMucmVzb3VyY2UoKTtcbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLl9jb250ZXh0O1xuICAgICAgICBpZiAoY29udGV4dCAhPT0gdW5kZWZpbmVkKSBjb250ZXh0Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgcmV0ID0gcmVzb3VyY2UgIT09IE5VTExcbiAgICAgICAgICAgID8gdGhpcy5kb0Rpc3Bvc2UocmVzb3VyY2UsIGluc3BlY3Rpb24pIDogbnVsbDtcbiAgICAgICAgaWYgKGNvbnRleHQgIT09IHVuZGVmaW5lZCkgY29udGV4dC5fcG9wQ29udGV4dCgpO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl91bnNldERpc3Bvc2FibGUoKTtcbiAgICAgICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIERpc3Bvc2VyLmlzRGlzcG9zZXIgPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gKGQgIT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBkLnJlc291cmNlID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgZC50cnlEaXNwb3NlID09PSBcImZ1bmN0aW9uXCIpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBGdW5jdGlvbkRpc3Bvc2VyKGZuLCBwcm9taXNlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3IkKGZuLCBwcm9taXNlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgaW5oZXJpdHMoRnVuY3Rpb25EaXNwb3NlciwgRGlzcG9zZXIpO1xuXG4gICAgRnVuY3Rpb25EaXNwb3Nlci5wcm90b3R5cGUuZG9EaXNwb3NlID0gZnVuY3Rpb24gKHJlc291cmNlLCBpbnNwZWN0aW9uKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMuZGF0YSgpO1xuICAgICAgICByZXR1cm4gZm4uY2FsbChyZXNvdXJjZSwgcmVzb3VyY2UsIGluc3BlY3Rpb24pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBtYXliZVVud3JhcERpc3Bvc2VyKHZhbHVlKSB7XG4gICAgICAgIGlmIChEaXNwb3Nlci5pc0Rpc3Bvc2VyKHZhbHVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNvdXJjZXNbdGhpcy5pbmRleF0uX3NldERpc3Bvc2FibGUodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnByb21pc2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gUmVzb3VyY2VMaXN0KGxlbmd0aCkge1xuICAgICAgICB0aGlzLmxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgdGhpcy5wcm9taXNlID0gbnVsbDtcbiAgICAgICAgdGhpc1tsZW5ndGgtMV0gPSBudWxsO1xuICAgIH1cblxuICAgIFJlc291cmNlTGlzdC5wcm90b3R5cGUuX3Jlc3VsdENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gdGhpc1tpXTtcbiAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIGl0ZW0uY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgUHJvbWlzZS51c2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGlmIChsZW4gPCAyKSByZXR1cm4gYXBpUmVqZWN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5b3UgbXVzdCBwYXNzIGF0IGxlYXN0IDIgYXJndW1lbnRzIHRvIFByb21pc2UudXNpbmdcIik7XG4gICAgICAgIHZhciBmbiA9IGFyZ3VtZW50c1tsZW4gLSAxXTtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5wdXQ7XG4gICAgICAgIHZhciBzcHJlYWRBcmdzID0gdHJ1ZTtcbiAgICAgICAgaWYgKGxlbiA9PT0gMiAmJiBBcnJheS5pc0FycmF5KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgICAgIGlucHV0ID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgbGVuID0gaW5wdXQubGVuZ3RoO1xuICAgICAgICAgICAgc3ByZWFkQXJncyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5wdXQgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICBsZW4tLTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzb3VyY2VzID0gbmV3IFJlc291cmNlTGlzdChsZW4pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2UgPSBpbnB1dFtpXTtcbiAgICAgICAgICAgIGlmIChEaXNwb3Nlci5pc0Rpc3Bvc2VyKHJlc291cmNlKSkge1xuICAgICAgICAgICAgICAgIHZhciBkaXNwb3NlciA9IHJlc291cmNlO1xuICAgICAgICAgICAgICAgIHJlc291cmNlID0gcmVzb3VyY2UucHJvbWlzZSgpO1xuICAgICAgICAgICAgICAgIHJlc291cmNlLl9zZXREaXNwb3NhYmxlKGRpc3Bvc2VyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlID1cbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fdGhlbihtYXliZVVud3JhcERpc3Bvc2VyLCBudWxsLCBudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiByZXNvdXJjZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IGlcbiAgICAgICAgICAgICAgICAgICAgfSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvdXJjZXNbaV0gPSByZXNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZWZsZWN0ZWRSZXNvdXJjZXMgPSBuZXcgQXJyYXkocmVzb3VyY2VzLmxlbmd0aCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVmbGVjdGVkUmVzb3VyY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZWZsZWN0ZWRSZXNvdXJjZXNbaV0gPSBQcm9taXNlLnJlc29sdmUocmVzb3VyY2VzW2ldKS5yZWZsZWN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVzdWx0UHJvbWlzZSA9IFByb21pc2UuYWxsKHJlZmxlY3RlZFJlc291cmNlcylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGluc3BlY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbnNwZWN0aW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5zcGVjdGlvbiA9IGluc3BlY3Rpb25zW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zcGVjdGlvbi5pc1JlamVjdGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yT2JqLmUgPSBpbnNwZWN0aW9uLmVycm9yKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWluc3BlY3Rpb24uaXNGdWxmaWxsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0UHJvbWlzZS5jYW5jZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbnNwZWN0aW9uc1tpXSA9IGluc3BlY3Rpb24udmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcblxuICAgICAgICAgICAgICAgIGZuID0gdHJ5Q2F0Y2goZm4pO1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBzcHJlYWRBcmdzXG4gICAgICAgICAgICAgICAgICAgID8gZm4uYXBwbHkodW5kZWZpbmVkLCBpbnNwZWN0aW9ucykgOiBmbihpbnNwZWN0aW9ucyk7XG4gICAgICAgICAgICAgICAgdmFyIHByb21pc2VDcmVhdGVkID0gcHJvbWlzZS5fcG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgICAgIGRlYnVnLmNoZWNrRm9yZ290dGVuUmV0dXJucyhcbiAgICAgICAgICAgICAgICAgICAgcmV0LCBwcm9taXNlQ3JlYXRlZCwgXCJQcm9taXNlLnVzaW5nXCIsIHByb21pc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcHJvbWlzZSA9IHJlc3VsdFByb21pc2UubGFzdGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGluc3BlY3Rpb24gPSBuZXcgUHJvbWlzZS5Qcm9taXNlSW5zcGVjdGlvbihyZXN1bHRQcm9taXNlKTtcbiAgICAgICAgICAgIHJldHVybiBkaXNwb3NlKHJlc291cmNlcywgaW5zcGVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXNvdXJjZXMucHJvbWlzZSA9IHByb21pc2U7XG4gICAgICAgIHByb21pc2UuX3NldE9uQ2FuY2VsKHJlc291cmNlcyk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5fc2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uIChkaXNwb3Nlcikge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMTMxMDcyO1xuICAgICAgICB0aGlzLl9kaXNwb3NlciA9IGRpc3Bvc2VyO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5faXNEaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMTMxMDcyKSA+IDA7XG4gICAgfTtcblxuICAgIFByb21pc2UucHJvdG90eXBlLl9nZXREaXNwb3NlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Rpc3Bvc2VyO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5fdW5zZXREaXNwb3NhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH4xMzEwNzIpO1xuICAgICAgICB0aGlzLl9kaXNwb3NlciA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGUuZGlzcG9zZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uRGlzcG9zZXIoZm4sIHRoaXMsIGNyZWF0ZUNvbnRleHQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgIH07XG5cbn07XG5cbn0se1wiLi9lcnJvcnNcIjoxMixcIi4vdXRpbFwiOjM2fV0sMzY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZXM1ID0gX2RlcmVxXyhcIi4vZXM1XCIpO1xudmFyIGNhbkV2YWx1YXRlID0gdHlwZW9mIG5hdmlnYXRvciA9PSBcInVuZGVmaW5lZFwiO1xuXG52YXIgZXJyb3JPYmogPSB7ZToge319O1xudmFyIHRyeUNhdGNoVGFyZ2V0O1xudmFyIGdsb2JhbE9iamVjdCA9IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6XG4gICAgdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6XG4gICAgdGhpcyAhPT0gdW5kZWZpbmVkID8gdGhpcyA6IG51bGw7XG5cbmZ1bmN0aW9uIHRyeUNhdGNoZXIoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRyeUNhdGNoVGFyZ2V0O1xuICAgICAgICB0cnlDYXRjaFRhcmdldCA9IG51bGw7XG4gICAgICAgIHJldHVybiB0YXJnZXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqLmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgfVxufVxuZnVuY3Rpb24gdHJ5Q2F0Y2goZm4pIHtcbiAgICB0cnlDYXRjaFRhcmdldCA9IGZuO1xuICAgIHJldHVybiB0cnlDYXRjaGVyO1xufVxuXG52YXIgaW5oZXJpdHMgPSBmdW5jdGlvbihDaGlsZCwgUGFyZW50KSB7XG4gICAgdmFyIGhhc1Byb3AgPSB7fS5oYXNPd25Qcm9wZXJ0eTtcblxuICAgIGZ1bmN0aW9uIFQoKSB7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3IgPSBDaGlsZDtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvciQgPSBQYXJlbnQ7XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5TmFtZSBpbiBQYXJlbnQucHJvdG90eXBlKSB7XG4gICAgICAgICAgICBpZiAoaGFzUHJvcC5jYWxsKFBhcmVudC5wcm90b3R5cGUsIHByb3BlcnR5TmFtZSkgJiZcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUuY2hhckF0KHByb3BlcnR5TmFtZS5sZW5ndGgtMSkgIT09IFwiJFwiXG4gICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHRoaXNbcHJvcGVydHlOYW1lICsgXCIkXCJdID0gUGFyZW50LnByb3RvdHlwZVtwcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFQucHJvdG90eXBlID0gUGFyZW50LnByb3RvdHlwZTtcbiAgICBDaGlsZC5wcm90b3R5cGUgPSBuZXcgVCgpO1xuICAgIHJldHVybiBDaGlsZC5wcm90b3R5cGU7XG59O1xuXG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKHZhbCkge1xuICAgIHJldHVybiB2YWwgPT0gbnVsbCB8fCB2YWwgPT09IHRydWUgfHwgdmFsID09PSBmYWxzZSB8fFxuICAgICAgICB0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCI7XG5cbn1cblxuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICAgICAgICAgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBtYXliZVdyYXBBc0Vycm9yKG1heWJlRXJyb3IpIHtcbiAgICBpZiAoIWlzUHJpbWl0aXZlKG1heWJlRXJyb3IpKSByZXR1cm4gbWF5YmVFcnJvcjtcblxuICAgIHJldHVybiBuZXcgRXJyb3Ioc2FmZVRvU3RyaW5nKG1heWJlRXJyb3IpKTtcbn1cblxuZnVuY3Rpb24gd2l0aEFwcGVuZGVkKHRhcmdldCwgYXBwZW5kZWUpIHtcbiAgICB2YXIgbGVuID0gdGFyZ2V0Lmxlbmd0aDtcbiAgICB2YXIgcmV0ID0gbmV3IEFycmF5KGxlbiArIDEpO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICByZXRbaV0gPSB0YXJnZXRbaV07XG4gICAgfVxuICAgIHJldFtpXSA9IGFwcGVuZGVlO1xuICAgIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGdldERhdGFQcm9wZXJ0eU9yRGVmYXVsdChvYmosIGtleSwgZGVmYXVsdFZhbHVlKSB7XG4gICAgaWYgKGVzNS5pc0VTNSkge1xuICAgICAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBrZXkpO1xuXG4gICAgICAgIGlmIChkZXNjICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBkZXNjLmdldCA9PSBudWxsICYmIGRlc2Muc2V0ID09IG51bGxcbiAgICAgICAgICAgICAgICAgICAgPyBkZXNjLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIDogZGVmYXVsdFZhbHVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHt9Lmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpID8gb2JqW2tleV0gOiB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBub3RFbnVtZXJhYmxlUHJvcChvYmosIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKGlzUHJpbWl0aXZlKG9iaikpIHJldHVybiBvYmo7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9O1xuICAgIGVzNS5kZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIGRlc2NyaXB0b3IpO1xuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIHRocm93ZXIocikge1xuICAgIHRocm93IHI7XG59XG5cbnZhciBpbmhlcml0ZWREYXRhS2V5cyA9IChmdW5jdGlvbigpIHtcbiAgICB2YXIgZXhjbHVkZWRQcm90b3R5cGVzID0gW1xuICAgICAgICBBcnJheS5wcm90b3R5cGUsXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUsXG4gICAgICAgIEZ1bmN0aW9uLnByb3RvdHlwZVxuICAgIF07XG5cbiAgICB2YXIgaXNFeGNsdWRlZFByb3RvID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhjbHVkZWRQcm90b3R5cGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZiAoZXhjbHVkZWRQcm90b3R5cGVzW2ldID09PSB2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIGlmIChlczUuaXNFUzUpIHtcbiAgICAgICAgdmFyIGdldEtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgdmFyIHZpc2l0ZWRLZXlzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICAgIHdoaWxlIChvYmogIT0gbnVsbCAmJiAhaXNFeGNsdWRlZFByb3RvKG9iaikpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5cztcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBrZXlzID0gZ2V0S2V5cyhvYmopO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlzaXRlZEtleXNba2V5XSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0ZWRLZXlzW2tleV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVzYyAhPSBudWxsICYmIGRlc2MuZ2V0ID09IG51bGwgJiYgZGVzYy5zZXQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvYmogPSBlczUuZ2V0UHJvdG90eXBlT2Yob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGhhc1Byb3AgPSB7fS5oYXNPd25Qcm9wZXJ0eTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAgICAgaWYgKGlzRXhjbHVkZWRQcm90byhvYmopKSByZXR1cm4gW107XG4gICAgICAgICAgICB2YXIgcmV0ID0gW107XG5cbiAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXG4gICAgICAgICAgICBlbnVtZXJhdGlvbjogZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChoYXNQcm9wLmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleGNsdWRlZFByb3RvdHlwZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNQcm9wLmNhbGwoZXhjbHVkZWRQcm90b3R5cGVzW2ldLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgZW51bWVyYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9O1xuICAgIH1cblxufSkoKTtcblxudmFyIHRoaXNBc3NpZ25tZW50UGF0dGVybiA9IC90aGlzXFxzKlxcLlxccypcXFMrXFxzKj0vO1xuZnVuY3Rpb24gaXNDbGFzcyhmbikge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBlczUubmFtZXMoZm4ucHJvdG90eXBlKTtcblxuICAgICAgICAgICAgdmFyIGhhc01ldGhvZHMgPSBlczUuaXNFUzUgJiYga2V5cy5sZW5ndGggPiAxO1xuICAgICAgICAgICAgdmFyIGhhc01ldGhvZHNPdGhlclRoYW5Db25zdHJ1Y3RvciA9IGtleXMubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgICAgICEoa2V5cy5sZW5ndGggPT09IDEgJiYga2V5c1swXSA9PT0gXCJjb25zdHJ1Y3RvclwiKTtcbiAgICAgICAgICAgIHZhciBoYXNUaGlzQXNzaWdubWVudEFuZFN0YXRpY01ldGhvZHMgPVxuICAgICAgICAgICAgICAgIHRoaXNBc3NpZ25tZW50UGF0dGVybi50ZXN0KGZuICsgXCJcIikgJiYgZXM1Lm5hbWVzKGZuKS5sZW5ndGggPiAwO1xuXG4gICAgICAgICAgICBpZiAoaGFzTWV0aG9kcyB8fCBoYXNNZXRob2RzT3RoZXJUaGFuQ29uc3RydWN0b3IgfHxcbiAgICAgICAgICAgICAgICBoYXNUaGlzQXNzaWdubWVudEFuZFN0YXRpY01ldGhvZHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b0Zhc3RQcm9wZXJ0aWVzKG9iaikge1xuICAgIC8qanNoaW50IC1XMDI3LC1XMDU1LC1XMDMxKi9cbiAgICBmdW5jdGlvbiBGYWtlQ29uc3RydWN0b3IoKSB7fVxuICAgIEZha2VDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBvYmo7XG4gICAgdmFyIGwgPSA4O1xuICAgIHdoaWxlIChsLS0pIG5ldyBGYWtlQ29uc3RydWN0b3IoKTtcbiAgICByZXR1cm4gb2JqO1xuICAgIGV2YWwob2JqKTtcbn1cblxudmFyIHJpZGVudCA9IC9eW2EteiRfXVthLXokXzAtOV0qJC9pO1xuZnVuY3Rpb24gaXNJZGVudGlmaWVyKHN0cikge1xuICAgIHJldHVybiByaWRlbnQudGVzdChzdHIpO1xufVxuXG5mdW5jdGlvbiBmaWxsZWRSYW5nZShjb3VudCwgcHJlZml4LCBzdWZmaXgpIHtcbiAgICB2YXIgcmV0ID0gbmV3IEFycmF5KGNvdW50KTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgY291bnQ7ICsraSkge1xuICAgICAgICByZXRbaV0gPSBwcmVmaXggKyBpICsgc3VmZml4O1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBzYWZlVG9TdHJpbmcob2JqKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIG9iaiArIFwiXCI7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gXCJbbm8gc3RyaW5nIHJlcHJlc2VudGF0aW9uXVwiO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaXNFcnJvcihvYmopIHtcbiAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRXJyb3IgfHxcbiAgICAgICAgKG9iaiAhPT0gbnVsbCAmJlxuICAgICAgICAgICB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgICAgIHR5cGVvZiBvYmoubWVzc2FnZSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICAgICB0eXBlb2Ygb2JqLm5hbWUgPT09IFwic3RyaW5nXCIpO1xufVxuXG5mdW5jdGlvbiBtYXJrQXNPcmlnaW5hdGluZ0Zyb21SZWplY3Rpb24oZSkge1xuICAgIHRyeSB7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKGUsIFwiaXNPcGVyYXRpb25hbFwiLCB0cnVlKTtcbiAgICB9XG4gICAgY2F0Y2goaWdub3JlKSB7fVxufVxuXG5mdW5jdGlvbiBvcmlnaW5hdGVzRnJvbVJlamVjdGlvbihlKSB7XG4gICAgaWYgKGUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiAoKGUgaW5zdGFuY2VvZiBFcnJvcltcIl9fQmx1ZWJpcmRFcnJvclR5cGVzX19cIl0uT3BlcmF0aW9uYWxFcnJvcikgfHxcbiAgICAgICAgZVtcImlzT3BlcmF0aW9uYWxcIl0gPT09IHRydWUpO1xufVxuXG5mdW5jdGlvbiBjYW5BdHRhY2hUcmFjZShvYmopIHtcbiAgICByZXR1cm4gaXNFcnJvcihvYmopICYmIGVzNS5wcm9wZXJ0eUlzV3JpdGFibGUob2JqLCBcInN0YWNrXCIpO1xufVxuXG52YXIgZW5zdXJlRXJyb3JPYmplY3QgPSAoZnVuY3Rpb24oKSB7XG4gICAgaWYgKCEoXCJzdGFja1wiIGluIG5ldyBFcnJvcigpKSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChjYW5BdHRhY2hUcmFjZSh2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIHRyeSB7dGhyb3cgbmV3IEVycm9yKHNhZmVUb1N0cmluZyh2YWx1ZSkpO31cbiAgICAgICAgICAgIGNhdGNoKGVycikge3JldHVybiBlcnI7fVxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGNhbkF0dGFjaFRyYWNlKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFcnJvcihzYWZlVG9TdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfTtcbiAgICB9XG59KSgpO1xuXG5mdW5jdGlvbiBjbGFzc1N0cmluZyhvYmopIHtcbiAgICByZXR1cm4ge30udG9TdHJpbmcuY2FsbChvYmopO1xufVxuXG5mdW5jdGlvbiBjb3B5RGVzY3JpcHRvcnMoZnJvbSwgdG8sIGZpbHRlcikge1xuICAgIHZhciBrZXlzID0gZXM1Lm5hbWVzKGZyb20pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgaWYgKGZpbHRlcihrZXkpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGVzNS5kZWZpbmVQcm9wZXJ0eSh0bywga2V5LCBlczUuZ2V0RGVzY3JpcHRvcihmcm9tLCBrZXkpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgICAgfVxuICAgIH1cbn1cblxudmFyIGFzQXJyYXkgPSBmdW5jdGlvbih2KSB7XG4gICAgaWYgKGVzNS5pc0FycmF5KHYpKSB7XG4gICAgICAgIHJldHVybiB2O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbmlmICh0eXBlb2YgU3ltYm9sICE9PSBcInVuZGVmaW5lZFwiICYmIFN5bWJvbC5pdGVyYXRvcikge1xuICAgIHZhciBBcnJheUZyb20gPSB0eXBlb2YgQXJyYXkuZnJvbSA9PT0gXCJmdW5jdGlvblwiID8gZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh2KTtcbiAgICB9IDogZnVuY3Rpb24odikge1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIHZhciBpdCA9IHZbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgICAgICB2YXIgaXRSZXN1bHQ7XG4gICAgICAgIHdoaWxlICghKChpdFJlc3VsdCA9IGl0Lm5leHQoKSkuZG9uZSkpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGl0UmVzdWx0LnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICBhc0FycmF5ID0gZnVuY3Rpb24odikge1xuICAgICAgICBpZiAoZXM1LmlzQXJyYXkodikpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9IGVsc2UgaWYgKHYgIT0gbnVsbCAmJiB0eXBlb2YgdltTeW1ib2wuaXRlcmF0b3JdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBBcnJheUZyb20odik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcbn1cblxudmFyIGlzTm9kZSA9IHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgIGNsYXNzU3RyaW5nKHByb2Nlc3MpLnRvTG93ZXJDYXNlKCkgPT09IFwiW29iamVjdCBwcm9jZXNzXVwiO1xuXG52YXIgaGFzRW52VmFyaWFibGVzID0gdHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICB0eXBlb2YgcHJvY2Vzcy5lbnYgIT09IFwidW5kZWZpbmVkXCI7XG5cbmZ1bmN0aW9uIGVudihrZXkpIHtcbiAgICByZXR1cm4gaGFzRW52VmFyaWFibGVzID8gcHJvY2Vzcy5lbnZba2V5XSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0TmF0aXZlUHJvbWlzZSgpIHtcbiAgICBpZiAodHlwZW9mIFByb21pc2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbigpe30pO1xuICAgICAgICAgICAgaWYgKHt9LnRvU3RyaW5nLmNhbGwocHJvbWlzZSkgPT09IFwiW29iamVjdCBQcm9taXNlXVwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkb21haW5CaW5kKHNlbGYsIGNiKSB7XG4gICAgcmV0dXJuIHNlbGYuYmluZChjYik7XG59XG5cbnZhciByZXQgPSB7XG4gICAgaXNDbGFzczogaXNDbGFzcyxcbiAgICBpc0lkZW50aWZpZXI6IGlzSWRlbnRpZmllcixcbiAgICBpbmhlcml0ZWREYXRhS2V5czogaW5oZXJpdGVkRGF0YUtleXMsXG4gICAgZ2V0RGF0YVByb3BlcnR5T3JEZWZhdWx0OiBnZXREYXRhUHJvcGVydHlPckRlZmF1bHQsXG4gICAgdGhyb3dlcjogdGhyb3dlcixcbiAgICBpc0FycmF5OiBlczUuaXNBcnJheSxcbiAgICBhc0FycmF5OiBhc0FycmF5LFxuICAgIG5vdEVudW1lcmFibGVQcm9wOiBub3RFbnVtZXJhYmxlUHJvcCxcbiAgICBpc1ByaW1pdGl2ZTogaXNQcmltaXRpdmUsXG4gICAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICAgIGlzRXJyb3I6IGlzRXJyb3IsXG4gICAgY2FuRXZhbHVhdGU6IGNhbkV2YWx1YXRlLFxuICAgIGVycm9yT2JqOiBlcnJvck9iaixcbiAgICB0cnlDYXRjaDogdHJ5Q2F0Y2gsXG4gICAgaW5oZXJpdHM6IGluaGVyaXRzLFxuICAgIHdpdGhBcHBlbmRlZDogd2l0aEFwcGVuZGVkLFxuICAgIG1heWJlV3JhcEFzRXJyb3I6IG1heWJlV3JhcEFzRXJyb3IsXG4gICAgdG9GYXN0UHJvcGVydGllczogdG9GYXN0UHJvcGVydGllcyxcbiAgICBmaWxsZWRSYW5nZTogZmlsbGVkUmFuZ2UsXG4gICAgdG9TdHJpbmc6IHNhZmVUb1N0cmluZyxcbiAgICBjYW5BdHRhY2hUcmFjZTogY2FuQXR0YWNoVHJhY2UsXG4gICAgZW5zdXJlRXJyb3JPYmplY3Q6IGVuc3VyZUVycm9yT2JqZWN0LFxuICAgIG9yaWdpbmF0ZXNGcm9tUmVqZWN0aW9uOiBvcmlnaW5hdGVzRnJvbVJlamVjdGlvbixcbiAgICBtYXJrQXNPcmlnaW5hdGluZ0Zyb21SZWplY3Rpb246IG1hcmtBc09yaWdpbmF0aW5nRnJvbVJlamVjdGlvbixcbiAgICBjbGFzc1N0cmluZzogY2xhc3NTdHJpbmcsXG4gICAgY29weURlc2NyaXB0b3JzOiBjb3B5RGVzY3JpcHRvcnMsXG4gICAgaGFzRGV2VG9vbHM6IHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lICYmXG4gICAgICAgICAgICAgICAgIHR5cGVvZiBjaHJvbWUubG9hZFRpbWVzID09PSBcImZ1bmN0aW9uXCIsXG4gICAgaXNOb2RlOiBpc05vZGUsXG4gICAgaGFzRW52VmFyaWFibGVzOiBoYXNFbnZWYXJpYWJsZXMsXG4gICAgZW52OiBlbnYsXG4gICAgZ2xvYmFsOiBnbG9iYWxPYmplY3QsXG4gICAgZ2V0TmF0aXZlUHJvbWlzZTogZ2V0TmF0aXZlUHJvbWlzZSxcbiAgICBkb21haW5CaW5kOiBkb21haW5CaW5kXG59O1xucmV0LmlzUmVjZW50Tm9kZSA9IHJldC5pc05vZGUgJiYgKGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ZXJzaW9uID0gcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLnNwbGl0KFwiLlwiKS5tYXAoTnVtYmVyKTtcbiAgICByZXR1cm4gKHZlcnNpb25bMF0gPT09IDAgJiYgdmVyc2lvblsxXSA+IDEwKSB8fCAodmVyc2lvblswXSA+IDApO1xufSkoKTtcblxuaWYgKHJldC5pc05vZGUpIHJldC50b0Zhc3RQcm9wZXJ0aWVzKHByb2Nlc3MpO1xuXG50cnkge3Rocm93IG5ldyBFcnJvcigpOyB9IGNhdGNoIChlKSB7cmV0Lmxhc3RMaW5lRXJyb3IgPSBlO31cbm1vZHVsZS5leHBvcnRzID0gcmV0O1xuXG59LHtcIi4vZXM1XCI6MTN9XX0se30sWzRdKSg0KVxufSk7ICAgICAgICAgICAgICAgICAgICA7aWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdyAhPT0gbnVsbCkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuUCA9IHdpbmRvdy5Qcm9taXNlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZiAhPT0gbnVsbCkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5QID0gc2VsZi5Qcm9taXNlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vc3RlZmFucGVubmVyL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIHY0LjIuNCszMTRlNDgzMVxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeDtcbiAgcmV0dXJuIHggIT09IG51bGwgJiYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG5cblxudmFyIF9pc0FycmF5ID0gdm9pZCAwO1xuaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHZvaWQgMDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHZvaWQgMDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIGlmICh0eXBlb2YgdmVydHhOZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciB2ZXJ0eCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCkucmVxdWlyZSgndmVydHgnKTtcbiAgICB2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgIHJldHVybiB1c2VWZXJ0eFRpbWVyKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xuICB9XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoID0gdm9pZCAwO1xuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmIChpc05vZGUpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xufSBlbHNlIGlmIChicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IGF0dGVtcHRWZXJ0eCgpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgcGFyZW50ID0gdGhpcztcblxuICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBpZiAoY2hpbGRbUFJPTUlTRV9JRF0gPT09IHVuZGVmaW5lZCkge1xuICAgIG1ha2VQcm9taXNlKGNoaWxkKTtcbiAgfVxuXG4gIHZhciBfc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG5cbiAgaWYgKF9zdGF0ZSkge1xuICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tfc3RhdGUgLSAxXTtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBpbnZva2VDYWxsYmFjayhfc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yZXNvbHZlYCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlc29sdmVkIHdpdGggdGhlXG4gIHBhc3NlZCBgdmFsdWVgLiBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVzb2x2ZSgxKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoMSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZXNvbHZlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBbnl9IHZhbHVlIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgZnVsZmlsbGVkIHdpdGggdGhlIGdpdmVuXG4gIGB2YWx1ZWBcbiovXG5mdW5jdGlvbiByZXNvbHZlJDEob2JqZWN0KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICByZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG52YXIgUFJPTUlTRV9JRCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnZhciBQRU5ESU5HID0gdm9pZCAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgPSAyO1xuXG52YXIgVFJZX0NBVENIX0VSUk9SID0geyBlcnJvcjogbnVsbCB9O1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5VGhlbih0aGVuJCQxLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gIHRyeSB7XG4gICAgdGhlbiQkMS5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGFzYXAoZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgdmFyIGVycm9yID0gdHJ5VGhlbih0aGVuJCQxLCB0aGVuYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH1cbiAgfSwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSkge1xuICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3RvciAmJiB0aGVuJCQxID09PSB0aGVuICYmIG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IucmVzb2x2ZSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoZW4kJDEgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIFRSWV9DQVRDSF9FUlJPUi5lcnJvcik7XG4gICAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhlbiQkMSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih0aGVuJCQxKSkge1xuICAgICAgaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBzZWxmRnVsZmlsbG1lbnQoKSk7XG4gIH0gZWxzZSBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlLCBnZXRUaGVuKHZhbHVlKSk7XG4gIH0gZWxzZSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICB9XG5cbiAgcHVibGlzaChwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQ7XG5cbiAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCAhPT0gMCkge1xuICAgIGFzYXAocHVibGlzaCwgcHJvbWlzZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gIGFzYXAocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX3N1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IF9zdWJzY3JpYmVycy5sZW5ndGg7XG5cblxuICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gIF9zdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSA9IG9uUmVqZWN0aW9uO1xuXG4gIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgIGFzYXAocHVibGlzaCwgcGFyZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UpIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjaGlsZCA9IHZvaWQgMCxcbiAgICAgIGNhbGxiYWNrID0gdm9pZCAwLFxuICAgICAgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgfVxuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICB0cnkge1xuICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSA9IHZvaWQgMCxcbiAgICAgIGVycm9yID0gdm9pZCAwLFxuICAgICAgc3VjY2VlZGVkID0gdm9pZCAwLFxuICAgICAgZmFpbGVkID0gdm9pZCAwO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHZhbHVlID0gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICBpZiAodmFsdWUgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICB2YWx1ZS5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxudmFyIEVudW1lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcblxuICAgIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgdGhpcy5fZW51bWVyYXRlKGlucHV0KTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICB9XG4gIH1cblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gX2VudW1lcmF0ZShpbnB1dCkge1xuICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLl9zdGF0ZSA9PT0gUEVORElORyAmJiBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiBfZWFjaEVudHJ5KGVudHJ5LCBpKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgIHZhciByZXNvbHZlJCQxID0gYy5yZXNvbHZlO1xuXG5cbiAgICBpZiAocmVzb2x2ZSQkMSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgICAgaWYgKF90aGVuID09PSB0aGVuICYmIGVudHJ5Ll9zdGF0ZSAhPT0gUEVORElORykge1xuICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSQxKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQxKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUkJDEoZW50cnkpO1xuICAgICAgICB9KSwgaSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQxKGVudHJ5KSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiBfc2V0dGxlZEF0KHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG5cbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiBfd2lsbFNldHRsZUF0KHByb21pc2UsIGkpIHtcbiAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gRW51bWVyYXRvcjtcbn0oKTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QkMShyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbmVlZHNSZXNvbHZlcigpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xufVxuXG5mdW5jdGlvbiBuZWVkc05ldygpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbn1cblxuLyoqXG4gIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gIFRlcm1pbm9sb2d5XG4gIC0tLS0tLS0tLS0tXG5cbiAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgQmFzaWMgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLVxuXG4gIGBgYGpzXG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gb24gc3VjY2Vzc1xuICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgLy8gb24gZmFpbHVyZVxuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIEFkdmFuY2VkIFVzYWdlOlxuICAtLS0tLS0tLS0tLS0tLS1cblxuICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICBgYGBqc1xuICBQcm9taXNlLmFsbChbXG4gICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9KTtcbiAgYGBgXG5cbiAgQGNsYXNzIFByb21pc2VcbiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZXJcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAY29uc3RydWN0b3JcbiovXG5cbnZhciBQcm9taXNlJDEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgICAgdHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nICYmIG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gIH0pO1xuICBgYGBcbiAgIENoYWluaW5nXG4gIC0tLS0tLS0tXG4gICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gIH0pO1xuICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgfSk7XG4gIGBgYFxuICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgQXNzaW1pbGF0aW9uXG4gIC0tLS0tLS0tLS0tLVxuICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gIH0pO1xuICBgYGBcbiAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgU2ltcGxlIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IHJlc3VsdDtcbiAgIHRyeSB7XG4gICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBmYWlsdXJlXG4gIH0pO1xuICBgYGBcbiAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IGF1dGhvciwgYm9va3M7XG4gICB0cnkge1xuICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG4gICB9XG4gICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICAgfVxuICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICB9XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRBdXRob3IoKS5cbiAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgIC8vIGZvdW5kIGJvb2tzXG4gIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICAgQG1ldGhvZCB0aGVuXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG4gIC8qKlxuICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gIH1cbiAgLy8gc3luY2hyb25vdXNcbiAgdHJ5IHtcbiAgZmluZEF1dGhvcigpO1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG4gIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgQG1ldGhvZCBjYXRjaFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIF9jYXRjaChvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgIGBmaW5hbGx5YCB3aWxsIGJlIGludm9rZWQgcmVnYXJkbGVzcyBvZiB0aGUgcHJvbWlzZSdzIGZhdGUganVzdCBhcyBuYXRpdmVcbiAgICB0cnkvY2F0Y2gvZmluYWxseSBiZWhhdmVzXG4gIFxuICAgIFN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpIHtcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBdXRob3IoKTtcbiAgICB9XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZmluZEF1dGhvcigpOyAvLyBzdWNjZWVkIG9yIGZhaWxcbiAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIGFsd2F5cyBydW5zXG4gICAgICAvLyBkb2Vzbid0IGFmZmVjdCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBBc3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7XG4gICAgICAvLyBhdXRob3Igd2FzIGVpdGhlciBmb3VuZCwgb3Igbm90XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgZmluYWxseVxuICAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiBfZmluYWxseShjYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm9taXNlLmNvbnN0cnVjdG9yO1xuXG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhyb3cgcmVhc29uO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIFByb21pc2U7XG59KCk7XG5cblByb21pc2UkMS5wcm90b3R5cGUudGhlbiA9IHRoZW47XG5Qcm9taXNlJDEuYWxsID0gYWxsO1xuUHJvbWlzZSQxLnJhY2UgPSByYWNlO1xuUHJvbWlzZSQxLnJlc29sdmUgPSByZXNvbHZlJDE7XG5Qcm9taXNlJDEucmVqZWN0ID0gcmVqZWN0JDE7XG5Qcm9taXNlJDEuX3NldFNjaGVkdWxlciA9IHNldFNjaGVkdWxlcjtcblByb21pc2UkMS5fc2V0QXNhcCA9IHNldEFzYXA7XG5Qcm9taXNlJDEuX2FzYXAgPSBhc2FwO1xuXG4vKmdsb2JhbCBzZWxmKi9cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICB2YXIgbG9jYWwgPSB2b2lkIDA7XG5cbiAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBnbG9iYWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBzZWxmO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBsb2NhbCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICB9XG4gIH1cblxuICB2YXIgUCA9IGxvY2FsLlByb21pc2U7XG5cbiAgaWYgKFApIHtcbiAgICB2YXIgcHJvbWlzZVRvU3RyaW5nID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcHJvbWlzZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBzaWxlbnRseSBpZ25vcmVkXG4gICAgfVxuXG4gICAgaWYgKHByb21pc2VUb1N0cmluZyA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBsb2NhbC5Qcm9taXNlID0gUHJvbWlzZSQxO1xufVxuXG4vLyBTdHJhbmdlIGNvbXBhdC4uXG5Qcm9taXNlJDEucG9seWZpbGwgPSBwb2x5ZmlsbDtcblByb21pc2UkMS5Qcm9taXNlID0gUHJvbWlzZSQxO1xuXG5yZXR1cm4gUHJvbWlzZSQxO1xuXG59KSkpO1xuXG5cblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXM2LXByb21pc2UubWFwXG4iLCIvKiFcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgYSBCdWZmZXJcbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3Npbmdcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG59XG5cbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXG5mdW5jdGlvbiBpc1Nsb3dCdWZmZXIgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKlxuICogVG9hc3RyXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1XG4gKiBBdXRob3JzOiBKb2huIFBhcGEsIEhhbnMgRmrDpGxsZW1hcmssIGFuZCBUaW0gRmVycmVsbC5cbiAqIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBVc2UsIHJlcHJvZHVjdGlvbiwgZGlzdHJpYnV0aW9uLCBhbmQgbW9kaWZpY2F0aW9uIG9mIHRoaXMgY29kZSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBhbmRcbiAqIGNvbmRpdGlvbnMgb2YgdGhlIE1JVCBsaWNlbnNlLCBhdmFpbGFibGUgYXQgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAqXG4gKiBBUklBIFN1cHBvcnQ6IEdyZXRhIEtyYWZzaWdcbiAqXG4gKiBQcm9qZWN0OiBodHRwczovL2dpdGh1Yi5jb20vQ29kZVNldmVuL3RvYXN0clxuICovXG4vKiBnbG9iYWwgZGVmaW5lICovXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuICAgIGRlZmluZShbJ2pxdWVyeSddLCBmdW5jdGlvbiAoJCkge1xuICAgICAgICByZXR1cm4gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciAkY29udGFpbmVyO1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyO1xuICAgICAgICAgICAgdmFyIHRvYXN0SWQgPSAwO1xuICAgICAgICAgICAgdmFyIHRvYXN0VHlwZSA9IHtcbiAgICAgICAgICAgICAgICBlcnJvcjogJ2Vycm9yJyxcbiAgICAgICAgICAgICAgICBpbmZvOiAnaW5mbycsXG4gICAgICAgICAgICAgICAgc3VjY2VzczogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6ICd3YXJuaW5nJ1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHRvYXN0ciA9IHtcbiAgICAgICAgICAgICAgICBjbGVhcjogY2xlYXIsXG4gICAgICAgICAgICAgICAgcmVtb3ZlOiByZW1vdmUsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLFxuICAgICAgICAgICAgICAgIGdldENvbnRhaW5lcjogZ2V0Q29udGFpbmVyLFxuICAgICAgICAgICAgICAgIGluZm86IGluZm8sXG4gICAgICAgICAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlOiBzdWJzY3JpYmUsXG4gICAgICAgICAgICAgICAgc3VjY2Vzczogc3VjY2VzcyxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMi4xLjQnLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHdhcm5pbmdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBwcmV2aW91c1RvYXN0O1xuXG4gICAgICAgICAgICByZXR1cm4gdG9hc3RyO1xuXG4gICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGVycm9yKG1lc3NhZ2UsIHRpdGxlLCBvcHRpb25zT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm90aWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdG9hc3RUeXBlLmVycm9yLFxuICAgICAgICAgICAgICAgICAgICBpY29uQ2xhc3M6IGdldE9wdGlvbnMoKS5pY29uQ2xhc3Nlcy5lcnJvcixcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uc092ZXJyaWRlOiBvcHRpb25zT3ZlcnJpZGUsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRDb250YWluZXIob3B0aW9ucywgY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zKSB7IG9wdGlvbnMgPSBnZXRPcHRpb25zKCk7IH1cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyID0gJCgnIycgKyBvcHRpb25zLmNvbnRhaW5lcklkKTtcbiAgICAgICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRjb250YWluZXI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjcmVhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lciA9IGNyZWF0ZUNvbnRhaW5lcihvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICRjb250YWluZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGluZm8obWVzc2FnZSwgdGl0bGUsIG9wdGlvbnNPdmVycmlkZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub3RpZnkoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0b2FzdFR5cGUuaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbkNsYXNzOiBnZXRPcHRpb25zKCkuaWNvbkNsYXNzZXMuaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uc092ZXJyaWRlOiBvcHRpb25zT3ZlcnJpZGUsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiB0aXRsZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzdWJzY3JpYmUoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lciA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzdWNjZXNzKG1lc3NhZ2UsIHRpdGxlLCBvcHRpb25zT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm90aWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdG9hc3RUeXBlLnN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgICAgIGljb25DbGFzczogZ2V0T3B0aW9ucygpLmljb25DbGFzc2VzLnN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnNPdmVycmlkZTogb3B0aW9uc092ZXJyaWRlLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogdGl0bGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gd2FybmluZyhtZXNzYWdlLCB0aXRsZSwgb3B0aW9uc092ZXJyaWRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vdGlmeSh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRvYXN0VHlwZS53YXJuaW5nLFxuICAgICAgICAgICAgICAgICAgICBpY29uQ2xhc3M6IGdldE9wdGlvbnMoKS5pY29uQ2xhc3Nlcy53YXJuaW5nLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zT3ZlcnJpZGU6IG9wdGlvbnNPdmVycmlkZSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNsZWFyKCR0b2FzdEVsZW1lbnQsIGNsZWFyT3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gZ2V0T3B0aW9ucygpO1xuICAgICAgICAgICAgICAgIGlmICghJGNvbnRhaW5lcikgeyBnZXRDb250YWluZXIob3B0aW9ucyk7IH1cbiAgICAgICAgICAgICAgICBpZiAoIWNsZWFyVG9hc3QoJHRvYXN0RWxlbWVudCwgb3B0aW9ucywgY2xlYXJPcHRpb25zKSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckNvbnRhaW5lcihvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlbW92ZSgkdG9hc3RFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRPcHRpb25zKCk7XG4gICAgICAgICAgICAgICAgaWYgKCEkY29udGFpbmVyKSB7IGdldENvbnRhaW5lcihvcHRpb25zKTsgfVxuICAgICAgICAgICAgICAgIGlmICgkdG9hc3RFbGVtZW50ICYmICQoJzpmb2N1cycsICR0b2FzdEVsZW1lbnQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVUb2FzdCgkdG9hc3RFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5jaGlsZHJlbigpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaW50ZXJuYWwgZnVuY3Rpb25zXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNsZWFyQ29udGFpbmVyIChvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvYXN0c1RvQ2xlYXIgPSAkY29udGFpbmVyLmNoaWxkcmVuKCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IHRvYXN0c1RvQ2xlYXIubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUb2FzdCgkKHRvYXN0c1RvQ2xlYXJbaV0pLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNsZWFyVG9hc3QgKCR0b2FzdEVsZW1lbnQsIG9wdGlvbnMsIGNsZWFyT3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBmb3JjZSA9IGNsZWFyT3B0aW9ucyAmJiBjbGVhck9wdGlvbnMuZm9yY2UgPyBjbGVhck9wdGlvbnMuZm9yY2UgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoJHRvYXN0RWxlbWVudCAmJiAoZm9yY2UgfHwgJCgnOmZvY3VzJywgJHRvYXN0RWxlbWVudCkubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICAkdG9hc3RFbGVtZW50W29wdGlvbnMuaGlkZU1ldGhvZF0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IG9wdGlvbnMuaGlkZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZWFzaW5nOiBvcHRpb25zLmhpZGVFYXNpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkgeyByZW1vdmVUb2FzdCgkdG9hc3RFbGVtZW50KTsgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlQ29udGFpbmVyKG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyID0gJCgnPGRpdi8+JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2lkJywgb3B0aW9ucy5jb250YWluZXJJZClcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKG9wdGlvbnMucG9zaXRpb25DbGFzcyk7XG5cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZFRvKCQob3B0aW9ucy50YXJnZXQpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGNvbnRhaW5lcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0RGVmYXVsdHMoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdGFwVG9EaXNtaXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0b2FzdENsYXNzOiAndG9hc3QnLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJJZDogJ3RvYXN0LWNvbnRhaW5lcicsXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnOiBmYWxzZSxcblxuICAgICAgICAgICAgICAgICAgICBzaG93TWV0aG9kOiAnZmFkZUluJywgLy9mYWRlSW4sIHNsaWRlRG93biwgYW5kIHNob3cgYXJlIGJ1aWx0IGludG8galF1ZXJ5XG4gICAgICAgICAgICAgICAgICAgIHNob3dEdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgICAgICAgICBzaG93RWFzaW5nOiAnc3dpbmcnLCAvL3N3aW5nIGFuZCBsaW5lYXIgYXJlIGJ1aWx0IGludG8galF1ZXJ5XG4gICAgICAgICAgICAgICAgICAgIG9uU2hvd246IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgaGlkZU1ldGhvZDogJ2ZhZGVPdXQnLFxuICAgICAgICAgICAgICAgICAgICBoaWRlRHVyYXRpb246IDEwMDAsXG4gICAgICAgICAgICAgICAgICAgIGhpZGVFYXNpbmc6ICdzd2luZycsXG4gICAgICAgICAgICAgICAgICAgIG9uSGlkZGVuOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlTWV0aG9kOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VEdXJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlRWFzaW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VPbkhvdmVyOiB0cnVlLFxuXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuZGVkVGltZU91dDogMTAwMCxcbiAgICAgICAgICAgICAgICAgICAgaWNvbkNsYXNzZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAndG9hc3QtZXJyb3InLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5mbzogJ3RvYXN0LWluZm8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogJ3RvYXN0LXN1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FybmluZzogJ3RvYXN0LXdhcm5pbmcnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGljb25DbGFzczogJ3RvYXN0LWluZm8nLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkNsYXNzOiAndG9hc3QtdG9wLXJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgdGltZU91dDogNTAwMCwgLy8gU2V0IHRpbWVPdXQgYW5kIGV4dGVuZGVkVGltZU91dCB0byAwIHRvIG1ha2UgaXQgc3RpY2t5XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlQ2xhc3M6ICd0b2FzdC10aXRsZScsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzczogJ3RvYXN0LW1lc3NhZ2UnLFxuICAgICAgICAgICAgICAgICAgICBlc2NhcGVIdG1sOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiAnYm9keScsXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlSHRtbDogJzxidXR0b24gdHlwZT1cImJ1dHRvblwiPiZ0aW1lczs8L2J1dHRvbj4nLFxuICAgICAgICAgICAgICAgICAgICBjbG9zZUNsYXNzOiAndG9hc3QtY2xvc2UtYnV0dG9uJyxcbiAgICAgICAgICAgICAgICAgICAgbmV3ZXN0T25Ub3A6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHByZXZlbnREdXBsaWNhdGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzc0NsYXNzOiAndG9hc3QtcHJvZ3Jlc3MnLFxuICAgICAgICAgICAgICAgICAgICBydGw6IGZhbHNlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gcHVibGlzaChhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFsaXN0ZW5lcikgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICBsaXN0ZW5lcihhcmdzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gbm90aWZ5KG1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0gZ2V0T3B0aW9ucygpO1xuICAgICAgICAgICAgICAgIHZhciBpY29uQ2xhc3MgPSBtYXAuaWNvbkNsYXNzIHx8IG9wdGlvbnMuaWNvbkNsYXNzO1xuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAobWFwLm9wdGlvbnNPdmVycmlkZSkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSAkLmV4dGVuZChvcHRpb25zLCBtYXAub3B0aW9uc092ZXJyaWRlKTtcbiAgICAgICAgICAgICAgICAgICAgaWNvbkNsYXNzID0gbWFwLm9wdGlvbnNPdmVycmlkZS5pY29uQ2xhc3MgfHwgaWNvbkNsYXNzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRFeGl0KG9wdGlvbnMsIG1hcCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgICAgICB0b2FzdElkKys7XG5cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyID0gZ2V0Q29udGFpbmVyKG9wdGlvbnMsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGludGVydmFsSWQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHZhciAkdG9hc3RFbGVtZW50ID0gJCgnPGRpdi8+Jyk7XG4gICAgICAgICAgICAgICAgdmFyICR0aXRsZUVsZW1lbnQgPSAkKCc8ZGl2Lz4nKTtcbiAgICAgICAgICAgICAgICB2YXIgJG1lc3NhZ2VFbGVtZW50ID0gJCgnPGRpdi8+Jyk7XG4gICAgICAgICAgICAgICAgdmFyICRwcm9ncmVzc0VsZW1lbnQgPSAkKCc8ZGl2Lz4nKTtcbiAgICAgICAgICAgICAgICB2YXIgJGNsb3NlRWxlbWVudCA9ICQob3B0aW9ucy5jbG9zZUh0bWwpO1xuICAgICAgICAgICAgICAgIHZhciBwcm9ncmVzc0JhciA9IHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJ2YWxJZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgaGlkZUV0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgbWF4SGlkZVRpbWU6IG51bGxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG9hc3RJZDogdG9hc3RJZCxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6ICd2aXNpYmxlJyxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICBtYXA6IG1hcFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBwZXJzb25hbGl6ZVRvYXN0KCk7XG5cbiAgICAgICAgICAgICAgICBkaXNwbGF5VG9hc3QoKTtcblxuICAgICAgICAgICAgICAgIGhhbmRsZUV2ZW50cygpO1xuXG4gICAgICAgICAgICAgICAgcHVibGlzaChyZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5kZWJ1ZyAmJiBjb25zb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gJHRvYXN0RWxlbWVudDtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGVzY2FwZUh0bWwoc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2UgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcGVyc29uYWxpemVUb2FzdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0SWNvbigpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaXRsZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRNZXNzYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNldENsb3NlQnV0dG9uKCk7XG4gICAgICAgICAgICAgICAgICAgIHNldFByb2dyZXNzQmFyKCk7XG4gICAgICAgICAgICAgICAgICAgIHNldFJUTCgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRTZXF1ZW5jZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZXRBcmlhKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2V0QXJpYSgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyaWFWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1hcC5pY29uQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3RvYXN0LXN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAndG9hc3QtaW5mbyc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYVZhbHVlID0gICdwb2xpdGUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhVmFsdWUgPSAnYXNzZXJ0aXZlJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAkdG9hc3RFbGVtZW50LmF0dHIoJ2FyaWEtbGl2ZScsIGFyaWFWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlRXZlbnRzKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5jbG9zZU9uSG92ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b2FzdEVsZW1lbnQuaG92ZXIoc3RpY2tBcm91bmQsIGRlbGF5ZWRIaWRlVG9hc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLm9uY2xpY2sgJiYgb3B0aW9ucy50YXBUb0Rpc21pc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b2FzdEVsZW1lbnQuY2xpY2soaGlkZVRvYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmNsb3NlQnV0dG9uICYmICRjbG9zZUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRjbG9zZUVsZW1lbnQuY2xpY2soZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmNhbmNlbEJ1YmJsZSAhPT0gdW5kZWZpbmVkICYmIGV2ZW50LmNhbmNlbEJ1YmJsZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9uQ2xvc2VDbGljaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uQ2xvc2VDbGljayhldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlkZVRvYXN0KHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vbmNsaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9hc3RFbGVtZW50LmNsaWNrKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25jbGljayhldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlkZVRvYXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRpc3BsYXlUb2FzdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRvYXN0RWxlbWVudC5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgJHRvYXN0RWxlbWVudFtvcHRpb25zLnNob3dNZXRob2RdKFxuICAgICAgICAgICAgICAgICAgICAgICAge2R1cmF0aW9uOiBvcHRpb25zLnNob3dEdXJhdGlvbiwgZWFzaW5nOiBvcHRpb25zLnNob3dFYXNpbmcsIGNvbXBsZXRlOiBvcHRpb25zLm9uU2hvd259XG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudGltZU91dCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVydmFsSWQgPSBzZXRUaW1lb3V0KGhpZGVUb2FzdCwgb3B0aW9ucy50aW1lT3V0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLm1heEhpZGVUaW1lID0gcGFyc2VGbG9hdChvcHRpb25zLnRpbWVPdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuaGlkZUV0YSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgcHJvZ3Jlc3NCYXIubWF4SGlkZVRpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5wcm9ncmVzc0Jhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLmludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh1cGRhdGVQcm9ncmVzcywgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2V0SWNvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hcC5pY29uQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b2FzdEVsZW1lbnQuYWRkQ2xhc3Mob3B0aW9ucy50b2FzdENsYXNzKS5hZGRDbGFzcyhpY29uQ2xhc3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2V0U2VxdWVuY2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm5ld2VzdE9uVG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLnByZXBlbmQoJHRvYXN0RWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkdG9hc3RFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNldFRpdGxlKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWFwLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3VmZml4ID0gbWFwLnRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZXNjYXBlSHRtbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1ZmZpeCA9IGVzY2FwZUh0bWwobWFwLnRpdGxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICR0aXRsZUVsZW1lbnQuYXBwZW5kKHN1ZmZpeCkuYWRkQ2xhc3Mob3B0aW9ucy50aXRsZUNsYXNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b2FzdEVsZW1lbnQuYXBwZW5kKCR0aXRsZUVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2V0TWVzc2FnZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hcC5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3VmZml4ID0gbWFwLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5lc2NhcGVIdG1sKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VmZml4ID0gZXNjYXBlSHRtbChtYXAubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWVzc2FnZUVsZW1lbnQuYXBwZW5kKHN1ZmZpeCkuYWRkQ2xhc3Mob3B0aW9ucy5tZXNzYWdlQ2xhc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHRvYXN0RWxlbWVudC5hcHBlbmQoJG1lc3NhZ2VFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNldENsb3NlQnV0dG9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5jbG9zZUJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGNsb3NlRWxlbWVudC5hZGRDbGFzcyhvcHRpb25zLmNsb3NlQ2xhc3MpLmF0dHIoJ3JvbGUnLCAnYnV0dG9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9hc3RFbGVtZW50LnByZXBlbmQoJGNsb3NlRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzZXRQcm9ncmVzc0JhcigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucHJvZ3Jlc3NCYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRwcm9ncmVzc0VsZW1lbnQuYWRkQ2xhc3Mob3B0aW9ucy5wcm9ncmVzc0NsYXNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0b2FzdEVsZW1lbnQucHJlcGVuZCgkcHJvZ3Jlc3NFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNldFJUTCgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucnRsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkdG9hc3RFbGVtZW50LmFkZENsYXNzKCdydGwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNob3VsZEV4aXQob3B0aW9ucywgbWFwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnByZXZlbnREdXBsaWNhdGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWFwLm1lc3NhZ2UgPT09IHByZXZpb3VzVG9hc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNUb2FzdCA9IG1hcC5tZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBoaWRlVG9hc3Qob3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG92ZXJyaWRlICYmIG9wdGlvbnMuY2xvc2VNZXRob2QgIT09IGZhbHNlID8gb3B0aW9ucy5jbG9zZU1ldGhvZCA6IG9wdGlvbnMuaGlkZU1ldGhvZDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGR1cmF0aW9uID0gb3ZlcnJpZGUgJiYgb3B0aW9ucy5jbG9zZUR1cmF0aW9uICE9PSBmYWxzZSA/XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmNsb3NlRHVyYXRpb24gOiBvcHRpb25zLmhpZGVEdXJhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVhc2luZyA9IG92ZXJyaWRlICYmIG9wdGlvbnMuY2xvc2VFYXNpbmcgIT09IGZhbHNlID8gb3B0aW9ucy5jbG9zZUVhc2luZyA6IG9wdGlvbnMuaGlkZUVhc2luZztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJzpmb2N1cycsICR0b2FzdEVsZW1lbnQpLmxlbmd0aCAmJiAhb3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQocHJvZ3Jlc3NCYXIuaW50ZXJ2YWxJZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkdG9hc3RFbGVtZW50W21ldGhvZF0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZWFzaW5nOiBlYXNpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVRvYXN0KCR0b2FzdEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChpbnRlcnZhbElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vbkhpZGRlbiAmJiByZXNwb25zZS5zdGF0ZSAhPT0gJ2hpZGRlbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbkhpZGRlbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0ZSA9ICdoaWRkZW4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVuZFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2gocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBkZWxheWVkSGlkZVRvYXN0KCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy50aW1lT3V0ID4gMCB8fCBvcHRpb25zLmV4dGVuZGVkVGltZU91dCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVydmFsSWQgPSBzZXRUaW1lb3V0KGhpZGVUb2FzdCwgb3B0aW9ucy5leHRlbmRlZFRpbWVPdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIubWF4SGlkZVRpbWUgPSBwYXJzZUZsb2F0KG9wdGlvbnMuZXh0ZW5kZWRUaW1lT3V0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2dyZXNzQmFyLmhpZGVFdGEgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIHByb2dyZXNzQmFyLm1heEhpZGVUaW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc3RpY2tBcm91bmQoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChpbnRlcnZhbElkKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3NCYXIuaGlkZUV0YSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICR0b2FzdEVsZW1lbnQuc3RvcCh0cnVlLCB0cnVlKVtvcHRpb25zLnNob3dNZXRob2RdKFxuICAgICAgICAgICAgICAgICAgICAgICAge2R1cmF0aW9uOiBvcHRpb25zLnNob3dEdXJhdGlvbiwgZWFzaW5nOiBvcHRpb25zLnNob3dFYXNpbmd9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlUHJvZ3Jlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwZXJjZW50YWdlID0gKChwcm9ncmVzc0Jhci5oaWRlRXRhIC0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSkgLyBwcm9ncmVzc0Jhci5tYXhIaWRlVGltZSkgKiAxMDA7XG4gICAgICAgICAgICAgICAgICAgICRwcm9ncmVzc0VsZW1lbnQud2lkdGgocGVyY2VudGFnZSArICclJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBnZXRPcHRpb25zKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLmV4dGVuZCh7fSwgZ2V0RGVmYXVsdHMoKSwgdG9hc3RyLm9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVUb2FzdCgkdG9hc3RFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKCEkY29udGFpbmVyKSB7ICRjb250YWluZXIgPSBnZXRDb250YWluZXIoKTsgfVxuICAgICAgICAgICAgICAgIGlmICgkdG9hc3RFbGVtZW50LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHRvYXN0RWxlbWVudC5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAkdG9hc3RFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5jaGlsZHJlbigpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c1RvYXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KSgpO1xuICAgIH0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZGVwcywgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvL05vZGVcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WyckJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWyckJ10gOiBudWxsKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LnRvYXN0ciA9IGZhY3Rvcnkod2luZG93LmpRdWVyeSk7XG4gICAgfVxufSkpO1xuIiwiaW1wb3J0ICogYXMgYXhpb3MgZnJvbSAnLi4vbGlicy9heGlvcy13cmFwcGVyJ1xuaW1wb3J0ICogYXMgdG9hc3RyIGZyb20gJ3RvYXN0cidcbmltcG9ydCAqIGFzICQgZnJvbSAnanF1ZXJ5J1xubGV0IFV0aWxzID0gcmVxdWlyZSgnLi4vbGlicy91dGlscycpXG5cbmZ1bmN0aW9uIGVyckhhbmRsZXIgKGVycikge1xuICBjb25zb2xlLmVycm9yKGVycilcbiAgdG9hc3RyLmVycm9yKCdFcnJvcjogJyArIGVyci5tZXNzYWdlKVxufVxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICQoJyNidG4tc3RhcnQtdG9waWMnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgYXhpb3MucG9zdCgnL2NvbXBldGVuY3ktZXhlcmNpc2Uvc3RhcnQtdG9waWMnKS50aGVuKHJhd1Jlc3AgPT4ge1xuICAgICAgY29uc3QgcmVzcCA9IHJhd1Jlc3AuZGF0YVxuICAgICAgaWYgKHJlc3Auc3RhdHVzKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9hc3RyLmVycm9yKCdHYWdhbCBtZW11bGFpIHVqaSBrb21wZXRlbnNpOiAnICsgcmVzcC5lcnJNZXNzYWdlKVxuICAgICAgICBjb25zb2xlLmVycm9yKHJlc3AuZXJyTWVzc2FnZSlcbiAgICAgIH1cbiAgICB9KS5jYXRjaChlcnJIYW5kbGVyKVxuICB9KVxuXG4gICQoJyNidG4tYWJhbmRvbi1leGVyY2lzZScpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICBpZiAoY29uZmlybSgnU2VtdWEgcHJvZ3JlcyBha2FuIGhpbGFuZy4gQXBha2FoIGFuZGEgeWFraW4/JykpIHtcbiAgICAgIGF4aW9zLnBvc3QoJy9jb21wZXRlbmN5LWV4ZXJjaXNlL2FiYW5kb24tZXhlcmNpc2UnKS50aGVuKHJhd1Jlc3AgPT4ge1xuICAgICAgICBjb25zdCByZXNwID0gcmF3UmVzcC5kYXRhXG4gICAgICAgIGlmIChyZXNwLnN0YXR1cykge1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvYXN0ci5lcnJvcignR2FnYWwgbWVtYmF0YWxrYW4gdWppIGtvbXBldGVuc2k6ICcgKyByZXNwLmVyck1lc3NhZ2UpXG4gICAgICAgICAgY29uc29sZS5lcnJvcihyZXNwLmVyck1lc3NhZ2UpXG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyckhhbmRsZXIpXG4gICAgfVxuICB9KVxuXG4gICQoJyNidG4tc2tpcC1leGVyY2lzZScpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICBpZiAoY29uZmlybSgnVG9waWsgaW5pIGFrYW4gZGkgbGV3YXRpLiBBcGFrYWggYW5kYSB5YWtpbj8nKSkge1xuICAgICAgYXhpb3MucG9zdCgnL2NvbXBldGVuY3ktZXhlcmNpc2Uvc2tpcC10b3BpYycpLnRoZW4ocmF3UmVzcCA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3AgPSByYXdSZXNwLmRhdGFcbiAgICAgICAgaWYgKHJlc3Auc3RhdHVzKSB7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9hc3RyLmVycm9yKCdHYWdhbCBtZW1iYXRhbGthbiB1amkga29tcGV0ZW5zaTogJyArIHJlc3AuZXJyTWVzc2FnZSlcbiAgICAgICAgICBjb25zb2xlLmVycm9yKHJlc3AuZXJyTWVzc2FnZSlcbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goZXJySGFuZGxlcilcbiAgICB9XG4gIH0pXG5cbiAgZnVuY3Rpb24gc3VibWl0IChuYW1lLCBlbWFpbCwgcGhvbmUpIHtcbiAgICBheGlvcy5wb3N0KCcvY29tcGV0ZW5jeS1leGVyY2lzZS9zdWJtaXQnLCB7IG5hbWUsIGVtYWlsLCBwaG9uZSB9KS50aGVuKHJhd1Jlc3AgPT4ge1xuICAgICAgY29uc3QgcmVzcCA9IHJhd1Jlc3AuZGF0YVxuICAgICAgaWYgKHJlc3Auc3RhdHVzKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihuZXcgRXJyb3IoJ0ZhaWxlZCB0byBzdWJtaXQgZXhlcmNpc2U6ICcgKyByZXNwLmVyck1lc3NhZ2UpKVxuICAgICAgICB0b2FzdHIuZXJyb3IoJ0dhZ2FsIG1lbXByb3NlcyBzdWJtaXNzaW9uOiAnICsgcmVzcC5lcnJNZXNzYWdlKVxuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyckhhbmRsZXIpXG4gIH1cblxuICAkKCcjYnRuLWNvbnRhY3QtdXMnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9ICQoJyNpbnB1dC1uYW1lJykudmFsKClcbiAgICBjb25zdCBlbWFpbCA9ICQoJyNpbnB1dC1lbWFpbCcpLnZhbCgpXG4gICAgY29uc3QgcGhvbmUgPSAkKCcjaW5wdXQtcGhvbmUnKS52YWwoKVxuXG4gICAgaWYgKChuYW1lICYmIHBob25lKSB8fCAobmFtZSAmJiBlbWFpbCkpIHtcbiAgICAgIGlmIChlbWFpbCAmJiAhVXRpbHMudmFsaWRhdGVFbWFpbChlbWFpbCkpIHtcbiAgICAgICAgYWxlcnQoJ0Zvcm1hdCBlbWFpbCBzYWxhaCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJtaXQobmFtZSwgZW1haWwsIHBob25lKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhbGVydCgnTmFtYSBkYW4gbm9tb3IgdGVsZXBvbi9lbWFpbCBoYXJ1cyBkaWlzaScpXG4gICAgfVxuICB9KVxuXG4gICQoJyNidG4tZG9udC1jb250YWN0LXVzJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSAkKCcjaW5wdXQtbmFtZScpLnZhbCgpXG4gICAgY29uc3QgZW1haWwgPSAkKCcjaW5wdXQtZW1haWwnKS52YWwoKVxuICAgIGNvbnN0IHBob25lID0gJCgnI2lucHV0LXBob25lJykudmFsKClcblxuICAgIHN1Ym1pdChuYW1lICsgJyAoZG8gbm90IGNvbnRhY3QpJywgZW1haWwsIHBob25lKVxuICB9KVxuXG4gICQoJyNidG4tc2tpcC10b3BpYycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICBpZiAoY29uZmlybSgnVG9waWsgaW5pIGFrYW4gZGkgbGV3YXRpLiBBcGFrYWggYW5kYSB5YWtpbj8nKSkge1xuICAgICAgYXhpb3MucG9zdCgnL2NvbXBldGVuY3ktZXhlcmNpc2Uvc2tpcC10b3BpYycpLnRoZW4ocmF3UmVzcCA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3AgPSByYXdSZXNwLmRhdGFcbiAgICAgICAgaWYgKHJlc3Auc3RhdHVzKSB7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9hc3RyLmVycm9yKCdHYWdhbCBtZW1iYXRhbGthbiB1amkga29tcGV0ZW5zaTogJyArIHJlc3AuZXJyTWVzc2FnZSlcbiAgICAgICAgICBjb25zb2xlLmVycm9yKHJlc3AuZXJyTWVzc2FnZSlcbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goZXJySGFuZGxlcilcbiAgICB9XG4gIH0pXG5cbiAgJCgnI2J0bi1yZXRha2UtZXhlcmNpc2UnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgYXhpb3MucG9zdCgnL2NvbXBldGVuY3ktZXhlcmNpc2UvcmV0YWtlLWV4ZXJjaXNlJykudGhlbihyYXdSZXNwID0+IHtcbiAgICAgIGNvbnN0IHJlc3AgPSByYXdSZXNwLmRhdGFcbiAgICAgIGlmIChyZXNwLnN0YXR1cykge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvYXN0ci5lcnJvcignR2FnYWwgbWVtYmF0YWxrYW4gdWppIGtvbXBldGVuc2k6ICcgKyByZXNwLmVyck1lc3NhZ2UpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IocmVzcC5lcnJNZXNzYWdlKVxuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyckhhbmRsZXIpXG4gIH0pXG59KVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vIE1heCB0aW1lIGJlZm9yZSBhIFBPU1QvR0VUIHJlcXVlc3QgaXMgYWJvcnRlZFxuICBORVRXT1JLX1RJTUVPVVQ6IDE1MDAwXG59XG4iLCIiLCJyZXF1aXJlKCdlczYtcHJvbWlzZScpLnBvbHlmaWxsKClcbnZhciBheGlvcyA9IHJlcXVpcmUoJ2F4aW9zJylcbnZhciBDb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcuanMnKVxubW9kdWxlLmV4cG9ydHMgPSBheGlvcy5jcmVhdGUoe1xuICB0aW1lb3V0OiBDb25maWcuTkVUV09SS19USU1FT1VUXG59KVxuIiwidmFyIFByb21pc2UgPSByZXF1aXJlKCdibHVlYmlyZCcpXG5cbmNsYXNzIFV0aWxzIHtcbiAgLy8gVXNhZ2U6IGF3YWl0IHNsZWVwKDUwMClcbiAgLy8gaS5lLiB1c2VkIHRvIHNpbXVsYXRlIG5ldHdvcmsgZGVsYXlcbiAgc3RhdGljIHNsZWVwIChtcykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKVxuICB9XG5cbiAgLy8gVGFrZSB0aGUgcmVzdWx0IG9mIGZvcm0uc2VyaWFsaXplQXJyYXkoKSBhbmQgY29udmVydCBpdCB0byBKU09OIG9iamVjdFxuICBzdGF0aWMgb2JqZWN0aWZ5Rm9ybSAoZm9ybUFycmF5KSB7XG4gICAgdmFyIHJldHVybkFycmF5ID0ge31cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZvcm1BcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgcmV0dXJuQXJyYXlbZm9ybUFycmF5W2ldWyduYW1lJ11dID0gZm9ybUFycmF5W2ldWyd2YWx1ZSddXG4gICAgfVxuICAgIHJldHVybiByZXR1cm5BcnJheVxuICB9XG5cbiAgc3RhdGljIHZhbGlkYXRlRW1haWwoZW1haWwpIHtcbiAgICB2YXIgcmUgPSAvXigoW148PigpXFxbXFxdXFxcXC4sOzpcXHNAXCJdKyhcXC5bXjw+KClcXFtcXF1cXFxcLiw7Olxcc0BcIl0rKSopfChcIi4rXCIpKUAoKFxcW1swLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXF0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvO1xuICAgIHJldHVybiByZS50ZXN0KFN0cmluZyhlbWFpbCkudG9Mb3dlckNhc2UoKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsc1xuIl19
