/**
 * Unit tests for logic for interacting with the user account database.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

var q = require('q');
var rewire = require('rewire');

var mock_mongodb = require('./mock_mongodb');
var test_util = require('./test_util');

var TEST_EMAIL = 'user@test.com';
var TEST_API_KEY = 'testapikey';
var TEST_ACCOUNT_DB_URI = 'test_account_db_uri';
var TEST_USAGES_DB_URI = 'test_usages_db_uri';
var TEST_ACCOUNT_COLLECTION = 'test_accounts';
var TEST_USAGE_COLLECTION = 'test_usages';

// Depenency injection for mongodb.
mock_mongo_client = new mock_mongodb.MockMongoClient();

// Dependency injection for runtime environment
var replacementConfig = {
    accountDBURI: TEST_ACCOUNT_DB_URI,
    loggingDBURI: TEST_USAGES_DB_URI
};
var replacementLoadConfig = function () {
    var deferred = q.defer();
    deferred.resolve(replacementConfig);
    return deferred.promise;
};

// Partial dependency injection on account_db_facade
var account_db_facade = rewire('../account_db_facade');
account_db_facade.__set__('ACCOUNT_COLLECTION', TEST_ACCOUNT_COLLECTION);
account_db_facade.__set__('USAGE_COLLECTION', TEST_USAGE_COLLECTION);
account_db_facade.__set__('MAX_DB_CONNECTIONS', 1);
account_db_facade.__set__('DB_TIMEOUT', 1);
account_db_facade.__set__('MAX_DB_CONNECTIONS', 1);
account_db_facade.__set__('env_config.loadConfig', replacementLoadConfig);
account_db_facade.__set__('mongodb.MongoClient', mock_mongo_client);

// Drain default pools
var createAccountDBPool = account_db_facade.__get__('createAccountDBPool');
var createLoggingDBPool = account_db_facade.__get__('createLoggingDBPool');
var accountDBPool = account_db_facade.__get__('accountDBPool');
var loggingDBPool = account_db_facade.__get__('loggingDBPool');
accountDBPool.drain(function(){ accountDBPool.destroyAllNow(); });
loggingDBPool.drain(function(){ loggingDBPool.destroyAllNow(); });


module.exports = {

    /**
     * Create new database connection pools ahead of each unit test.
     *
     * Create database connection pools ahead of each unit test to prevent
     * errors in one test from causing another test to fail.
     *
     * @param {function} callback Standard callback from nodeunit to call after
     *      test setup logic has finished.
    **/
    setUp: function(callback) {
        account_db_facade.__set__('accountDBPool', createAccountDBPool());
        account_db_facade.__set__('loggingDBPool', createLoggingDBPool());
        callback();
    },

     /**
     * Drain the database connection pool at the end of each unit test.
     *
     * Drain the database connection pool at the end of each unit test to
     * prevent errors in one test from causing another test to fail.
     *
     * @param {function} callback Standard callback from nodeunit to call after
     *      test tear down logic has finished.
    **/
    tearDown: function(callback) {
        var accountDBPool = account_db_facade.__get__('accountDBPool');
        var loggingDBPool = account_db_facade.__get__('loggingDBPool');

        accountDBPool.drain(function(){ accountDBPool.destroyAllNow(); });
        loggingDBPool.drain(function(){ loggingDBPool.destroyAllNow(); });

        callback();
    },


    /**
     * Test getting a user account record given that user's email address.
     *
     * @param {nodeunit.test} test Object describing the nodeunit test currently
     *      running.
    **/
    testGetUserByEmail: function (test) {
        mock_mongo_client.prepareForNextUse({email: TEST_EMAIL});

        account_db_facade.getUserByEmail(TEST_EMAIL).then(function(retAccount){
            test.equal(retAccount.email, TEST_EMAIL);

            test.deepEqual(mock_mongo_client.getLastSelector(),
                {email: TEST_EMAIL});
            test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_ACCOUNT_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'findOne');

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test getting a user account record given that user's API key.
     *
     * @param {nodeunit.test} test Object describing the nodeunit test currently
     *      running.
    **/
    testGetUserByAPIKey: function (test) {
        mock_mongo_client.prepareForNextUse({email: TEST_EMAIL});

        account_db_facade.getUserByAPIKey(TEST_API_KEY)
        .then(function(retAccount){
            test.equal(retAccount.email, TEST_EMAIL);

            test.deepEqual(mock_mongo_client.getLastSelector(),
                {apiKey: TEST_API_KEY});
            test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_ACCOUNT_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'findOne');

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test updating a user record.
     *
     * @param {nodeunit.test} test Object describing the nodeunit test currently
     *      running.
    **/
    testPutUser: function (test) {
        mock_mongo_client.prepareForNextUse();
        var testUser = {email: TEST_EMAIL};

        account_db_facade.putUser(testUser).then(function(retAccount){
            test.equal(retAccount.email, TEST_EMAIL);

            test.deepEqual(mock_mongo_client.getLastSelector(),
                {email: TEST_EMAIL});
            test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_ACCOUNT_COLLECTION);
            
            var lastOptions = mock_mongo_client.getLastOptions();
            test.equal(lastOptions.upsert, true);

            test.deepEqual(mock_mongo_client.getLastDocuments(), testUser);

            test.equal(mock_mongo_client.getLastOperation(), 'update');

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test reporting that an account executed a query without error.
     *
     * @param {nodeunit.test} test Object describing the nodeunit test currently
     *      running.
    **/
    testReportUsageNoError: function (test) {
        mock_mongo_client.prepareForNextUse();
        var query = {recordID: 12345};

        account_db_facade.reportUsage(TEST_API_KEY, query)
        .then(function(retRecord){
            test.equal(retRecord.apiKey, TEST_API_KEY);
            test.deepEqual(retRecord.query, query);
            test.equal(retRecord.error, null);

            test.equal(mock_mongo_client.getLastURI(), TEST_USAGES_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_USAGE_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'insert');

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test reporting that an account executed a query with an error.
     *
     * @param {nodeunit.test} test Object describing the nodeunit test currently
     *      running.
    **/
    testReportUsageError: function (test) {
        mock_mongo_client.prepareForNextUse();
        var query = {recordID: 12345};

        account_db_facade.reportUsage(TEST_API_KEY, query, 'test error')
        .then(function(retRecord){
            test.equal(retRecord.apiKey, TEST_API_KEY);
            test.deepEqual(retRecord.query, query);
            test.equal(retRecord.error, 'test error');

            test.equal(mock_mongo_client.getLastURI(), TEST_USAGES_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_USAGE_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'insert');

            test.deepEqual(mock_mongo_client.getLastDocuments(), retRecord);

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test querying for a user's account activity by her API key.
     *
     * @param {nodeunit.Test} test Object describing the nodeunit test currently
     *      running.
    **/
    testFindAPIKeyUsage: function (test) {
        var startDate = new Date(1, 2, 2013);
        var endDate = new Date(2, 3, 2013);

        var testRecord1 = {
            apiKey: TEST_API_KEY,
            query: {recordID: 12345},
            error: null
        };
        var testRecord2 = {
            apiKey: TEST_API_KEY,
            query: {recordID: 12345},
            error: null
        };

        var testRecords = [testRecord1, testRecord2];
        mock_mongo_client.prepareForNextUse(testRecords);

        account_db_facade.findAPIKeyUsage(TEST_API_KEY, startDate, endDate)
        .then(function(records){
            test.deepEqual(records, testRecords);

            var lastSelector = mock_mongo_client.getLastSelector();
            test.equal(lastSelector.apiKey, TEST_API_KEY);
            test.equal(lastSelector.createdOn.$gt, startDate);
            test.equal(lastSelector.createdOn.$lt, endDate);

            test.equal(mock_mongo_client.getLastURI(), TEST_USAGES_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_USAGE_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'find');

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test removing old account usage records, including those with errors.
     *
     * @param {nodeunit.Test} test Object describing the nodeunit test currently
     *      running.
    **/
    testFindAPIKeyUsageRemoveErrors: function (test) {
        var endDate = new Date(2, 3, 2013);

        mock_mongo_client.prepareForNextUse(1);

        account_db_facade.removeOldUsageRecords(TEST_API_KEY, endDate, true)
        .then(function(){
            var lastSelector = mock_mongo_client.getLastSelector();
            test.equal(lastSelector.apiKey, TEST_API_KEY);
            test.equal(lastSelector.createdOn.$lt, endDate);

            test.equal(mock_mongo_client.getLastURI(), TEST_USAGES_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_USAGE_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'remove');

            test.done();

        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test removing old account usage records, excluding those with errors.
     *
     * @param {nodeunit.Test} test Object describing the nodeunit test currently
     *      running.
    **/
    testFindAPIKeyUsageNoRemoveErrors: function (test) {
        var endDate = new Date(2, 3, 2013);

        mock_mongo_client.prepareForNextUse(1);

        account_db_facade.removeOldUsageRecords(TEST_API_KEY, endDate, false)
        .then(function(){

            test.deepEqual(mock_mongo_client.getLastSelector(), {
                apiKey: TEST_API_KEY,
                createdOn: {'$lt': endDate},
                error: null
            });

            test.equal(mock_mongo_client.getLastURI(), TEST_USAGES_DB_URI);
            test.equal(mock_mongo_client.getLastCollectionName(),
                TEST_USAGE_COLLECTION);

            test.equal(mock_mongo_client.getLastOperation(), 'remove');

            test.done();
        })
        .fail(function (error) { test_util.reportAsyncError(test, error); });
    }

};
