/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  RPC_URL: string;
}

interface Window {
  gm: GameManager | undefined;
  pm: PluginManager | undefined;
}
