'use strict';

var Bip44 = require('bip44-constants');
Bip44['ROOT'] = 0x8fffffff; // Not applicable; arbitrary value for this implementation
Bip44['TESTNET'] = 0x80000001; // Not defined in Bip44 list

var owsCommon = require('@owstack/ows-common');
var Base58 = owsCommon.encoding.Base58;
var BufferUtil = owsCommon.buffer;
var JSUtil = owsCommon.util.js;
var lodash = owsCommon.deps.lodash;

var networks = [];
var networkMap = {};

/**
 * Implementing currencies define networks as follows.
 *
 * Example:
 *
 * {
 *   name: 'Bitcoin',
 *   code: 'BTC',
 *   coin: Bip44['BTC'] ^ 0x80000000,
 *   protocol: 'bitcoin',
 *   alias: 'livenet',
 *   preference: 'BTC',
 *   prefix: {
 *     pubkeyhash: 0x30,
 *     privatekey: 0xb0,
 *     scripthash: 0x32
 *   },
 *   version: {
 *     xpubkey: 0x019da462,
 *     xprivkey: 0x019d9cfe,
 *   },
 *   networkMagic: 0xfbc0b6db,
 *   port: 9333,
 *   dnsSeeds: [
 *     'dnsseed.litecointools.com',
 *     'dnsseed.litecoinpool.org',
 *     'dnsseed.ltc.xurious.com',
 *     'dnsseed.koin-project.com',
 *    'seed-a.litecoin.loshan.co.uk',
 *     'dnsseed.thrasher.io'
 *   ]
 * }
 *
 * name
 *   The name of the network.
 *
 * code
 *   The currency code for the network.
 *
 * coin
 *   The SLIP44 'coin' assignment for the BIP44 derivation path.
 *
 * protocol
 *   The network protocol, e.g., for Bitcoin, defined by BIP21.
 *
 * alias
 *   The common name for the network within its own scope, 'livenet' or 'testnet'.
 *
 * preference
 *   The preference of the implementing network, used to prefer one network over
 *   another when multiple networks have same attribute values (e.g., Bitcoin and Bitcoin Cash
 *   share testnet address prefixes).
 *
 * prefix
 *   Address prefixes defined as follows.
 *
 *   pubkeyhash - The publickey hash prefix.
 *   privatekey - The privatekey prefix.
 *   scripthash - The scripthash prefix.
 *
 * version
 *   The HD key prefix bytes defined as follows (see BIP32, SLIP132).
 *
 *   xpubkey - The extended public key version bytes.
 *   xprivkey - The extended private key version bytes.
 *
 * networkMagic
 *   The network magic number.
 *
 * port
 *   The network port.
 *
 * dnsSeeds
 *   An array of dns seeds.
 *
 * indexBy
 *   An array of network properties to map for looking up a network in this implementation.
 *   Typically used when defining a network which shares one or more attributes with another
 *   network. Also see 'preference' attribute.
 */

/**
 * Add network objects shared across multiple coins or that have no network association (e.g., root network for master key).
 */
addNetworks([{
	name: 'Root',
	code: 'ROOT',
	coin: Bip44['ROOT'] ^ 0x80000000,
	protocol: {},
	prefix: {},
	alias: 'root',
	version: {
	  xpubkey: 0x040bf2a6, // 'rpub..' (no 'root network' version strings registered); see SLIP132
	  xprivkey: 0x040bee6c // 'rprv..' (no 'root network' version strings registered); see SLIP132
	},
  networkMagic: 0,
	port: 0,
	preference: undefined,
	dnsSeeds: [
    'seed.bitcoin.sipa.be',
    'dnsseed.bluematt.me',
    'dnsseed.bitcoin.dashjr.org',
    'seed.bitcoinstats.com',
    'seed.bitnodes.io',
    'bitseed.xf2.org'
	],
	indexBy: getIndexBy()
}]);

/**
 * A network is merely a map containing values that correspond to version
 * numbers for each network.
 * @constructor
 */
function Network() {}

Network.prototype.toString = function toString() {
  return this.code;
};

/**
 * @function
 * @member Networks#get
 * Retrieves the network associated with a magic number or string.
 * @param {string|number|Network} arg
 * @param {string|Array} keys - if set, only check if the keys associated with this name match
 * @param {string} preference - if set, prefer a network with this id over alternatives (useful for
 * discrimination among networks that share the same attribute values)
 * @return Network
 */
function get(arg, keys, preference) {
  if (~networks.indexOf(arg)) {
    return arg;
  }

  if (keys) {
    if (!lodash.isArray(keys)) {
      keys = [keys];
    }

    var containsArg = function(key) {
    	if (preference) {
    		// A specific network preference is defined (helps to disambiguate networks with same attribute values).
    		// Consider a match if the indexed network is preferred.
				var p = (lodash.get(networks[index], 'preference') == preference);

	      return (lodash.get(networks[index], key) === arg) && p;
    	} else {
      	return lodash.get(networks[index], key) === arg;    		
    	}
    };

    var index;
    var findNetwork = function() {
	    for (index in networks) {
	      if (lodash.some(keys, containsArg)) {
	        return networks[index];
	      }
	    }
    };

    var foundNetwork = findNetwork();

		// No network found. If there was a specified preference then remove it and try again. Return a
		// non-preferred network rather than no network.
    if (preference) {
	    preference == undefined;
	    foundNetwork = findNetwork();
    }

    return foundNetwork;
  }

	if (preference && lodash.isString(arg)) {
		// If there is a network preference then attempt to match the arg (search criteria) and
		// the desired preference.
	  return lodash.find(networks, function(n) {
	  	// Does this network meet the callers criteria?
	  	var match = lodash.some(getIndexBy(), function(attr) {
	  		return n[attr] == arg;
	  	});

	  	if (match && n.preference == preference) {
	  		return n;
	  	}
	  });

	} else {

		// No preference, just return a mapped value.
	  if (networkMap[arg] != undefined) {
	  	return networkMap[arg];

	  } else if (lodash.isString(arg) && Base58.validCharacters(arg)) {
			// Try to decode from an extended private or public key.
	    var version = BufferUtil.integerFromBuffer(Base58.decode(arg));
	  	return networkMap[version];
	  }
	}
};

