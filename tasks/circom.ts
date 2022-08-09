import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { ZkeyFastFile } from 'hardhat-circom';
import { subtask } from 'hardhat/config';
import { TASK_CIRCOM_TEMPLATE } from 'hardhat-circom';
import * as fs from 'fs/promises';
import * as path from 'path';

const camelcase = require('camelcase');

subtask(TASK_CIRCOM_TEMPLATE, circomTemplate);

async function circomTemplate(
  { zkeys }: { zkeys: ZkeyFastFile[] },
  hre: HardhatRuntimeEnvironment
) {
  // The circom task can be run with `--circuit circuitName`, and we don't want to change
  // the template if someone is trying to compile one circuit because that would remove
  // all the other verifyProof functions
  if (zkeys.length !== hre.config.circom.circuits.length) {
    throw new Error('Unable to generate circom template without all zkeys');
  }

  const contractsDir = hre.packages.get('contracts');
  if (!contractsDir) {
    throw new Error('Unable to find contracts directory');
  }
  const librariesDir = path.join(contractsDir, 'library');

  const groth16 = await fs.readFile(path.join(contractsDir, 'Verifier.sol.ejs'), 'utf8');

  await fs.mkdir(librariesDir, { recursive: true });

  for (const zkey of zkeys) {
    const verifierSol = await hre.snarkjs.zKey.exportSolidityVerifier(
      zkey,
      // We don't want to support plonk currently
      { groth16, plonk: '' }
    );

    const circuitName = camelcase(zkey.name, {
      pascalCase: true,
      preserveConsecutiveUppercase: true,
      locale: false,
    });
    const verifierPath = path.join(librariesDir, `${circuitName}Verifier.sol`);

    await fs.writeFile(verifierPath, verifierSol);
  }
}
