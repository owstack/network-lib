'use strict';

var Networks = require('./lib/networks');

Networks.Unit = require('./lib/unit');
Networks.URI = require('./lib/uri');
Networks.version = 'v' + require('./package.json').version;

module.exports = Networks;
