/**
 * Express.js routing callbacks for v1 API endpoints.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

var services = require('./services');

var tracer_db_facade = require('./tracer_db_facade');
var account_manager = require('./account_manager');

module.exports = function(app) {
    app.get('/v1', function(req, res) {
      res.status(200).json(services());
    });

    app.get('/v1/contributions.json', function(req, res) {
      tracer_db_facade.executeQuery({asdf: 1});
      res.status(501).json({message: "API request unimplemented."});
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
