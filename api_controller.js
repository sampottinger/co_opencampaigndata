/**
 * Express.js routing callbacks for v1 API endpoints.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

var q = require('q');

var services = require('./services');
var data_formatter = require('./data_formatter');
var tracer_db_facade = require('./tracer_db_facade');
var account_manager = require('./account_manager');
var api_controller_config = require('./api_controller_config.json');

var DEFAULT_FIELDS = api_controller_config.defaultFields;
var NUMBER_PARAMS = api_controller_config.numberParams;
var BOOL_PARAMS = api_controller_config.boolParams;

var MIME_INFO = {
    'json': 'application/json',
    'csv': 'text/csv'
};


function parseBool (val) {
    if (val === '1')
        return true;
    else
        return false;
}


function parseRequestQueryInfo (collection, rawQuery) {
    var params = {};
    var query = {params: params, targetCollection: collection};
    var fields = DEFAULT_FIELDS[collection];
    var numParams = NUMBER_PARAMS[collection];
    var boolParams = NUMBER_PARAMS[collection];
    var apiKey;

    query.offset = 0;

    for (var componentName in rawQuery) {
        var componentValue = rawQuery[componentName];

        if (componentName === 'apiKey') {
            apiKey = componentValue;
        } else if (componentName === 'offset') {
            query.offset = componentValue;
        } else if (componentName === 'limit') {
            query.resultLimit = componentValue;
        } else if (componentName === 'fields') {
            fields = componentValue.split(',');
        } else if (numParams.indexOf(componentName) != -1) {
            params[componentName] = parseFloat(componentValue);
        } else if (boolParams.indexOf(componentName) != -1) {
            params[componentName] = parseBool(componentValue);
        } else {
            params[componentName] = componentValue;
        }
    }

    return {query: query, fields: fields, apiKey: apiKey};
}


function checkUserCredentials (res, account, query) {
    var deferred = q.defer();

    if (account === null) {
        res.status(401).json({message: 'Invalid API key.'});
        deferred.resolve(false);
        return deferred.promise;
    }

    account_manager.canFulfillQueryWithThrottle(account, query)
    .then(function (canFulfill) {
        if (canFulfill) {
            deferred.resolve(true);
        } else {
            res.status(429).json({message: 'Rate limit reached.'});
            deferred.resolve(false);
        }
    });

    return deferred.promise;
}


function updateQueryWithOffset (req, offset) {
    var newUrl = "http://" + req.headers.host + req._parsedUrl.pathname;
    var newParams = [];
    if(req.query.offset == undefined) {
        req.query.offset = offset;
    } else {
        var newOffset = parseInt(req.query.offset) + offset;
        req.query.offset = newOffset;
    }
    for(var i in req.query) {
        newParams.push(i + "=" + req.query[i]);
    }
    return newParams.join("&");
}


function serializeResponse (req, query, results, fields, format, resource) {

    var nextHref = 'http://' + req.headers.host + '?';
    nextHref += updateQueryWithOffset(req, results.length);

    var metaInfo = {
        offset: query.offset,
        'next-href': nextHref
    };

    return data_formatter.format(
        format,
        results,
        fields,
        resource,
        metaInfo
    )
}


function sendResponse (res, serializedResponse, serializationFormat) {
    res.status(200)
    .set('content-type', MIME_INFO[serializationFormat])
    .send(serializedResponse);
}


function handleV1Request (req, res, resource, collection, format) {
    var queryInfo = parseRequestQueryInfo(collection, req.query);
    var apiKey = queryInfo.apiKey;
    var query = queryInfo.query;
    var fields = queryInfo.fields;

    var genericErrorHandler = function (msg) {
        res.status(500).json({message: msg});
    };

    var checkUserCredentialsClosure = function (account) {
        return checkUserCredentials(res, account, query);
    };

    var serializeResponseClosure = function (results) {
        return serializeResponse(
            req,
            query,
            results,
            fields,
            format,
            resource
        );
    };

    var sendResponseClosure = function (serializedResponse) {
        return sendResponse(res, serializedResponse, format);
    };

    account_manager.getUserByAPIKey(apiKey)
    .then(checkUserCredentialsClosure, genericErrorHandler)
    .then(function (userCanExecuteQuery) {

        if (!userCanExecuteQuery)
            return;

        tracer_db_facade.executeQuery(query)
        .then(serializeResponseClosure, genericErrorHandler)
        .then(sendResponseClosure, genericErrorHandler)

    }, genericErrorHandler);
}


function createV1Handler (resource, collection, format) {
    return function (req, res) {
        handleV1Request(req, res, resource, collection, format);
    };
}


function createAndRegisterV1Handlers (app, resource, collection) {
    app.get(
        '/' + resource,
        createV1Handler(resource, collection, 'json')
    );
    
    app.get(
        '/v1/' + resource,
        createV1Handler(resource, collection, 'json')
    );
    
    app.get(
        '/' + resource + '.json',
        createV1Handler(resource, collection, 'json')
    );
    
    app.get(
        '/v1/' + resource + '.json',
        createV1Handler(resource, collection, 'json')
    );
    
    app.get(
        '/' + resource + '.csv',
        createV1Handler(resource,collection, 'csv')
    );
    
    app.get(
        '/v1/' + resource + '.csv',
        createV1Handler(resource,collection, 'csv')
    );
}


module.exports = function(app) {
    app.get('/v1', function(req, res) {
      res.status(200).json(services());
    });

    createAndRegisterV1Handlers(app, 'expenditures', 'expenditures');
}
