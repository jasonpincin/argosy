var test     = require('tape'),
    exported = require('..')

test('exported', function (t) {
    t.ok(exported.service, 'service')
    t.ok(exported.client, 'client')
    t.ok(exported.pattern, 'pattern')
    t.end()
})
