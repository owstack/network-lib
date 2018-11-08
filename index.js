'use strict';

var networkLib = {};

// Module information
networkLib.version = 'v' + require('./package.json').version;

networkLib.Networks = require('./lib/networks');
networkLib.Unit = require('./lib/unit');
networkLib.URI = require('./lib/uri');

module.exports = networkLib;
