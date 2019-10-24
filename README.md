# Wrapped Ether Helper (`@habsyr/weth-helper`)

Exports a helper class `WethHelper` to simplify interactions with the canonical wrapped Ether (WETH9) contract.

Documentation can be found in the [`docs/`](./docs) folder.

## Usage

This section will get you started quickly with the `WethHelper` class.

### Install

Add the package to your project.

```bash
# with yarn
yarn add @habsyr/weth-helper

# with npm
npm i --save @habsyr/weth-helper
```

### Import

Import the helper class into your codebase.

```typescript
// ES6+ and TypeScript
import { WethHelper } from "@habsyr/weth-helper";

// CommonJS
const { WethHelper } = require("@habsyr/weth-helper");
```

### Setup

You must instantiate helper instances with a configured Ethereum provider.

#### Browser

To use in a `web3` supported browser, try the following.

```javascript
const { WethHelper } = require("@habsyr/weth-helper");

(async () => {
    await window.ethereum.enable();

    const wethHelper = new WethHelper(window.ethereum);

    // use any public methods after construction
    const one = wethHelper.toBaseUnit(1);
    const txId = await wethHelper.wrap(one);
})();
```

#### Server

For usage in the server (Node.js), try the following.

```javascript
const { WethHelper } = require("@habsyr/weth-helper");
const Web3 = require("web3");

const {
    ETHEREUM_JSONRPC_URL = "http://localhost:8545",
} = process.env;

const web3 = new Web3(ETHEREUM_JSONRPC_URL);
const wethHelper = new WethHelper(web3.currentProvider);
```

## Develop

1. Install dependencies (`yarn`)
1. Build source (`yarn build`)
1. Lint source (`yarn lint`)
1. Generate docs (`yarn docs`)
1. Run tests (`yarn test`)

## License

[MIT Licensed](./LICENSE).

Written by Henry Harder (`@hrharder`), 2019.

## Contributing

Contributions and issue reports welcome and encourage. 

Please feel free to open an [issue](https://github.com/hrharder/weth-helper/issues) or a [pull request](https://github.com/hrharder/weth-helper/pulls) as needed.