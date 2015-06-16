var test   = require('tape'),
    argosy = require('..')

test('argosy', function (t) {
    t.plan(2)

    var service = argosy()

    t.equals(typeof service, 'object', 'should be an object')
    t.equals(typeof service.pipe, 'function', 'should be a stream')
})
