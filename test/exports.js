var test     = require('tape')

test('exported', function (t) {
    t.equal(typeof require('..'), 'function', 'exports a function')
    t.equal(typeof require('..').pattern, 'function', 'exports argosy-pattern as argosy.pattern')
    t.equal(require('../pattern'),  require('..').pattern, 'exports argosy-pattern as argosy/pattern')
    t.end()
})
