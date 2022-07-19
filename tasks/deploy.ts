import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";
import dedent from "ts-dedent";

import { DiamondChanges } from "./utils/diamond";
import { tscompile } from "./utils/tscompile";

task("deploy", "deploy all contracts", deploy);

async function deploy(args: {}, hre: HardhatRuntimeEnvironment) {
  const isDev =
    hre.network.name === "localhost" || hre.network.name === "hardhat";

  // We always force a compile for tasks
  await hre.run("compile");

  // The first account in `getSigners()` is used as the deployer
  const [deployer] = await hre.ethers.getSigners();

  const requiredEther = hre.ethers.utils.parseEther("2.1");
  const balance = await deployer.getBalance();

  // When deploying to production, ensure the deployer wallet has enough
  // money in order for it to be able to deploy the contracts
  if (!isDev && balance.lt(requiredEther)) {
    throw new Error(
      `${deployer.address} requires ~$${hre.ethers.utils.formatEther(
        requiredEther
      )} but has ${hre.ethers.utils.formatEther(balance)} top up and rerun`
    );
  }

  const changes = new DiamondChanges();

  for (const { diamond, initializer, facets } of Object.values(
    hre.settings.deployments
  )) {
    const diamondContract = await deployContract(diamond, hre);

    const initializerContract = await deployContract(initializer, hre);

    // The `cuts` to perform for ZKGame facets
    const cuts = [];
    // TODO: Use `selectors` somehow
    for (const { name } of facets) {
      const facetContract = await deployContract(name, hre);
      cuts.push(...changes.getFacetCuts(name, facetContract));
    }

    const diamondCut = await hre.ethers.getContractAt(
      "ZKGame",
      diamondContract.address
    );

    // EIP-2535 specifies that the `diamondCut` function takes two optional
    // arguments: address _init and bytes calldata _calldata
    // These arguments are used to execute an arbitrary function using delegatecall
    // in order to set state variables in the diamond during deployment or an upgrade
    // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface
    const initAddress = initializerContract.address;
    const initFunctionCall = initializerContract.interface.encodeFunctionData(
      "init",
      [hre.settings.zkgame.initializers]
    );

    const initTx = await diamondCut.diamondCut(
      cuts,
      initAddress,
      initFunctionCall
    );
    const initReceipt = await initTx.wait();
    if (!initReceipt.status) {
      throw Error(`Diamond cut failed: ${initTx.hash}`);
    }
    console.log("Completed diamond cut");

    await saveDeploy(
      {
        coreBlockNumber: initReceipt.blockNumber,
        diamondAddress: diamondContract.address,
        initAddress: initializerContract.address,
      },
      hre
    );
  }

  // TODO: Upstream change to export task name from `hardhat-4byte-uploader`
  if (!isDev) {
    try {
      await hre.run("upload-selectors", { noCompile: true });
    } catch {
      console.warn(
        "WARNING: Unable to update 4byte database with our selectors"
      );
      console.warn(
        "Please run the `upload-selectors` task manually so selectors can be reversed"
      );
    }
  }

  console.log("Deployed successfully.");
}

async function deployContract(
  contractName: string,
  hre: HardhatRuntimeEnvironment
) {
  const factory = await hre.ethers.getContractFactory(contractName);
  const contract = await factory.deploy();
  await contract.deployTransaction.wait();
  console.log(`${contractName} deployed to: ${contract.address}`);
  return contract;
}

async function saveDeploy(
  args: {
    coreBlockNumber: number;
    diamondAddress: string;
    initAddress: string;
  },
  hre: HardhatRuntimeEnvironment
) {
  const isDev =
    hre.network.name === "localhost" || hre.network.name === "hardhat";

  // Save the addresses of the deployed contracts to the `@zkgame/contracts` package
  const tsContents = dedent`
    /**
     * This package contains deployed contract addresses and ABIs for a ZK Game
     *
     * ## Installation
     *
     * You can install this package using [\`npm\`](https://www.npmjs.com) or
     * [\`yarn\`](https://classic.yarnpkg.com/lang/en/) by running:
     *
     * \`\`\`bash
     * npm install --save @zkgame/contracts
     * \`\`\`
     * \`\`\`bash
     * yarn add @zkgame/contracts
     * \`\`\`
     *
     * When using this in a plugin, you might want to load it with [skypack](https://www.skypack.dev)
     *
     * \`\`\`js
     * import * as contracts from 'http://cdn.skypack.dev/@zkgame/contracts'
     * \`\`\`

     * ## ABIs
     *
     * The contract ABIs can be found in the \`json\` files.
     *
     * @packageDocumentation
     */

    /**
     * The name of the network where these contracts are deployed.
     */
    export const NETWORK = '${hre.network.name}';
    /**
     * The id of the network where these contracts are deployed.
     */
    export const NETWORK_ID = ${hre.network.config.chainId};
    /**
     * The block in which the Diamond contract was initialized.
     */
    export const START_BLOCK = ${isDev ? 0 : args.coreBlockNumber};
    /**
     * The address for the Diamond contract.
     */
    export const CONTRACT_ADDRESS = '${args.diamondAddress}';
    /**
     * The address for the Diamond Initalizer contract. Useful for lobbies.
     */
    export const INIT_ADDRESS = '${args.initAddress}';
    `;

  const { jsContents, jsmapContents, dtsContents, dtsmapContents } =
    tscompile(tsContents);

  const contractsPkgDir = hre.packages.get("@zkgame/contracts");
  if (!contractsPkgDir) {
    throw new Error("Unable to locate @zkgame/contracts directory.");
  }

  const contractsFileTS = path.join(contractsPkgDir, "index.ts");
  const contractsFileJS = path.join(contractsPkgDir, "index.js");
  const contractsFileJSMap = path.join(contractsPkgDir, "index.js.map");
  const contractsFileDTS = path.join(contractsPkgDir, "index.d.ts");
  const contractsFileDTSMap = path.join(contractsPkgDir, "index.d.ts.map");

  fs.writeFileSync(contractsFileTS, tsContents);
  fs.writeFileSync(contractsFileJS, jsContents);
  fs.writeFileSync(contractsFileJSMap, jsmapContents);
  fs.writeFileSync(contractsFileDTS, dtsContents);
  fs.writeFileSync(contractsFileDTSMap, dtsmapContents);
}
