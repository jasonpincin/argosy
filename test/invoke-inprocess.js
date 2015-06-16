var test   = require('tape'),
    argosy = require('..')(),
    match  = require('argosy-pattern/match')

argosy.accept({ get: 'random-number', min: match.number, max: match.number }).process(function (msg, cb) {
    cb(null, parseInt(msg.min + (Math.random(msg.max - msg.min) * (msg.max - msg.min + 1) )))
})
argosy.accept({ make: 'error' }).process(function (msg, cb) {
    cb(new Error('It broke'))
})

test('invoke', function (t) {
    t.plan(5)

    argosy.invoke({ get: 'random-number', min: 1, max: 10 }, function (err, result) {
        t.false(err, 'function when called should not produce error')
        t.ok(result >= 1 && result <= 10, 'function should produce result between 1 and 10: ' + result)
    })

    argosy.invoke({ make: 'error' }, function (err) {
        t.true(err, 'on error supplies cb error')
    })

    argosy.invoke({ get: 'random-number', min: 1, max: 10 }).then(function (result) {
        t.ok(result >= 1 && result <= 10, 'returns and resolves promises')
    })

    argosy.invoke({ make: 'error' }).catch(function (err) {
        t.true(err, 'returns and rejects promise on error')
    })
})
