/**
 * Convienence utility functions for unit testing.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license GNU GPL v3
**/


/**
 * Callback for Q to help reporting errors that happened during async operation.
 *
 * Callback for Q chained functions that helps reporting errors that occurred
 * asynchronously while fulfilling promises. This will fail the provided test
 * but also report it as having finished to prevent nodeunit from hanging.
 *
 * @param {nodeunit.test} test A nodeunit test instance.
 * @param {Error} error The error to report.
**/
exports.reportAsyncError = function (test, error) {
    test.ok(false, error);
    test.done();
};
