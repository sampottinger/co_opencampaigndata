/**
 * Express.js routing callbacks for v1 API endpoints.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

var q = require('q');

var cors = require('cors');
var moment = require('moment');

var services = require('./services');
var data_formatter = require('./data_formatter');
var tracer_db_facade = require('./tracer_db_facade');
var account_manager = require('./account_manager');
var api_controller_config = require('./config/api_controller_config.json');

var DEFAULT_FIELDS = api_controller_config.defaultFields;
var NUMBER_PARAMS = api_controller_config.numberParams;
var BOOL_PARAMS = api_controller_config.boolParams;
var MISSING_API_KEY_MSG = 'Must include an apiKey as a query parameter.';
var DATE_PARAMS = api_controller_config.dateParams;

var MIME_INFO = {
    'json': 'application/json',
    'csv': 'text/csv'
};


/**
 * Convert "0" to false and "1" to true.
 *
 * Convert an non-localized boolean valid (0 or 1) to JavaScript-native true or
 * false respectively.
 *
 * @param {String} strVal The string value to interpret as true or false.
 * @return {Boolean} The boolean value parsed from strVal.
 * @throws {Error} Error thrown if strVal is not equal to "0" or "1".
**/
function parseInternationalBool (strVal) {
    if (strVal === '1')
        return true;
    else if (strVal === '0')
        return false;
    else
        throw new Error(strVal + ' not a valid boolean value. Use 0 or 1.');
}


/**
 * Read the query components from an HTTP request and return a QueryInfo struct.
 *
 * @param {String} resource The name of the type of resource that is being
 *      requested.
 * @param {Object} rawQuery The query components / parameters read from the
 *      HTTP request. For express, this would be request.query.
 * @return {Object} Object that follows the QueryInfo struct as defined in the
 *      structures section of the project wiki.
**/
function parseRequestQueryInfo (resource, rawQuery) {
    var params = {};
    var query = {params: params, targetCollection: resource};
    var fields = DEFAULT_FIELDS[resource];
    var numParams = NUMBER_PARAMS[resource];
    var boolParams = BOOL_PARAMS[resource];
    var dateParams = DATE_PARAMS[resource];
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
            params[componentName] = parseInternationalBool(componentValue);
        } else if (dateParams.indexOf(componentName) != -1) {
            params[componentName] = moment(componentValue).toDate();
        } else {
            params[componentName] = componentValue.toUpperCase();
        }
    }

    return {query: query, fields: fields, apiKey: apiKey};
}


/**
 * Check that a user account exists and that the account can execute a query.
 *
 * Deferred callback for after looking up an account in the Accounts database
 * given that Account's API key. This will check that the account was located
 * and that the user has not exceeded her request rates. If the account was not
 * found by API key or throttling limits have been exceeded, the provided
 * response will be set to the apporpriate HTTP status code and a JSON encoded
 * error message will be provided.
 *
 * @param {express.Response} res The express.js response to operate on if the
 *      account could not be located or throttling limits have been exceeded.
 * @param {Object} account An Account structure as defined in the structures
 *      section of the project wiki or null if the account could not be
 *      located.
 * @param {Object} query A Query structure as defined in the structures
 *      section of the project wiki. This is the query that the current user is
 *      trying to execute against the provided account.
 * @return {q.promise} Promise that resolves to true if the user was located by
 *      her API key and has not exceeded rate limiting restrictions. The
 *      promise will resolve to false otherwise.
**/
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


/**
 * Update a set of HTTP request query components to reflect a new offset.
 *
 * Updates a set of HTTP request query components, replacing the existing
 * offset query component with a new offset value. If an offset query component
 * does not already exist, a new one will be created.
 *
 * @param {Object} oldQueryComponents Object encapsulating query components to
 *      operate on.
 * @param {Number} addToOffset The number of records to offset from the given
 *      query components previous offset. If no offset was found in the original
 *      set of query components, this parameter will be the new offset.
 * @note This does not return a new set of query components but a url encoded
 *      listing of those components.
**/
function updateQueryWithOffset (oldQueryComponents, addToOffset) {

    if(oldQueryComponents.offset == undefined) {
        oldQueryComponents.offset = addToOffset;
    } else {
        var newOffset = parseInt(oldQueryComponents.offset) + addToOffset;
        oldQueryComponents.offset = newOffset;
    }
    
    var newParams = [];
    for(var componentName in oldQueryComponents) {
        var newValue = encodeURIComponent(oldQueryComponents[componentName]);
        newParams.push(componentName + "=" + newValue);
    }
    
    return newParams.join("&");
}


