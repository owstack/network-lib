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
 * Implementing currencies define units as follows.
 *
 * @example
 * ```javascript
 * {
 *   name: 'Bitcoin',
 *   shortName: 'BTC',
 *   code: 'BTC',
 *   accessor: 'BTC',
 *   kind: 'standard',
 *   value: 100000000,
 *   precision: {
 *     full: {
 *       maxDecimals: 8,
 *       minDecimals: 8
 *     },
 *     short: {
 *       maxDecimals: 6,
 *       minDecimals: 2
 *     }
 *   }
 * }
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
 * var sats = Unit.fromBTC(1.3).toAtomicUnits();
 * var mili = Unit.fromBits(1.3).to(Unit.mBTC);
 * var bits = Unit.fromFiat(1.3, 350).bits;
 * var btc = new Unit(1.3, Unit.bits).BTC;
 * ```
 *
 * name
 *   The human readable name of the unit, suitable for explanation.
 *
 * shortName
 *   A short form of the human readable name of the unit, suitable
 *   for value expression.
 *
 * code
 *   The currency code. Non-standard codes may be used for "sub-units".
 *
 * accessor
 *   The name of the unit to be used as 'to' and 'from' accessors.
 *   E.g., accessor = 'satoshis' yields toSatoshis() and fromSatoshis()
 *
 * kind
 *   A (typically) one word description for the kind of unit relative
 *   to other units. The following values must be assigned and must be
 *   assigned only once.
 *
 *   standard - The unit that represents the whole unit value; e.g., BTC
 *     for Bitcoin, USD for US Dollar.
 *   atomic - The unit that represents the smallest divisible unit value;
 *     e.g., satoshi for Bitcoin, cent for US Dollar.
 * 
 * value
 *   The number of atomic units in 'this' unit; e.g. 100000000 for Bitcoin,
 *   100 for US Dollar.
 *
 * precision
 *   Represents various degrees for formatted precision, suitable for user
 *   interface display and certain types of calculations.
 *
 *   full - Full precision for the unit.
 *   short - An arbitrary precision for the unit.
 *
 *   All categories of precision are defined using the following.
 *
 *   maxDecimals - The maximum number of decimals for this unit.
 *   minDecimals - The minimum number of decimals for this unit.
 */

/**
 * @param {Array} units - An array of valid units
 * @param {Number} amount [optional] - The amount to be represented
 * @param {String|Number} code [optional] - The unit of the amount or the exchange rate
 * @returns {Unit} A new instance of an Unit
 * @constructor
 */
