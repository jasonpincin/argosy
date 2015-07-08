var test   = require('tape'),
    argosy = require('..')

test('argosy', function (t) {
    t.plan(3)

    var service = argosy()

    t.equals(typeof service, 'object', 'should be an object')
    t.equals(typeof service.pipe, 'function', 'should be a stream')

    var client = argosy({ id: 'forced-id' })
    t.equals(client.id, 'forced-id', 'accepts option: id')
})
