'use strict';

var owsCommon = require('@owstack/ows-common');
var errors = owsCommon.errors;
var lodash = owsCommon.deps.lodash;
var $ = owsCommon.util.preconditions;

/**
 * Utility for handling and converting currency units. The supported units are
 * defined by the caller (see example below). A unit instance can be created with an
 * amount and a unit code, or alternatively using static methods, for example fromBTC().
 * It also allows to be created from a fiat amount and the exchange rate, or
 * alternatively using the {fromFiat} static method.
 * 
 * You should be able to consult for different representation of a unit instance
 * using it's {to} method, the fixed unit methods like {toSatoshis} or alternatively
 * using the unit accessors. It also can be converted to a fiat amount by providing the
 * corresponding exchange rate, for example BTC/USD.
 *
 * @example
 * ```javascript
 * var UNITS = [{
 *   name: 'Bitcoin Cash',
 *   shortName: 'BCH',
 *   value: 100000000,
 *   decimals: 8,
 *   code: 'BCH',
 *   kind: 'standard'
 * }, {
 *   ...
 * }];
 *
 * BchUnit.fromBTC = function(amount) {
 *   return (new BtcUnit(amount, BtcUnit.BTC);
 * };
 *
 * BchUnit.prototype.toBTC = function() {
 *   return this.to(BtcUnit.BTC);
 * };
 *
 * // used as follows
 * var sats = Unit.fromBTC(1.3).toSatoshis();
 * var mili = Unit.fromBits(1.3).to(Unit.mBTC);
 * var bits = Unit.fromFiat(1.3, 350).bits;
 * var btc = new Unit(1.3, Unit.bits).BTC;
 * ```
 *
 * @param {Number} amount - The amount to be represented
 * @param {String|Number} code - The unit of the amount or the exchange rate
 * @returns {Unit} A new instance of an Unit
 * @constructor
 */
function Unit(units, amount, code) {
  this.units = units;

  // Convert fiat to standard unit
  if (lodash.isNumber(code)) {
    if (code <= 0) {
      throw new errors.Unit.InvalidRate(code);
    }
    amount = amount / code;
    code = lodash.find(this.units, function(u) {
      return u.kind == 'standard';
    }).code;
  }

  this._value = this._from(amount, code);

  var self = this;
  var defineAccesor = function(key) {
    Object.defineProperty(self, key, {
      get: function() { return self.to(key); },
      enumerable: true
    });
  };

  var keys = lodash.map(this.units, function(u) {
    return u.shortName;
  });

  keys.forEach(defineAccesor);
  return this;
};

/**
 * Abstract functions and statics required to be implemented.
 */
Unit.fromFiat = function(amount) {
  throw new errors.AbstractMethodInvoked('Unit#fromFiat');
};

Unit.fromObject = function(amount) {
  throw new errors.AbstractMethodInvoked('Unit#fromObject');
};

Unit.fromStandardUnit = function(amount) {
  throw new errors.AbstractMethodInvoked('Unit#fromStandardUnit');
};

Unit.fromAtomicUnit = function(amount) {
  throw new errors.AbstractMethodInvoked('Unit#fromStandardUnit');
};

Unit.prototype._from = function(amount, code) {
  var unit = lodash.find(this.units, function(u) {
    return u.shortName == code;
  });

  if (!unit) {
    throw new errors.Unit.UnknownCode(code);
  }
  return parseInt((amount * unit.value).toFixed());
};

/**
 * Returns the value represented in the specified unit
 *
 * @param {String|Number} code - The unit code or exchange rate
 * @returns {Number} The converted value
 */
Unit.prototype.to = function(code) {
  if (lodash.isNumber(code)) {
    if (code <= 0) {
      throw new errors.Unit.InvalidRate(code);
    }
    return parseFloat((getKindUnitValue(this, 'standard') * code).toFixed(2));
  }

  var unit = lodash.find(this.units, function(u) {
    return u.shortName == code;
  });

  if (!unit) {
    throw new errors.Unit.UnknownCode(code);
  }

  var value = this._value / unit.value;
  return parseFloat(value.toFixed(unit.decimals));
};

/**
 * Returns the unit standard value
 *
 * @returns {Number} The converted value
 */
Unit.prototype.toStandardUnit = function() {
  var u = lodash.find(this.units, function(u) {
    return u.kind == 'standard';
  }).shortName;

  return this.to(u);
};

/**
 * Returns the unit atomic value
 *
 * @returns {Number} The converted value
 */
Unit.prototype.toAtomicUnit = function() {
  var u = lodash.find(this.units, function(u) {
    return u.kind == 'atomic';
  }).shortName;

  return this.to(u);
};

/**
 * Returns the available units
 *
 * @returns {array} An array of available units
 */
Unit.prototype.getUnits = function() {
  return this.units;
};

/**
 * Returns the value represented in fiat
 *
 * @param {string} rate - The exchange rate; example BTC/USD
 * @returns {Number} The value converted to satoshis
 */
Unit.prototype.atRate = function(rate) {
  return this.to(rate);
};

/**
 * Returns a the string representation of the value in satoshis
 *
 * @returns {string} the value in satoshis
 */
Unit.prototype.toString = function() {
  return getKindUnitValue(this, 'atomic') + ' ' + getKindUnit(this, 'atomic').shortName;
};

/**
 * Returns a plain object representation of the Unit
 *
 * @returns {Object} An object with the keys: amount and code
 */
Unit.prototype.toObject = Unit.prototype.toJSON = function toObject() {
  return {
    amount: getKindUnitValue(this, 'standard'),
    code: getKindUnit(this, 'standard').code
  };
};

/**
 * Returns a string formatted for the console
 *
 * @returns {string} the value in satoshis
 */
Unit.prototype.inspect = function() {
  return '<Unit: ' + this.toString() + '>';
};

/**
 * @private
 * Get the unit with the specified abstract 'kind'.
 * For example, kind == 'standard' will return the following.
 * {
 *   name: 'Bitcoin',
 *   shortName: 'BTC',
 *   value: 100000000,
 *   decimals: 8,
 *   code: 'BTC',
 *   kind: 'standard'
 * }
 */
function getKindUnit(obj, kind) {
  return lodash.find(obj.units, function(u) {
    return u.kind == kind;
  });
};

/**
 * @private
 * Get the value of the unit with the specified abstract 'kind'.
 * For example, kind == 'standard' will return the a numerical value for the amount.
 */
function getKindUnitValue(obj, kind) {
  var kindUnit = getKindUnit(obj, kind);
  if (!kindUnit) {
    throw new errors.Unit.UnknownCode(kind);
  }
  return obj[kindUnit.shortName];
};

module.exports = Unit;
