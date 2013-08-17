var test_util = require('./test_util');
var server = require('nodeunit-httpclient').create({
    port: 3030,
    path: '/v1',   //Base URL for requests
});

//Automatic tests on response object
module.exports = {
    testIndex: function (test) {
      server.get(test, '/', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(res.data, {message: "API request unimplemented."});
          test.done();
        });
    },
    testContributionsJson: function (test) {
      server.get(test, '/contributions.json', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(res.data, {message: "API request unimplemented."});
          test.done()
      });
    },
    testContributionsCsv: function (test) {
      server.get(test, '/contributions.csv', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.body, "Message\n501: API request unimplemented.");
          test.done()
      });
    },
    testLoansJson: function (test) {
      server.get(test, '/loans.json', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(res.data, {message: "API request unimplemented."});
          test.done()
      });
    },
    testLoansCsv: function (test) {
      server.get(test, '/loans.csv', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.body, "Message\n501: API request unimplemented.");
          test.done()
      });
    },
    testExpendituresJson: function (test) {
      server.get(test, '/expenditures.json', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(res.data, {message: "API request unimplemented."});
          test.done()
      });
    },
    testExpendituresCsv: function (test) {
      server.get(test, '/expenditures.csv', function (res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.body, "Message\n501: API request unimplemented.");
          test.done()
      });
    },
}
