var http    = require('http'),
    query   = require('querystring'),
    argosy  = require('..')

// create an endpoint
var service = argosy()
// create a client
var client = argosy()
// connect the client to the service
client.pipe(service).pipe(client)

// create a service queue of requests for weather
var weatherRequest = service.accept({
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
    if (err) return console.error(err)
    console.log(weather.temp + ' degrees (F) in Boston.')
})

// or create a convenience function using invoke.partial
var getWeather = client.invoke.partial({ get: 'weather', units: 'metric' })

getWeather({ location: 'Dublin,IE' }, function (err, weather) {
    if (err) return console.error(err)
    console.log(weather.temp + ' degrees (C) in Dublin.')
})

// or use promises
getWeather({ location: 'London,UK' }).then(function (weather) {
    console.log(weather.temp + ' degrees (C) in London.')
})
