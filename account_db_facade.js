/**
 * Logic for storing and loading account models.
 *
 * Logic for persisting and restoring database models representing user account
 * information and user activity records. Note that this only contains logic for
 * database operation, encapsulating database-specific complexity. Interaction
 * with this module should happen through account_manager, the decorator for
 * this module.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

var ACCOUNT_COLLECTION = 'accounts';
var USAGE_COLLECTION = 'usages';
var DB_TIMEOUT = 600000;
var MAX_DB_CONNECTIONS = 5;

// Strategy index mapping database type to a strategy to open that database.
var ACQUIRE_DB_CONNECTION_STRATEGIES = {
    account: acquireAccountDBConnection,
    logging: acquireLoggingDBConnection
};

// Strategy index mapping database type to a strategy to close a connection to
// that database.
var RELEASE_DB_CONNECTION_STRATEGIES = {
    account: releaseAccountDBConnection,
    logging: releaseLoggingDBConnection
};

// Strategy index mapping collection type to a strategy to select that database
// collection.
var SELECT_COLLECTION_STRATEGIES = {
    account: getAccountCollection,
    usage: getUsageCollection
};

var mongodb = require('mongodb');
var generic_pool = require('generic-pool');
var q = require('q');

var env_config = require('./env_config');


/**
 * Pool for account database connections. This may be the same database as the
 * usages database. The connected URI is controlled by the env.ACCOUNT_DB_URI
 * environment variable.
**/
function createAccountDBPool()
{
    return generic_pool.Pool({
        name: 'mongodb-account',
        create: function(createCallback) {
            env_config.loadConfig().then(function(envSettings) {
                mongodb.MongoClient.connect(
                    envSettings.ACCOUNT_DB_URI,
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
var accountDBPool = createAccountDBPool();


/**
 * Pool for account database connections. This may be the same database as the
 * usages database. The connected URI is controlled by the env.ACCOUNT_DB_URI
 * environment variable.
**/
function createLoggingDBPool()
{
    return generic_pool.Pool({
        name: 'mongodb-logging',
        create: function(callback) {
            env_config.loadConfig().then(function(envSettings) {
                mongodb.MongoClient.connect(
                    envSettings.LOGGING_DB_URI,
                    function (err, db) { 
                        callback(null, db); 
                    }
                );
            });
        },
        destroy: function(db) { db.close(); },
        max: MAX_DB_CONNECTIONS,
        idleTimeoutMillis : DB_TIMEOUT
    });
}
var loggingDBPool = createLoggingDBPool();


/**
 * Acquire a new connection to the user accounts database.
 *
 * @return {Q.promise} Promise that resolves to a connection (mongodb.Db) to the
 *      user accounts database. Note that this may be the same database as the
 *      logging database. 
**/
function acquireAccountDBConnection()
{
    var deferred = q.defer();

    accountDBPool.acquire(function (err, db) {
        if(err) {
            var message = 'Error while acquiring account DB connection: ' + err;
            throw new Error(message);
        }
        deferred.resolve(db);
    });

    return deferred.promise;
}


/**
 * Acquire a connection to the user account activity logging database.
 *
 * Acquire a connection to the user account activity logging database, pulling
 * that connection from a database connection pool. Note that this may be the
 *      same database as the user accounts database.
 *
 * @return {Q.promise} Promise that resolves to a connection (mongodb.Db) to the
 *      user accounts activity logging database.
**/
function acquireLoggingDBConnection() {
    var deferred = q.defer();

    loggingDBPool.acquire(function (err, db) {
        if(err) {
            var message = 'Error while acquiring logging DB connection: ' + err;
            throw new Error(message);
        }
        deferred.resolve(db);
    });

    return deferred.promise;
}


/**
 * Release an accounts database connection back to the database connection pool.
 *
 * @param {mongodb.Db} db The database client to release back to the connection
 *      pool for the account database.
**/
function releaseAccountDBConnection(db) {
    accountDBPool.release(db);
}


/**
 * Release a logging database connection back to the database connection pool.
 *
 * @param {mongo.Db} db The database client to release back to the connection
 *      pool for the logging database.
**/
function releaseLoggingDBConnection(db) {
    loggingDBPool.release(db);
}


/**
 * Get the accounts collection within the accounts database.
 *
 * @param {mongodb.Db} db Connection to the accounts database.
 * @return {Q.promise} Promise that resolves to the account collection
 *      (mongodb.Collection).
**/
function getAccountCollection(db) {
    var deferred = q.defer();

    db.collection(ACCOUNT_COLLECTION, function (err, collection) {
        deferred.resolve(collection);
    });

    return deferred.promise;
}


/**
 * Get the usages collection within the logging database.
 *
 * @param {mongodb.Db} db Connection to the logging database.
 * @return {Q.promise} Promise that resolves to the usagees collection
 *      (mongodb.Collection).
**/
function getUsageCollection(db) {
    var deferred = q.defer();

    db.collection(USAGE_COLLECTION, function (err, collection) {
        deferred.resolve(collection);
    });

    return deferred.promise;
}


/**
 * Find an account record for an email address within given a collection.
 *
 * Search the given collection for a record of a user with the given email
 * address.
 *
 * @param {String} email Finds a user account with this email address.
 * @return {Q.promise} Promise that resolves to an Account object as described
 *      in the structures article of the project wiki or null if a matching
 *      account record could not be found.
**/
function getUserByEmail(collection, email) {
    var deferred = q.defer();

    collection.findOne({email: email}, function (err, doc) {
        if (err) {
            var message = 'Error while searching for user by email: ' + err;
            throw new Error(message);
        }

        deferred.resolve(doc);
    });

    return deferred.promise;
}


/**
 * Find a user given that user's API key within the given collection.
 *
 * Search the given collection for a record of a user account assigned the
 * given API key.
 *
 * @param {String} apiKey Finds a user with this API key.
 * @return {Q.promise} Promise that resolves to an Account object as described
 *      in the structures article of the project wiki or null if a matching
 *      account record could not be found.
**/
function getUserByAPIKey(collection, apiKey) {
    var deferred = q.defer();

    collection.findOne({apiKey: apiKey}, function (err, doc) {
        if (err) {
            var message = 'Error while searching for user by key: ' + err;
            throw new Error(message);
        }

        deferred.resolve(doc);
    });

    return deferred.promise;
}


/**
 * Save a new user account record or update an existing one in this collection.
 *
 * Save a record of a user account to the given collection. An existing record
 * be replaced if it has the same email address and a new record will be created
 * if no records with the same email address can be found.
 *
 * @param {Object} account Account object as described in the structures article
 *      of the project wiki.
 * @return {Q.promise} Promise that resolves to the provided Account object
 *      after it has been saved to the database.
**/
function putUser(collection, account) {
    var deferred = q.defer();
    var email = account.email;

    collection.update(
        {email: email},
        account,
        {safe: true, upsert:true},
        function (err, count) {
            if (err) {
                var message = 'Error while updating user: ' + err;
                throw new Error(message);
            }

            deferred.resolve(account);
        }
    );

    return deferred.promise;
}


/**
 * Indicate that an account executed a query, recording to the given collection.
 *
 * Persist a record of a user having executed a query along with a flag
 * indicating if that user request was fulfilled successfully.
 *
 * @param {String} apiKey The apiKey belonging to the user that executed the
 *      provided query.
 * @param {Object} query Query object as described in the structures article of
 *      the project wiki.
 * @param {String} error Optional parameter. Should be a description of an error
 *      encountered while fulfilling the user request. This includes malformed
 *      user requests, exceeding request limits, server errors, or anything that
 *      caused the appliction to fail to return 200 (OK). If no error, this
 *      parameter should be left as undefined.
 * @return {Q.proimse} Promise that resovles to the record being persisted after
 *      the asynchronous write request has been made to the database. This will
 *      potentially resolve before the actual write.
**/
function reportUsage(collection, apiKey, query, error) {
    var deferred = q.defer();

    var newRecord = {
        apiKey: apiKey,
        query: query,
        error: error,
        createdOn: new Date()
    };
    collection.insert(
        newRecord,
        {w: 1},
        function () {
            deferred.resolve(newRecord);
        }
    );

    return deferred.promise;
}


/**
 * Finds usage logs within a given datetime range in the given collection.
 *
 * Finds log entries within a given datetime range indicating that a query was
 * executed for a given user. Only searches the provided collection.
 *
 * @param {String} apiKey Finds log entries for the user that owns this API key.
 * @param {Date} startDate Start of the datetime range to find activity within.
 * @param {Date} endDate End of the datetime range to find activity within.
 * @return {Q.promise} Promise that resolves to an Array of QueryLog Objects as
 *      described in the structures section of the project wiki.
**/
function findAPIKeyUsage(collection, apiKey, startDate, endDate) {
    var deferred = q.defer();
    var searchFilter = {
        apiKey: apiKey,
        createdOn: {'$gt': startDate, '$lt': endDate}
    };

    collection.find(searchFilter).toArray(function (err, docs) {
        if (err) {
            var message = 'Error while searching for user by email: ' + err;
            throw new Error(message);
        }

        deferred.resolve(docs);
    });

    return deferred.promise;
}


/**
 * Remove old API usage records in this collection for a user.
 *
 * Requst API usage records older than a certain datetime be removed for the
 * user with the given API key. Only removes records from the given collection.
 *
 * @param {String} apiKey The API key of the user for whom old API usage records
 *      should be removed.
 * @param {Date} endDate The datetime before which API usage records should be
 *      removed.
 * @param {Boolean} removeErrors If true, remove all records before the endDate.
 *      If false, only remove records that did not have an error.
 * @return {Q.proimse} Promise that resovles to undefined after the asynchronous
 *      remove request has been made to the database. This will potentially
 *      resolve before the actual remove.
**/
function removeOldUsageRecords(collection, apiKey, endDate, removeErrors) {
    var deferred = q.defer();

    var searchFilter;
    if (removeErrors) {
        searchFilter = {
            apiKey: apiKey,
            createdOn: {'$lt': endDate}
        };
    } else {
        searchFilter = {
            apiKey: apiKey,
            createdOn: {'$lt': endDate},
            error: null
        };
    }
    
    collection.remove(searchFilter, {w: 1}, function () {
        deferred.resolve();
    });

    return deferred.promise;
}


/**
 * Wrap a function that operates on a collection with logic to get a collection.
 *
 * Decorates a function with database manipulation logic in logic to get a
 * database connection and collection before excuting that original function
 * and releasing that database connection to a database connection pool. The
 * decorated function must return a Q.promise.
 *
 * @param {function} targetFunction The function that operates on a collection
 *      (mongodb.Collection) to decorate.
 * @param {String} database Name identifying the database to connect to. Must
 *      correspond to a property in ACQUIRE_DB_CONNECTION_STRATEIGES /
 *      RELEASE_DB_CONNECTION_STRATEIGES in this module.
 * @param {String} collection The name of the collection to select from the
 *      database connected to as specified in the database argument / parameter.
 *      Provided name must correspond to a property in
 *      SELECT_COLLECTION_STRATEGIES.
**/
function decorateForDatabase(targetFunction, database, collection, context) {
    var acquireStrategy = ACQUIRE_DB_CONNECTION_STRATEGIES[database];
    var releaseStrategy = RELEASE_DB_CONNECTION_STRATEGIES[database];
    var collectionSelectStrategy = SELECT_COLLECTION_STRATEGIES[collection];

    var innerState = this;

    innerState.connection = 'test';

    var createTargetFunctionClosure = function (args) {
        return function (collection) {
            args.unshift(collection);
            return targetFunction.apply(null, args);
        };
    };

    var throwError = function(error) {
        var message = 'Error while ' +  context + ': ' + error;
        message += ': ' + error.stack;
        message += '\n\n';
        console.log(message);
        throw new Error(message);
    };

    var error;
    if (acquireStrategy === undefined) {
        error = acquireStrategy + ' not a valid DB acquisition strategy.';
        throw new Error(error);
    }

    if (releaseStrategy === undefined) {
        error = releaseStrategy + ' not a valid DB release strategy.';
        throw new Error(error);
    }

    if (collectionSelectStrategy === undefined) {
        error = collectionSelectStrategy;
        error += ' invalid collection getter strategy.';
        throw new Error(error);
    }

    return function () {
        var args = Array.prototype.slice.call(arguments);
        var deferred = q.defer();

        var executeDBOperations = function(database) {
            var innerDeferred = q.defer();

            collectionSelectStrategy(database)
            .then(createTargetFunctionClosure(args), throwError)
            .then(deferred.resolve, throwError)
            .fail(throwError);

            innerDeferred.resolve(database);
            return innerDeferred.promise;
        };

        acquireStrategy()
        .then(executeDBOperations, throwError)
        .then(releaseStrategy, throwError)
        .fail(throwError);

        return deferred.promise;
    };
}


/**
 * Find a user account record given that user's email address.
 *
 * Search the accounts database for a record of a user with the given email
 * address.
 *
 * @param {String} email Finds a user account with this email address.
 * @return {Q.promise} Promise that resolves to an Account object as described
 *      in the structures article of the project wiki or null if a matching
 *      account record could not be found.
**/
exports.getUserByEmail = decorateForDatabase(
    getUserByEmail,
    'account',
    'account',
    'getting user by email'
);


/**
 * Find a user given that user's API key.
 *
 * Search the accounts database for a record of a user account assigned the
 * given API key.
 *
 * @param {String} apiKey Finds a user with this API key.
 * @return {Q.promise} Promise that resolves to an Account object as described
 *      in the structures article of the project wiki or null if a matching
 *      account record could not be found.
**/
exports.getUserByAPIKey = decorateForDatabase(
    getUserByAPIKey,
    'account',
    'account',
    'getting user by api key'
);


/**
 * Save a new user account record or update an existing one.
 *
 * Save a record of a user account to the accounts database. An existing record
 * be replaced if it has the same email address and a new record will be created
 * if no records with the same email address can be found.
 *
 * @param {Object} account Account object as described in the structures article
 *      of the project wiki.
 * @return {Q.promise} Promise that resolves to the provided Account object
 *      after it has been saved to the database.
**/
exports.putUser = decorateForDatabase(
    putUser,
    'account',
    'account',
    'persisting user'
);


/**
 * Indicate that an account executed a query.
 *
 * Persist a record of a user having executed a query along with a flag
 * indicating if that user request was fulfilled successfully.
 *
 * @param {String} apiKey The apiKey belonging to the user that executed the
 *      provided query.
 * @param {Object} query Query object as described in the structures article of
 *      the project wiki.
 * @param {String} error Optional parameter. Should be a description of an error
 *      encountered while fulfilling the user request. This includes malformed
 *      user requests, exceeding request limits, server errors, or anything that
 *      caused the appliction to fail to return 200 (OK). If no error, this
 *      parameter should be left as undefined.
 * @return {Q.proimse} Promise that resovles to the record being persisted after
 *      the asynchronous write request has been made to the database. This will
 *      potentially resolve before the actual write.
**/
exports.reportUsage = decorateForDatabase(
    reportUsage,
    'logging',
    'usage',
    'reporting account usage'
);


/**
 * Finds usage logs within a given datetime range for a given account.
 *
 * Finds log entries within a given datetime range indicating that a query was
 * executed for a given user.
 *
 * @param {String} apiKey Finds log entries for the user that owns this API key.
 * @param {Date} startDate Start of the datetime range to find activity within.
 * @param {Date} endDate End of the datetime range to find activity within.
 * @return {Q.promise} Promise that resolves to an Array of QueryLog Objects as
 *      described in the structures section of the project wiki.
**/
exports.findAPIKeyUsage = decorateForDatabase(
    findAPIKeyUsage,
    'logging',
    'usage',
    'finding account usage'
);


/**
 * Remove old API usage records for the user with the given API key.
 *
 * Requst API usage records older than a certain datetime be removed for the
 * user with the given API key.
 *
 * @param {String} apiKey The API key of the user for whom old API usage records
 *      should be removed.
 * @param {Date} endDate The datetime before which API usage records should be
 *      removed.
 * @param {Boolean} removeErrors If true, remove all records before the endDate.
 *      If false, only remove records that did not have an error.
 * @return {Q.proimse} Promise that resovles to undefined after the asynchronous
 *      remove request has been made to the database. This will potentially
 *      resolve before the actual remove.
**/
exports.removeOldUsageRecords = decorateForDatabase(
    removeOldUsageRecords,
    'logging',
    'usage',
    'removing old usage records'
);
