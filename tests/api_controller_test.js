var test_util = require('./test_util');
var rewire = require('rewire');
var services = require('../services');
var request = require('supertest');
var api_controller = rewire('../api_controller');
var express = require('express');
var app = express();

var test_contribution_data = [
  {"recordID": 1,"committeeID": 123, "lastName": "Smith", "firstName" : "Alice", "amount": 50},
  {"recordID": 2,"committeeID": 23,  "lastName": "Smith", "firstName" : "Bob",   "amount": 10},
];

var testDbFacade = {
  executeQuery: function(query, onNext, onEnd, onError) {
    test_contribution_data.forEach(function(i) {
      onNext(i);
    });
    onEnd();
  }
};

api_controller.__set__('tracer_db_facade', testDbFacade);
api_controller(app);

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
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), 
            {contributions: test_contribution_data,
             meta: { offset: 0, 'result-set-size': 500}});
          test.done();
      });
    },
    testContributionsJsonWithFields: function (test) {
      request(app).get('/v1/contributions.json?fields=committeeID,amount')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), 
            {contributions: [ { committeeID: 123, amount: 50 },
                              { committeeID: 23, amount: 10 } ],
             meta: { offset: 0, 'result-set-size': 500}});
          test.done();
      });
    },
    testContributionsCsv: function (test) {
      request(app).get('/v1/contributions.csv')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, 'recordID,committeeID,amount,firstName,lastName\n1,123,50,"Alice","Smith"\n2,23,10,"Bob","Smith"');
          test.done()
      });
    },
    testContributionsCsvWithFields: function (test) {
      request(app).get('/v1/contributions.csv?fields=committeeID,amount')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, 'committeeID,amount\n123,50\n23,10');
          test.done()
      });
    },
    testLoansJson: function (test) {
      request(app).get('/v1/loans.json')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), 
            {loans: test_contribution_data,
             meta: { offset: 0, 'result-set-size': 500}});
          test.done();
      });
    },
    testLoansCsv: function (test) {
      request(app).get('/v1/loans.csv')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, 'recordID,committeeID,amount,firstName,lastName\n1,123,50,"Alice","Smith"\n2,23,10,"Bob","Smith"');
          test.done()
      });
    },
    testExpendituresJson: function (test) {
      request(app).get('/v1/expenditures.json')
        .set('Accept', 'application/json')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "application/json");
          test.deepEqual(JSON.parse(res.text), 
            {expenditures: test_contribution_data,
             meta: { offset: 0, 'result-set-size': 500}});
          test.done();
      });
    },
    testExpendituresCsv: function (test) {
      request(app).get('/v1/expenditures.csv')
        .set('Accept', 'text/csv')
        .end(function (err, res) {
          test.equal(res.statusCode, 200);
          test.equal(res.headers['content-type'], "text/csv");
          test.deepEqual(res.text, 'recordID,committeeID,amount,firstName,lastName\n1,123,50,"Alice","Smith"\n2,23,10,"Bob","Smith"');
          test.done()
      });
    },
}
