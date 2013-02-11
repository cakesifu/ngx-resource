'use strict';

describe "Resource", ->
  Route = undefined

  beforeEach module("ngxRoute")
  beforeEach inject ($injector) ->
    Route = $injector.get "Route"

  it "should create a route with empty parameters", ->
    route = new Route("/path")
    route.url().should.equal "/path"

  it "should accept parameters", ->
    route = new Route("/path/:foo")
    route.url(foo: 'foo').should.equal "/path/foo"

  it "should accept default parameters", ->
    route = new Route("/path/:foo/:bar", foo: 'foo')
    route.url().should.equal "/path/foo"
    route.url(bar: "bar").should.equal "/path/foo/bar"
    route.url(foo: "baz").should.equal "/path/baz"

  it "should only allow scalar values as segments", ->
    route = new Route("/path/:foo")
    route.url(foo: { bar: 'baz' }).should.equal "/path"

  it "should append unknown params as query string", ->
    route = new Route("/path/:foo")
    route.url(foo: 'foo', bar: 'baz').should.equal "/path/foo?bar=baz"

  it "should ignore slashes of undefined parameters", ->
    route = new Route("/path/:foo/:bar/:baz/pow")
    route.url().should.equal "/path/pow"
    route.url(bar: 'bar').should.equal "/path/bar/pow"

  it "should handle multiple parameters with the same name", ->
    route = new Route("/path/:foo/:foo")
    route.url().should.equal "/path"
    route.url(foo: "foo").should.equal "/path/foo/foo"

  it "should support escaping colons in url template", ->
    route = new Route("http://localhost\\:8080/path/:foo/\\:bar/:baz")
    route.url().should.equal "http://localhost:8080/path/:bar"
    route.url(baz: 'baz').should.equal "http://localhost:8080/path/:bar/baz"

  it "should correctly encode url params", ->
    route = new Route("/path/:foo")

    route.url(foo: "foo#1").should.equal "/path/foo%231"
    route.url(foo: "foo!@bar").should.equal "/path/foo!@bar"
    route.url(foo: "doh@fo o", "!do&h": "g=a h", ":bar": "$baz@1").should.equal "/path/doh@fo%20o?!do%26h=g%3Da+h&:bar=$baz@1"
    route.url(foo: "doh&foo", bar: 'baz&1').should.equal "/path/doh&foo?bar=baz%261"

  it "should correclty encode nested hash as param", ->
    route = new Route("/path");

    expectedUrl = "/path?foo%5Bbar%5D=bar&foo%5Bbaz%5D%5B%5D=b&foo%5Bbaz%5D%5B%5D=az&arr%5B%5D=2&arr%5B%5D=3&arr%5B%5D=4"
    route.url(foo: { bar: 'bar', baz: ['b', 'az'] }, arr: [2,3,4]).should.equal expectedUrl
