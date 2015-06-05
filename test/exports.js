var test     = require('tape'),
    exported = require('..')

test('exported', function (t) {
    t.equal(require('../service'), exported.service, 'service')
    t.equal(require('../client'), exported.client, 'client')
    t.equal(require('../pattern'), exported.pattern, 'pattern')
    t.end()
})
