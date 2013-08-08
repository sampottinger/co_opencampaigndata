/**
 * Logic to serialize Objects to CSV, JSON, and other structured formats.
 *
 * Logic to transform Objects to various structured formats including CSV and
 * JSON. This module supports the formatting of query results for end user
 * responses.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

// Listing of available serialization routines.
var serializationStrategies = {
    'csv': formatAsCSV,
    'json': formatAsJSON
};


/**
 * Format the given collection of Objects to a 2D CSV table.
 *
 * @param {Array} corpus Array of Object to convert to a CSV table.
 * @param {Array} fields Array of String field names to include in the CSV
 *      table.
 * @param {String} unusedLabel The label to assign to the collection of results
 *      after being converted to CSV. This does not apply to the CSV format and
 *      will be ignored.
 * @return {Q.promise} Promise that resolves to a String with the resulting
 *      return CSV values.
**/
function formatAsCSV(corpus, fields, ununsedLabel)
{

}


/**
 * Format the given collection of Objects to a JSON document.
 *
 * @param {Array} corpus Array of Object to convert to a JSON document.
 * @param {Array} fields Array of String field names to include in the JSON
 *      document.
 * @param {String} label The name of the object property to give to the Array
 *      of serialized results. So, label = "testLabel" will yield an object
 *      of form {"testLabel": [...]}.
 * @return {Q.promise} Promise that resolves to a String containing the
 *      resulting JSON document.
**/
function formatAsJSON(corpus, fields, label)
{

}


/**
 * Format the given collection of Objects to the given serialization format.
 *
 * Converts the given collection of Objects into a String representing a
 * serailization of that Object collection in the requested format.
 *
 * @param {String} format The name of the format to convert the collection of
 *      Objects to. Examples include "json" or "csv" for JSON and CSV
 *      respectively.
 * @param {Array} corpus An Array of Object to serialize to the given format.
 * @param {Array} fields The name of the fields to include in the serialized
 *      version of the proivded corpus.
 * @param {String} label If the format requires a label describing the corpus
 *      (examples include expenditures, loans, or contributions), this String
 *      label will be used.
**/
exports.format = function(format, corpus, fields, label)
{

};