/**
 * Serialize a response into a supported format like CSV or JSON.
 *
 * Serialize a response into a supported format and add meta data like next-href
 * and offset as appropriate,
 *
 * @param {express.Request} req The current user request this serialization is
 *      being performed for.
 * @param {Object} query A Query structure as defined in the structures section
 *      of the project wiki. This is the query the user is currenlty executing
 *      with req.
 * @param {Array} results The array of results (Object) read from the database
 *      and to be serialized in preparation for returning to the user.
 * @param {Array} fields An Array of String, each with a name of a field. An
 *      attribute of a record found in the database will only be returned if it
 *      is listed in this parameter.
 * @param {String} format The name of the format to serialize to. Examples
 *      include "json" and "csv".
 * @param {String} resource The name of the resource that is being requested.
 *      Examples include "loans" or "contributions".
 * @return {q.promise} Promise that resovles to the string serialization of the
 *      given records and related metadata to return to the user.
**/
function serializeResponse (req, query, results, fields, format, resource) {

    var urlNoParams = req.url.substr(0,req.url.indexOf('?'));
    var nextHref = 'http://' + req.headers.host + urlNoParams + '?';
    nextHref += updateQueryWithOffset(req.query, results.length);

    var metaInfo = { offset: query.offset };
    if(results.length == 0)
        metaInfo['next-href'] = null;
    else
        metaInfo['next-href'] = nextHref;

    return data_formatter.format(
        format,
        results,
        fields,
        resource,
        metaInfo
    )
}


/**
 * Send a response back to the client with a HTTP OK status code.
 *
 * @param {express.Response} res The express.js response object to write to.
 * @param {String} serializedResponse The string payload (csv, json, etc.) to
 *      return to the user.
 * @param {String} serializationFormat The string name of the format that
 *      serializedResponse is in ("csv", "json", etc.).
**/
function sendResponse (res, serializedResponse, serializationFormat) {
    res.status(200)
    .set('content-type', MIME_INFO[serializationFormat])
    .send(serializedResponse);
}


/**
 * Handle a query request made on version 1 of the API.
 *
 * @param {express.Request} req The HTTP request information as provided by
 *      express.js.
 * @param {express.Response} res The express.js response object to write the
 *      results of this operation to.
 * @param {Object} queryInfo A QueryInfo structure corresponding to the query
 *      components provided by the user in their HTTP request and as found in
 *      the req parameter.
 * @param {String} resource The name of the type of resource being requested.
 *      Examples include "loans" or "contributions".
 * @param {String} format The format to serialize results / the reponse to.
 *      Examples include "json" and "csv".
**/
function handleV1Request (req, res, queryInfo, resource, format) {
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

    if (apiKey == null || apiKey == undefined) {
        res.status(403).json({message: MISSING_API_KEY_MSG});
        return;
    }

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


/**
 * Creates a closure for a call to handleV1Request.
 *
 * Creates a closure around the provided resouce and format information,
 * returning a newly generated function that takes a express.js Request and
 * Response. The returned function will parse query components as provided
 * in the user's HTTP request (and as exposed through the passed Request object)
 * before calling handleV1Request with the parsed components.
 *
 * @param {String} resource The name of the resource to create a handler for.
 * @param {String} format The name of the format to serialize results to.
 * @return {function} Function that takes two parameters: a express.js Request
 *      and express.js Response. The returned function will parse query
 *      components as provided in the user's HTTP request (and as exposed
 *      through the passed Request object) before calling handleV1Request with
 *      the parsed components.
**/
function createV1Handler (resource, format) {

    return function (req, res) {
        
        var queryInfo;

        try {
            queryInfo = parseRequestQueryInfo(resource, req.query);
        } catch (err) {
            res.status(500).json({message: err.message});
            return;
        }

        handleV1Request(req, res, queryInfo, resource, format);
    };
}


/**
 * Create a set of version 1 API endpoint request handlers.
 *
 * @param {express.Application} app The application to register the endpoints
 *      on.
 * @param {String} resource The name of the resource that endpoints are being
 *      created for. Examples include "loans" and "contributions".
**/
function createAndRegisterV1Handlers (app, resource) {
    app.get(
        '/' + resource,
        cors(),
        createV1Handler(resource, 'json')
    );
    
    app.get(
        '/v1/' + resource,
        cors(),
        createV1Handler(resource, 'json')
    );
    
    app.get(
        '/' + resource + '.json',
        cors(),
        createV1Handler(resource, 'json')
    );
    
    app.get(
        '/v1/' + resource + '.json',
        cors(),
        createV1Handler(resource, 'json')
    );
    
    app.get(
        '/' + resource + '.csv',
        cors(),
        createV1Handler(resource, 'csv')
    );
    
    app.get(
        '/v1/' + resource + '.csv',
        cors(),
        createV1Handler(resource, 'csv')
    );
}


module.exports = function(app) {
    app.get('/v1', cors(), function(req, res) {
      res.status(200).json(services());
    });

    createAndRegisterV1Handlers(app, 'contributions');
    createAndRegisterV1Handlers(app, 'expenditures');
    createAndRegisterV1Handlers(app, 'loans');
}
