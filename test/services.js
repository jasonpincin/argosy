var test   = require('tape'),
    argosy = require('..'),
    pattern = require('argosy-pattern'),
    match  = require('argosy-pattern/match')

test('services', function (t) {
    t.plan(2)

    var client = argosy()
    var server = argosy()
    client.pipe(server).pipe(client)

    server.accept({ hello: match.string })
    client.accept({ greetings: match.string })

    t.deepEqual(client.services, [{ local: true, provider: { id: client.id }, pattern: pattern({ greetings: match.string }) }], 'client has one svc')
    t.deepEqual(server.services, [{ local: true, provider: { id: server.id }, pattern: pattern({ hello: match.string }) }], 'server has one svc')
})

test('services (while subscribed to services)', function (t) {
    t.plan(3)

    var client = argosy()
    var server = argosy()
    client.pipe(server).pipe(client)

    server.accept({ hello: match.string })
    client.accept({ greetings: match.string })

    client.subscribeRemote(['services'], function (err) {
        t.false(err, 'should not receive error on subscribe')
        t.deepEqual(client.services, [
            { local: true, provider: { id: client.id }, pattern: pattern({ greetings: match.string }) },
            { remote: true, provider: { id: server.id }, pattern: pattern({ hello: match.string }) }
        ], 'client has two svcs after sync')
        t.deepEqual(server.services, [{ local: true, provider: { id: server.id }, pattern: pattern({ hello: match.string }) }], 'server has one svc after sync')
    })
})
