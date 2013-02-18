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
