'use strict';
var makeLintStream = require('../lint-stream')();
var path = require('path');
var getJavaScriptFiles = require('../get-javascript-files');
var fixturesPath = path.join(__dirname, 'fixtures/rules');
var test = require('tape');
var testResults = require(path.join(fixturesPath, 'output.json'));
var root = path.resolve(__dirname, '..');
var commondir = require('commondir');

test('lint-trap JSON stream results', function testStream(t) {
    t.plan(testResults.length + 1);

    getJavaScriptFiles(fixturesPath, function lintFilesCallback(err, jsfiles) {
        if (err) {
            return t.fail(err);
        }
        var streamMessages = [];
        var opts = {stdin: false, lineLength: 80};
        jsfiles.sort();
        var dir = commondir(jsfiles);
        var lintStream = makeLintStream(jsfiles, dir, opts);

        lintStream.on('data', streamMessages.push.bind(streamMessages));
        lintStream.on('error', t.fail.bind(t));
        lintStream.on('end', onEnd);

        function onEnd() {
            t.equal(streamMessages.length, testResults.length,
                'Correct number of lint messages');
            testResults.forEach(checkTestResult);
        }

        function checkTestResult(expected) {
            var actual = streamMessages.filter(function match(message) {
                return message.file === expected.file;
            })[0];
            t.deepEqual(actual, expected, path.relative(root, expected.file));
        }

    });
});
