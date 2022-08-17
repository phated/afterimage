/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_DEFAULT_RPC: string;
}

interface Window {
  gm: GameManager | undefined;
  pm: PluginManager | undefined;
}
