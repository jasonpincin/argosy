# argosy

[![NPM version](https://badge.fury.io/js/argosy.png)](http://badge.fury.io/js/argosy)
[![Build Status](https://travis-ci.org/jasonpincin/argosy.svg?branch=master)](https://travis-ci.org/jasonpincin/argosy)
[![Coverage Status](https://coveralls.io/repos/jasonpincin/argosy/badge.png?branch=master)](https://coveralls.io/r/jasonpincin/argosy?branch=master)

A modular, pipable, micro-service framework.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [motivation](#motivation)
- [example](#example)
  - [es5](#es5)
  - [es6+](#es6)
- [api](#api)
  - [service = argosy.service()](#service--argosyservice)
    - [queue = service.message(pattern)](#queue--servicemessagepattern)
  - [client = argosy.client()](#client--argosyclient)
    - [client.invoke(msg [, cb])](#clientinvokemsg--cb)
    - [client.invoke.partial(partialMsg)](#clientinvokepartialpartialmsg)
  - [pattern = argosy.pattern(object)](#pattern--argosypatternobject)
    - [pattern.matches(object)](#patternmatchesobject)
    - [argosy.pattern.match](#argosypatternmatch)
- [testing](#testing)
- [coverage](#coverage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## motivation

Why a framework? After building micro-services a wide variety of ways over a number of years, in small organizations and large, I wanted to 
standardize the approach, and bring together all the lessons learned. Argosy draws inspiration from many sources 
including a smorgasbord of systems (I've used in other micro-service projects) such as [RabbitMQ](http://www.rabbitmq.com) and  
[Zookeeper](http://zookeeper.apache.org), as well as other node libraries including but not limited to 
[dnode](https://github.com/substack/dnode) and [rpc-stream](https://github.com/dominictarr/rpc-stream). Argosy shares some 
commonalities with [seneca](https://github.com/rjrodger/seneca) as well. 

Like the micro-service model, Argosy is a collection of [small modules](https://github.com/search?q=user%3Ajasonpincin+argosy). 
Instead of a plugin model, these components are streams, designed to be connected together via pipes. Extending Argosy is a 
matter of manipulating the stream.

## example

### es5

```javascript
var http    = require('http'),
    query   = require('querystring'),
    argosy  = require('argosy')

// create a service
var service = argosy.service()
// create a client
var client = argosy.client()
// connect the client to the service
client.pipe(service).pipe(client)

// create a service queue of requests for weather
var weatherRequest = service.message({
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

// use the service with argosy-client
client.invoke({ get: 'weather', location: 'Boston,MA' }, function (err, weather) {
    console.log(weather.temp + ' degrees (F) in Boston.')
})

// or create a convenience function using invoke.partial
var getWeather = client.invoke.partial({ get: 'weather', units: 'metric' })

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
    argosy  = require('argosy')

// create a service
var service = argosy.service()
// create a client
var client = argosy.client()
// connect the client to the service
client.pipe(service).pipe(client)

// create a service queue of requests for weather
var weatherRequest = service.message({
    get: 'weather',
    location: argosy.pattern.match.defined
})

// process the requests for weather
var weatherUrl = 'http://api.openweathermap.org/data/2.5/weather?'
weatherRequest.process(co.wrap(function* ({ location:q, units='imperial' }) {
    var weather = yield request.get(weatherUrl + query({ q, units }))
    return JSON.parse(weather).main
}))

// now use the argosy client to interact with out service
// we can create a convenience function with invoke.partial
var getWeather = client.invoke.partial({ get: 'weather', units: 'metric' })

co(function* () {
    // use client.invoke directly
    var boston = yield client.invoke({ get: 'weather', location: 'Boston,MA' })

    // or use our shiny new convenient function
    var dublin = yield getWeather({ location: 'Dublin,IE' })
    var london = yield getWeather({ location: 'London,UK' })

    console.log(boston.temp + ' degrees (F) in Boston.')
    console.log(dublin.temp + ' degrees (C) in Dublin.')
    console.log(london.temp + ' degrees (C) in London.\n')
})
```

## api

```javascript
var argosy = require('argosy')
```

### service = argosy.service()

See also [argosy-service](https://github.com/jasonpincin/argosy-service).

Create a new service object. The `service` object is a stream intended to be connected (piped) to Argosy clients 
through any number of intermediary streams. 

#### queue = service.message(pattern)

Create a [concurrent-queue](https://github.com/jasonpincin/concurrent-queue) that will be pushed messages that 
match the `pattern` object provided (see [argosy-pattern](https://github.com/jasonpincin/argosy-pattern) for details on 
defining patterns). These messages should be processed and responded to using the `process` function of the `queue`. 
Responses will be sent to the connected/requesting client.

It is advised not to match the key `argosy` as this is reserved for internal use. 

### client = argosy.client()

See also [argosy-client](https://github.com/jasonpincin/argosy-client).

Create a new client object. The `client` object is a stream intended to be connected (piped) to Argosy services
through any number of intermediary streams.

#### client.invoke(msg [, cb])

Invoke a service which implements the `msg` [pattern](https://github.com/jasonpincin/argosy-pattern#argosy-pattern). Upon 
completion, the callback `cb`, if supplied, will be called with the result or error. The `client.invoke` function also 
returns a promise which will resolve or reject appropriately. 

#### client.invoke.partial(partialMsg)

Return a function that represents a partial invocation. The function returned has the same signature as `client.invoke`, but 
when called, the `msg` parameter will be merged with the `partialMsg` parameter provided at the time the function was created. 
Otherwise, the generated function behaves identically to `client.invoke`.

### pattern = argosy.pattern(object)

See also [argosy-pattern](https://github.com/jasonpincin/argosy-pattern).

Create an Argosy pattern, given an object containing rules. Each key in the object represents a key 
that is to be validated in compared message objects. These keys will be tested to have the same literal 
value, matching regular expression, or to be of a given type using the matching system described below. 
Nested keys may be matched using the dot notation. For example, `{'message.count':1}` equates to 
`{message: {count: 1}}`.

#### pattern.matches(object)

Returns true of the given object matches the pattern, or false otherwise. 

#### argosy.pattern.match

Argosy patterns support more than literal values. The values of the pattern keys may be any of the following in 
addition to literal values:

* A regular expression - values will be tested against the regular expression to determine a match
* `argosy.pattern.match.number` - matches any number
* `argosy.pattern.match.string` - matches any string
* `argosy.pattern.match.bool` - matches `true` or `false`
* `argosy.pattern.match.array` - matches any array
* `argosy.pattern.match.object` - matches any truthy object
* `argosy.pattern.match.defined` - matches anything other than `undefined`
* `argosy.pattern.match.undefined` - matches `undefined` or missing key


## testing

`npm test [--dot | --spec] [--grep=pattern]`

Specifying `--dot` or `--spec` will change the output from the default TAP style. 
Specifying `--grep` will only run the test files that match the given pattern.

## coverage

`npm run coverage [--html]`

This will output a textual coverage report. Including `--html` will also open 
an HTML coverage report in the default browser.
