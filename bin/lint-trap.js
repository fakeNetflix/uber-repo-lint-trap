#!/usr/bin/env node
/*eslint no-console:0 no-process-exit:0 */
'use strict';
var process = require('process');
var console = require('console');
var argv = require('minimist')(process.argv.slice(2));
var lintTrap = require('../lint-trap');
var fmt = require('util').format;

var files = argv._.length === 0 ? [process.cwd()] : argv._;

function readFromStdin(argv) {
    return argv._.length === 1 && argv._[0] === '-';
}

var opts = {
    lineLength: argv['line-length'] || 80,
    reporter: argv.reporter || argv.r || 'stylish',
    files: files,
    stdin: readFromStdin(argv)
};

if (argv.v || argv.version) {
    var pkg = require('../package.json');
    console.error(fmt('lint-trap v%s', pkg.version));
    process.exit(0);
} else if (argv.h || argv.help) {
    var helpMsg = [
        'lint-trap',
        '',
        'usage:',
        '',
        'options:',
        '  -h --help                   Print help information',
        '     --line-length <length>   Set line-length limit to <length>',
        '  -v --version                Print version',
        ''
    ].join('\n');
    process.stdout.write(helpMsg);
    process.exit(0);
} else {
    lintTrap(opts, run);
}

function run(err) {
    if (err) {
        if (err.message !== 'Lint errors encountered') {
            console.error(err.message);
        }
        return process.exit(1);
    }
    process.exit(0);
}
