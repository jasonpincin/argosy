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
