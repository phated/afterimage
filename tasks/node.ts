import type { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types';
import { subtask } from 'hardhat/config';
import { TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';
import * as vite from 'vite';

subtask(TASK_NODE_SERVER_READY, nodeReady);

async function nodeReady(
  args: { address: string; port: number },
  hre: HardhatRuntimeEnvironment,
  runSuper: RunSuperFunction<{ address: string; port: number }>
) {
  await runSuper(args);

  await hre.run('deploy');

  const server = await vite.createServer({
    root: hre.packages.get('client'),
    envFile: false,
    optimizeDeps: {
      // This is needed to support BigInt out-of-the-box
      esbuildOptions: {
        target: 'es2020',
      },
    },
  });

  // Adding things here will be available in `import.meta.env`
  server.config.env.RPC_URL = `http://${args.address}:${args.port}`;

  await server.listen();

  server.printUrls();
}
