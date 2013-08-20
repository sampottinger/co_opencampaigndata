/**
 * Main routing file that splits routes to other controllers.
 *
 * Main routing module that splits routes to other controllers, namely this
 * module routes API endpoints route to the api_controller module and
 * frontend / GUI-serving requests to callbacks in frontend_controller.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

var config = require('./config.json')
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));
app.use(express.errorHandler());
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

require('./frontend_controller')(app);
require('./api_controller')(app);

if (! module.parent) {
    app.listen(config.port);
    console.log("Listening on port " + config.port);
}

