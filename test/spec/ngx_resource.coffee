'use strict';

describe "Resource", ->
  $resource = $httpBackend = undefined
  Resource = null
  data = [{ id: 1, foo: 'bar' }, { id: 2, foo: 'baz' }]

  beforeEach module('ngxResource')

  beforeEach inject ($injector) ->
    $httpBackend = $injector.get('$httpBackend')
    $resource = $injector.get('$resource')


  afterEach ->
    $httpBackend.verifyNoOutstandingExpectation()

  describe "basic usage", ->
    beforeEach ->
      Resource = $resource(
        url: '/path/:id',
        params: { id: '@id' }
      )

    it "should have default methods", ->
      r = new Resource
      angular.forEach ['get', 'update', 'save', 'query', 'remove'], (action) ->
        Resource[action].should.be.a 'function'
        r["$#{action}"].should.be.a 'function'

    it "should build a resource from a url", ->
      $httpBackend.expect('GET', '/path/1').respond(data[0])
      Resource = $resource('/path/:id')
      resource = Resource.get(params: { id: 1 })
      resource.should.be.instanceof Resource

    it "should fetch a resource", ->
      $httpBackend.expect('GET', '/path/1').respond(data[0])
      resource = Resource.get(params: { id: 1 })
      resource.should.be.instanceof Resource
      expect(resource.id).to.be.undefined
      $httpBackend.flush()
      resource.id.should.equal 1

    it "should fetch a collection", ->
      $httpBackend.expect('GET', '/path').respond(data)
      resource = Resource.query()
      resource.should.eql []
      $httpBackend.flush()
      resource.length.should.equal 2
      resource.should.eql data

    context "saving/updating a resource", ->
      initialData = { id: 1, foo: 'bar' }
      updatedData = { id: 1, foo: 'baz' }
      resource = null

      beforeEach ->
        resource = new Resource initialData

      it "should make the request with correct data", ->
        $httpBackend.expect('POST', '/path/1', angular.toJson(initialData)).respond()
        resource.$save()

      it "should update with data from server", ->
        $httpBackend.expect('POST', '/path/1', angular.toJson(initialData)).respond(updatedData)
        resource.$save()
        $httpBackend.flush()
        resource.foo.should.equal 'baz'

      it "should not mutate object if no data is returned by server", ->
        $httpBackend.expect('POST', '/path/1', angular.toJson(initialData)).respond('')
        resource.$save()
        $httpBackend.flush()
        resource.foo.should.equal 'bar'

  describe "core features", ->
    beforeEach ->
      Resource = $resource(
        url: '/path/:id'
        params:
          id: '@id'
        actions:
          search:
            method: 'GET'
            collection: true
          find:
            method: 'GET'
          purge:
            method: 'GET'
            body: true
      )

    it "should send custom headers", ->
      Resource = $resource(
        url:'/path/:id',
        actions:
          conditionalPut: { method: 'PUT', headers: { 'If-None-Match': '*' } }
      )

      $httpBackend.expectPUT('/path/123', undefined, (headers) ->
        headers['If-None-Match'] == "*"
      ).respond(id: 123);

      Resource.conditionalPut( params: { id: 123 });


    it "should allow actions to have body", ->
      data = { id: 1, foo: 'bar' }
      $httpBackend.expect('GET', '/path/1', angular.toJson(data)).respond('')
      resource = new Resource(id: 1)
      resource.foo = 'bar'
      resource.$purge()

    it 'should not pass default params between actions', ->
      R = $resource(
        url: '/path',
        params: {},
        actions:
          get: { method: 'GET', params: { objId: '1' } },
          perform: { method: 'GET' }
      )
      $httpBackend.expect('GET', '/path?objId=1').respond('')
      $httpBackend.expect('GET', '/path').respond('')

      R.get()
      R.perform()

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
      Resource.test(params: { foo: 'bat' })

      $httpBackend.expect('GET', '/path/baz').respond('')
      Resource.testBaz()

      $httpBackend.expect('GET', '/path/bat').respond('')
      Resource.testBaz(params: { foo: 'bat' })


    it "should allow custom serializer", ->
      data = { id: 1, foo: 'bar' }
      $httpBackend.expect('POST', '/path', angular.toJson(data)).respond('')
      Resource = $resource(
        url: '/path'
        serializer: (obj) ->
          { id: obj.id, foo: obj.bar }
      )

      resource = new Resource id: 1, bar: 'bar'
      resource.$save()

    it "should allow custom deserializer", ->
      Resource = $resource(
        url: '/path'
        deserializer: (data, options) ->
          return { id: data.id, foo: data.bar }
      )

      resource = new Resource(id: 1, bar: 'bar')
      resource.foo.should.eql('bar')
