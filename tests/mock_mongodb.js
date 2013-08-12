/**
 * Logic for a mock mongodb.MongoClient.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/

// TODO: This is experimental and in progress! Do not rely on this code yet!
// WARNING: This is experimental and in progress! Do not rely on this code yet!
// TODO: This form of dependency injection is terribly terribly messy.

/**
 * Mock version of mongodb.MongoClient for use in testing.
**/
function MockMongoClient()
{
    var lastURI = null;
    var lastCollectionName = null;
    var lastSelector = null;
    var lastDocuments = null;
    var lastOptions = null;
    var lastOperation = null;

    var queryReturned = false;
    var endStreamListener = null;

    var nextResult = null;

    /**
     * Mock connect routine that returns a mocked collection.
     *
     * Mock connect routine that, in turn, yields a collection with mocked
     * methods. This includes find, findOne, update, insert, and remove.
     *
     * @param {String} uri The URI of the database to pretend to open.
     * @param {function} callback The function to call after pretending to open
     *      a database.
    **/
    this.connect = function(uri, callback){
        lastURI = uri;
        var retCollection = {

            // Provide mocked version of find
            'find': function(selector, options, callback){
                lastSelector = selector;
                lastOperation = 'find';

                if(callback === undefined)
                {
                    callback = options;
                    options = undefined;
                }

                lastOptions = options;

                var mockedStream = {
                    'stream': {
                        'on': function(listenerType, callback)
                        {
                            if(listenerType === 'data')
                            {
                                var queryResultLen = nextResult.length;
                                for(var i=0; i<queryResultLen; i++)
                                {
                                    callback(nextResult[i]);
                                }
                                queryReturned = true;
                                if(endStreamListener !== null)
                                    callback();
                            }
                            else if(listenerType === 'end')
                            {
                                callback();
                                if(queryReturned)
                                    callback();
                            }
                        }
                    },
                    'toArray': function(callback) {
                        callback(null, nextResult);
                    }
                };

                callback(null, mockedStream);
            },

            // Provide mocked version of findOne
            'findOne': function(selector, options, callback)
            {
                lastSelector = selector;
                lastOperation = 'findOne';

                if(callback === undefined)
                {
                    callback = options;
                    options = undefined;
                }

                lastOptions = options;

                callback(null, nextResult);
            },

            // Provide mocked version of update
            'update': function(selector, documents, options, callback)
            {
                lastSelector = selector;
                lastDocuments = documents;
                lastOptions = options;
                lastOperation = 'update';

                if(callback !== undefined)
                {
                    callback(null, nextResult);
                }
            },


            // Provide mocked version of insert
            'insert': function(docs, options, callback)
            {
                lastDocuments = docs;
                lastOptions = options;
                lastOperation = 'insert';

                if(callback !== undefined)
                {
                    callback(null, nextResult);
                }
            },

            // Provide mocked version of remove
            'remove': function(selector, options, callback)
            {
                lastSelector = selector;
                lastOptions = options;

                if(callback !== undefined)
                {
                    callback(null, nextResult);
                }
            }

        };

        var retClient = {
            'collection': function(name, callback) {
                lastCollectionName = name;
                callback(null, retCollection);
            },
            'close': function() {}
        };

        callback(null, retClient);
    };


    /**
     * Get the URI of the database this client prentended to connec to.
     *
     * @return {String} Last URI opened with this mock client.
    **/
    this.getLastURI = function()
    {
        return lastURI;
    };

    /**
     * Clear the record of the last URI this client pretended to connect to.
     *
     * Reset this mock client's last connected URI record to null. The last URI
     * is maintained across calls to prepareForNextUse.
    **/
    this.clearLastURI = function()
    {
        lastURI = null;
    }

    /**
     * Get the database collection this client last preteneded to load.
     *
     * @return {String} Name of the last collection this client pretended to
     *      load.
    **/
    this.getLastCollectionName = function()
    {
        return lastCollectionName;
    };

    /**
     * Get the selector last used by this client.
     *
     * Get the selector last provided to this client for an update, find,
     * findOne, or remove.
     *
     * @return {Object} Last selector provided to this mock database client.
    **/
    this.getLastSelector = function()
    {
        return lastSelector;
    };

    /**
     * Get the last documents provided to this client.
     *
     * Get a listing of the last set of documents provided to this client for
     * an insert or update.
     *
     * @return {Array or Object} The document or documents last provided to this
     *      fake client.
    **/
    this.getLastDocuments = function()
    {
        return lastDocuments;
    };

    /**
     * Get the last options object provided to this client.
     *
     * Get the last set of options provided to this client. This is typically
     * an Object with operational settings related to the specifics of the
     * function called like update or insert.
     *
     * @return {Object} Last options object provided to this client.
    **/
    this.getLastOptions = function()
    {
        return lastOptions;
    };

    /**
     * Get the name of the last operation executed on this client.
     *
     * Get the name of the last non-connect/disconnect operation executed on
     * this client. This should be update, insert, find, findOne, or remove.
     *
     * @return {String} Description of the last operation executed.
    **/
    this.getLastOperation = function()
    {
        return lastOperation;
    };

    /**
     * Provide testing values and reset flags before using this client again.
     *
     * This fake client provides a record of recent values supplied to it and
     * allows for fake values to be specified and returned to client code. This
     * function resets those recent value records and accepts a new fake return
     * value.
     *
     * @param {Object or Array} newNextResult The next value to return to client
     *      code. May also be primitive like Number.
    **/
    this.prepareForNextUse = function(newNextResult)
    {
        nextResult = newNextResult;
        lastCollectionName = null;
        lastSelector = null;
        lastDocuments = null;
        lastOptions = null;
        queryReturned = false;
        endStreamListener = null;
        lastOperation = null;
    }

}


exports.MockMongoClient = MockMongoClient;
