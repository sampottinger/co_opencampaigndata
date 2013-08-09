/**
 * Unit tests for accounts, throttling, and user account activity logging.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
**/

// TODO: This is experimental and in progress! Do not rely on this code yet!
// WARNING: This is experimental and in progress! Do not rely on this code yet!

var q = require('Q');
var rewire = require('rewire');
var sinon = require('sinon');

var account_db_facade = require('./account_db_facade');
var account_manager = rewire('./account_manager');

var TEST_EMAIL = 'email@test.com';
var TEST_API_KEY = 'apikey';
var DAY_MINUTES = 1440; // Number of minutes in a day
var MILLIS_PER_MINUTE = 60000;

// Modify account manager behavioral constants
account_manager.__set__('MAX_QPM', 2);
account_manager.__set__('LOG_ENTRY_LIFETIME_MINUTES', DAY_MINUTES);


/**
 * Test creating a new user.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testCreateUserByEmail = function(test)
{
    var partialAccount = {'email': TEST_EMAIL};

    var getByEmailStub = sinon.stub(account_db_facade, 'getUserByEmail');
    var putUserStub = sinon.stub(account_db_facade, 'putUser');

    var emailMatch = sinon.match.has('email', TEST_EMAIL);

    var emailLookupPromise = q.fcall(function(){return null;});
    var putAccountPromise = q.fcall(function(){return partialAccount;});

    getByEmailStub.returns(emailLookupPromise);
    putUserStub.returns(partialAccount);

    account_manager.getOrCreateUserByEmail(TEST_EMAIL).then(function(account)
    {
        test.equal(account.email, TEST_EMAIL);

        test.ok(getByEmailStub.calledWith(TEST_EMAIL));
        test.ok(putUserStub.calledWith(emailMatch));

        getByEmailStub.restore();
        putUserStub.restore();

        test.done();
    });
};


/**
 * Test finding a user given her email address.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testGetUserByEmail = function(test)
{
    var partialAccount = {'email': TEST_EMAIL};

    var getByEmailStub = sinon.stub(account_db_facade, 'getUserByEmail');
    var putUserStub = sinon.stub(account_db_facade, 'putUser');

    var emailLookupPromise = q.fcall(function(){return partialAccount;});

    getByEmailStub.returns(emailLookupPromise);
    putUserStub.throws(new Error('Put should not be called in this test.'));

    account_manager.getOrCreateUserByEmail(TEST_EMAIL).then(function(account)
    {
        test.equal(account.email, TEST_EMAIL);
        test.ok(getByEmailStub.calledWith(TEST_EMAIL));

        getByEmailStub.restore();
        putUserStub.restore();

        test.done();
    });
};


/**
 * Test checking if a user can execute a query.
 *
 * Test checking if a user can execute a query. This test specifically looks at
 * the case when the user should be able to execute the query.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testCanFulfillQuery = function(test)
{
    var partialAccount = {'apiKey': TEST_API_KEY};
    var partialQuery = {};
    var retLog = [{'apiKey': TEST_API_KEY}];

    var findAPIKeyUsageStub = sinon.stub(account_db_facade, 'findAPIKeyUsage');

    var apiKeyUsagePromise = q.fcall(function(){return retLog;});
    findAPIKeyUsageStub.returns(apiKeyUsagePromise);

    account_manager.canFulfillQuery(partialAccount, partialQuery)
    .then(function(canFulfillQuery)
    {
        test.equal(canFulfillQuery, true);
        findAPIKeyUsageStub.restore();
        test.done();
    });
};


/**
 * Test checking if a user can execute a query.
 *
 * Test checking if a user can execute a query. This test specifically looks at
 * the case when the user should not be able to execute the query.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testCannotFulfillQuery = function(test)
{
    var partialAccount = {'apiKey': TEST_API_KEY};
    var partialQuery = {};
    var retLog = [{'apiKey': TEST_API_KEY}, {'apiKey': TEST_API_KEY}];

    var findAPIKeyUsageStub = sinon.stub(account_db_facade, 'findAPIKeyUsage');

    var apiKeyUsagePromise = q.fcall(function(){return retLog;});
    findAPIKeyUsageStub.returns(apiKeyUsagePromise);

    account_manager.canFulfillQuery(partialAccount, partialQuery)
    .then(function(canFulfillQuery)
    {
        test.equal(canFulfillQuery, false);
        findAPIKeyUsageStub.restore();
        test.done();
    });
};


/**
 * Test checking if looking up an account log uses the right date range.
 *
 * Test checking if looking up an account log to see if that account can execute
 * a request uses the correct date range.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testCanFulfillQueryDates = function(test)
{
    var partialAccount = {'apiKey': TEST_API_KEY};
    var partialQuery = {};
    var retLog = [{'apiKey': TEST_API_KEY}];

    var clock = sinon.useFakeTimers();
    var findAPIKeyUsageStub = sinon.stub(account_db_facade, 'findAPIKeyUsage');

    var expectedStart = new Date().getTime() - MILLIS_PER_MINUTE;
    var expectedEnd = new Date().getTime();
    var isStartDate = function(val){return val.getTime() == expectedStart};
    var isEndDate = function(val){return val.getTime() == expectedEnd};
    var startDateMatch = sinon.match(isStartDate, 'Unexpected date.');
    var endDateMatch = sinon.match(isEndDate, 'Unexpected date.');

    var apiKeyUsagePromise = q.fcall(function(){return retLog;});
    findAPIKeyUsageStub.returns(apiKeyUsagePromise);

    account_manager.canFulfillQuery(partialAccount, partialQuery)
    .then(function(canFulfillQuery)
    {
        findAPIKeyUsageStub.calledWith(startDateMatch, endDateMatch);

        findAPIKeyUsageStub.restore();
        clock.restore();

        test.done();
    });
};


/**
 * Test logging a successful user request.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testUpdateAccountLog = function(test)
{
    var partialAccount = {'apiKey': TEST_API_KEY};
    var partialQuery = {};

    var reportUsageStub = sinon.stub(account_db_facade, 'reportUsage');
    var removeStub = sinon.stub(account_db_facade, 'removeOldUsageRecords');

    var expectedEnd = new Date().getTime() - DAY_MINUTES * MILLIS_PER_MINUTE;
    var isEndDate = function(val){return val.getTime() == expectedEnd};
    var endDateMatch = sinon.match(isEndDate, 'Unexpected date.');

    var updatePromise = q.fcall(function(){return;});
    reportUsageStub.returns(updatePromise);
    removeStub.returns(updatePromise);

    account_manager.updateAccountLog(partialAccount, partialQuery)
    .then(function()
    {
        reportUsageStub.calledWith(partialAccount, partialQuery);
        removeStub.calledWith(TEST_API_KEY, endDateMatch, false);

        // Ensure no error was passed
        test.equal(reportUsageStub.getCall(0).args.length, 2);

        reportUsageStub.restore();
        removeStub.restore();

        test.done();
    });
};


/**
 * Test logging a user request that produced an error.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testUpdateAccountLogError = function(test)
{
    var partialAccount = {'apiKey': TEST_API_KEY};
    var partialQuery = {};
    var testError = 'test error';

    var reportUsageStub = sinon.stub(account_db_facade, 'reportUsage');
    var removeStub = sinon.stub(account_db_facade, 'removeOldUsageRecords');

    var expectedEnd = new Date().getTime() - DAY_MINUTES * MILLIS_PER_MINUTE;
    var isEndDate = function(val){return val.getTime() == expectedEnd};
    var endDateMatch = sinon.match(isEndDate, 'Unexpected date.');

    var updatePromise = q.fcall(function(){return;});
    reportUsageStub.returns(updatePromise);
    removeStub.returns(updatePromise);

    account_manager.updateAccountLog(partialAccount, partialQuery, testError)
    .then(function()
    {
        reportUsageStub.calledWith(partialAccount, partialQuery, testError);
        removeStub.calledWith(TEST_API_KEY, endDateMatch, false);

        reportUsageStub.restore();
        removeStub.restore();

        test.done();
    });
};
