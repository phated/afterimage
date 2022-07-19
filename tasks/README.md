# Hardhat Tasks

Hardhat functionality can be expanded by registering new tasks, or hooking existing tasks.

Tasks are defined inside files this directory, and imported into the `hardhat.config.ts` file at the root of the repository. Try to organize the tasks logically for easier discovery; however, all registered tasks can be reviewed via the `hardhat --help` command.

## Utilities

When writing a task that interacts with deployed contracts, the following helper should be used to load a type-safe contract:

```ts
const contract = await hre.ethers.getContractAt(
  "ZKGame"
  // Contract address
);
```

During compile, we generate a `ZKGame` ABI which combines all functions from our contracts into a single ABI. Then, TypeChain creates TypeScript helpers to ensure the `hre.ethers.getContractAt('ZKGame', ...)` function returns the `ZKGame` contract.

Other contracts could be loaded with `hre.ethers.getContractAt()`, but that shouldn't be necessary since all public functions will be available through the `ZKGame` Diamond ABI.

## Task return types

Generally, all function signatures contain the return type; however, when working with Hardhat and TypeChain, this causes a chicken-and-egg problem. Some functions will return the type-safe contract, but those types won't exist before the TypeChain files are generated during `hardhat compile`. If those files are imported, Hardhat will fail to start and can never generate the types.

Since TypeChain generates Hardhat + TypeScript helpers, function use will be type-safe after the first compile—so it is not necessary (and actively harmful) to add return types to functions in this directory.
