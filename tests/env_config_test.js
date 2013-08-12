var rewire = require('rewire');

var test_util = require('./test_util');

var env_config = rewire('../env_config');

var TEST_FILE_CONTENTS = '{"test1": 1, "test2": "two"}';
var TEST_CONFIG = {test1: 1, test2: 'two'};


/**
 * Dependency injection helper emulating callback functionality for readFile.
 *
 * Simple dependency injection helper that records calls to readFile for a file
 * system stub.
 *
 * @param {String} err The error to provide when readFile is called. Pass null
 *      to execute readFile without error.
 * @param {String} contents The contents to return for readFile.
**/
function FakeFile(err, contents)
{
    this.lastSrc = null;
    this.lastEncoding = null;

    /**
     * Fake read file providing test values specified at construction.
     *
     * @param {String} src The location of the file to pretend to read.
     * @param {String} encoding The encoding to pretend to use while reading
     *      this file.
     * @param {function} callback The function to call after pretending to read
     *      this file. Should take an error String as the first parameter which
     *      is null if no error was encountered and a second String argument
     *      for the contents of the file itself.
    **/
    this.readFile = function (src, encoding, callback)
    {
        this.lastSrc = src;
        this.lastEncoding = encoding;

        callback(err, contents);
    };

    /**
     * Get the location last read by this fake filesystem object.
     *
     * @return {String} The location that this dependency injection contstruct
     *      last pretended to read.
    **/
    this.getLastSrc = function ()
    {
        return this.lastSrc;
    };

    /**
     * Create a function (closure over this object) for readFile.
     *
     * Create a function that can be used where fs.readFile would typically
     * be used.
     *
     * @return {function} Fake readFile.
    **/
    this.createReadFileCallback = function ()
    {
        var target = this;
        return function (src, encoding, callback) {
            target.readFile(src, encoding, callback);
        };
    }
}


module.exports = {

    /**
     * Test setup function that clears cached configuration settings.
     * 
     * @param {function} callback The standard callback used by nodeunit to
     *      indicate that setup has completed.
    **/
    setUp: function(callback)
    {
        env_config.__set__('loadedConfiguration', null);
        callback();
    },


    /**
     * Test loading configuration successfully.
     *
     * @param {nodeunit.test} test Standard nodeunit test object describing the
     *      test currently running.
    **/
    testLoadConfig: function (test)
    {
        var fakeFile = new FakeFile(null, TEST_FILE_CONTENTS);
        var expectedFileSrc = env_config.__get__('CONFIG_FILE_SRC');
        env_config.__set__('fs.readFile', fakeFile.createReadFileCallback());

        env_config.loadConfig()
        .then(function (loadedConfig) {
            test.equal(fakeFile.getLastSrc(), expectedFileSrc);
            test.deepEqual(loadedConfig, TEST_CONFIG);
            test.done();
        }, function (error) { test_util.reportAsyncError(test, error); });
    },


    /**
     * Test loading configuration with a file system error.
     *
     * @param {nodeunit.test} test Standard nodeunit test object describing the
     *      test currently running.
    **/
    testLoadConfigError: function (test)
    {
        var fakeFile = new FakeFile('test error!', null);
        env_config.__set__('fs.readFile', fakeFile.createReadFileCallback());

        env_config.loadConfig()
        .then(function (loadedConfig) {
            test_util.reportAsyncError(
                test,
                'Promise for reading config file should not have resolved.'
            );
        }, function (error) { test.done(); });
    },


    /**
     * Ensure that configuration settings are being cached in memory.
     *
     * @param {nodeunit.test} test Standard nodeunit test object describing the
     *      test currently running.
    **/
    testCache: function (test)
    {
        var fakeFile1 = new FakeFile(null, TEST_FILE_CONTENTS);
        var fakeFile2 = new FakeFile('test error!', null);
        var callback1 = fakeFile1.createReadFileCallback();
        var callback2 = fakeFile2.createReadFileCallback();

        // Load file
        env_config.__set__('fs.readFile', callback1);
        env_config.loadConfig()
        .then(function(loadedConfig) {
            
            // Invalidate fake file to cause read error and use file in cache.
            env_config.__set__('fs.readFile', callback2);
            env_config.loadConfig()
            .fail(function (error) {
                test_util.reportAsyncError(test, error);
            });

        }, function (error) { test_util.reportAsyncError(test, error); });

        test.done();
    }
};
