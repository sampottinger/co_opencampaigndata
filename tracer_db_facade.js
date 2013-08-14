/**
 * Logic to read and query the political finance database.
 *
 * Logic to read / query the political finance database. However, note that an
 * external independent process provides aggregation into this database.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/


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
exports.executeQuery = function(query, onNext, onEnd, onError) {

};
