'use strict';
var lintStream = require('./lint-stream')();
var printStylish = require('./stylish-reporter');
var printCheckstyle = require('./checkstyle-reporter');
var printJSON = require('./json-reporter');
var async = require('async');
var getJavaScriptFiles = require('./get-javascript-files');
var es = require('event-stream');
var process = require('process');
var extend = require('xtend');
var makeErrorMeter = require('./error-meter');
var partial = require('partial');
var printCompact = require('./compact-reporter');
var path = require('path');
var commondir = require('commondir');
var setRules = require('./set-rules');

function findFiles(paths, callback) {
    async.reduce(paths, [], function accumulator(memo, pathArg, done) {
        getJavaScriptFiles(pathArg, function findJSFilesCallback(err, jsfiles) {
            if (err) {
                return done(err);
            }
            done(null, memo.concat(jsfiles));
        });
    }, callback);
}

function isRelativePath(p) {
    return p.charAt(0) === '/';
}

function makeWriter(printer, callback) {
    function writer(err, fileMessages) {
        if (err) {
            return callback(err);
        }

        // Convert absolute paths to relative paths so that
        // syntastic plugin works properly.
        var files = fileMessages.map(function getFilepath(msg) {
            return msg.file;
        });

        if (files.every(isRelativePath)) {
            var dir = commondir(files);

            fileMessages.forEach(function fixPaths(msg) {
                var p = path.relative(dir, msg.file);
                msg.file = p.length > 0 ? p : path.basename(msg.file);
            });
        }

        var output = printer(fileMessages);
        process.stdout.write(output);
    }
    return es.writeArray(writer);
}

function onEnd(errorMeter, callback) {
    var metrics = errorMeter.getMetrics();
    var err = metrics.errorCode === 1 ?
        new Error('Lint errors encountered') : null;
    callback(err);
}

function lint(jsfiles, opts, callback) {
    jsfiles.sort();
    var dir = commondir(jsfiles);
    setRules(dir, opts.lineLength, onRulesSet);

    function onRulesSet(err) {
        if (err) {
            return callback(err);
        }

        var uberLintStream = lintStream(jsfiles, dir, opts);
        var errorMeter = makeErrorMeter();
        var writer;
        var r = opts.reporter;

        writer = (r === 'stylish') ? makeWriter(printStylish, callback) :
                 (r === 'checkstyle') ? makeWriter(printCheckstyle, callback) :
                 (r === 'json') ? makeWriter(printJSON, callback) :
                 (r === 'compact') ? makeWriter(printCompact, callback) : null;

        if (!writer) {
            return callback(new Error('Unknown reporter: ' + r));
        }

        uberLintStream
            .pipe(errorMeter.meter)
            .pipe(writer);

        uberLintStream.once('end', partial(onEnd, errorMeter, callback));
    }
}

function run(opts, callback) {
    opts = extend({
        files: [],
        reporter: 'stylish',
        stdin: false,
        lineLength: 80
    }, opts);

    if (opts.lineLength > 120) {
        var errMsg = 'Line length limit cannot be greater than 120 characters';
        return callback(new Error(errMsg));
    }

    if (opts.stdin) {
        lint(['stdin'], opts, callback);
    } else {
        findFiles(opts.files, function fileFilesCallback(err, files) {
            if (err) {
                return callback(err);
            }
            if (files.length === 0) {
                return callback(new Error('no files found'));
            }
            lint(files, opts, callback);
        });
    }
}

module.exports = run;
