var test   = require('tape'),
    argosy = require('..'),
    pattern = require('argosy-pattern'),
    match  = require('argosy-pattern/match')

test('serviceAdded (no subscribe)', function (t) {
    t.plan(1)

    var client = argosy()
    var server = argosy()
    client.pipe(server).pipe(client)

    client.serviceAdded(function (svc) {
        t.deepEqual(svc.pattern, pattern({ greetings: match.string }), 'Produces notice upon local adding a service')
    })
    server.accept({ greetings: match.string })
    client.accept({ greetings: match.string })
})

test('serviceAdded (while subscribed to services)', function (t) {
    t.plan(4)

    var client = argosy()
    var server = argosy()
    client.pipe(server).pipe(client)
    client.subscribeRemote(['services'], function (err) {
        t.false(err, 'should not receive error on subscribe')
        server.accept({ greetings: match.string })
        client.accept({ greetings: match.string })
    })

    client.serviceAdded(function (svc) {
        t.deepEqual(svc.pattern, pattern({ greetings: match.string }), 'Produces notice upon local adding a service')
    })
    server.serviceAdded(function (svc) {
        t.deepEqual(svc.pattern, pattern({ greetings: match.string }), 'Produces notice upon local adding a service')
    })
})
