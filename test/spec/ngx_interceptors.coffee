"use strict";

angular.module("ngxInterceptors").
        factory("fooSerializer", ->
          (data) ->
            return foo: data
        ).
        factory("fooDeserializer", ->
          (data) ->
            data = data.foo
            return data
        ).
        factory("nameSerializer", ->
          (data, context) ->
            out = {}
            out[context.config.name] = data
            out
        ).
        factory("nameDeserializer", ->
          (data, context) ->
            data[context.config.name]
        ).
        factory("fooInitializer", ->
          (resource, context) ->
            resource.foo = "bar"
            return resource
        );

describe "Resource", ->

  context "interceptors", ->

    $resource = $httpBackend = $rootScope = interceptorProvider = interceptor = undefined

    beforeEach module 'ngxResource'

    beforeEach inject ($injector) ->
      $httpBackend = $injector.get('$httpBackend')
      $resource = $injector.get('$resource')
      $rootScope = $injector.get('$rootScope')
      interceptor = sinon.spy((response) ->
        response
      )
      interceptorProvider = ->
        interceptor

    afterEach ->
      $httpBackend.verifyNoOutstandingExpectation()

    it "should pipeline data through interceptors", ->
      data1 = foo: 'bar'
      data2 = bar: 'baz'

      interceptor1 = sinon.spy (data) ->
          return data1
      interceptor2 = sinon.spy (data) ->
          return data2

      Resource = new $resource(
        url: "/path",
        serializers: [
          ->
            interceptor1
          ->
            interceptor2
        ]
      )
      $httpBackend.expect("POST", "/path", data2).respond('')
      resource = new Resource(bar: "baz")
      resource.$save()

      interceptor1.calledWithMatch(bar: "baz").should.be.true
      interceptor2.calledWith(data1).should.be.true

    it "should call serializers", ->
      Resource = new $resource(
        url: "/path"
        serializers: [interceptorProvider]
      )

      $httpBackend.expect("POST", "/path", bar: 'baz').respond('')
      resource = new Resource(bar: "baz")
      resource.$save()
      expectedContext = {
        config: Resource.config,
        request:
          method: 'POST'
          url: '/path'
      }
      interceptor.calledWithMatch({bar: 'baz'}, expectedContext).should.be.true

    it "should call registered serializers", ->
      Resource = new $resource(
        url: "/path"
        serializers: ["fooSerializer", "fooSerializer"]
      )

      $httpBackend.expect("POST", "/path", { foo: { foo: { bar: 'bar' } } }).respond('')
      resource = new Resource(bar: 'bar')
      resource.$save()

    it "should't call serializers on class methods", ->
      Resource = new $resource(
        url: "/path"
        serializers: [interceptorProvider]
      )

      $httpBackend.expect("POST", "/path").respond('')
      Resource.create()
      interceptor.called.should.be.false

    it "should call deserializers", ->
      Resource = new $resource(
        url: "/path"
        deserializers: [interceptorProvider]
      )

      $httpBackend.expect("GET", "/path").respond("foo")
      Resource.get()
      $httpBackend.flush()
      expectedContext = config: Resource.config, response: { data: 'foo', status: 200 }
      interceptor.calledWithMatch("foo", expectedContext).should.be.true

    it "should call deserializers on class methods", (done) ->
      Resource = new $resource(
        url: "/path",
        deserializers: ['nameDeserializer'],
        name: 'foobar'
      )
      $httpBackend.expect('GET', '/path').respond(foobar: { kung: 'pow' })
      Resource.get().then (response) ->
        response.should.eql kung: 'pow'
        done()
      $httpBackend.flush()

    it "should call initializers", ->
      Resource = new $resource(
        url: "/path"
        initializers: [interceptorProvider]
      )

      $httpBackend.expect("GET", "/path").respond(foo: "bar");
      Resource.get()
      expectedContext = {
        config: Resource.config,
        response: {
          data: { foo: "bar" }
          status: 200
        }
      }
      $httpBackend.flush()
      interceptor.calledWithMatch({ foo: "bar" }, expectedContext).should.be.true

    it "should call initializers with the created resource instance", (done) ->
      metadataInitializer = ->
        (resource, context) ->
          resource.length.should.eql 1
          resource[0].should.be.an.instanceof Resource
          resource[0].foo = 'baz'
          resource.foo = "bar"
          return resource

      Resource = new $resource(
        url: "/path"
        initializers: [metadataInitializer]
      )

      $httpBackend.expect("GET", "/path").respond([{ id: 1, foo: 'bar' }]);
      Resource.get().then (resource) ->
        resource.foo.should.equal "bar"
        resource[0].foo.should.equal "baz"
        done()

      $httpBackend.flush()
