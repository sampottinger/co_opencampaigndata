/**
 * Logic for user accounts, throttling, and user account activity logging.
 *
 * Logic for creating and retrieving user accounts as well as tracking user
 * account activity, limiting queries per second if necessary to prevent abuse.
 * Note that logic for actual communication with the database resides in
 * account_db_facade, making this a decorator for that module.
 *
 * @author A. Samuel Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPLv3
**/

var q = require('q');

var account_db_facade = require('./account_db_facade');

var MAX_QPM = 6000;
var API_KEY_LEN = 15;
var DAY_MINUTES = 1440; // Number of minutes in a day
var MILLIS_PER_MINUTE = 60000;
var KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
var TYPICAL_USER = 'typical_user';
var ADMIN_USER = 'admin_user';


/**
 * Generate a random string of the given length.
 *
 * @param {Number} length Integer length of the string to generate.
 * @return {String} The generated String.
 * @author http://stackoverflow.com/questions/1349404
**/
function generateRandomString(length)
{
    charSet = KEY_CHARS;
    var randomString = '';
    for (var i = 0; i < length; i++) {
        var randomPos = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPos,randomPos+1);
    }
    return randomString;
}


/**
 * Generate a new random API key not currently assigned to a user.
 *
 * @return {Q.promise} Promise that resolves to a String with the new API key.
**/ 
function generateNewAPIKey()
{
    var deferred = q.defer();
    var possibleAPIKey = generateRandomString(API_KEY_LEN);
    
    var checkExisitingOwner = function (existingOwner) {
        if (existingOwner === null) {
            deferred.resolve(possibleAPIKey);
        } else {
            generateNewAPIKey().then(function (newKey) {
                deferred.resolve(newKey);
            });
        }
    };

    account_db_facade.getUserByAPIKey(possibleAPIKey).then(checkExisitingOwner);
    
    return deferred.promise;
}


/**
 * Save a new user account.
 *
 * @param {Object} account The Account Object (see structures page on wikie) to
 *      persist to the accounts database.
**/
function createNewAccount(email, apiKey, permissions)
{
    account = {
        email: email,
        apiKey: apiKey,
        permissions:TYPICAL_USER
    };
    return account_db_facade.putUser(account);
}


/**
 * Get the account record for a user with the given email address.
 *
 * Get the existing account record for a user with the given email address or
 * creating a new account record if one does not already exists.
 *
 * @param {String} email The email address of the user for whom an account
 *      record is being requested.
 * @return {Q.promise} Promise that resolves to the Account record for the user
 *      with the given email address.
**/
exports.getOrCreateUserByEmail = function(email)
{
    var deferred = q.defer();

    account_db_facade.getUserByEmail(email).then(function(account){

        // If account exists, return it right off
        if (account !== null) {
            deferred.resolve(account);
            return;
        }

        // Otherwise, create closure over email.
        var createNewAccountWithEmail = function (apiKey) {
            return createNewAccount(email, apiKey, TYPICAL_USER);
        };

        // Generate an new unique API key and create account.
        generateNewAPIKey()
        .then(createNewAccountWithEmail)
        .then(deferred.resolve)
        .fail(function (error) {
            throw new Error('Error while creating account: ' + error);
        });

    }).fail( function (error) { throw new Error(error); });

    return deferred.promise;
};


/**
 * Determine if an account can make the given query.
 *
 * Determine if a user account can make the given request given throttling
 * (request rate limiting) and permissions.
 *
 * @param {Object} account Object describing the Account that is making the
 *      given query. Should be an Account Object as described in the structures
 *      section of the project wiki.
 * @param {Object} query Object describing the query that the user wants to
 *      execute. Should be a Query Object as described in the structures section
 *      of the project wiki.
 * @return {Q.promise} Promise that resolves to true if the user can fulfill
 *      the given query and false otherwise.
**/
exports.canFulfillQuery = function(account, query)
{
    var deferred = q.defer();
    var lastMinuteMillis = new Date().getTime() - MILLIS_PER_MINUTE;
    var lastMinute = new Date(lastMinuteMillis);
    var now = new Date();

    account_db_facade.findAPIKeyUsage(account.apiKey,lastMinute,now)
    .then(function (activity) {
        deferred.resolve(activity.length < MAX_QPM);
    })
    .fail(function (error) {
        throw new Error('Failed checking account usage: ' + error);
    });

    return deferred.promise;
};


/**
 * Log a user request and clean up that user's old log entries.
 *
 * Log a request executed on behalf of a user and remove old log entries that
 * executed without error.
 *
 * @param {Object} account Object with account information for the user that
 *      executed the given request. See the Account Object structure in the
 *      structures section of the project wiki.
 * @param {Object} query The query executed. See the Query Object structure in
 *      the structures section of the project wiki.
 * @param {String} error Optional parameter. If provided, the error encountered
 *      while fulfilling this user's request (executing the provided query for
 *      the provided user).
 * @return {Q.promise} Promise that resolves to undefined after the requests
 *      have been made. However, it may resolve before the database operations
 *      have actually finished.
**/ 
exports.updateAccountLog = function(account, query, error)
{
    var deferred = q.defer();
    var apiKey = account.apiKey;
    var keepRecordsStartDate = DAY_MINUTES * MILLIS_PER_MINUTE;
    var removeEntriesBeforeMillis = new Date().getTime() - keepRecordsStartDate;
    var removeEntriesBeforeDate = new Date(removeEntriesBeforeMillis);

    var reportUsage = function () {
        return account_db_facade.reportUsage(apiKey, query, error);
    };

    var removeOldEntries = function () {
        return account_db_facade.removeOldUsageRecords(
            apiKey,
            removeEntriesBeforeDate,
            false
        );
    };

    reportUsage()
    .then(removeOldEntries)
    .then(deferred.resolve)
    .fail(function (error) {
        throw new Error('Failed updating account log: ' + error);
    });

    return deferred.promise;
};
