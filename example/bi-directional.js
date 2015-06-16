var http    = require('http'),
    query   = require('querystring'),
    argosy  = require('..')

// create some endpoints
var service1 = argosy()
var service2 = argosy()
// connect the endpoints
service1.pipe(service2).pipe(service1)

// create a service1 implementation for random numbers
service1.accept({ get: 'random number' }).process(function (msg, cb) {
    cb(null, Math.floor(Math.random()*10))
})
// create a service2 implementation for random letters
service2.accept({ get: 'random letter' }).process(function (msg, cb) {
    cb(null, 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random()*26)])
})

// service1 users service2
service1.invoke({ get: 'random letter' }, function (err, letter) {
    console.log('random letter: ' + letter)
})

// service2 users service1
service2.invoke({ get: 'random number' }, function (err, number) {
    console.log('random number: ' + number)
})
