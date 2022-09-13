import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types';
import { subtask } from 'hardhat/config';
import { TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';
import { TASK_VITE } from 'hardhat-vite';

subtask(TASK_NODE_SERVER_READY, nodeReady);

async function nodeReady(
  args: { address: string; port: number },
  hre: HardhatRuntimeEnvironment,
  runSuper: RunSuperFunction<{ address: string; port: number }>
) {
  await runSuper(args);

  await hre.run('deploy');

  await hre.run(TASK_VITE, {
    command: 'serve',
    // Adding things here will be available in `import.meta.env`
    env: {
      RPC_URL: `http://${args.address}:${args.port}`,
    },
  });
}
