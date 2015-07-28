var net    = require('net'),
    test   = require('tape'),
    argosy = require('..')

var service = argosy()
var client = argosy()
client.pipe(service).pipe(client)

service.accept({ make: 'error' }).process(function (msg, cb) {
    cb(new Error('It broke'))
})
service.accept({ make: 'nestedError' }).process(function (msg, cb) {
    client.invoke({ make: 'error' }, cb)
})

var server = net.createServer(function (c) {
    c.pipe(service).pipe(c)
})

test('start server', function (t) {
    server.listen(0, t.end.bind(t))
})

test('remote socket service generating errors error', function (t) {
    t.plan(2)
    t.timeoutAfter(2000)

    var myclient = argosy()
    var socket = net.createConnection(server.address(), function () {
        myclient.pipe(socket).pipe(myclient)

        myclient.invoke({ make: 'error' }).catch(function (err) {
            t.ok(err.message && err.stack, 'should result in error for invoke')
            t.ok(err.remoteStack, 'should include remoteStack')
            setTimeout(socket.end.bind(socket), 200)
        })
    })
})

test('remote socket service (nested) generating errors error', function (t) {
    t.plan(2)
    t.timeoutAfter(2000)

    var myclient = argosy()
    var socket = net.createConnection(server.address(), function () {
        myclient.pipe(socket).pipe(myclient)

        myclient.invoke({ make: 'nestedError' }).catch(function (err) {
            t.ok(err.message && err.stack, 'should result in error for invoke')
            t.ok(err.remoteStack, 'should include remoteStack')
            setTimeout(socket.end.bind(socket), 200)
        })
    })
})

test('stop server', function (t) {
    server.close(t.end.bind(t))
})
