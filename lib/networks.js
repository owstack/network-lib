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
var networkMaps = {};

/**
 * Network object definition
 *
 * name - The name of the network
 * symbol - The currency symbol for the network
 * coin - The SLIP44 'coin' assignment for the BIP44 derivation path
 * protocol - The network protocol per BIP21
 * alias - For implementing network, 'livenet' or 'testnet'
 * preference - The preference of the implementing network, used to prefer one network over
 * another when multiple networks have same attribute values
 * prefix - Address prefixes
 *   pubkeyhash - The publickey hash prefix
 *   privatekey - The privatekey prefix
 *   scripthash - The scripthash prefix
 * version - Key prefix; see BIP32, SLIP132; used only for HD keys
 *   xpubkey - The extended public key magic
 *   xprivkey - The extended private key magic
 * networkMagic - The network magic number
 * port - The network port
 * dnsSeeds - An array of dns seeds
 * indexBy - An array of network properties to map
 */

/**
 * Add network objects shared across multiple coins or that have no network association (e.g., root network for master key).
 */
addNetworks([{
	name: 'Root',
	symbol: 'ROOT',
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
	indexBy: [
	  'name',
	  'symbol',
	  'version.xpubkey',
	  'version.xprivkey'
  ]
}, {
	name: 'Testnet',
	symbol: 'TESTNET',
	coin: Bip44['TESTNET'] ^ 0x80000000,
	protocol: 'testnet',
	alias: 'testnet',
	preference: undefined,
	prefix: {
		pubkeyhash: 0x6f,
	  privatekey: 0xef,
	  scripthash: 0xc4
	},
	version: {
	  xpubkey: 0x043587cf,
	  xprivkey: 0x04358394
	},
  networkMagic: 0x0b110907,
	port: 18333,
	dnsSeeds: [
		'testnet-seed.bitcoin.petertodd.org',
    'testnet-seed.bluematt.me',
    'testnet-seed.alexykot.me',
    'testnet-seed.bitcoin.schildbach.de'
	],
	indexBy: getIndexBy()
}, {
	name: 'Regtest',
	symbol: 'REGTEST',
	coin: Bip44['TESTNET'] ^ 0x80000000,
	protocol: 'regtest',
	alias: 'testnet',
	preference: undefined,
	prefix: {
		pubkeyhash: 0x6f,
	  privatekey: 0xef,
	  scripthash: 0xc4
	},
	version: {
	  xpubkey: 0x043587cf,
	  xprivkey: 0x04358394
	},
  networkMagic: 0xdab5bffa,
	port: 18444,
	dnsSeeds: [],
	indexBy: [
    'name',
    'symbol',
		'protocol',
    'port'
  ]
}]);

/**
 * A network is merely a map containing values that correspond to version
 * numbers for each network.
 * @constructor
 */
function Network() {}

Network.prototype.toString = function toString() {
  return this.symbol;
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
    		// Consider a match if the indexed network is preferred or there is no preference for the indexed network.
				var p = (lodash.get(networks[index], 'preference') == preference) ||
					(lodash.isUndefined(lodash.get(networks[index], 'preference')));

	      return (lodash.get(networks[index], key) === arg) && p;
    	} else {
      	return lodash.get(networks[index], key) === arg;    		
    	}
    };

    for (var index in networks) {
      if (lodash.some(keys, containsArg)) {
        return networks[index];
      }
    }
    return undefined;
  }

  if (networkMaps[arg] != undefined) {
  	return networkMaps[arg];

  } else if (lodash.isString(arg) && Base58.validCharacters(arg)) {
		// Try to decode from an extended private or public key.
    var version = BufferUtil.integerFromBuffer(Base58.decode(arg));
  	return networkMaps[version];
  }
};

/**
 * @function
 * @member Networks#add
 * Will add a custom Network
 * @param {Object} data
 * @param {string} data.name - The name of the network chain
 * @param {string} data.symbol - The currency symbol for the network
 * @param {string} data.coin - The SLIP44 coin number
 * @param {string} data.protocol - The BIP21 network protocol
 * @param {Number} data.prefix.pubkeyhash - The publickey hash prefix
 * @param {Number} data.prefix.privatekey - The privatekey prefix
 * @param {Number} data.prefix.scripthash - The scripthash prefix
 * @param {Number} data.version.xpubkey - The extended public key magic
 * @param {Number} data.version.xprivkey - The extended private key magic
 * @param {Number} data.networkMagic - The network magic number
 * @param {Number} data.port - The network port
 * @param {Array}  data.dnsSeeds - An array of dns seeds
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
	    symbol: n.symbol,
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
  for (var key in networkMaps) {
    if (networkMaps[key] === network) {
      delete networkMaps[key];
    }
  }
  unindexNetworkBy(network, Object.keys(networkMaps));
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
    'symbol',
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
      networkMaps[value] = network;
    }
  }
};

function unindexNetworkBy(network, values) {
  for(var index = 0; index < values.length; index++) {
    var value = values[index];
    if(networkMaps[value] === network) {
      delete networkMaps[value];
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
  Bip44
};
