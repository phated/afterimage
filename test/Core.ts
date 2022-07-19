import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import * as hre from "hardhat";
import { deployAll } from "hardhat-tasks/deploy";

describe("test", () => {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployFixture() {
    const BLOCKS = 32;

    const { diamondContract, initializerContract, initTx } = await deployAll(
      {
        diamond: "Diamond",
        initializer: "Initializer",
        facets: [{ name: "CoreFacet", selectors: "*" }],
      },
      hre
    );

    const initReceipt = await initTx.wait(BLOCKS);
    if (!initReceipt.status) {
      throw Error(`Diamond cut failed: ${initTx.hash}`);
    }

    return { diamondContract, initializerContract };
  }

  it("works", async () => {
    const { diamondContract } = await loadFixture(deployFixture);

    console.log(diamondContract);
  }).timeout(60000);
});
