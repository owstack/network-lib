'use strict';

var expect = require('chai').expect;
var should = require('chai').should();

var owsCommon = require('@owstack/ows-common');
var Networks = require('..');
var lodash = owsCommon.deps.lodash;

describe('Units', function() {
    
  var UNITS = [{
      name: 'Bitcoin',
      shortName: 'BTC',
      code: 'BTC',
      accessor: 'BTC',
      kind: 'standard',
      value: 100000000,
      precision: {
        full: {
          maxDecimals: 8,
          minDecimals: 8
        },
        short: {
          maxDecimals: 6,
          minDecimals: 2
        }
      }
    }, {
      name: 'mBTC (1,000 mBTC = 1BTC)',
      shortName: 'mBTC',
      code: 'mBTC',
      accessor: 'mBTC',
      kind: 'millis',
      value: 100000,
      precision: {
        full: {
          maxDecimals: 5,
          minDecimals: 5
        },
        short: {
          maxDecimals: 3,
          minDecimals: 2
        }
      }
    }, {
      name: 'uBTC (1,000,000 uBTC = 1BTC)',
      shortName: 'uBTC',
      code: 'uBTC',
      accessor: 'uBTC',
      kind: 'micros',
      value: 100,
      precision: {
        full: {
          maxDecimals: 4,
          minDecimals: 4
        },
        short: {
          maxDecimals: 2,
          minDecimals: 1
        }
      }
    }, {
      name: 'bits (1,000,000 bits = 1BTC)',
      shortName: 'bits',
      code: 'bit',
      accessor: 'bits',
      kind: 'bits',
      value: 100,
      precision: {
        full: {
          maxDecimals: 2,
          minDecimals: 2
        },
        short: {
          maxDecimals: 0,
          minDecimals: 0
        }
      }
    }, {
      name: 'satoshi (100,000,000 satoshi = 1BTC)',
      shortName: 'sats',
      code: 'satoshi',
      accessor: 'satoshis',
      kind: 'atomic',
      value: 1,
      precision: {
        full: {
          maxDecimals: 0,
          minDecimals: 0
        },
        short: {
          maxDecimals: 0,
          minDecimals: 0
        }
      }
    }];

  it('converts correctly', function() {
    var unit = new Networks.Unit(UNITS, 1.345, 'BTC');

    unit.toStandardUnit().should.equal(1.345);
    unit.toAtomicUnit().should.equal(134500000);

    unit.toString('BTC').should.equal('1.345 BTC');
    unit.toString('mBTC').should.equal('1,345 mBTC');
    unit.toString('uBTC').should.equal('1,345,000 uBTC');
    unit.toString('bit').should.equal('1,345,000 bits');
    unit.toString('satoshi').should.equal('134,500,000 sats');

    unit.toString('BTC', {
      fullPrecision: true,
      noInsignificant: false
    }).should.equal('1.34500000 BTC');

    unit.toString('BTC', {
      noInsignificant: false
    }).should.equal('1.345 BTC');

    unit.toString('mBTC', {
      fullPrecision: true,
      noInsignificant: false
    }).should.equal('1,345.00000 mBTC');

    unit.toString('mBTC', {
      noInsignificant: false
    }).should.equal('1,345.00 mBTC');

    unit.toString('mBTC', {
      fullPrecision: true,
      noInsignificant: false
    }).should.equal('1,345.00000 mBTC');

    unit.toString('BTC', {
      fullPrecision: true,
      includeUnits: true,
      includeSeparators: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      noInsignificant: true
    }).should.equal('1.345 BTC');

    unit.toString('BTC', {
      fullPrecision: true,
      includeUnits: false,
      includeSeparators: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      noInsignificant: true
    }).should.equal('1.345');

    unit.toString('BTC', {
      fullPrecision: true,
      includeUnits: false,
      includeSeparators: true,
      thousandsSeparator: ',',
      decimalSeparator: '*',
      noInsignificant: true
    }).should.equal('1*345');

    unit.toString('BTC', {
      fullPrecision: true,
      includeUnits: true,
      includeSeparators: true,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      noInsignificant: false
    }).should.equal('1.34500000 BTC');
  });

});
