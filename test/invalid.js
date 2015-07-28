var test   = require('tape'),
    argosy = require('..')

test('invalid message', function (t) {
    t.plan(3)

    var service = argosy()
    service.on('data', function (chunk) {
        var msg = JSON.parse(chunk)
        if (msg.type !== 'response') return
        t.deepEqual(msg.headers.client, { id: 1, request: 10 }, 'should produce a msg with matching client header')
        t.ok(msg.error && msg.error.message, 'should have an error property')
        t.ok(msg.error.message.match(/^not implemented/), 'should produce an error message containing "not implemented"')
    })
    service.write(JSON.stringify({ type: 'request', headers: { client: { id: 1, request: 10 } }, body: { argosy: 'bad' } }) + '\n')
})
