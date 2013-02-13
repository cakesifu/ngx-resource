ngx-resource
============

Angular eXtended Resource. A slightly improved ngResource for angular apps.

To get started:

```javascript
angular.module("myModule", ["ngxResource"]).
  factory("Book", function($resource) {
    return $resource("/books/:id");
  });
```

Available initialize options:

## URL params

ngxResource has the same URL routing scheme as the original ngResource.

```javascript
var Phone = $resource("/phones/:brand/:id");

Phone.query({ brand: "samsung" });  // GET /phones/samsung
Phone.get({ id: 123 }); 			      // GET /phones/123
```

You can specify resource params defaults

```javascript
var Phone = $resource({
  url: "/phones/:brand/:id",
  params: {
    id: '@id'
  }
}),
    myPhone = new Phone({ id: 5, brand: 'lg' });

myPhone.$save(); 	  // POST /phones/5
```

# Custom actions
Just like ngResource you can specify custom actions.

```javascript
var Phone = $resource({
  url: "/phones/:id/:action",
  actions: {
    featured: { method: 'GET', params: { action: 'featured' } }
  }
});

Phone.featured();   // GET /phones/featured
```

# Interceptors
ngxResource allows you to register interceptors which are functions or services that can
process data before sending it to server (serializers) and after receiving it from server
(deserializers)

```javascript
function fooWrapper(data, config) {
  return { foo: data }
}

var Phone = $resource({
  url: "/phones/:id",
  serializers: [fooWrapper]
}),
    myPhone = new Phone({ id: 5, name: "GalaxyS3"});

myPhone.$save();      // POST /phones/5  foo[id]=5&foo[name]=GalaxyS3
```

Deserializers have the added ability to pass metadata from the response to the resource.

```javascript
var metadataDeserializer = function() {
  return function(response) {
    var fooHeader;
    if (fooHeader = response.headers("foo")) {
      response.metadata.foo = fooHeader;
    }
    return response;
  }
}

Resource = new $resource({
  url: "/path",
  deserializers: [metadataDeserializer]
});

Resource.query().then(function(response){
  response.foo;   // the value of the HTTP header named "foo" in the HTTP response
});
```

TODO: explain how to register global interceptors

# Promises

Every call to a resource method will return a promise object. Angular docs have a great explanation
on [promises](http://docs.angularjs.org/api/ng.$q).

```javascript
var Phone = $resource("/phones");
Phone.get().then(function(phone) {
  console.log(phone instanceof Phone);  // true
});
```

The templating engine will recognize the promise so you can assign it to the scope and use it in
your views

```javascript
function PhonesController($scope, Phone) {
  $scope.phones = Phone.query();
}
```

```html
<ul ng-controller="PhonesController">
  <li ng-repeat="phone in phones">{{phone.name}}</li>
</ul>
```

# Global configuration


ngxResource can be configured

```javascript
angular.module("myModule", ["ng", "ngxResource"]).
        config(function($resourceProvider){
          // $resourceProvider.config...
        });
```

