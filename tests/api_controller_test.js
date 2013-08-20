var test_util = require('./test_util');
var rewire = require('rewire');
var services = require('../services');
var request = require('supertest');
var app = require('../server');

//Automatic tests on response object
module.exports = {
    testIndex: function (test) {
      request(app).get('/v1')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), services());
          test.done();
      });
    },
    testContributionsJson: function (test) {
      request(app).get('/v1/contributions.json')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), {message: "API request unimplemented."});
          test.done();
      });
    },
    testContributionsCsv: function (test) {
      request(app).get('/v1/contributions.csv')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, "Message\n501: API request unimplemented.");
          test.done()
      });
    },
    testLoansJson: function (test) {
      request(app).get('/v1/loans.json')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), {message: "API request unimplemented."});
          test.done()
      });
    },
    testLoansCsv: function (test) {
      request(app).get('/v1/loans.csv')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, "Message\n501: API request unimplemented.");
          test.done()
      });
    },
    testExpendituresJson: function (test) {
      request(app).get('/v1/expenditures.json')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), {message: "API request unimplemented."});
          test.done()
      });
    },
    testExpendituresCsv: function (test) {
      request(app).get('/v1/expenditures.csv')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 501);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, "Message\n501: API request unimplemented.");
          test.done()
      });
    },
}
