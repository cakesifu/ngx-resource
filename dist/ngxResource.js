/*! ngxResource - v0.3.0 - 2013-02-18
* Copyright (c) 2013 Cezar Berea <berea.cezar@gmail.com>; Licensed MIT */

'use strict';

angular.module('ngxResource', ['ng', 'ngxRoute', 'ngxInterceptors']).
  provider('$resource', function() {

    this.config = {
      actions: {
        'get':    { method:'GET' },
        'update': { method:'PUT' },
        'create': { method:'POST' },
        'save':   { method:'POST' },
        'query':  { method:'GET' },
        'remove': { method:'DELETE' }
      },
      headers: {},
      serializers: [],
      deserializers: [],
      initializers: []
    };

    this.$get = ['$http', '$parse', '$injector', 'Route', function($http, $parse, $injector, Route) {

      var extend = angular.extend,
          copy = angular.copy,
          isFunction = angular.isFunction,
          isDefined = angular.isDefined,
          isArray = angular.isArray,
          isObject = angular.isObject,
          getter = function(obj, path) {
            return $parse(path)(obj);
          };

      function extractParams(data) {
        var ids = {},
            params = Array.prototype.slice.call(arguments, 1);

        params.unshift({});
        params = extend.apply(angular, params);

        angular.forEach(params, function(value, key){
          if (value === undefined || value === null) {
            return;
          }
          if (isFunction(value)) {
            value = value();
          }
          ids[key] = value.charAt && value.charAt(0) == '@' ? getter(data, value.substr(1)) : value;
        });

        return ids;
      }

      function callInterceptors(interceptors, data, context) {
        angular.forEach(interceptors, function (interceptor) {
          var interceptorFunc =  angular.isString(interceptor) ? $injector.get(interceptor)
                                                               : $injector.invoke(interceptor);
          data = interceptorFunc(data, context);
        });
        return data;
      }

      function processResponse(promise, Resource, instance) {
        return promise.then(function(response) {
          var data = callInterceptors(
                Resource.config.deserializers,
                response.data,
                { config: Resource.config, response: response }
              ), result;

          if (isArray(data)) {
            result = [];

            angular.forEach(data, function (value) {
              result.push(new Resource(value));
            });

          } else{
            if (isObject(data)) {
              if (instance) {
                result = instance;
                extend(instance, data);
              } else {
                result = new Resource(data);
              }
            } else {
              result = data;
            }
          }

          result = callInterceptors(
              Resource.config.initializers,
              result,
              { response: response, config: Resource.config }
          );

          return result;
        });
      }

      var providerConfig = this.config;

      function ResourceFactory(options) {

        var url = options.url || options,
            route = new Route(url),
            actions = options.actions = extend({}, providerConfig.actions, options.actions),
            config;

        if (isDefined(options.extraHeaders)) {
          options.headers = extend(options.headers || {}, providerConfig.headers, options.extraHeaders);
        }
        options.params = extend({}, providerConfig.params, options.params);

        function Resource(value) {
          copy(value || {}, this);
        }

        Resource.config = config = extend({}, providerConfig, options);

        angular.forEach(actions, function(action, name) {

          action.method = angular.uppercase(action.method);

          var hasBody = (typeof action.body !== "undefined")
                      ? action.body
                      : (action.method === "POST" || action.method === "PUT");

          Resource[name] = function(params, data) {
            data = data || {};
            params = extractParams(data, config.params, action.params, params);

            var url = route.url(params),
                self = this,
                promise;

            promise = $http({
              method: action.method,
              url: url,
              data: data,
              headers: extend({}, action.headers || {})
            });

            return processResponse(promise, Resource, null).then(function(response) {
              extend(self, response);
              return response;
            });
          };

          Resource.prototype['$' + name] = function(params) {
            params = extractParams(this, config.params, action.params, params);
            var url = route.url(params),
                request = {
                  method: action.method,
                  url: url,
                  headers: extend({}, action.headers || {})
                },
                promise;

            if (hasBody) {
              request.data = callInterceptors(
                  Resource.config.serializers,
                  this,
                  { config: Resource.config, request: request }
              );
            }

            promise = $http(request);

            return processResponse(promise, Resource, this);
          };

        });

        return Resource;
      }

      return ResourceFactory;
    }]
  });

"use strict";

angular.module('ngxRoute', []).factory('Route', function() {

  var forEach = angular.forEach,
      isArray = angular.isArray,
      isObject = angular.isObject,
      isFunction = angular.isFunction,
      isUndefined = angular.isUndefined;

    /**
     * We need our custom method because encodeURIComponent is too aggressive and doesn't follow
     * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
     * segments:
     *    segment       = *pchar
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriSegment(val) {
      return encodeUriQuery(val, true).
        replace(/%26/gi, '&').
        replace(/%3D/gi, '=').
        replace(/%2B/gi, '+');
    }


    /**
     * This method is intended for encoding *key* or *value* parts of query component. We need a custom
     * method becuase encodeURIComponent is too agressive and encodes stuff that doesn't have to be
     * encoded per http://tools.ietf.org/html/rfc3986:
     *    query       = *( pchar / "/" / "?" )
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriQuery(val, pctEncodeSpaces) {
      return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace((pctEncodeSpaces ? null : /%20/g), '+');
    }

    function buildQuery(value, prefix) {
      var out = [];
      if (isArray(value) || isObject(value)) {
        forEach(value, function(v, k) {
          var newPrefix = prefix ? prefix + '[' + (isArray(value) ? '' : k) + ']' : k;
          out = out.concat(buildQuery(v, newPrefix));
        });
      } else if (!isFunction(value)) {
        if (isUndefined(value) || value === null) {
          value = '';
        }
        out.push(encodeUriQuery(prefix) + '=' + encodeUriQuery(value));
      }
      return out;
    }

    function Route(template, defaults) {
      this.template = template = template + '#';
      this.defaults = defaults || {};
      var urlParams = this.urlParams = {};
      forEach(template.split(/\W/), function(param){
        if (param && template.match(new RegExp("[^\\\\]:" + param + "\\W"))) {
          urlParams[param] = true;
        }
      });

      this.template = template.replace(/\\:/g, ':');
    }

    Route.prototype = {
      url: function(params) {
        var self = this,
            url = this.template,
            val,
            encodedVal;

        params = params || {};
        forEach(this.urlParams, function(_, urlParam){
          val = params.hasOwnProperty(urlParam) ? params[urlParam] : self.defaults[urlParam];
          if (angular.isDefined(val) && val !== null && !isObject(val) && !isArray(val)) {
            encodedVal = encodeUriSegment(val);
            url = url.replace(new RegExp(":" + urlParam + "(\\W)", "g"), encodedVal + "$1");
          } else {
            url = url.replace(new RegExp("/?:" + urlParam + "(\\W)", "g"), '$1');
          }
        });

        var serializeableParams = {};

        forEach(params, function(value, key){
          if (!self.urlParams[key]) {
            serializeableParams[key] = value;
          }
        });

        var query = buildQuery(serializeableParams);

        url = url.replace(/\/?#$/, '').replace(/\/*$/, '');
        return url + (query.length ? '?' + query.join('&') : '');
      }
    };

    return Route;
  });

"use strict";

angular.module("ngxInterceptors", []);
