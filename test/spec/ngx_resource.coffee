'use strict';

describe "Resource", ->
  $resource = $httpBackend = undefined

  beforeEach module('ngxResource')

  beforeEach inject ($injector) ->
    $httpBackend = $injector.get('$httpBackend')
    $resource = $injector.get('$resource')


  afterEach ->
    $httpBackend.verifyNoOutstandingExpectation()

  describe "core features", ->
    Resource = undefined
    data = [{ id: 1 }, { id: 2 }]

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

    it "should respect action body property", ->
      data = { id: 1, foo: 'bar' }
      $httpBackend.expect('GET', '/path/1', angular.toJson(data)).respond('')
      resource = new Resource(id: 1)
      resource.foo = 'bar'
      resource.$purge()

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
