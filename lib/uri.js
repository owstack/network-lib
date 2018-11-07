'use strict';

var owsCommon = require('@owstack/ows-common');
var errors = owsCommon.errors;
var URL = require('url');
var inherits = require('inherits');
var lodash = owsCommon.deps.lodash;

/**
 * URI
 *
 * Instantiate an URI from a URI String or an Object. An URI instance
 * can be created with a uri string or an object. All instances of
 * URI are valid, the static method isValid allows checking before instantiation.
 *
 * All standard parameters can be found as members of the class, the address
 * is represented using an {Address} instance and the amount is represented in
 * satoshis. Any other non-standard parameters can be found under the extra member.
 *
 * @example
 * ```javascript
 *
 * var uri = new URI('bitcoin:12A1MyfXbW6RhdRAZEqofac5jCQQjwEPBu?amount=1.2');
 * console.log(uri.address, uri.amount);
 * ```
 *
 * @param {Address} Address - An Address object associated with the URI
 * @param {Networks} Networks - The Networks object associated with the URI
 * @param {Unit} Unit - The Unit object associated with the URI
 * @param {string|Object} data - A URI string or an Object
 * @param {Array.<string>=} knownParams - Required non-standard params
 * @throws {TypeError} Invalid network address
 * @throws {TypeError} Invalid amount
 * @throws {Error} Unknown required argument
 * @returns {URI} A new valid and frozen instance of URI
 * @constructor
 */
//function URI(data, knownParams) {
function URI(Address, Networks, Unit, data, knownParams) {
  this.Address = Address;
  this.Networks = Networks;
  this.Unit = Unit;

  this.extras = {};
  this.knownParams = knownParams || [];
  this.address = this.network = this.amount = this.message = null;

  if (typeof(data) === 'string') {
    var params = URI.parseWithNetworks(Networks.getProtocols(), data);
    if (params.amount) {
      params.amount = this._parseAmount(params.amount);
    }
    this._fromObject(params);
  } else if (typeof(data) === 'object') {
    this._fromObject(data);
  } else {
    throw new TypeError('Unrecognized data format.');
  }
};

// Valid members of a URI.
URI.Members = ['address', 'amount', 'message', 'label', 'r'];

/**
 * Returns whether or not the specied address is valid.
 *
 * @returns {boolean} Address is valid
 */
URI.prototype.addressIsValid = function(address) {
  return this.Address.isValid(address);
};

/**
 * Creates and returns a new Address object.
 * @param {*} data - The encoded data in various formats
 * @returns {Address} A new address using the 
 */
URI.prototype.newAddress = function(data) {
  return new this.Address(data);
};

/**
 * Convert a network URI string into a simple object.
 *
 * @param {string} uri - A URI string
 * @throws {TypeError} Invalid URI
 * @returns {Object} An object with the parsed params
 */
URI.parse = function(uri) {
  throw new errors.AbstractMethodInvoked('URI#parse');
};

/**
 * Instantiate a URI from a String
 *
 * @param {string} str - JSON string or object of the URI
 * @returns {URI} A new instance of a URI
 */
URI.fromString = function(str) {
  throw new errors.AbstractMethodInvoked('URI#fromString');
};

/**
 * Instantiate a URI from an Object
 *
 * @param {Object} data - object of the URI
 * @returns {URI} A new instance of a URI
 */
URI.fromObject = function(json) {
  throw new errors.AbstractMethodInvoked('URI#fromObject');
};

/**
 * Check if an URI string is valid
 *
 * @example
 * ```javascript
 *
 * var valid = URI.isValid('bitcoin:12A1MyfXbW6RhdRAZEqofac5jCQQjwEPBu');
 * // true
 * ```
 *
 * @param {string|Object} data - A URI string or an Object
 * @param {Array.<string>=} knownParams - Required non-standard params
 * @returns {boolean} Result of uri validation
 */
URI.isValid = function(data, knownParams) {
  throw new errors.AbstractMethodInvoked('URI#isValid');
};

/**
 * Convert a network URI string into a simple object.
 *
 * @param {Array} protocols - A list of valid network protocols
 * @param {string} uri - A URI string
 * @throws {TypeError} Invalid URI
 * @returns {Object} An object with the parsed params
 */
URI.parseWithNetworks = function(protocols, uri) {
  var info = URL.parse(uri, true);

  info.protocol = info.protocol.slice(0, -1);
//  if (URI.getProtocols().indexOf(info.protocol) < 0) {
  if (protocols.indexOf(info.protocol) < 0) {
    throw new TypeError('Invalid URI');
  }

  // workaround to host insensitiveness
  var group = /[^:]*:\/?\/?([^?]*)/.exec(uri);
  info.query.address = group && group[1] || undefined;

  return info.query;
};

/**
 * Internal function to load the URI instance with an object.
 *
 * @param {Object} obj - Object with the information
 * @throws {TypeError} Invalid network address
 * @throws {TypeError} Invalid amount
 * @throws {Error} Unknown required argument
 */
URI.prototype._fromObject = function(obj) {
  /* jshint maxcomplexity: 10 */

  if (!this.addressIsValid(obj.address)) {
    throw new TypeError('Invalid network address');
  }

  this.address = this.newAddress(obj.address);
  this.network = this.address.network;
  this.amount = obj.amount;

  for (var key in obj) {
    if (key === 'address' || key === 'amount') {
      continue;
    }

    if (/^req-/.exec(key) && this.knownParams.indexOf(key) === -1) {
      throw Error('Unknown required argument ' + key);
    }

    var destination = URI.Members.indexOf(key) > -1 ? this : this.extras;
    destination[key] = obj[key];
  }
};

/**
 * Internal function to transform a BCH string amount into satoshis
 *
 * @param {string} amount - Amount BCH string
 * @throws {TypeError} Invalid amount
 * @returns {Object} Amount represented in satoshis
 */
URI.prototype._parseAmount = function(amount) {
  amount = Number(amount);
  if (isNaN(amount)) {
    throw new TypeError('Invalid amount');
  }
  return this.Unit.fromStandardUnit(amount).toAtomicUnit();
};

URI.prototype.toObject = URI.prototype.toJSON = function toObject() {
  var json = {};
  for (var i = 0; i < URI.Members.length; i++) {
    var m = URI.Members[i];
    if (this.hasOwnProperty(m) && typeof(this[m]) !== 'undefined') {
      json[m] = this[m].toString();
    }
  }
  lodash.extend(json, this.extras);
  return json;
};

/**
 * Will return a the string representation of the URI
 *
 * @returns {string} URI string
 */
URI.prototype.toString = function() {
  var query = {};
  if (this.amount) {
    query.amount = this.Unit.fromAtomicUnit(this.amount).toStandardUnit();
  }
  if (this.message) {
    query.message = this.message;
  }
  if (this.label) {
    query.label = this.label;
  }
  if (this.r) {
    query.r = this.r;
  }
  lodash.extend(query, this.extras);

  return this.address + URL.format({query: query});
};

/**
 * Will return a string formatted for the console
 *
 * @returns {string} URI
 */
URI.prototype.inspect = function() {
  return '<URI: ' + this.toString() + '>';
};

module.exports = URI;
