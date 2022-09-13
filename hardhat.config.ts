// Hardhat plugins
// Note: Order probably matters!
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-abi-exporter';
import 'hardhat-diamond-abi';
// Must be registered after hardhat-diamond-abi
import '@typechain/hardhat';
import 'hardhat-circom';
import 'hardhat-contract-sizer';
import 'hardhat-settings';
import 'hardhat-vite';
import '@solidstate/hardhat-4byte-uploader';

// Our Hardhat tasks
import 'hardhat-tasks/deploy';
import 'hardhat-tasks/node';
import 'hardhat-tasks/circom';

// Other
import type { HardhatRuntimeEnvironment, HardhatUserConfig } from 'hardhat/types';
import { extendEnvironment } from 'hardhat/config';
import * as diamondUtils from 'hardhat-tasks/utils/diamond';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';

//@ts-ignore because they don't provide types
import * as mapWorkspaces from '@npmcli/map-workspaces';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    packages: Map<string, string>;
  }
}

declare module 'hardhat/types' {
  interface HardhatSettings {
    deployments: {
      [key: string]: {
        diamond: string;
        initializer: string;
        facets: { name: string; selectors: string | string[] }[];
      };
    };
  }
}

const packages = mapWorkspaces.virtual({
  cwd: __dirname,
  pkg: require('./package.json'),
  lockfile: require('./package-lock.json'),
});

extendEnvironment((env: HardhatRuntimeEnvironment) => {
  env.packages = packages;
});

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  /**
   * This configures which networks hardhat will communicate with
   */
  networks: {
    localhost: {
      accounts: {
        mnemonic: 'change typical hire slam amateur loan grid fix drama electric seed label',
      },
      chainId: 31337,
    },
    // Used when you don't specify a network on command line, like in tests
    hardhat: {
      accounts: [
        {
          privateKey: '0x044C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32',
          balance: '100000000000000000000',
        },
      ],
      blockGasLimit: 16777215,
      mining: {
        auto: false,
        interval: 1000,
      },
    },
  },
  /**
   * This configures the solidity compiler used to build our Smart Contracts.
   */
  solidity: {
    version: '0.8.10',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  /**
   * This plugins compiles circom circuits and outputs the necessary files to
   * the `@zkgame/snarks` package.
   */
  circom: {
    inputBasePath: './circuits/',
    outputBasePath: packages.get('@zkgame/snarks'),
    // The ptau15 will be automatically fetched from the hermez dropbox
    ptau: 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau',
    circuits: [
      {
        name: 'whitelist',
        circuit: 'whitelist.circom',
        input: 'whitelist-input.json',
        beacon: '0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      },
      {
        name: 'init',
        circuit: 'init.circom',
        input: 'init-input.json',
        beacon: '0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      },
      {
        name: 'move',
        circuit: 'move.circom',
        input: 'move-input.json',
        beacon: '0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      },
      {
        name: 'battle',
        circuit: 'battle.circom',
        input: 'battle-input.json',
        beacon: '0000000005060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      },
    ],
  },
  /**
   * This plugin will provide size information about all our contracts
   * via the `hardhat size-contracts` command.
   */
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  /**
   * This plugin generates TypeScript definitions for interacting with our
   * Smart Contracts—primarily the ZKGame Contract, which is the Diamond.
   */
  typechain: {
    outDir: packages.get('@zkgame/typechain'),
    target: 'ethers-v5',
  },
  /**
   * This plugin will combine all ABIs from any Smart Contract with `Facet`
   * in the name or path and output it as `ZKGame.json`.
   */
  diamondAbi: {
    name: 'ZKGame',
    include: ['Facet$', ':Diamond$'],
    // We explicitly set `strict` to `true` because we want to validate
    // our facets don't accidentally provide overlapping functions
    strict: true,
    // We use our diamond utils to filter some functions we ignore from the combined ABI
    filter(abiElement: unknown, index: number, abi: unknown[], fullyQualifiedName: string) {
      // Events can be defined in internal libraries or multiple facets and look like duplicates
      if (diamondUtils.isOverlappingEvent(abiElement)) {
        return false;
      }
      // Errors can be defined in internal libraries or multiple facets and look like duplicates
      if (diamondUtils.isOverlappingError(abiElement)) {
        return false;
      }
      const signature = diamondUtils.toSignature(abiElement);
      return diamondUtils.isIncluded(fullyQualifiedName, signature);
    },
  },
  /**
   * This plugin will copy the ABI from the ZKGame artifact into our
   * `@zkgame/contracts` package as `ZKGame.json`.
   */
  abiExporter: {
    path: packages.get('@zkgame/contracts'),
    runOnCompile: true,
    // We don't want additional directories created, so we explicitly
    // set the `flat` option to `true`
    flat: true,
    // We want to copy the ZKGame ABI (which is the Diamond ABI we generate) and the
    // initializer ABI to this folder, so we limit the matched files with the `only` option
    only: [
      ':ZKGame$',
      ':Initializer$',
      // We also want the Diamond so our Hardhat diamond utilities can filter its interface
      ':Diamond$',
    ],
  },
  /**
   * This plugin will load and parse the `zkgame.toml` file and provide the
   * values to tasks on the HardhatRuntimeEnvironment.
   */
  settings: {
    deployments: {
      lazy: false,
    },
    zkgame: {
      lazy: false,
    },
  },
  vite: {
    root: packages.get('client'),
    envFile: false,
    plugins: [
      svelte({
        // Consult https://github.com/sveltejs/svelte-preprocess for details about preprocessors
        preprocess: sveltePreprocess(),
      }),
    ],
    assetsInclude: ['**/*.zkey'],
  },
};

export default config;
