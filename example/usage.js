var argosy  = require('..'),
    client  = argosy.client(),
    service = argosy.service(),
    match   = argosy.pattern.match
client.pipe(service).pipe(client)

// set up a simple service
service.message({ get: 'random-number', min: match.number, max: match.number }).process(function (msg, cb) {
    cb(null, parseInt(msg.min + (Math.random(msg.max - msg.min) * (msg.max - msg.min + 1) )))
})

// create a conveniently callable function
var random = client.invoke.partial({ get: 'random-number' })

// call (potentially remote) micro-service
random({ min: 1, max: 10 }, function (err, result) {
    console.log(result)
})
