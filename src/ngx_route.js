"use strict";

angular.module('ngxRoute', []).factory('Route', function() {

  var forEach = angular.forEach,
      isArray = angular.isArray,
      isObject = angular.isObject;

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
      } else {
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
