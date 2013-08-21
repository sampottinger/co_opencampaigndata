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

var Q = require('q');

// Listing of available serialization routines.
var serializationStrategies = {
    'csv': formatAsCSV,
    'json': formatAsJSON
};


/**
 * Serialize the given collection of Objects to a 2D CSV table.
 *
 * Serialize the given collection of Objects to a 2D CSV table with a comma as
 * a delimeter and double quotes for quoting.
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
function formatAsCSV(corpus, fields, ununsedLabel, unusedMetaInfo) {
  return Q.fcall(function() {
      var i = 0,
          j = 0,
          corpusLen = 0,
          fieldsLen = 0,
          rows = [],
          columns = [];
      // Set up header.
      rows.push(fields);
      for(i = 0, corpusLen = corpus.length; i < corpusLen; ++i) {
          columns = [];
          for(j = 0, fieldsLen = fields.length; j < fieldsLen; ++j) {
              if(typeof(corpus[i][fields[j]]) == 'number') {
                  columns.push(corpus[i][fields[j]]);
              } else {
                  columns.push('"' + corpus[i][fields[j]] + '"');
              }
          }
          rows.push(columns.join(','));
      }
      return rows.join('\n');
  });
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
function formatAsJSON(corpus, fields, label, metaInfo) {
    return Q.fcall(function() {
      var i = 0,
          j = 0,
          corpusLen = 0,
          fieldsLen = 0,
          item = {},
          jsonObj = {};
      jsonObj[label] = [];
      for(i = 0, corpusLen = corpus.length; i < corpusLen; ++i) {
          item = {};
          for(j = 0, fieldsLen = fields.length; j < fieldsLen; ++j) {
              item[fields[j]] = corpus[i][fields[j]];
          }
          jsonObj[label].push(item);
      }
      jsonObj.meta = metaInfo;
      return JSON.stringify(jsonObj);
    });
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
 * @return {Q.promise} Promise that resolves to a String containing the
 *      resulting serialization.
**/
exports.format = function(format, corpus, fields, label, metaInfo) {
    var strategy = serializationStrategies[format];
    if(strategy === undefined) {
        var notFoundError = new Error('Unknown format: ' + format);
        return Q.fcall(function() { throw notFoundError; });
    } else {
        return strategy(corpus, fields, label, metaInfo);
    }
};
