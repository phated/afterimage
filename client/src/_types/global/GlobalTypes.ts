import type { ZKGame } from "@zkgame/typechain";

declare global {
  interface Window {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    snarkjs: any;
    contract: ZKGame | undefined;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    pm: any;
  }
}
