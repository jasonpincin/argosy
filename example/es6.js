var http    = require('http'),
    query   = require('querystring').stringify,
    request = require('request-promise'),
    co      = require('co'),
    argosy  = require('..')

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
weatherRequest.process(co.wrap(function* ({ location: q, units = 'imperial' }) {
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
