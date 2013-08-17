var test_util = require('./test_util');
var server = require('nodeunit-httpclient').create({
    port: 3030,
    path: '/',   //Base URL for requests
    status: 200,    //Test each response is OK (can override later)
    headers: {      //Test that each response must have these headers (can override later)
        'content-type': 'text/html; charset=utf-8'
    }
});

//Automatic tests on response object
module.exports = {
    testIndex: function(test) {
        server.get(test, '/', {
            body: 'Hello world.'
        });
    }
}
