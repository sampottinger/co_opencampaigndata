var fs = require('fs');
var q = require('q');

var CONFIG_FILE_SRC = './config.json';

var loadedConfiguration = null;


/**
 * Load the current configuration settings for the service.
 *
 * @return {q.promise} A promise that resolves to the loaded JSON configuration
 *      settings.
**/
exports.loadConfig = function () {
    var deferred = q.defer();

    if (loadedConfiguration === null) {
        fs.readFile(CONFIG_FILE_SRC, 'utf8', function (err,data) {
            if (err) {
                var message = 'Could not load configuration settings: ' + err;
                throw new Error(message);
            }
            loadedConfiguration = JSON.parse(data);
            deferred.resolve(loadedConfiguration);
        });
    } else {
        deferred.resolve(loadedConfiguration);
    }

    return deferred.promise;
};
