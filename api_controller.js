/**
 * Express.js routing callbacks for v1 API endpoints.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

var services = require('./services');
var formatter = require('./data_formatter');

var tracer_db_facade = require('./tracer_db_facade');
var account_manager = require('./account_manager');

var default_fields = {
  contributions: [
    "recordID",
    "committeeID",
    "amount",
    "firstName",
    "lastName"
  ],
  expenditures: [
    "recordID",
    "committeeID",
    "amount",
    "firstName",
    "lastName"
  ],
  loans: [
    "recordID",
    "committeeID",
    "amount",
    "firstName",
    "lastName"
  ],
};


var createQuery = function(collection, params) {
  var offset = params.offset || 0;
  var limit = params.limit || 500;
  delete params.offset;
  delete params.limit;

  return {
    targetCollection: collection,
    params: params,
    offset: offset,
    resultLimit: limit
  };
}

var getFields = function(collection, params) {
  var fields = [];
    if(params.fields !== undefined) {
      fields = params.fields.split(',');
    } else {
      fields = default_fields[collection];
    }
    return fields;
}

var handleJsonRequest = function(collection, req, res) {
  var results = [];
  var params = req.query;
  var key = params.apiKey;
  var object = {};
  var fields = getFields(collection, params);
  var query = createQuery(collection,params);

  tracer_db_facade.executeQuery(query,function(next) {
    results.push(next);
  }, function() {
    formatter.format('json',results,fields, collection)
      .then(function(json) {
        var object = JSON.parse(json)
        object.meta = { offset: query.offset, 'result-set-size': query.resultLimit};
        res.status(200).json(object);
      });
  }, function(msg) {
    res.status(500).json({message: msg});
  });
}

var handleCsvRequest = function(collection, req, res) {
  var results = [];
  var params = req.query;
  var key = params.apiKey;
  var fields = getFields(collection, params);
  var query = createQuery(collection,params);

  tracer_db_facade.executeQuery(query,function(next) {
    results.push(next);
  }, function() {
    formatter.format('csv',results,fields)
      .then(function(csv) {
        res.status(200).set('content-type','text/csv').send(csv);
      });
  }, function(msg) {
    res.status(500).json({message: msg});
  });
}

module.exports = function(app) {
    app.get('/v1', function(req, res) {
      res.status(200).json(services());
    });

    app.get('/v1/contributions.json', function(req, res) {
      handleJsonRequest('contributions',req, res);
    });

    app.get('/v1/contributions.csv', function(req, res) {
      handleCsvRequest('contributions',req, res);
    });

    app.get('/v1/loans.json', function(req, res) {
      handleJsonRequest('loans', req, res);
    });
    app.get('/v1/loans.csv', function(req, res) {
      handleCsvRequest('loans',req, res);
    });

    app.get('/v1/expenditures.json', function(req, res) {
      handleJsonRequest('expenditures', req, res);
    });
    app.get('/v1/expenditures.csv', function(req, res) {
      handleCsvRequest('expenditures',req, res);
    });
}
