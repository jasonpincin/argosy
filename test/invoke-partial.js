var test   = require('tape'),
    argosy = require('..'),
    match  = require('argosy-pattern/match')

var service = argosy()
service.accept({ get: 'random-number', min: match.number, max: match.number }).process(function (msg, cb) {
    cb(null, parseInt(msg.min + Math.random(msg.max - msg.min)))
})

test('invoke-partial', function (t) {
    t.plan(5)

    var client = argosy()
    client.pipe(service).pipe(client)

    var random = client.invoke.partial({ get: 'random-number' })
    t.equal(typeof random, 'function', 'should return a function')

    random({ min: 1, max: 10 }, function (err, result) {
        t.false(err, 'function when called should not produce error')
        t.ok(result >= 1 && result <= 10, 'function should produce result between 1 and 10: ' + result)
    })

    var random5 = client.invoke.partial({ get: 'random-number', min: 1, max: 5 })
    random5(function (err, result) {
        t.false(err, 'function when called should not produce error')
        t.ok(result >= 1 && result <= 5, 'function should not require a match object')
    })
})
