var test_util = require('./test_util');
var server = require('nodeunit-httpclient').create({
    port: 3030,
    path: '/',   //Base URL for requests
});

//Automatic tests on response object
module.exports = {
    testIndex: function(test) {
        server.get(test, '/', function(res){ 
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], 'text/html; charset=utf-8');
          test.ok(res.body.match(/co\.opencampaigndata\.org/));
          test.done();
        });
    }
}
