/**
 * Express.js routing callbacks for v1 API endpoints.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

module.exports = function(app) {
    app.get('/v1', function(req, res) {
        res.status(200).json({message: "Hello world."});
    });
}
