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
var tracer_db_config = require('./config/tracer_db_config.json');

// Module behavioral constants
var MAX_DB_CONNECTIONS = 2;
var DB_TIMEOUT = 600;
var DEFAULT_RESULT_LIMIT = 500;
var MAX_RESULT_LIMIT = 5000;
//var TRACER_DB = 'tracer-records-db';
var ALLOWED_FIELDS = tracer_db_config.allowedFields;
var DATE_FIELDS = ['filedDate', 'date', 'expenditureDate'];
var NUM_DATE_FIELDS = DATE_FIELDS.length;


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
        name: 'mongodb-tracer',
        create: function(createCallback) {
            env_config.loadConfig().then(function(envSettings) {
                mongodb.MongoClient.connect(
                    envSettings.tracerDBURI,
                    function (err, db) { 
                        createCallback(null, db); 
                    }
                );
            }, function (err) { throw new Error (err); });
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
    var query = {};

    for (var paramName in params) {
        paramValue = params[paramName];
        indexEntry = fieldIndex[paramName];
        queryOp = indexEntry.queryOp;

        if (indexEntry === undefined) {
            throw new Error(paramName + ' is an unexpected field.');
        } else {
            paramEntry = query[indexEntry.dbField];
            
            // Ensure an attribute for this parameter in the MongoDB selector
            if (paramEntry === undefined) {
                paramEntry = {};
                query[indexEntry.dbField] = paramEntry;
            }
            
            // Default to qual if the field index does not provide a queryOp
            if (queryOp === undefined) {
                query[indexEntry.dbField] = paramValue;
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
 * @return {Q.promise} Promise that resolves to an Array of records loaded from
 *      the database.
**/
exports.executeQuery = function (query) {
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
    if (resultLimit > MAX_RESULT_LIMIT)
        resultLimit = MAX_RESULT_LIMIT;

    // Create closure to perform query
    function performQuery (dbConnection) {
        var innerDeferred = q.defer();

        dbConnection.collection(collection, function (err, tracerCollection) {

            if (err) {
                innerDeferred.reject(err);
                return innerDeferred.promise;
            }

            // Execute actual DB operation
            tracerCollection.find(
                createDBQueryForParams(params, allowedFieldsForCol),
                {skip: skip, limit: resultLimit},
                function (err, results) {
                    if (err) {
                        innerDeferred.reject(err);
                        return;
                    }

                    // Redirect stream events to client code
                    results.toArray(function (err, docs) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            var fieldName;
                            var fieldValue;
                            var doc;
                            var numDocs = docs.length;
                            
                            // TODO(samnsparky): Stream results while doing
                            // this transform.
                            for (var i=0; i<numDocs; i++)
                            {
                                doc = docs[i];
                                for (var j=0; j<NUM_DATE_FIELDS; j++) {
                                    fieldName = DATE_FIELDS[j];
                                    fieldValue = doc[fieldName];
                                    if (fieldValue !== undefined && fieldValue !== "")
                                    {
                                        try {
                                            fieldValue = new Date(fieldValue).toISOString();
                                        } catch(e) {
                                            console.log("Couldn't parse " + fieldValue + " as a valid Date.");
                                            fieldValue = undefined;
                                        }
                                        doc[fieldName] = fieldValue;
                                    }
                                }
                            }

                            deferred.resolve(docs);
                        }

                        innerDeferred.resolve(dbConnection);
                    });
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
