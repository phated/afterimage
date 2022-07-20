import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types';
import { subtask } from 'hardhat/config';
import { TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';

subtask(TASK_NODE_SERVER_READY, nodeReady);

async function nodeReady(
  args: unknown,
  hre: HardhatRuntimeEnvironment,
  runSuper: RunSuperFunction<unknown>
) {
  await runSuper(args);

  await hre.run('deploy');
}
