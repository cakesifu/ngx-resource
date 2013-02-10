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
Phone.get({ id: 123 }); 			// GET /phones/123
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
    
myPhone.$save(); 	// POST /phones/5 
```

# Custom actions
Just like ngResource you can specify custom actions.

```javascript
var Phone = $resource({
	url: "/phones/:id/:action",
    actions: { 
    	methd: 'GET
    }
});
```
