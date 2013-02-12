'use strict';

describe "Resource", ->
  $httpBackend = $resource = $rootScope = undefined

  beforeEach module 'ngxResource'

  beforeEach inject ($injector) ->
    $httpBackend = $injector.get('$httpBackend')
    $resource = $injector.get('$resource')
    $rootScope = $injector.get('$rootScope')

  context "creating and reading resource", ->
    Resource = undefined
    beforeEach ->
      Resource = $resource(
        url: '/path/:id',
        params: { id: '@id' }
      )

    it "should have default methods", ->
      resource = new Resource('/path')
      angular.forEach ['get', 'update', 'create', 'save', 'query', 'remove'], (action) ->
        Resource[action].should.be.a 'function'
        resource["$#{action}"].should.be.a 'function'

    it "should build a resource from a url", ->
      $httpBackend.expect('GET', '/path/1').respond('')
      Resource = $resource('/path/:id')
      Resource.get id: 1

    it "should fetch a resource", (done) ->
      $httpBackend.expect('GET', '/path/5').respond(id: 5, foo: 'bar')
      resource = Resource.get(id: 5)
      resource.should.not.be.undefined
      resource.then (response) ->
        response.should.be.an.instanceof Resource
        response.id.should.equal 5
        response.foo.should.equal 'bar'
        done()

      $httpBackend.flush()

    it "should handle failure", (done) ->
      $httpBackend.expect('GET', '/path').respond(403, '')

      Resource.get().then(null, ->
        # TODO make sure this receives the http response object
        done()
      )

      $httpBackend.flush()

    it "should fetch a collection", (done) ->
      $httpBackend.expect('GET', '/path').respond([{ id: 1, foo: 'bar'}, { id: 2, foo: 'baz' }])
      resource = Resource.query()
      resource.then (response) ->
        response.should.be.an.instanceof Array
        response[0].should.be.an.instanceof Resource
        response.length.should.equal 2
        response[0].id.should.equal 1
        response[1].foo.should.equal 'baz'
        done()

      $httpBackend.flush()

  context "saving and updating a resource", ->
    initialData = { id: 1, foo: 'bar' }
    updatedData = { id: 1, foo: 'baz' }
    resource = undefined
    Resource = undefined

    beforeEach ->
      Resource = $resource(
        url: '/path/:id',
        params: { id: '@id' }
      )
      resource = new Resource initialData

    it "should make the request with correct data", ->
      $httpBackend.expect('POST', '/path/1', angular.toJson(initialData)).respond()
      resource.$save()

    it "should update with data from server", (done) ->
      $httpBackend.expect('POST', '/path/1', angular.toJson(initialData)).respond(updatedData)
      resource.$save().then () ->
        resource.foo.should.equal 'baz'
        done()

      $httpBackend.flush()

    it "should not mutate object if no data is returned by server", (done) ->
      $httpBackend.expect('POST', '/path/1', angular.toJson(initialData)).respond()
      resource.$save().then ->
        resource.foo.should.equal 'bar'
        done()

      $httpBackend.flush()

  it "should correctly overwrite params", ->
    Resource = $resource(
      url: '/path/:foo',
      params: { foo: 'bar' },
      actions:
        test: { method: 'GET' }
        testBaz: { method: 'GET', params: { foo: 'baz' } }
    )

    $httpBackend.expect('GET', '/path/bar').respond('')
    Resource.test()

    $httpBackend.expect('GET', '/path/bat').respond('')
    Resource.test(foo: 'bat')

    $httpBackend.expect('GET', '/path/baz').respond('')
    Resource.testBaz()

    $httpBackend.expect('GET', '/path/bat').respond('')
    Resource.testBaz(foo: 'bat')


  it "should send custom headers", ->
    Resource = $resource(
      url:'/path/:foo',
      actions:
        conditionalPut: { method: 'PUT', headers: { 'If-None-Match': '*' } }
    )

    $httpBackend.expect('PUT', '/path/bar', undefined, (headers) ->
      headers['If-None-Match'] == "*"
    ).respond();

    Resource.conditionalPut( foo: 'bar' );

  it 'should not pass default params between actions', ->
    Resource = $resource(
      url: '/path',
      params: {},
      actions:
        get: { method: 'GET', params: { foo: 'bar' } },
        perform: { method: 'GET' }
    )
    $httpBackend.expect('GET', '/path?foo=bar').respond('')
    $httpBackend.expect('GET', '/path').respond('')

    Resource.get()
    Resource.perform()

  it "should allow custom actions to have default parameters", ->
    Resource = $resource(
      url: "/path/:id/:action",
      params:
        id: '@id'
      actions:
        test: { method: 'PUT', params: { action: 'test' } }
    )

    $httpBackend.expect('PUT', '/path/test').respond('')
    Resource.test()

    $httpBackend.expect('PUT', '/path/2/test').respond('')
    resource = new Resource(id: 2)
    resource.$test()
