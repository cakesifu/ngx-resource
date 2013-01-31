'use strict';

describe("Resource", function() {
  var $resource, $httpBackend;

  beforeEach(module('ngxResource'));

  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
    $resource = $injector.get('$resource');
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
  });

  describe("core features", function() {
    var R,
        data = [{id: 1}, {id: 2}];

    beforeEach(function() {
      R = $resource({
        url: '/path/:id',
        params: {
          id: '@id'
        },
        actions: {
          search: { method: 'GET', collection: true },
          find: { method: 'GET' }
        }
      });
    });

    // @todo more precise specs here
    it("should build resource with default actions", function() {
      expect(R).to.be.a("function");
      expect(R.get).to.be.a("function");
      expect(R.save).to.be.a("function");
      expect(R.remove).to.be.a("function");
      expect(R['delete']).to.be.a("function");
      expect(R.query).to.be.a("function");
    });

    it("should handle collections",function() {
      var results;

      $httpBackend.expect('GET', '/path').respond(data);
      results = R.search();
      expect(results).to.be.a('Array');
      $httpBackend.flush();
      expect(results).to.eql(data);
    });

    it("should handle single resources", function() {
      var result;
      $httpBackend.expect('GET', '/path/123').respond(data[0]);
      result = R.get({params: {id: 123}});
      expect(result).to.be.an.instanceof(R);
      $httpBackend.flush();
      expect(result).to.eql(data[0]);
    });

  });

  it('should send correct headers', function() {
    var R = $resource({
      url:'/path/:id',
      actions: {
        conditionalPut: { method: 'PUT', headers: { 'If-None-Match': '*' } }
      }
    });

    $httpBackend.expectPUT('/path/123', undefined, function(headers) {
      return headers['If-None-Match'] == "*";
    }).respond({id:123});

    R.conditionalPut({params: { id: 123 }});
  });

  it('should not mutate the resource object if response has no body', function() {
    var data = { id: 123, number:'9876' },
        R = $resource({
          url: '/path/:id',
          params: {
            id: '@id'
          }
        });

    $httpBackend.expect('GET', '/path/123').respond(data);

    var item = R.get({params: { id: 123 }});
    $httpBackend.flush();
    expect(item).to.be.instanceof(R);

    $httpBackend.expect('POST', '/path/123', angular.toJson(data)).respond('');
    var idBefore = item.id;

    item.$save();
    $httpBackend.flush();
    expect(item.id).to.equal(idBefore);
  });

  describe("URL routing", function() {

    it('should ignore slashes of undefinend parameters', function() {
      var R = $resource('/Path/:a/:b/:c');

      $httpBackend.when('GET', '/Path').respond('{}');
      $httpBackend.when('GET', '/Path/0').respond('{}');
      $httpBackend.when('GET', '/Path/false').respond('{}');
      $httpBackend.when('GET', '/Path').respond('{}');
      $httpBackend.when('GET', '/Path/').respond('{}');
      $httpBackend.when('GET', '/Path/1').respond('{}');
      $httpBackend.when('GET', '/Path/2/3').respond('{}');
      $httpBackend.when('GET', '/Path/4/5').respond('{}');
      $httpBackend.when('GET', '/Path/6/7/8').respond('{}');

      R.get({params: {}});
      R.get({params: {a:0}});
      R.get({params: {a:false}});
      R.get({params: {a:null}});
      R.get({params: {a:undefined}});
      R.get({params: {a:''}});
      R.get({params: {a:1}});
      R.get({params: {a:2, b:3}});
      R.get({params: {a:4, c:5}});
      R.get({params: {a:6, b:7, c:8}});
    });

    it('should support escaping colons in url template', function() {
      var R = $resource('http://localhost\\:8080/Path/:a/\\:stillPath/:b');

      $httpBackend.expect('GET', 'http://localhost:8080/Path/foo/:stillPath/bar').respond();
      R.get({params: {a: 'foo', b: 'bar'}});
    });

    it('should correctly encode url params', function() {
      var R = $resource('/Path/:a');

      $httpBackend.expect('GET', '/Path/foo%231').respond('{}');
      $httpBackend.expect('GET', '/Path/doh!@foo?bar=baz%231').respond('{}');

      R.get({params: {a: 'foo#1'}});
      R.get({params: {a: 'doh!@foo', bar: 'baz#1'}});
    });

    it('should not encode @ in url params', function() {
      //encodeURIComponent is too agressive and doesn't follow http://www.ietf.org/rfc/rfc3986.txt
      //with regards to the character set (pchar) allowed in path segments
      //so we need this test to make sure that we don't over-encode the params and break stuff like
      //buzz api which uses @self

      var R = $resource('/Path/:a');
      $httpBackend.expect('GET', '/Path/doh@fo%20o?!do%26h=g%3Da+h&:bar=$baz@1').respond('{}');
      R.get({params: {a: 'doh@fo o', ':bar': '$baz@1', '!do&h': 'g=a h'}});
    });

    it('should encode & in url params', function() {
      var R = $resource('/Path/:a');
      $httpBackend.expect('GET', '/Path/doh&foo?bar=baz%261').respond('{}');
      R.get({params: {a: 'doh&foo', bar: 'baz&1'}});
    });

    it('should handle multiple params with same name', function() {
      var R = $resource('/:id/:id');

      $httpBackend.when('GET').respond('{}');
      $httpBackend.expect('GET', '/1/1');

      R.get({params: {id: 1}});
    });

    it('should default to empty parameters', function() {
      $httpBackend.expect('GET', 'URL').respond({});
      $resource('URL').query();
    });

    it('should read default param from instance', function() {
      $httpBackend.expect('POST', '/Customer/123').respond();
      var R = $resource({
            url: '/Customer/:id',
            actions: {
              post: {method: 'POST', params: {id: '@id'}}
            }
          }),
          inst = new R({ id: 123 });

      expect(inst.id).to.equal(123);
      inst.$post();
    });
  });


  describe("custom actions", function() {

    it('should not pass default params between actions', function() {
      var R = $resource({
        url: '/Path',
        params: {},
        actions: {
          get: { method: 'GET', params: {objId: '1'} },
          perform: { method: 'GET' }
        }
      });

      $httpBackend.expect('GET', '/Path?objId=1').respond('{}');
      $httpBackend.expect('GET', '/Path').respond('{}');

      R.get();
      R.perform();
    });

    it("should overwrite default params", function() {
      $httpBackend.expect('GET', '/Customer/123').respond({id: 'abc'});
      var R = $resource({
            url: '/:type/:typeId',
            params: {type: 'Order'},
            actions:{
              get: {method: 'GET', params: {type: 'Customer'}}
            }
          }),
          item = R.get({params: {typeId: 123}});

      $httpBackend.flush();
      expect(item).to.eql({id: 'abc'});
    });

  });

});
/*

  it("should create resource", function() {
    $httpBackend.expect('POST', '/CreditCard', '{"name":"misko"}').respond({id: 123, name: 'misko'});

    var cc = CreditCard.save({name: 'misko'}, callback);
    expect(cc).toEqualData({name: 'misko'});
    expect(callback).not.toHaveBeenCalled();

    $httpBackend.flush();
    expect(cc).toEqualData({id: 123, name: 'misko'});
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mostRecentCall.args[0]).toEqual(cc);
    expect(callback.mostRecentCall.args[1]()).toEqual({});
  });


  it("should read resource", function() {
    $httpBackend.expect('GET', '/CreditCard/123').respond({id: 123, number: '9876'});
    var cc = CreditCard.get({id: 123}, callback);

    expect(cc instanceof CreditCard).toBeTruthy();
    expect(cc).toEqualData({});
    expect(callback).not.toHaveBeenCalled();

    $httpBackend.flush();
    expect(cc).toEqualData({id: 123, number: '9876'});
    expect(callback.mostRecentCall.args[0]).toEqual(cc);
    expect(callback.mostRecentCall.args[1]()).toEqual({});
  });


  it("should read partial resource", function() {
    $httpBackend.expect('GET', '/CreditCard').respond([{id:{key:123}}]);
    var ccs = CreditCard.query();

    $httpBackend.flush();
    expect(ccs.length).toEqual(1);

    var cc = ccs[0];
    expect(cc instanceof CreditCard).toBe(true);
    expect(cc.number).toBeUndefined();

    $httpBackend.expect('GET', '/CreditCard/123').respond({id: {key: 123}, number: '9876'});
    cc.$get(callback);
    $httpBackend.flush();
    expect(callback.mostRecentCall.args[0]).toEqual(cc);
    expect(callback.mostRecentCall.args[1]()).toEqual({});
    expect(cc.number).toEqual('9876');
  });


  it("should update resource", function() {
    $httpBackend.expect('POST', '/CreditCard/123', '{"id":{"key":123},"name":"misko"}').
                 respond({id: {key: 123}, name: 'rama'});

    var cc = CreditCard.save({id: {key: 123}, name: 'misko'}, callback);
    expect(cc).toEqualData({id:{key:123}, name:'misko'});
    expect(callback).not.toHaveBeenCalled();
    $httpBackend.flush();
  });


  it("should query resource", function() {
    $httpBackend.expect('GET', '/CreditCard?key=value').respond([{id: 1}, {id: 2}]);

    var ccs = CreditCard.query({key: 'value'}, callback);
    expect(ccs).toEqual([]);
    expect(callback).not.toHaveBeenCalled();

    $httpBackend.flush();
    expect(ccs).toEqualData([{id:1}, {id:2}]);
    expect(callback.mostRecentCall.args[0]).toEqual(ccs);
    expect(callback.mostRecentCall.args[1]()).toEqual({});
  });


  it("should have all arguments optional", function() {
    $httpBackend.expect('GET', '/CreditCard').respond([{id:1}]);

    var log = '';
    var ccs = CreditCard.query(function() { log += 'cb;'; });

    $httpBackend.flush();
    expect(ccs).toEqualData([{id:1}]);
    expect(log).toEqual('cb;');
  });


  it('should delete resource and call callback', function() {
    $httpBackend.expect('DELETE', '/CreditCard/123').respond({});
    CreditCard.remove({id:123}, callback);
    expect(callback).not.toHaveBeenCalled();

    $httpBackend.flush();
    expect(callback.mostRecentCall.args[0]).toEqualData({});
    expect(callback.mostRecentCall.args[1]()).toEqual({});

    callback.reset();
    $httpBackend.expect('DELETE', '/CreditCard/333').respond(204, null);
    CreditCard.remove({id:333}, callback);
    expect(callback).not.toHaveBeenCalled();

    $httpBackend.flush();
    expect(callback.mostRecentCall.args[0]).toEqualData({});
    expect(callback.mostRecentCall.args[1]()).toEqual({});
  });


  it('should post charge verb', function() {
    $httpBackend.expect('POST', '/CreditCard/123!charge?amount=10', '{"auth":"abc"}').respond({success: 'ok'});
    CreditCard.charge({id:123, amount:10}, {auth:'abc'}, callback);
  });


  it('should post charge verb on instance', function() {
    $httpBackend.expect('POST', '/CreditCard/123!charge?amount=10',
        '{"id":{"key":123},"name":"misko"}').respond({success: 'ok'});

    var card = new CreditCard({id:{key:123}, name:'misko'});
    card.$charge({amount:10}, callback);
  });


  it("should patch a resource", function() {
    $httpBackend.expectPATCH('/CreditCard/123', '{"name":"igor"}').
                     respond({id: 123, name: 'rama'});

    var card = CreditCard.patch({id: 123}, {name: 'igor'}, callback);

    expect(card).toEqualData({name: 'igor'});
    expect(callback).not.toHaveBeenCalled();
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
    expect(card).toEqualData({id: 123, name: 'rama'});
  });


  it('should create on save', function() {
    $httpBackend.expect('POST', '/CreditCard', '{"name":"misko"}').respond({id: 123}, {header1: 'a'});

    var cc = new CreditCard();
    expect(cc.$get).toBeDefined();
    expect(cc.$query).toBeDefined();
    expect(cc.$remove).toBeDefined();
    expect(cc.$save).toBeDefined();

    cc.name = 'misko';
    cc.$save(callback);
    expect(cc).toEqualData({name:'misko'});

    $httpBackend.flush();
    expect(cc).toEqualData({id:123});
    expect(callback.mostRecentCall.args[0]).toEqual(cc);
    expect(callback.mostRecentCall.args[1]()).toEqual({header1: 'a'});
  });


  it('should bind default parameters', function() {
    $httpBackend.expect('GET', '/CreditCard/123.visa?minimum=0.05').respond({id: 123});
    var Visa = CreditCard.bind({verb:'.visa', minimum:0.05});
    var visa = Visa.get({id:123});
    $httpBackend.flush();
    expect(visa).toEqualData({id:123});
  });


  it('should support dynamic default parameters (global)', function() {
    var currentGroup = 'students',
        Person = $resource('/Person/:group/:id', { group: function() { return currentGroup; }});


    $httpBackend.expect('GET', '/Person/students/fedor').respond({id: 'fedor', email: 'f@f.com'});

    var fedor = Person.get({id: 'fedor'});
    $httpBackend.flush();

    expect(fedor).toEqualData({id: 'fedor', email: 'f@f.com'});
  });


  it('should support dynamic default parameters (action specific)', function() {
    var currentGroup = 'students',
        Person = $resource('/Person/:group/:id', {}, {
          fetch: {method: 'GET', params: {group: function() { return currentGroup; }}}
        });

    $httpBackend.expect('GET', '/Person/students/fedor').respond({id: 'fedor', email: 'f@f.com'});

    var fedor = Person.fetch({id: 'fedor'});
    $httpBackend.flush();

    expect(fedor).toEqualData({id: 'fedor', email: 'f@f.com'});
  });


  it('should exercise full stack', function() {
    var Person = $resource('/Person/:id');

    $httpBackend.expect('GET', '/Person/123').respond('\n{\n"name":\n"misko"\n}\n');
    var person = Person.get({id:123});
    $httpBackend.flush();
    expect(person.name).toEqual('misko');
  });


  describe('failure mode', function() {
    var ERROR_CODE = 500,
        ERROR_RESPONSE = 'Server Error',
        errorCB;

    beforeEach(function() {
      errorCB = jasmine.createSpy('error').andCallFake(function(response) {
        expect(response.data).toBe(ERROR_RESPONSE);
        expect(response.status).toBe(ERROR_CODE);
      });
    });


    it('should call the error callback if provided on non 2xx response', function() {
      $httpBackend.expect('GET', '/CreditCard/123').respond(ERROR_CODE, ERROR_RESPONSE);

      CreditCard.get({id:123}, callback, errorCB);
      $httpBackend.flush();
      expect(errorCB).toHaveBeenCalledOnce();
      expect(callback).not.toHaveBeenCalled();
    });


    it('should call the error callback if provided on non 2xx response', function() {
      $httpBackend.expect('GET', '/CreditCard').respond(ERROR_CODE, ERROR_RESPONSE);

      CreditCard.get(callback, errorCB);
      $httpBackend.flush();
      expect(errorCB).toHaveBeenCalledOnce();
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
//*/
