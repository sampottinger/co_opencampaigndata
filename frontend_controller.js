/**
 * Callbacks for URL routes that handle the human user graphical interfaces.
 *
 * Callbacks for the graphical interfaces and human user facing endpoints.
 * However, the routes are set in the server module.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

var account_manager = require('./account_manager');

module.exports = function(app) {
    app.get('/', function(req, res) {
        res.render('index');
    });

    app.get('/keys/new', function(req, res) {
        res.render('new');
    });

    app.post('/keys', function(req, res) {
        var email = req.body.email
        account_manager.getOrCreateUserByEmail(email).then(function(account) {
          res.redirect('/keys/' + account.apiKey);
        });

    });
    app.get('/keys/:id', function(req, res) {
        res.render('show_key', {key: req.params.id});
    });
}
