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
ngxResource allows you to register interceptors which are functions or services that can process data before sending it to server (serializers) and after receiving it from server (deserializers)

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

TODO: explain how to register global interceptors

# Promises

TODO: explain how to use promises

# Global configuration

TODO: explain how to configure the provider to change global defaults