/**
 * @function
 * @member Networks#add
 * Will add a custom Network
 * @param {Object} data
 * @param {string} data.name - The name of the network chain
 * @param {string} data.code - The currency code for the network
 * @param {string} data.coin - The SLIP44 coin number
 * @param {string} data.alias - The network alias
 * @param {string} data.protocol - The BIP21 network protocol
 * @param {Number} data.prefix.pubkeyhash - The publickey hash prefix
 * @param {Number} data.prefix.privatekey - The privatekey prefix
 * @param {Number} data.prefix.scripthash - The scripthash prefix
 * @param {Number} data.version.xpubkey - The extended public key magic
 * @param {Number} data.version.xprivkey - The extended private key magic
 * @param {Number} data.networkMagic - The network magic number
 * @param {Number} data.port - The network port
 * @param {Array} data.dnsSeeds - An array of dns seeds
 * @param {Array} data.indexBy (optional) - An array of attributes for indexing the network, see getIndexBy()
 * @return Network
 */
function addNetworks(data) {
	if (!lodash.isArray(data)) {
		data = [data];
	}

	lodash.forEach(data, function(n) {
	  var network = new Network();

	  JSUtil.defineImmutable(network, {
	    name: n.name,
	    code: n.code,
	    coin: n.coin,
	    protocol: n.protocol,
	    alias: n.alias,
	    preference: n.preference,
	    prefix: n.prefix,
			version: n.version
	  });

	  if (n.networkMagic) {
	    JSUtil.defineImmutable(network, {
	      networkMagic: BufferUtil.integerAsBuffer(n.networkMagic)
	    });
	  }

	  if (n.port) {
	    JSUtil.defineImmutable(network, {
	      port: n.port
	    });
	  }

	  if (n.dnsSeeds) {
	    JSUtil.defineImmutable(network, {
	      dnsSeeds: n.dnsSeeds
	    });
	  }

	  networks.push(network);

	  n.indexBy = n.indexBy || getIndexBy();
		indexNetworkBy(network, n.indexBy);
	});
};

/**
 * @function
 * @member Networks#remove
 * Will remove a custom network
 * @param {Network} network
 */
function removeNetwork(network) {
  for (var i = 0; i < networks.length; i++) {
    if (networks[i] === network) {
      networks.splice(i, 1);
    }
  }
  for (var key in networkMap) {
    if (networkMap[key] === network) {
      delete networkMap[key];
    }
  }
  unindexNetworkBy(network, Object.keys(networkMap));
};

/**
 * @function
 * @member Networks#isCommonPrivateKeyPrefix
 * Several networks share the same one byte private key prefix so it's not possible to discern the specific
 * network when this prefix is used. This 'livenet common' prefix and the testnet prefix is based on the bitcoin
 * standard WIF one byte prefix. In this case we cannot detect a network mismatch. Return false if prefix string
 * not recognized.
 * @param {number} byte - The byte value to test
 * @param {string} prefix - One of the valid prefixes
 */
function isSharedPrefix(byte, prefix) {
	switch (prefix) {		                  // livenet           testnet
		case 'prefix.pubkeyHash': return (byte == 0x00) || (byte == 0x6f);
		case 'prefix.privatekey': return (byte == 0x80) || (byte == 0xef);
		case 'prefix.scripthash': return (byte == 0x05) || (byte == 0xc4);
	};
	return false;
};

function getIndexBy(minimal) {
	var base = [
    'code',
		'protocol',
    'networkMagic',
    'port'
  ];
	var extended = [
		'prefix.pubkeyhash',
		'prefix.privatekey',
		'prefix.scripthash', 
		'version.xpubkey',
		'version.xprivkey'
	];

	if (minimal) {
		return base;
	} else {
		return lodash.concat(base, extended);
	}
};

function indexNetworkBy(network, keys) {
  for(var i = 0; i <  keys.length; i++) {
		var value = lodash.get(network, keys[i]);
    if(!lodash.isUndefined(value) && !lodash.isObject(value)) {
      networkMap[value] = network;
    }
  }
};

function unindexNetworkBy(network, values) {
  for(var index = 0; index < values.length; index++) {
    var value = values[index];
    if(networkMap[value] === network) {
      delete networkMap[value];
    }
  }
};

/**
 * @namespace Networks
 */
module.exports = {
  add: addNetworks,
  remove: removeNetwork,
  get: get,
  isSharedPrefix: isSharedPrefix,
  indexAll: getIndexBy(),
  indexMinimal: getIndexBy(true),
  defaultNetwork: get('ROOT'),
  Bip44: Bip44
};
