'use strict';

var expect = require('chai').expect;
var should = require('chai').should();

var networkLib = require('..');
var Networks = networkLib.Networks;
var lodash = require('lodash');

describe('Networks', function() {

  var customnet;

  it('should be able to define a custom Network', function() {
    var custom = {
      name: 'customnet',
      symbol: 'customnet',
      coin: 0x81234567,
      prefix: {
        pubkeyhash: 0x10,
        privatekey: 0x90,
        scripthash: 0x08
      },
      version: {
        xpubkey: 0x0278b20e,
        xprivkey: 0x0278ade4
      },
      networkMagic: 0xe7beb4d4,
      port: 20001,
      dnsSeeds: [
        'localhost',
        'mynet.localhost'
      ],
      indexBy: Networks.indexAll
    };
    Networks.add(custom);
    customnet = Networks.get('customnet');

    var expected = new Buffer('e7beb4d4', 'hex');
    customnet.networkMagic.should.deep.equal(expected);

    for (var key in custom) {
      if (key !== 'indexBy') {
        return;
      }

      if (key !== 'networkMagic') {
        customnet[key].should.deep.equal(custom[key]);
      } else {
        var expected = new Buffer('e7beb4d4', 'hex');
        customnet[key].should.deep.equal(expected);
      }
    }
  });

  it('can remove a custom network', function() {
    Networks.remove(customnet);
    var net = Networks.get('customnet');
    should.equal(net, undefined);
  });

  it('should not set a network map for an undefined value', function() {
    var custom = {
      name: 'somenet',
      symbol: 'somenet',
      coin: 0x81234567,
      prefix: {
        pubkeyhash: 0x13,
        privatekey: 0x93,
        scripthash: 0x11
      },
      version: {
        xpubkey: 0x0278b20f,
        xprivkey: 0x0278ade5
      },
      networkMagic: 0xe7beb4d5,
      port: 20008,
      dnsSeeds: [
        'somenet.localhost'
      ],
      indexBy: Networks.indexAll
    };
    Networks.add(custom);
    var network = Networks.get(undefined);
    should.not.exist(network);
    Networks.remove(custom);
  });

  it('should get the default network', function() {
    var network = Networks.get('ROOT');
    network.should.equal(Networks.defaultNetwork);
  });

  var masterConstants = [
    'name',
    'symbol',
    'version.xpubkey',
    'version.xprivkey'
  ];

  masterConstants.forEach(function(key) {
    it('should have constant ' + key + ' for all Networks', function() {
      lodash.has(Networks.get('ROOT'), key).should.equal(true);
    });
  });

  it('tests only for the specified key', function() {
    expect(Networks.get(0x040bee6c, 'version.xprivkey')).to.equal(Networks.defaultNetwork);
    expect(Networks.get(0x040bee6c, 'version.xpubkey')).to.equal(undefined);
  });

  it('can test for multiple keys', function() {
    expect(Networks.get(0x040bee6c, ['version.xprivkey', 'version.xpubkey'])).to.equal(Networks.get('ROOT'));
    expect(Networks.get(0x040bf2a6, ['version.xprivkey', 'version.xpubkey'])).to.equal(Networks.get('ROOT'));
    expect(Networks.get(0x0, ['version.xprivkey', 'version.xpubkey'])).to.equal(undefined);
  });

  it('converts to string using the "name" property', function() {
    Networks.get('ROOT').toString().should.equal('ROOT');
  });

  it('network object should be immutable', function() {
    expect(Networks.get('ROOT').symbol).to.equal('ROOT')
    var fn = function() { Networks.get('ROOT').symbol = 'Something else' }
    expect(fn).to.throw(TypeError)
  });

});