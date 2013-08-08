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
exports.getUserByEmail = function(email)
{

};


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
exports.getUserByAPIKey = function(apiKey)
{

};


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
exports.putUser = function(account)
{

};


/**
 * Indicate that an account executed a query.
 *
 * Persist a record of a user having executed a query along with a flag
 * indicating if that user request was fulfilled successfully.
 *
 * @param {Object} account The user account for which this query was executed.
 * @param {Object} query Query object as described in the structures article of
 *      the project wiki.
 * @param {String} error Optional parameter. Should be a description of an error
 *      encountered while fulfilling the user request. This includes malformed
 *      user requests, exceeding request limits, server errors, or anything that
 *      caused the appliction to fail to return 200 (OK). If no error, this
 *      parameter should be left as undefined.
 * @return {Q.proimse} Promise that resovles to undefined after the asynchronous
 *      write request has been made to the database. This will potentially
 *      resolve before the actual write.
**/
exports.reportUsage = function(account, query, error)
{

};


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
exports.findAPIKeyUsage = function(apiKey, startDate, endDate)
{

};


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
exports.removeOldUsageRecords = function(apiKey, endDate, removeErrors)
{

};
