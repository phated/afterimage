/**
 * This package contains deployed contract addresses and ABIs for a ZK Game
 *
 * ## Installation
 *
 * You can install this package using [`npm`](https://www.npmjs.com) or
 * [`yarn`](https://classic.yarnpkg.com/lang/en/) by running:
 *
 * ```bash
 * npm install --save @zkgame/contracts
 * ```
 * ```bash
 * yarn add @zkgame/contracts
 * ```
 *
 * When using this in a plugin, you might want to load it with [skypack](https://www.skypack.dev)
 *
 * ```js
 * import * as contracts from 'http://cdn.skypack.dev/@zkgame/contracts'
 * ```

 * ## ABIs
 *
 * The contract ABIs can be found in the `json` files.
 *
 * @packageDocumentation
 */
/**
 * The name of the network where these contracts are deployed.
 */
export const NETWORK = 'hardhat';
/**
 * The id of the network where these contracts are deployed.
 */
export const NETWORK_ID = 31337;
/**
 * The block in which the Diamond contract was initialized.
 */
export const START_BLOCK = 0;
/**
 * The address for the Diamond contract.
 */
export const CONTRACT_ADDRESS = '0x8f885Eb175212b5166729eCC14b44241eF29EDe5';
/**
 * The address for the Diamond Initalizer contract. Useful for lobbies.
 */
export const INIT_ADDRESS = '0x7c5De22D5fccb34233770Ed9B70f32748Ec2E349';
//# sourceMappingURL=index.js.map