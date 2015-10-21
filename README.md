![argosy logo](http://argosy.io/assets/images/argosy-logo-final-smaller.png)

[![NPM version](https://badge.fury.io/js/argosy.png)](http://badge.fury.io/js/argosy)
[![Build Status](https://travis-ci.org/jasonpincin/argosy.svg?branch=master)](https://travis-ci.org/jasonpincin/argosy)
[![Coverage Status](https://coveralls.io/repos/jasonpincin/argosy/badge.png?branch=master)](https://coveralls.io/r/jasonpincin/argosy?branch=master)
[![Sauce Test Status](https://saucelabs.com/browser-matrix/jp-argosy.svg)](https://saucelabs.com/u/jp-argosy)

A modular, pipe-able, micro-service framework.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [motivation](#motivation)
- [example](#example)
  - [es5](#es5)
  - [es6+](#es6)
- [api](#api)
  - [queue = argosy.accept(pattern)](#queue--argosyacceptpattern)
  - [queue.process([opts,] func)](#queueprocessopts-func)
  - [argosy.invoke(msg [, cb])](#argosyinvokemsg--cb)
  - [func = argosy.invoke.partial(partialMsg)](#func--argosyinvokepartialpartialmsg)
  - [argosy.subscribeRemote(subscriptions [, cb])](#argosysubscriberemotesubscriptions--cb)
  - [events](#events)
    - [serviceAdded](#serviceadded)
    - [localServiceAdded](#localserviceadded)
    - [remoteServiceAdded](#remoteserviceadded)
    - [synced](#synced)
  - [pattern = argosy.pattern(object)](#pattern--argosypatternobject)
  - [pattern.matches(object)](#patternmatchesobject)
  - [argosy.pattern.match](#argosypatternmatch)
  - [connecting endpoints](#connecting-endpoints)
- [testing](#testing)
  - [browser test](#browser-test)
  - [coverage](#coverage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## motivation

Why a framework? After building micro-services a wide variety of ways over a number of years, in small organizations and large, I wanted to standardize the approach, and bring together all the lessons learned. Argosy draws inspiration from many sources including a smorgasbord of systems (I've used in other micro-service projects) such as [RabbitMQ](http://www.rabbitmq.com) and  [Zookeeper](http://zookeeper.apache.org), as well as other node libraries including but not limited to [dnode](https://github.com/substack/dnode), [rpc-stream](https://github.com/dominictarr/rpc-stream), and [seneca](https://github.com/rjrodger/seneca).

Like the micro-service model, the Argosy ecosystem consists of many small modules. These components are streams, designed to be connected together via pipes. Extending Argosy is a matter of manipulating the stream.

## example

### es5

```javascript
var http    = require('http'),
    query   = require('querystring'),
    argosy  = require('argosy')()

// create a service queue of requests for weather
var weatherRequest = argosy.accept({
    get: 'weather',
    location: argosy.pattern.match.defined
})

// process the requests for weather
weatherRequest.process(function (msg, cb) {
    var qs = query.stringify({ q: msg.location, units: msg.units || 'imperial' })
    http.get('http://api.openweathermap.org/data/2.5/weather?' + qs, function (res) {
        var body = ''
        res.on('data', function (data) {
            body += data
        }).on('end', function () {
            cb(null, JSON.parse(body).main)
        })
    })
})

// use the service
argosy.invoke({ get: 'weather', location: 'Boston,MA' }, function (err, weather) {
    console.log(weather.temp + ' degrees (F) in Boston.')
})

// or create a convenience function using invoke.partial
var getWeather = argosy.invoke.partial({ get: 'weather', units: 'metric' })

getWeather({ location: 'Dublin,IE' }, function (err, weather) {
    console.log(weather.temp + ' degrees (C) in Dublin.')
})

// or use promises
getWeather({ location: 'London,UK' }).then(function (weather) {
    console.log(weather.temp + ' degrees (C) in London.')
})
```

### es6+

```javascript
var http    = require('http'),
    query   = require('querystring').stringify,
    request = require('request-promise'),
    co      = require('co'),
    argosy  = require('..')()

// create a service queue of requests for weather
var weatherRequest = argosy.accept({
    get: 'weather',
    location: argosy.pattern.match.defined
})

// process the requests for weather
var weatherUrl = 'http://api.openweathermap.org/data/2.5/weather?'
weatherRequest.process(co.wrap(function* ({ location: q, units = 'imperial' }) {
    var weather = yield request.get(weatherUrl + query({ q, units }))
    return JSON.parse(weather).main
}))

// we can create a convenience function with invoke.partial
var getWeather = argosy.invoke.partial({ get: 'weather', units: 'metric' })

co(function* () {
    // use invoke directly
    var boston = yield argosy.invoke({ get: 'weather', location: 'Boston,MA' })

    // or use our shiny new convenient function
    var dublin = yield getWeather({ location: 'Dublin,IE' })
    var london = yield getWeather({ location: 'London,UK' })

    console.log(boston.temp + ' degrees (F) in Boston.')
    console.log(dublin.temp + ' degrees (C) in Dublin.')
    console.log(london.temp + ' degrees (C) in London.\n')
})
```

_Note: If your runtime doesn't offer generators or promises, you can still run the above example from the example directory via [babel](https://babeljs.io). Just do: `npm i -g babel && babel-node example/es6.js`_

## api

```javascript
// Create a new Argosy stream
var argosy = require('argosy')()
```

### queue = argosy.accept(pattern)

Create a [concurrent-queue](https://github.com/jasonpincin/concurrent-queue) that will be pushed messages that match the `pattern` object provided (see [argosy-pattern](https://github.com/jasonpincin/argosy-pattern) for details on defining patterns). These messages should be processed and responded to using the `process` function of the `queue`.  Responses will be sent to the requesting Argosy stream.

It is advised not to match the key `argosy` as this is reserved for internal use.

### queue.process([opts,] func)

Process messages. See [concurrent-queue](https://github.com/jasonpincin/concurrent-queue) for more information. The processor function `func` has a signature of `msg [, cb]`. The callback `cb` if provided should be executed with any applicable return value or error object (as 1st argument) for the invoking client, once the request has been completed. Alternatively, a promise may be returned from the processor function `func`, and its resolved value or rejected error will be returned to the invoking client.

### argosy.invoke(msg [, cb])

Invoke a service which implements the `msg` object [pattern](https://github.com/jasonpincin/argosy-pattern#argosy-pattern). Upon completion, the callback `cb`, if supplied, will be called with the result or error. The `argosy.invoke` function also returns a promise which will resolve or reject appropriately. If the `msg` matches one of the patterns implemented by the `argosy` endpoint performing the `invoke`, then the `invoke` request will be handled locally by the the Argosy stream `invoke` was called from, otherwise the `invoke` request will be written to the stream's output, and the stream's input will be monitored for a response.

### func = argosy.invoke.partial(partialMsg)

Return a function that represents a partial invocation. The function returned has the same signature as `argosy.invoke`, but when called, the `msg` object parameter will be merged with the `partialMsg` object parameter provided at the time the function was created.  Otherwise, the generated function behaves identically to `argosy.invoke`.

### argosy.subscribeRemote(subscriptions [, cb])

Accepts an array of strings, these strings are subscription topics. Valid subscription topics are:

* `services` - Be notified when the remote argosy endpoint adds a service.  All existing remote services will be sent immediately.

Also accepts an optional error-first callback, which will be invoked after the remote argosy endpoint has sent all existing services.

This function returns a promise.

### events

Argosy exposes the following [eventuates](https://github.com/jasonpincin/eventuate):

#### serviceAdded

Produces messages when any service is added to the `argosy` endpoint (local or remote). The structure of the message is:

```
{ 
    remote: true|false, 
    provider: { 
        id: uuid 
    }, 
    pattern: argosyPattern 
}
```

Where `argosyPattern` is an [argosy.pattern](#pattern--argosypatternobject)

#### localServiceAdded

Produces messages when a local service is added to the `argosy` endpoint. The structure of the message is:

```
    remote: false, 
    provider: { 
        id: uuid 
    }, 
    pattern: argosyPattern 
```

Where `argosyPattern` is an [argosy.pattern](#pattern--argosypatternobject)

#### remoteServiceAdded

Produces messages when a remote service is added to the `argosy` endpoint. The structure of the message is:

```
    remote: true, 
    provider: { 
        id: uuid 
    }, 
    pattern: argosyPattern 
```

#### synced

Produces messages when a remote service has advertised all subscribed resources to the local `argosy` endpoint.

```
    provider: { 
        id: uuid 
    },
    services: count
```

Where `services` is present only if the remote subscription includes "services".

### pattern = argosy.pattern(object)

See also [argosy-pattern](https://github.com/jasonpincin/argosy-pattern).

Create an Argosy pattern, given an object containing rules. Each key in the object represents a key that is to be validated in compared message objects. These keys will be tested to have the same literal value, matching regular expression, or to be of a given type using the matching system described below.  Nested keys may be matched using the dot notation. For example, `{'message.count':1}` equates to `{message: {count: 1}}`.

### pattern.matches(object)

Returns true of the given object matches the pattern, or false otherwise.

### argosy.pattern.match

Argosy patterns support more than literal values. The values of the pattern keys may be any of the following in addition to literal values:

* A regular expression - values will be tested against the regular expression to determine a match
* `argosy.pattern.match.number` - matches any number
* `argosy.pattern.match.string` - matches any string
* `argosy.pattern.match.bool` - matches `true` or `false`
* `argosy.pattern.match.array` - matches any array
* `argosy.pattern.match.object` - matches any truthy object
* `argosy.pattern.match.defined` - matches anything other than `undefined`
* `argosy.pattern.match.undefined` - matches `undefined` or missing key

### connecting endpoints

One Argosy stream may be connected to another by piping them together.

```
var argosy   = require('argosy'),
    service1 = argosy(),
    service2 = argosy()

service1.pipe(service2).pipe(service)
```

This will create a duplex connection between the two Argosy streams, and allow both to invoke implemented services via the other. For example:

```javascript
service1.accept({ get: 'random number' }).process(function (msg, cb) {
    // do something interesting
})

service2.accept({ get: 'random letter' }).process(function (msg, cb) {
    // do something interesting
})

service1.invoke({ get: 'random letter' }, function (err, letter) {
    // this works
})

service2.invoke({ get: 'random number' }, function (err, number) {
    // so does this
})
```

Argosy streams work in pairs. To connect more than two Argosy streams, take a
look at [Hansa](https://github.com/jasonpincin/hansa).

## testing

`npm test [--dot | --spec] [--phantom] [--grep=pattern]`

Specifying `--dot` or `--spec` will change the output from the default TAP style.
Specifying `--phantom` will cause the tests to run in the headless phantom browser instead of node.
Specifying `--grep` will only run the test files that match the given pattern.

### browser test

`npm run browser-test`

This will run the tests in all browsers (specified in .zuul.yml). Be sure to [educate zuul](https://github.com/defunctzombie/zuul/wiki/cloud-testing#2-educate-zuul) first.

### coverage

`npm run coverage [--html]`

This will output a textual coverage report. Including `--html` will also open
an HTML coverage report in the default browser.
