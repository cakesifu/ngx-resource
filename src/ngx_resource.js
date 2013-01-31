'use strict';

/**
 * @todo should be able to specify associations
 */
angular.module('ngxResource', ['ng']).
  factory('Route', function() {

  var forEach = angular.forEach;

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
          if (angular.isDefined(val) && val !== null) {
            encodedVal = encodeUriSegment(val);
            url = url.replace(new RegExp(":" + urlParam + "(\\W)", "g"), encodedVal + "$1");
          } else {
            url = url.replace(new RegExp("/?:" + urlParam + "(\\W)", "g"), '$1');
          }
        });
        url = url.replace(/\/?#$/, '');
        var query = [];
        forEach(params, function(value, key){
          if (!self.urlParams[key]) {
            query.push(encodeUriQuery(key) + '=' + encodeUriQuery(value));
          }
        });
        query.sort();
        url = url.replace(/\/*$/, '');
        return url + (query.length ? '?' + query.join('&') : '');
      }
    };

    return Route;
  }).
  provider('$resource', function() {

    this.config = {
      actions: {
        'get':    { method:'GET' },
        'save':   { method:'POST' },
        'query':  { method:'GET', collection:true },
        'remove': { method:'DELETE' },
        'delete': { method:'DELETE' }
      },
      serializer: function(obj, options) {
        return obj;
      },
      deserializer: function(data, options) {
        return data;
      }
    };

    this.$get = ['$http', '$parse', 'Route', function($http, $parse, Route) {

      var config = this.config;

      var noop = angular.noop,
          forEach = angular.forEach,
          extend = angular.extend,
          copy = angular.copy,
          isFunction = angular.isFunction,
          getter = function(obj, path) {
            return $parse(path)(obj);
          };

      function extractParams(data) {
        var ids = {},
            params = Array.prototype.slice.call(arguments, 1);
        params.unshift({});
        params = extend.apply(angular, params);

        forEach(params, function(value, key){
          if (isFunction(value)) {
            value = value();
          }
          ids[key] = value.charAt && value.charAt(0) == '@' ? getter(data, value.substr(1)) : value;
        });

        return ids;
      }

      function ResourceFactory(options) {

        var url = options.url || options,
            route = new Route(url),
            actions = extend({}, config.actions, options.actions || {}),
            paramDefaults = options.params || {},
            serializer = options.serializer || config.serializer,
            deserializer = options.deserializer || config.deserializer;

        function Resource(value) {
          value = deserializer(value, options);
          copy(value || {}, this);
        }

        forEach(actions, function(action, name) {
          var hasBody;
          action.method = angular.uppercase(action.method);

          if (action.hasOwnProperty('body')) {
            hasBody = action.body
          } else {
            hasBody = action.method == 'POST' || action.method == 'PUT' || action.method == 'PATCH';
          }

          Resource[name] = function(args) {
            args = args || {};

            var params = args.params || {},
                data = args.data || {},
                success = args.success || noop,
                error = args.error,
                value = this instanceof Resource ? this : (action.collection ? [] : new Resource(data));

            $http({
              method: action.method,
              url: route.url(extend({}, extractParams(data, paramDefaults, action.params || {}), params)),
              data: data,
              headers: extend({}, action.headers || {})
            }).then(function(response) {
              var data = response.data;

              if (data) {
                if (action.collection) {
                  value.length = 0;
                  forEach(data, function(item) {
                    value.push(new Resource(item));
                  });
                } else {
                  copy(data, value);
                }
              }
              success(value, response.headers);
            }, error);

            return value;
          };

          Resource.prototype['$' + name] = function(args) {
            args = args || {};
            var params = args.params || extractParams(this, paramDefaults),
                success = args.success || noop,
                error = args.error,
                data = hasBody ? serializer(this, options) : undefined;
            Resource[name].call(this, { params: params, data: data, success: success, error: error });
          };

        });

//        Resource.bind = function(additionalParamDefaults){
//          return ResourceFactory({
//            url: url,
//            params: extend({}, paramDefaults, additionalParamDefaults),
//            actions: actions
//          });
//        };

        return Resource;
      }

      return ResourceFactory;
    }]
  });
