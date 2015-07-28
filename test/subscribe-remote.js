var test   = require('tape'),
    argosy = require('..'),
    match  = require('argosy-pattern/match')

test('subscribeRemote []', function (t) {
    t.plan(2)

    var client = argosy()
    var server = argosy()
    client.pipe(server).pipe(client)
    server.accept({ hello: match.string })

    client.subscribeRemote([], function (err, synced) {
        t.false(err, 'subscribeRemote should not result in error')
        t.equal(typeof synced.services, 'undefined', 'services is undefined')
    })
})

test('subscribeRemote ["services"]', function (t) {
    t.plan(2)

    var client = argosy()
    var server = argosy()
    client.pipe(server).pipe(client)
    server.accept({ hello: match.string })

    client.subscribeRemote(['services'], function (err, synced) {
        t.false(err, 'subscribeRemote should not result in error')
        t.equal(synced.services, 1, 'services is 1')
    })
})
