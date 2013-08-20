/**
 * Unit tests for logic to read / query the political finance records database.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

var q = require('q');
var rewire = require('rewire');

var mock_mongodb = require('./mock_mongodb');
var tracer_db_facade = rewire('../tracer_db_facade');

// Dependency injection for MongoDB
var mock_mongo_client = new mock_mongodb.MockMongoClient();
tracer_db_facade.__set__('mongodb.MongoClient', mock_mongo_client);

// Create dependency injection runtime / environment / configuration
var TEST_TRACER_DB_URI = 'test_tracer_uri';
var TEST_COMMITEE_ID_1 = 1;
var TEST_COMMITEE_ID_2 = 2;
var TEST_DEFAULT_LIMIT = 50;
var TEST_COLLECTION_NAME = 'test_collection';

// Dependency injection for runtime environment
var replacementConfig = {
    TRACER_DB_URI: TEST_TRACER_DB_URI
};
var replacementLoadConfig = function () {
    var deferred = q.defer();
    deferred.resolve(replacementConfig);
    return deferred.promise;
};

// Partial dependency injection on tracer_db_facade beahvioral constants
tracer_db_facade.__set__('MAX_DB_CONNECTIONS', 1);
tracer_db_facade.__set__('DB_TIMEOUT', 1);
tracer_db_facade.__set__('DEFAULT_RESULT_LIMIT', TEST_DEFAULT_LIMIT);
tracer_db_facade.__set__('env_config.loadConfig', replacementLoadConfig);

// Dependency injection on tracer_db_config
var TEST_ALLOWED_FIELDS = {};
TEST_ALLOWED_FIELDS[TEST_COLLECTION_NAME] = {
    minAmount: {dbField: 'amount', queryOp: '$gte'},
    maxAmount: {dbField: 'amount', queryOp: '$lte'},
    name: {dbField: 'name'}
};
tracer_db_facade.__set__('ALLOWED_FIELDS', TEST_ALLOWED_FIELDS);

// Drain default pools
var createTracerDBPool = tracer_db_facade.__get__('createTracerDBPool');
var tracerDBPool = tracer_db_facade.__get__('tracerDBPool');
tracerDBPool.drain(function(){ tracerDBPool.destroyAllNow(); });


module.exports = {

    /**
     * Setup operations in preparation for each tracer_db_facade unit test.
     *
     * Setup operations in preparation for each tracer_db_facade unit test,
     * specifically to create a new DB connections pools.
     *
     * @param {function} callback Nodeunit standard callback function to execute
     *      after setup operations have completed.
    **/
    setUp: function (callback) {
        tracer_db_facade.__set__('tracerDBPool', createTracerDBPool());
        callback();
    },

    /**
     * Clean up operations executed after each tracer_db_facade unit test.
     *
     * Clean up operations executed after each tracer_db_facade unit test,
     * specifically to drain DB connections pools.
     *
     * @param {function} callback Nodeunit standard callback function to execute
     *      after clean up operations have completed.
    **/
    tearDown: function (callback) {
        var tracerDBPool = tracer_db_facade.__get__('tracerDBPool');
        tracerDBPool.drain(function(){ tracerDBPool.destroyAllNow(); });
        callback();
    },

    /**
     * Test executing a query and streaming the results back.
     *
     * Test executing a TRACER records database query using a database-agnostic
     * Query object (as described in the structures section of the project
     * wiki) and streaming the results back instead of loading them all at once
     * into memory.
     *
     * @param {nodeunit.test} test The nodeunit test this routine is running
     *      under.
    **/
    testExecuteQuery: function (test) {
        var results = [];
        var testResult = [
            {comitteeID: TEST_COMMITEE_ID_1},
            {comitteeID: TEST_COMMITEE_ID_2}
        ];
        var expectedSelector = {
            amount: {$gte: 1, $lte: 5000}
        };
        var testQuery = {
            targetCollection: TEST_COLLECTION_NAME,
            params: {
                minAmount: 1,
                maxAmount: 5000
            }
        };
        var expectedOptions = {
            skip: 0,
            limit: TEST_DEFAULT_LIMIT
        }

        mock_mongo_client.prepareForNextUse(testResult);

        tracer_db_facade.executeQuery(
            testQuery,
            function (nextResult) {
                results.push(nextResult);
            },
            function () {
                test.deepEqual(results, testResult);
                test.deepEqual(
                    mock_mongo_client.getLastSelector(),
                    expectedSelector
                );
                test.deepEqual(
                    mock_mongo_client.getLastOptions(),
                    expectedOptions
                );
                test.equal(
                    mock_mongo_client.getLastCollectionName(),
                    TEST_COLLECTION_NAME
                );
                test.done();
            },
            function (error) {
                test.ok(false, 'Unexpected error: ' + error);
            }
        ).fail(function (err) {test.ok(false, err); test.done();});
    },

    /**
     * Test paging through query results.
     *
     * Test executing a TRACER records database query using a database-agnostic
     * Query object (as described in the structures section of the project
     * wiki) but skipping a certain number of initial results before streaming
     * records in the process.
     *
     * @param {nodeunit.test} test The nodeunit test this routine is running
     *      under.
    **/
    testPaging: function (test) {
        var results = [];
        var testResult = [
            {comitteeID: TEST_COMMITEE_ID_1},
            {comitteeID: TEST_COMMITEE_ID_2}
        ];
        var expectedSelector = {
            amount: {$gte: 1, $lte: 5000}
        };
        var testQuery = {
            targetCollection: TEST_COLLECTION_NAME,
            params: {
                minAmount: 1,
                maxAmount: 5000
            },
            offset: 100,
            resultLimit: TEST_DEFAULT_LIMIT+1
        };
        var expectedOptions = {
            skip: 100,
            limit: TEST_DEFAULT_LIMIT+1
        }

        mock_mongo_client.prepareForNextUse(testResult);

        tracer_db_facade.executeQuery(
            testQuery,
            function (nextResult) {
                results.push(nextResult);
            },
            function () {
                test.deepEqual(results, testResult);
                test.deepEqual(
                    mock_mongo_client.getLastSelector(),
                    expectedSelector
                );
                test.deepEqual(
                    mock_mongo_client.getLastOptions(),
                    expectedOptions
                );
                test.equal(
                    mock_mongo_client.getLastCollectionName(),
                    TEST_COLLECTION_NAME
                );
                test.done();
            },
            function (error) {
                test.ok(false, 'Unexpected stream error: ' + error);
                test.done();
            }
        ).fail(function (err) {test.ok(false, err); test.done();});
    },


    /**
     * Test that tracer_db_facade will default to $eq for a query operation.
     *
     * Test that tracer_db_facade will use $eq for a query operation if none is
     * explicitly provided.
     *
     * @param {nodeunit.test} test The nodeunit test that this routine is
     *      running under.
    **/
    testDefaultQueryOp: function (test) {
        var results = [];
        var testResult = [
            {comitteeID: TEST_COMMITEE_ID_1},
            {comitteeID: TEST_COMMITEE_ID_2}
        ];
        var expectedSelector = {
            name: {$eq: 'Test Name'}
        };
        var testQuery = {
            targetCollection: TEST_COLLECTION_NAME,
            params: {
                name: 'Test Name'
            }
        };

        mock_mongo_client.prepareForNextUse(testResult);

        tracer_db_facade.executeQuery(
            testQuery,
            function (nextResult) {
                results.push(nextResult);
            },
            function () {
                test.deepEqual(results, testResult);
                test.deepEqual(
                    mock_mongo_client.getLastSelector(),
                    expectedSelector
                );
                test.equal(
                    mock_mongo_client.getLastCollectionName(),
                    TEST_COLLECTION_NAME
                );
                test.done();
            },
            function (error) {
                test.ok(false, 'Unexpected stream error: ' + error);
                test.done();
            }
        ).fail(function (err) {test.ok(false, err); test.done();});
    },

    /**
     * Test refusual to execute a query on an unauthorized collection.
     *
     * Test that tracer_db_facade refuses to execute a query on an unauthorized
     * collection.
     *
     * @param {nodeunit.test} test The nodeunit test this routine is running
     *      under.
    **/
    testInvalidCollection: function (test) {
        var testResult = [
            {comitteeID: TEST_COMMITEE_ID_1},
            {comitteeID: TEST_COMMITEE_ID_2}
        ];
        var testQuery = {
            targetCollection: 'not_TEST_COLLECTION_NAME',
            params: {},
        };

        mock_mongo_client.prepareForNextUse(testResult);

        tracer_db_facade.executeQuery(
            testQuery,
            function (nextResult) {
                test.ok(false, 'Unexpected success.');
            },
            function () {
                test.ok(false, 'Unexpected success.');
            },
            function (error) {
                test.done();
            }
        ).fail(function (err) {test.done();});
    }
};