function Unit(units, amount, code) {
  if (!(this instanceof Unit)) {
    return new Unit(units, amount, code);
  }

  this.units = units;

  // Provide option to create an object with units only.
  if (!amount && !code) {
    return;
  }

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
    return u.accessor;
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
    return (u.code == code) || (u.kind == code) || (u.shortName == code) || (u.accessor == code);
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
Unit.prototype.to = function(code, opts) {
  opts = opts || {
    fullPrecision: true
  };

  if (lodash.isNumber(code)) {
    if (code <= 0) {
      throw new errors.Unit.InvalidRate(code);
    }
    return parseFloat((getUnitValue(this, 'standard') * code).toFixed(2));
  }

  var unit = lodash.find(this.units, function(u) {
    return (u.code == code) || (u.kind == code) || (u.shortName == code) || (u.accessor == code);
  });

  if (!unit) {
    throw new errors.Unit.UnknownCode(code);
  }

  var value = this._value / unit.value;
  if (opts.fullPrecision == true) {
    return parseFloat(value.toFixed(unit.precision.full.maxDecimals));
  } else {
    return parseFloat(value.toFixed(unit.precision.short.maxDecimals));
  }
};

/**
 * Returns the unit stanDard value
 *
 * @returns {Number} The converted value
 */
Unit.prototype.toStandardUnit = function() {
  var c = lodash.find(this.units, function(u) {
    return u.kind == 'standard';
  }).code;

  return this.to(c);
};

/**
 * Returns the unit atomic value
 *
 * @returns {Number} The converted value
 */
Unit.prototype.toAtomicUnit = function() {
  var c = lodash.find(this.units, function(u) {
    return u.kind == 'atomic';
  }).code;

  return this.to(c);
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
 * Returns the available codes for each unit as an array
 *
 * @returns {array} An array of available unit codes
 */
Unit.prototype.getCodes = function() {
  return lodash.map(this.units, function(u) {
    return u.code;
  });
};

/**
 * Returns the currency code for the standard unit
 *
 * @returns {string} A currency code
 */
Unit.prototype.standardsCode = function() {
  return lodash.find(this.units, function(u) {
    return u.kind == 'standard';
  }).code;
};

/**
 * Returns the accessor for the standard unit
 *
 * @returns {string} An accessor
 */
Unit.prototype.standardsAccessor = function() {
  return lodash.find(this.units, function(u) {
    return u.kind == 'standard';
  }).accessor;
};

/**
 * Returns the shortName for the standard unit
 *
 * @returns {string} A name
 */
Unit.prototype.standardsName = function() {
  return lodash.find(this.units, function(u) {
    return u.kind == 'standard';
  }).shortName;
};

/**
 * Returns the currency code for the atomic unit
 *
 * @returns {string} A currency code
 */
Unit.prototype.atomicsCode = function() {
  return lodash.find(this.units, function(u) {
    return u.kind == 'atomic';
  }).code;
};

/**
 * Returns the accessor for the atomic unit
 *
 * @returns {string} An accessor
 */
Unit.prototype.atomicsAccessor = function() {
  return lodash.find(this.units, function(u) {
    return u.kind == 'atomic';
  }).accessor;
};

/**
 * Returns the shortName for the atomic unit
 *
 * @returns {string} A name
 */
Unit.prototype.atomicsName = function() {
  return lodash.find(this.units, function(u) {
    return u.kind == 'atomic';
  }).shortName;
};

/**
 * Returns the value represented in fiat
 *
 * @param {string} rate - The exchange rate; example BTC/USD
 * @returns {Number} The value converted to atomic units
 */
Unit.prototype.atRate = function(rate) {
  return this.to(rate);
};

/**
 * Returns a the string representation of the value using the specified kind; defaults to atomic units
 *
 * @param {string} code - the unit code or kind of string representation to create
 * @param {Object} opts
 * @param {boolean} opts.includeUnits [true] - Add the human readable unit to the result (e.g., 'BTC')
 * @param {boolean} opts.includeSeparators [true] - Add the number separators to the value (e.g., 1,000.00)
 * @param {string} opts.thousandsSeparator - default to ','
 * @param {string} opts.decimalSeparator - default to '.'
 * @param {boolean} opts.noInsignificant [true] - Include insignificant digits if precision is long
 * @returns {string} the value using the specified kind
 */
Unit.prototype.toString = function(code, opts) {
  code = code || 'atomic';
  opts = opts || {};

  lodash.defaults(opts, {
    fullPrecision: false,
    includeUnits: true,
    includeSeparators: true,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    noInsignificant: true
  })

  function addSeparators(nStr, thousands, decimal, minDecimals) {
    nStr = nStr.replace('.', decimal);
    var x = nStr.split(decimal);
    var x0 = x[0];
    var x1 = x[1];

    x1 = lodash.dropRightWhile(x1, function(n, i) {
      return n == '0' && i >= minDecimals;
    }).join('');
    var x2 = x.length > 1 ? decimal + x1 : '';

    x0 = x0.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return x0 + x2;
  }

  var pre = 'short';
  if (opts.fullPrecision) {
    pre = 'full';
  }

  var unit = getUnit(this, code);
  var amount = this.to(code, opts).toFixed(unit.precision[pre].maxDecimals);

  if (!!opts.noInsignificant && amount.indexOf('.') >= 0) {
    amount = amount.replace(/[0]+$/, '');
    amount = amount.replace(/\.$/, '');
  }

  if (!!opts.includeSeparators) {
    amount = addSeparators(amount, opts.thousandsSeparator, opts.decimalSeparator, unit.precision[pre].minDecimals);
  }

  if (!!opts.includeUnits) {
    amount = amount + ' ' + unit.shortName;
  }
  return amount;
};

/**
 * Returns a plain object representation of the Unit
 *
 * @returns {Object} An object with the keys: amount and code
 */
Unit.prototype.toJSON =
Unit.prototype.toObject = function() {
  return {
    amount: getUnitValue(this, 'standard'),
    code: getUnit(this, 'standard').code
  };
};

/**
 * Returns a string formatted for the console
 *
 * @returns {string} the value in atomic units
 */
Unit.prototype.inspect = function() {
  return '<Unit: ' + this.toString('atomic', {includeSeparators: false}) + '>';
};

/**
 * @private
 * Get the unit with the specified abstract 'kind' or code.
 * For example, using Bitcoin, kind == 'standard' will return the 'BTC' unit.
 */
function getUnit(obj, code) {
  var unit;
  unit = lodash.find(obj.units, function(u) {
    return (u.code == code) || (u.kind == code);
  });
  return unit;
};

/**
 * @private
 * Get the value of the unit with the specified 'kind' or code.
 */
function getUnitValue(obj, code) {
  var unit = getUnit(obj, code);
  if (!unit) {
    throw new errors.Unit.UnknownCode(code);
  }
  return obj[unit.shortName];
};

module.exports = Unit;
