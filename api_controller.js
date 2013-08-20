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

var createQuery = function(collection, params) {
  var offset = params.offset;
  var limit = params.limit;
  delete params.offset;
  delete params.limit;

  return {
    targetCollection: collection,
    params: params,
    offset: offset,
    resultLimit: limit
  };

}

module.exports = function(app) {
    app.get('/v1', function(req, res) {
      res.status(200).json(services());
    });

    app.get('/v1/contributions.json', function(req, res) {
      var results = [];
      var params = req.params;
      var user = params.apiKey;
      delete params.apiKey;
      var query = createQuery('contributions',params);

      tracer_db_facade.executeQuery(query,function(next) {
        results.push(next);
      }, function() {
        formatter.format('json',results,["committeeID", "lastName", "firstName", "amount"], 'contributions')
          .then(function(json) {
            // FIXME: just sending the string broke the tests, but this is a lot
            // of back and forth between strings and JSON.
            res.status(200).json(JSON.parse(json));
          });
      }, function(msg) {
        res.status(500).json({message: msg});
      });
    });

    app.get('/v1/contributions.csv', function(req, res) {
      res.status(501)
        .header("content-type", "text/csv")
        .send("Message\n501: API request unimplemented.");
    });

    app.get('/v1/loans.json', function(req, res) {
      res.status(501).json({message: "API request unimplemented."});
    });
    app.get('/v1/loans.csv', function(req, res) {
      res.status(501)
        .header("content-type", "text/csv")
        .send("Message\n501: API request unimplemented.");
    });

    app.get('/v1/expenditures.json', function(req, res) {
      res.status(501).json({message: "API request unimplemented."});
    });
    app.get('/v1/expenditures.csv', function(req, res) {
      res.status(501)
        .header("content-type", "text/csv")
        .send("Message\n501: API request unimplemented.");
    });
}
