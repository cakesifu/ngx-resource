describe "Resource", ->
  context "config", ->
    $resource = $httpBackend = $rootScope = undefined

    afterEach ->
      $httpBackend.verifyNoOutstandingExpectation()

    beforeEach module 'ngxResource', ($resourceProvider) ->
      $resourceProvider.config.foo = 'default'
      $resourceProvider.config.bar = 'default'
      $resourceProvider.config.headers = {
        defaultHeader: 'default'
      }
      $resourceProvider.config.serializers = ['default']
      $resourceProvider.config.deserializers = ['default']
      return


    beforeEach inject ($injector) ->
      $httpBackend = $injector.get('$httpBackend')
      $resource = $injector.get('$resource')
      $rootScope = $injector.get('$rootScope')

      @Resource = new $resource(
        actions:
          foo: { method: 'GET' }
        serializers: ['bar'],
        foo: 'bar'
      )

    it "should extend default config", ->
      @Resource.config.foo.should.equal 'bar'
      @Resource.config.bar.should.equal 'default'

    it "should extend actions", ->
      @Resource.config.actions.foo.should.eql method: 'GET'

    it "should overwrite headers", ->
      Resource = new $resource(headers: { foo: 'bar' })
      Resource.config.headers.foo.should.equal 'bar'
      expect(Resource.config.headers.defaultHeader).to.be.undefined

    it "should add extra headers", ->
      Resource = new $resource(extraHeaders: { foo: 'bar' })
      Resource.config.headers.foo.should.equal 'bar'
      Resource.config.headers.defaultHeader.should.equal 'default'

    it "should behave as expected when providing both headers and extraHeaders", ->
      Resource = new $resource(headers: { foo: 'bar' }, extraHeaders: { bar: 'baz' })
      Resource.config.headers.foo.should.equal 'bar'
      Resource.config.headers.bar.should.equal 'baz'
      expect(Resource.config.headers.defaultHeaders).to.be.undefined

    it "should overwrite serializers and deserializers", ->
      @Resource.config.serializers.should.eql ['bar']
      @Resource.config.deserializers.should.eql ['default']
