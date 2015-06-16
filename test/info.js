var test   = require('tape'),
    argosy = require('..')

test('argosy info message', function (t) {
    t.plan(3)

    var service = argosy()
    service.accept({test: /\d+/})
    service.on('data', function (chunk) {
        var msg = JSON.parse(chunk)
        if (msg.type !== 'response') return
        t.deepEqual(msg.headers.client, {id:1, request:10}, 'should produce a result with matching client header')
        t.equal(msg.body.id, service.id, 'should identify itself')
        t.deepEqual(msg.body.implemented, [{argosy:'info'}, {test:'/\\d+/'}], 'should reveal argosy:info and test:regexpString as implemented')
    })
    service.write(JSON.stringify({ type: 'request', headers: {client: {id:1, request:10}}, body: { argosy: 'info' } })+'\n')
})
