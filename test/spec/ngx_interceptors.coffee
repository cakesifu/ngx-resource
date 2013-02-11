"use strict";

angular.module("ngxInterceptors").
        factory("fooSerializer", ->
          (data) ->
            return foo: data
        ).
        factory("fooDeserializer", ->
          (response) ->
            response.data = response.data.foo
            return response
        ).
        factory("nameSerializer", ->
          (data, config) ->
            out = {}
            out[config.name] = data
            out
        ).
        factory("nameDeserializer", ->
          (response, config) ->
            response.data = response.data[config.name]
            return response
        );

describe "Resource", ->
  context "interceptors", ->
    $resource = $httpBackend = $rootScope = undefined

    beforeEach module 'ngxResource'

    beforeEach inject ($injector) ->
      $httpBackend = $injector.get('$httpBackend')
      $resource = $injector.get('$resource')
      $rootScope = $injector.get('$rootScope')

    afterEach ->
      $httpBackend.verifyNoOutstandingExpectation()

    it "should call custom serializers", ->
      Resource = new $resource(
        url: "/path"
        serializers: ["fooSerializer"]
      )

      $httpBackend.expect("POST", "/path", foo: { bar: 'baz' }).respond('')
      resource = new Resource(bar: "baz")
      resource.$save()

    it "should not call serializers on class methods", ->
      Resource = new $resource("/path")
      $httpBackend.expect("POST", "/path", bar: 'baz').respond('')
      Resource.create({}, bar: 'baz')

    it "should allow function interceptors", ->
      worker = sinon.spy()
      interceptor = ->
        worker

      Resource = new $resource(
        url: "/path",
        serializers: [interceptor]
      )

      $httpBackend.expect("POST", "/path").respond('')
      resource = new Resource(foo: 'bar')
      resource.$save()
      worker.calledOnce.should.be.true
      worker.firstCall.args[0].should.eql foo: 'bar'
      worker.firstCall.args[1].should.equal Resource.config

    it "should give interceptors access to config", ->
      Resource = new $resource(
        url: "/path"
        serializers: ["nameSerializer"],
        name: "foobar"
      )

      $httpBackend.expect("POST", "/path", foobar: { bar: 'baz' }).respond('')
      resource = new Resource(bar: "baz")
      resource.$save()

    it "should call deserializers on class methods", (done) ->
      Resource = new $resource(
        url: "/path/:id",
        params: { id: '@id' }
        deserializers: ['nameDeserializer'],
        name: 'foobar'
      )
      $httpBackend.expect('GET', '/path/1').respond(foobar: { kung: 'pow' })
      Resource.get(id: 1).then (response) ->
        response.should.eql kung: 'pow'
        done()

      $httpBackend.flush()
