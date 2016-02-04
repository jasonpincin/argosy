var assert    = require('assert'),
    cq        = require('concurrent-queue'),
    eventuate = require('eventuate'),
    filter    = require('eventuate-filter'),
    once      = require('eventuate-once'),
    assign    = require('object-assign'),
    through2  = require('through2'),
    objectify = require('through2-objectify'),
    pipeline  = require('stream-combiner2'),
    split     = require('split2'),
    uuid      = require('uuid').v4,
    Promise   = require('promise-polyfill'),
    pattern   = require('argosy-pattern'),
    find      = require('array-find'),
    after     = require('afterward')

module.exports = function argosy (options) {
  options = assign({ id: uuid() }, options)

  var requestSeq     = 0,
      localServices  = [],
      remoteServices = [],
      outstanding    = [],
      input          = split(),
      parse          = objectify(function (chunk, enc, cb) {
        cb(null, JSON.parse(chunk))
      }),
      output         = objectify.deobj(function (msg, enc, cb) {
        cb(null, JSON.stringify(msg) + '\n')
      })

  var processMessage = through2.obj(function parseMessage (msg, enc, cb) {
    switch (msg.type) {
      case 'request':
        queue(msg.body, function done (err, result) {
          var reply = {
            type   : 'response',
            body   : result,
            headers: assign(msg.headers, {
              servicer: { id: options.id }
            })
          }
          if (err) reply.error = { message: err.message, stack: err.stack }
          processMessage.push(reply)
        })
        break
      case 'response':
        outstanding.filter(function (pending) {
          return (msg.headers.consumer.id === options.id &&
                  pending.seq === msg.headers.consumer.seq)
        }).forEach(function (pending) {
          if (msg.error) pending.reject(assign(new Error(msg.error.message), {
            remoteStack: msg.error.stack
          }))
          else pending.resolve(msg.body)
        })
        break
      case 'subscribe':
        var syncMessage = { id: options.id }
        if (~msg.body.indexOf('services')) {
          stream.localServiceAdded.removeConsumer(announceService)
          stream.localServiceAdded(announceService)
          localServices.forEach(announceService)
          syncMessage.services = localServices.length
        }
        output.write({ type: 'synced', body: syncMessage })
        break
      case 'announce-service':
        remoteServices.push({
          provider: msg.body.provider,
          pattern : pattern.decode(msg.body.pattern)
        })
        stream.serviceAdded.produce({
          remote  : true,
          provider: msg.body.provider,
          pattern : pattern.decode(msg.body.pattern)
        })
        break
      case 'synced':
        stream.synced.produce(msg.body)
        break
    }
    cb()
  })

  var stream = assign(pipeline(input, parse, processMessage, output), {
    id: options.id
  })

  stream.accept = function accept (rules) {
    var p = pattern(rules),
        q = cq()

    localServices.push({ pattern: p, queue: q })
    stream.serviceAdded.produce({
      local   : true,
      pattern : p,
      provider: { id: options.id }
    })
    return q
  }
  stream.invoke = function invoke (msgBody, cb) {
    var done = (serviceable(msgBody, localServices))
      ? queue(msgBody) // if we implement it ourself, stay in-process
      : stream.invoke.remote(msgBody) // otherwise, head out to sea
    return after(done, cb)
  }
  stream.invoke.remote = function invokeRemote (msgBody, cb) {
    var request = {
      type   : 'request',
      body   : msgBody,
      headers: {
        consumer: {
          id : options.id,
          seq: requestSeq++
        }
      }
    }

    var done = new Promise(function (resolve, reject) {
      outstanding.push({
        seq    : request.headers.consumer.seq,
        resolve: resolve,
        reject : reject
      })
      output.write(request)
    })
    return after(done, cb)
  }
  stream.invoke.partial = function invokePartial (partialBody) {
    return function partialInvoke (msgBody, cb) {
      if (typeof msgBody === 'function') {
        cb = msgBody
        msgBody = {}
      }
      return stream.invoke(assign({}, partialBody, msgBody), cb)
    }
  }
  stream.subscribeRemote = function subscribeRemote (msgBody, cb) {
    assert(Array.isArray(msgBody),
           'subscribeRemote requires an array of subscriptions')
    output.write({ type: 'subscribe', body: msgBody })
    return after(once(stream.synced), cb)
  }
  stream.synced = eventuate()
  stream.serviceAdded = eventuate()
  stream.remoteServiceAdded = filter(stream.serviceAdded, function (svc) {
    return svc.remote
  })
  stream.localServiceAdded = filter(stream.serviceAdded, function (svc) {
    return svc.local
  })
  stream.pattern = pattern

  Object.defineProperties(stream, {
    services: { get: function () {
      return localServices.map(function (svc) {
        return {
          local   : true,
          provider: { id: options.id },
          pattern : svc.pattern
        }
      }).concat(remoteServices.map(function (svc) {
        return { remote: true, provider: svc.provider, pattern: svc.pattern }
      }))
    }}
  })

  // can the message be routed to a service
  function serviceable (msgBody, services) {
    return (services.length && services.some(function acceptsMessage (svc) {
      return svc.pattern.matches(msgBody)
    }))
  }

  // find the right queue
  function queue (msgBody, cb) {
    var service = find(localServices, function (svc) {
      return svc.pattern.matches(msgBody)
    })
    if (!service)
      return cb(new Error('not implemented: ' + JSON.stringify(msgBody)))
    return service.queue(msgBody, cb)
  }

  function announceService (svc) {
    output.write({
      type: 'announce-service',
      body: {
        provider: {
          id: options.id
        },
        pattern: svc.pattern.encode()
      }
    })
  }

  return stream
}
module.exports.pattern = pattern
