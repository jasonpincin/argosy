var cq        = require('concurrent-queue'),
    assign    = require('object-assign'),
    through2  = require('through2'),
    objectify = require('through2-objectify'),
    pipeline  = require('stream-combiner2'),
    split     = require('split2'),
    uuid      = require('uuid').v4,
    Promise   = require('promise-polyfill'),
    pattern   = require('argosy-pattern')

module.exports = function argosy () {
    var myid        = uuid(),
        requestId   = 0,
        implemented = [],
        outstanding = [],
        input       = split(),
        parse       = objectify(function (chunk, enc, cb) { cb(null, JSON.parse(chunk)) }),
        output      = objectify.deobj(function (msg, enc, cb) { cb(null, JSON.stringify(msg) + '\n') })

    var processMessage = through2.obj(function parse(msg, enc, cb) {
        switch (msg.type) {
            case 'request':
                queue(msg.body, function done (err, result) {
                    var reply = { type: 'response', headers: msg.headers, body: result }
                    if (err) reply.error = { message: err.message, stack: err.stack }
                    processMessage.push(reply)
                })
                break
            case 'response':
                outstanding.filter(function (pending) {
                    return (msg.headers.client.id === myid && pending.seq === msg.headers.client.seq)
                }).forEach(function (pending) {
                    if (msg.error) pending.reject(assign(new Error(msg.error.message), { remoteStack: msg.error.stack }))
                    else pending.resolve(msg.body)
                })
                break
        }
        cb()
    })

    var stream = assign(pipeline(input, parse, processMessage, output), { id: myid })

    stream.accept = function accept (rules) {
        var impl = { pattern: pattern(rules), queue: cq() }
        implemented.push(impl)
        output.write({type: 'notify-implemented', body: impl.pattern.encode() })
        return impl.queue
    }
    stream.invoke = function invoke (msgBody, cb) {
        var request = { type: 'request', headers: { client: { id: myid, seq: requestId++ } }, body: msgBody },
            cb      = cb || function () {}

        var done
        // if we implement it ourself, stay in-process
        if (implemented.length && implementations(msgBody).length) done = queue(msgBody)
        // otherwise, head out to sea
        else done = new Promise(function (resolve, reject) {
            outstanding.push({ seq: request.headers.client.seq, resolve: resolve, reject: reject })
            output.write(request)
        })
        done.then(function (body) {
            setImmediate(cb.bind(undefined, null, body))
        })
        done.catch(function (err) {
            setImmediate(cb.bind(undefined, err))
        })
        return done
    }
    stream.invoke.partial = function invokePartial (partialBody) {
        return function partialInvoke (msgBody, cb) {
            return stream.invoke(assign({}, partialBody, msgBody), cb)
        }
    }
    stream.pattern = pattern

    // default message pattern implementations
    stream.accept({argosy:'info'}).process(function onInfoRequest (msgBody, cb) {
        cb(null, {
            id: myid,
            implemented: implemented.map(function implPatterns (impl) {
                return impl.pattern.encode()
            })
        })
    })

    // implementation test
    function implementations (message) {
        return implemented.filter(function acceptsMessage (impl) {
            return impl.pattern.matches(message)
        })
    }

    // find the right queue
    function queue (msgBody, cb) {
        var impls = implementations(msgBody)
        if (!impls.length) return cb(new Error('not implemented: ' + JSON.stringify(msgBody)))
        return impls[0].queue(msgBody, cb)
    }

    return stream
}
module.exports.pattern = pattern
