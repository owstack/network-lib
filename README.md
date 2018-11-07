NetworkLib
=======

[![NPM Package](https://img.shields.io/npm/v/@owstack/network-lib.svg?style=flat-square)](https://www.npmjs.org/package/@owstack/network-lib)
[![Build Status](https://img.shields.io/travis/owstack/network-lib.svg?branch=master&style=flat-square)](https://travis-ci.org/owstack/network-lib)
[![Coverage Status](https://img.shields.io/coveralls/owstack/network-lib.svg?style=flat-square)](https://coveralls.io/r/owstack/network-lib)

A JavaScript cryptocurrency network library.

## Get Started

```
npm install @owstack/network-lib
```

## Documentation

The complete docs are hosted here: [networkLib documentation](docs/index.md).

## Security

If you find a security issue, please email security@openwalletstack.com.

## Contributing

Please send pull requests for bug fixes, code optimization, and ideas for improvement. For more information on how to contribute, please refer to our [CONTRIBUTING](https://github.com/owstack/network-lib/blob/master/CONTRIBUTING.md) file.

## Building the Browser Bundle

To build a network-lib full bundle for the browser:

```sh
gulp browser
```

This will generate files named `network-lib.js` and `network-lib.min.js`.

## Development & Tests

```sh
git clone https://github.com/owstack/network-lib
cd network-lib
npm install
```

Run all the tests:

```sh
gulp test
```

You can also run just the Node.js tests with `gulp test:node`, just the browser tests with `gulp test:browser`
or create a test coverage report (you can open `coverage/lcov-report/index.html` to visualize it) with `gulp coverage`.

## License

Code released under [the MIT license](https://github.com/owstack/network-lib/blob/master/LICENSE).

Copyright 2018 Open Wallet Stack.
