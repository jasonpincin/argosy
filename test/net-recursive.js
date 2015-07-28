var net    = require('net'),
    test   = require('tape'),
    argosy = require('..'),
    match  = require('argosy-pattern/match')

var service = argosy()
var client = argosy()
client.pipe(service).pipe(client)

service.accept({ square: match.number }).process(function (msg, cb) {
    client.invoke({ multiply: [msg.square, msg.square] }, cb)
})
service.accept({ multiply: match.array }).process(function (msg, cb) {
    cb(null, msg.multiply.reduce(function (a, b) {
        return a * b
    }))
})

var server = net.createServer(function (c) {
    c.pipe(service).pipe(c)
})

test('start server', function (t) {
    server.listen(0, t.end.bind(t))
})

test('invoke square over net with sub-invocations', function (t) {
    t.plan(1)
    t.timeoutAfter(2000)

    var myclient = argosy()
    var socket = net.createConnection(server.address(), function () {
        myclient.pipe(socket).pipe(myclient)

        myclient.invoke({ square: 4 }).then(function (result) {
            t.equals(result, 16, 'tells us square of 4 is 16')
            setTimeout(socket.end.bind(socket), 200)
        }).catch(t.error.bind(t))
    })
})

test('stop server', function (t) {
    server.close(t.end.bind(t))
})
