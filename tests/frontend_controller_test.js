var test_util = require('./test_util');
var rewire = require('rewire');
var services = require('../services');
var request = require('supertest');
var frontend_controller = rewire('../frontend_controller');
var express = require('express');
var app = express();
var url = require('url');
var q = require('q');

app.use(express.static(__dirname + '/../public'));
app.use(express.errorHandler());
app.set('views', __dirname + '/../views');
app.set('view engine', 'jade');
app.use(express.bodyParser());

var users = {
  "foo@bar.com": {"email": "foo@bar.com", "apiKey": "ASDFASDFASDFASD", "permissions": "typical_user"}
};

var testManager = {
  getOrCreateUserByEmail: function(email) {
    return q.fcall(function() {
      if(users[email] === undefined) {
        return {
          email: "newuser@aaa.com",
          apiKey: "qwer",
          permissions: "typical_user"
        };
      } else {
        return users[email];
      }
    });
  }
};

frontend_controller.__set__('account_manager', testManager);
frontend_controller(app);

//Automatic tests on response object
module.exports = {
    testIndex: function(test) {
        request(app).get('/')
          .end(function (err, res) {
            test.equal(res.statusCode, 200);
            test.equal(res.headers['content-type'], 'text/html; charset=utf-8');
            test.ok(res.text.match(/co\.opencampaigndata\.org/));
            test.done();
        });
    },
    testNew: function(test) {
        request(app).get('/keys/new')
          .end(function (err, res) {
            test.equal(res.statusCode, 200);
            test.equal(res.headers['content-type'], 'text/html; charset=utf-8');
            test.ok(res.text.match(/Enter email/));
            test.done();
        });
    },
    testCreateNew: function(test) {
        request(app).post('/keys')
          .send({email: "newuser@aaa.com"})
          .end(function (err, res) {
            test.equal(res.statusCode, 302);
            test.equal(res.headers['content-type'], 'text/plain');
            test.equal(res.headers['location'], '/keys/qwer');
            test.ok(res.text.match(/Moved Temporarily. Redirecting to/));
            test.done();
        });
    },
    testCreateExisting: function(test) {
        request(app).post('/keys')
          .send({email: "foo@bar.com"})
          .end(function (err, res) {
            test.equal(res.statusCode, 302);
            test.equal(res.headers['content-type'], 'text/plain');
            test.equal(res.headers['location'], '/keys/ASDFASDFASDFASD');
            test.ok(res.text.match(/Moved Temporarily. Redirecting to/));
            test.done();
        });
    }
}
