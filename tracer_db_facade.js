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
 * @return {Q.promise} Promise that resolves to an Array of Object where each
 *      Object holds the information loaded from a single record returned from
 *      the database.
**/
exports.executeQuery = function(query)
{

};
