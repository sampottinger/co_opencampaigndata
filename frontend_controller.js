/**
 * Callbacks for URL routes that handle the human user graphical interfaces.
 *
 * Callbacks for the graphical interfaces and human user facing endpoints.
 * However, the routes are set in the server module.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

module.exports = function(app) {
    app.get('/', function(req, res) {
        res.send('Hello world.');
    });
}
