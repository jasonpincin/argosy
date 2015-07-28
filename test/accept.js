var test   = require('tape'),
    argosy = require('..'),
    match  = require('argosy-pattern/match')

test('accept(pattern)', function (t) {
    t.plan(4)

    var service = argosy()

    var helloWorld = service.accept({ hello: 'world' })
    t.ok(helloWorld.process, 'should return a queue')

    var msg = { type: 'request', headers: { client: { id: 1, request: 10 } }, body: { hello: 'world' } }
    service.write(JSON.stringify(msg) + '\n')
    service.on('data', function (chunk) {
        var data = JSON.parse(chunk)
        if (data.type !== 'response') return
        t.deepEqual(msg.headers.client, { id: 1, request: 10 }, 'should produce a msg with matching client header')
        t.equal(data.body.hello, 'WORLD', 'msg should be streamed after process calls callback')
    })
    helloWorld.process(function (_msg, cb) {
        t.deepEqual(_msg, msg.body, 'queue processor should be called with accept')
        cb(null, { hello: _msg.hello.toUpperCase() })
    })
})

test('accept(nested pattern)', function (t) {
    t.plan(1)

    var service = argosy()

    var nested = service.accept({'nested.accept': match.string})
    var msg = { type: 'request', headers: { client: { id: 1, request: 10 } }, body: { nested: {accept: 'go'} } }
    nested.process(function (_msg, cb) {
        t.deepEqual(_msg, msg.body, 'queue processor should be called for nested accept')
        cb()
    })
    service.write(JSON.stringify({ type: 'request', headers: { client: { id: 1, request: 10}}, body: { nested: { accept: 42} } }) + '\n')
    service.write(JSON.stringify(msg) + '\n')
})

test('accept anything', function (t) {
    t.plan(2)

    var service = argosy()

    var helloWorld = service.accept({})

    service.write(JSON.stringify({ type: 'request', headers: { client: { id: 1, request: 10 } }, body: { hello: 'world' } }) + '\n')
    service.write(JSON.stringify({ type: 'request', headers: { client: { id: 1, request: 11 } }, body: { greetings: 'world' } }) + '\n')
    service.on('data', function (chunk) {
        var msg = JSON.parse(chunk)
        if (msg.type !== 'response') return
        t.equal(msg.body.hello, 'WORLD', 'should get expected response regardless of message sent')
    })
    helloWorld.process(function (_msg, cb) {
        cb(null, { hello: 'WORLD' })
    })
})
