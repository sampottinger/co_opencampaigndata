/**
 * Unit tests for logic for interacting with the user account database.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

// TODO: This is experimental and in progress! Do not rely on this code yet!
// WARNING: This is experimental and in progress! Do not rely on this code yet!

var rewire = require('rewire');

var mock_mongodb = require('./mock_mongodb');

var TEST_EMAIL = 'user@test.com';
var TEST_API_KEY = 'testapikey';
var TEST_ACCOUNT_DB_URI = 'test_account_db_uri';
var TEST_ACCOUNT_COLLECTION = 'test_accounts';
var TEST_USAGE_COLLECTION = 'test_usages';

// Depenency injection for mongodb.
var mongodb = rewire('mongodb');
mock_mongo_client = new mock_mongodb.MockMongoClient();
mongodb.__set__('MongoClient', mock_mongo_client);

// Dependency injection for runtime environment
var process = rewire('process');
process.__set__('env.ACCOUNT_DB_URI', TEST_ACCOUNT_DB_URI);

// Partial dependency injection on account_db_facade
var account_db_facade = rewire('./account_db_facade');
account_db_facade.__set__('ACCOUNT_COLLECTION', TEST_ACCOUNT_COLLECTION);
account_db_facade.__set__('USAGE_COLLECTION', TEST_USAGE_COLLECTION);


/**
 * Test getting a user account record given that user's email address.
 *
 * @param {nodeunit.test} Object describing the nodeunit test currently running.
**/
exports.testGetUserByEmail = function(test)
{
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
    });
};


/**
 * Test getting a user account record given that user's API key.
 *
 * @param {nodeunit.test} Object describing the nodeunit test currently running.
**/
exports.testGetUserByAPIKey = function(test)
{
    mock_mongo_client.prepareForNextUse({email: TEST_EMAIL});

    account_db_facade.getUserByAPIKey(TEST_API_KEY).then(function(retAccount){
        test.equal(retAccount.email, TEST_EMAIL);

        test.deepEqual(mock_mongo_client.getLastSelector(),
            {apiKey: TEST_API_KEY});
        test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
        test.equal(mock_mongo_client.getLastCollectionName(),
            TEST_ACCOUNT_COLLECTION);

        test.equal(mock_mongo_client.getLastOperation(), 'findOne');

        test.done();
    });
};


/**
 * Test updating a user record.
 *
 * @param {nodeunit.test} Object describing the nodeunit test currently running.
**/
exports.testPutUser = function(test)
{
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
    });
};


/**
 * Test reporting that an account executed a query without error.
 *
 * @param {nodeunit.test} Object describing the nodeunit test currently running.
**/
exports.testReportUsageNoError = function(test)
{
    mock_mongo_client.prepareForNextUse();
    var testUser = {email: TEST_EMAIL, apiKey: TEST_API_KEY};
    var query = {recordID: 12345};

    account_db_facade.reportUsage(testUser, query).then(function(){
        test.equal(retRecord.apiKey, TEST_API_KEY);
        test.deepEqual(retRecord.query, query);
        test.equal(retRecord.error, null);

        test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
        test.equal(mock_mongo_client.getLastCollectionName(),
            TEST_USAGE_COLLECTION);

        test.equal(mock_mongo_client.getLastOperation(), 'insert');

        test.done();
    });
};


/**
 * Test reporting that an account executed a query with an error.
 *
 * @param {nodeunit.test} Object describing the nodeunit test currently running.
**/
exports.testReportUsageError = function(test)
{
    mock_mongo_client.prepareForNextUse();
    var testUser = {email: TEST_EMAIL, apiKey: TEST_API_KEY};
    var query = {recordID: 12345};

    account_db_facade.reportUsage(testUser, query, 'test error')
    .then(function(){
        test.equal(retRecord.apiKey, TEST_API_KEY);
        test.deepEqual(retRecord.query, query);
        test.equal(retRecord.error, 'test error');

        test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
        test.equal(mock_mongo_client.getLastCollectionName(),
            TEST_USAGE_COLLECTION);

        test.equal(mock_mongo_client.getLastOperation(), 'insert');

        test.deepEqual(mock_mongo_client.getLastDocuments(), retRecord);

        test.done();
    });
};


/**
 * Test querying for a user's account activity by her API key.
 *
 * @param {nodeunit.Test} Object describing the nodeunit test currently running.
**/
exports.testFindAPIKeyUsage = function(test)
{
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

        test.deepEqual(mock_mongo_client.getLastSelector(), {
            apiKey: TEST_API_KEY,
            createdOn: {'$gte': startDate, '$lt': endDate}
        });

        test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
        test.equal(mock_mongo_client.getLastCollectionName(),
            TEST_USAGE_COLLECTION);

        test.equal(mock_mongo_client.getLastOperation(), 'find');

        test.done();
    });
};


/**
 * Test removing old account usage records, including those with errors.
 *
 * @param {nodeunit.Test} Object describing the nodeunit test currently running.
**/
exports.testFindAPIKeyUsageRemoveErrors = function(test)
{
    var endDate = new Date(2, 3, 2013);

    mock_mongo_client.prepareForNextUse(1);

    account_db_facade.removeOldUsageRecords(TEST_API_KEY, endDate, true)
    .then(function(){

        test.deepEqual(mock_mongo_client.getLastSelector(), {
            apiKey: TEST_API_KEY,
            createdOn: {'$lt': endDate}
        });

        test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
        test.equal(mock_mongo_client.getLastCollectionName(),
            TEST_USAGE_COLLECTION);

        test.equal(mock_mongo_client.getLastOperation(), 'remove');

        test.done();

    });
};


/**
 * Test removing old account usage records, excluding those with errors.
 *
 * @param {nodeunit.Test} Object describing the nodeunit test currently running.
**/
exports.testFindAPIKeyUsageNoRemoveErrors = function(test)
{
    var endDate = new Date(2, 3, 2013);

    mock_mongo_client.prepareForNextUse(1);

    account_db_facade.removeOldUsageRecords(TEST_API_KEY, endDate, false)
    .then(function(){

        test.deepEqual(mock_mongo_client.getLastSelector(), {
            apiKey: TEST_API_KEY,
            createdOn: {'$lt': endDate},
            error: null
        });

        test.equal(mock_mongo_client.getLastURI(), TEST_ACCOUNT_DB_URI);
        test.equal(mock_mongo_client.getLastCollectionName(),
            TEST_USAGE_COLLECTION);

        test.equal(mock_mongo_client.getLastOperation(), 'remove');

        test.done();

    });
};
