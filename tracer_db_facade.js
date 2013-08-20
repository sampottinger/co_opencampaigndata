/**
 * Logic to read and query the political finance records database.
 *
 * Logic to read / query the political finance records database. However, note
 * that an external independent process provides aggregation into this database.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

var generic_pool = require('generic-pool');
var mongodb = require('mongodb');
var q = require('q');

var env_config = require('./env_config');
var tracer_db_config = require('./tracer_db_config.json');

var MAX_DB_CONNECTIONS = 2;
var DB_TIMEOUT = 600;
var DEFAULT_RESULT_LIMIT = 50;
var MAX_RESULT_LIMIT = 500;
var TRACER_DB = 'tracerRecords';
var ALLOWED_FIELDS = tracer_db_config.allowedFields;


/**
 * Pool for TRACER database connections. This may be the same database as the
 * usages database. The connected URI is controlled by the env.TRACER_DB_URI
 * environment variable.
 *
 * @return {generic-pool.Pool} Pool for database connections to the TRACER
 *      records database.
**/
function createTracerDBPool () {
    return generic_pool.Pool({
        name: 'mongodb-account',
        create: function(createCallback) {
            env_config.loadConfig().then(function(envSettings) {
                mongodb.MongoClient.connect(
                    envSettings.TRACER_DB_URI,
                    function (err, db) { 
                        createCallback(null, db); 
                    }
                );
            });
        },
        destroy: function(db) { db.close(); },
        max: MAX_DB_CONNECTIONS,
        idleTimeoutMillis : DB_TIMEOUT
    });
}
var tracerDBPool = createTracerDBPool();


/**
 * Acquire a new connection to the TRACER database.
 *
 * @return {Q.promise} Promise that resolves to a connection (mongodb.Db) to the
 *      user accounts database. Note that this may be the same database as the
 *      logging database. 
**/
function acquireTracerDBConnection () {
    var deferred = q.defer();

    tracerDBPool.acquire(function (err, db) {
        if(err) {
            var message = 'Error while acquiring account DB connection: ' + err;
            throw new Error(message);
        }
        deferred.resolve(db);
    });

    return deferred.promise;
}


/**
 * Release an TRACER records database connection back to the connection pool.
 *
 * @param {mongodb.Db} db The database client to release back to the connection
 *      pool for the TRACER records database.
**/
function releaseTracerDBConnection(db) {
    tracerDBPool.release(db);
}


/**
 * Create a Mongo-specific selector from the provided Query struct parameters.
 *
 * Create a MongoDB-specific database query / selector from the provided params.
 * This Object should match the structure of an Object expected to be stored in
 * a database agnostic Query structure's params attribute. The Query Object,
 * in addition to being specific to this application, is described in the
 * structures section of the project wiki.
 *
 * @param {Object} params The parameters to create a MongoDB-specific query /
 *      selector Object for. The Object passed for this parameter should match
 *      the structure of an Object expected to be in the params attribute of a
 *      Query object as described in the structures section of the project wiki.
 * @param {Object} fieldIndex The attribute of fieldIndex for the current
 *      collection. In other words, the field index loaded from tracer_db_config
 *      specific for the collection that this function is generating a MongoDB-
 *      specific query for.
 * @return {Object} MongoDB-specific object suitable as a selector / query for
 *      a MongoDB driver operation.
**/
function createDBQueryForParams (params, fieldIndex) {
    var paramValue;
    var indexEntry;
    var queryOp;
    var indexEntry;
    var query = {};

    for (paramName in params) {
        paramValue = params[paramName];
        indexEntry = fieldIndex[paramName];
        queryOp = indexEntry.queryOp;

        if (indexEntry === undefined) {
            throw new Error(paramName + ' is an unexpected field.');
        } else {
            paramEntry = query[indexEntry.dbField]
            if (paramEntry === undefined) {
                paramEntry = {};
                query[indexEntry.dbField] = paramEntry;
            }
            if (queryOp === undefined) {
                paramEntry.$eq = paramValue;
            } else {
                paramEntry[queryOp] = paramValue;
            }
        }
    }

    return query;
}


/**
 * Execute an asynchronous query in the political finance database.
 *
 * @param {Object} query An Query Object as described in the structures section
 *      of the project wiki.
 * @param {function} onNext Callback for when a record has been loaded from the
 *      database.
 * @param {function} onEnd Callback for when all records have been loaded from
 *      the database. Will not execute if error encountered.
 * @param {function} onError Callback if an error is encountered while reading
 *      from the results stream. Should take a single String argument describing
 *      the error encountered.
 * @return {Q.promise} Promise that resolves to undefined. Will resolve after
 *      streaming results has started but may resolve before that streaming has
 *      finished.
**/
exports.executeQuery = function (query, onNext, onEnd, onError) {
    var deferred = q.defer();
    var collection = query.targetCollection;
    var params = query.params;
    var skip = query.offset;
    var resultLimit = query.resultLimit;

    // Check collection allowed
    collection = collection.toLowerCase();
    if (ALLOWED_FIELDS[collection] === undefined) {
        deferred.reject(collection + ' not an allowed collection.');
        return deferred.promise;
    }

    // Check query fields allowed
    var allowedFieldsForCol = ALLOWED_FIELDS[collection];
    for (var name in params) {
        if (allowedFieldsForCol[name] === undefined) {
            deferred.reject(name + ' not an allowed field.');
            return deferred.promise;
        }
    }

    // Prepare pagination
    if (skip === undefined)
        skip = 0;
    if (resultLimit === undefined)
        resultLimit = DEFAULT_RESULT_LIMIT;

    // Create closure to perform query
    function performQuery (dbConnection) {
        var innerDeferred = q.defer();

        dbConnection.collection(collection, function (err, tracerCollection) {

            if (err) {
                innerDeferred.reject(err);
                return innerDeferred.promise;
            }

            tracerCollection.find(
                createDBQueryForParams(params, allowedFieldsForCol),
                {skip: skip, limit: resultLimit},
                function (err, results) {
                    if (err) {
                        innerDeferred.reject(err);
                        return;
                    }

                    var stream = results.stream();
                    stream.on('data', onNext);
                    stream.on('end', onEnd);
                    innerDeferred.resolve(dbConnection);
                }
            );

        });

        return innerDeferred.promise;
    }

    // Load database and perform query
    acquireTracerDBConnection()
    .then(performQuery, function (err) { deferred.reject(err); })
    .then(releaseTracerDBConnection, function (err) { deferred.reject(err); })
    .fail(function (err) { deferred.reject(err); });

    return deferred.promise;
};
