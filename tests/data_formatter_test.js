/**
 * Unit tests for serializing Objects to CSV, JSON, etc.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
**/

// TODO: This is experimental and in progress! Do not rely on this code yet!
// WARNING: This is experimental and in progress! Do not rely on this code yet!

var data_formatter = require('../data_formatter');


/**
 * Test serializing an Object to a CSV string.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testFormatCSV = function(test)
{
    var testCorpus = [
        {'field1': 1, 'field2': 'test1', 'field3': 'dont include me!'},
        {'field1': 2, 'field2': 'test2', 'field3': 'dont include me!'}
    ];
    var fields = ['field1', 'field2'];
    var expectedStr = [
        ['field1', 'field2'],
        ['1', '"test1"'],
        ['2', '"test2"']
    ].join('\n');

    data_formatter.format('csv', testCorpus, fields, '').then(function(csvStr){
        test.equal(csvStr, expectedStr);
        test.done();
    });
};


/**
 * Test serializing an Object to a JSON string.
 *
 * @param {nodeunit.test} test Object describing the nodeunit test currently
 *      running.
**/
exports.testFormatJSON = function(test)
{
    var testCorpus = [
        {'field1': 1, 'field2': 'test1', 'field3': 'dont include me!'},
        {'field1': 2, 'field2': 'test2', 'field3': 'dont include me!'}
    ];
    var fields = ['field1', 'field2'];
    var expectedObj = {
        'testObjs': [
            {'field1': 1, 'field2': 'test1'},
            {'field1': 2, 'field2': 'test2'}
        ]
    };

    data_formatter.format('json', testCorpus, fields, 'testObjs')
    .then(function(jsonStr)
    {
        test.deepEqual(JSON.parse(jsonStr), expectedObj);
        test.done();
    });
};
