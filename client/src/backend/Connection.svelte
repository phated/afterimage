<script lang="ts" context="module">
  import { ConnectionManager } from "@darkforest_eth/network/dist/ConnectionManager";

  export const connection = new ConnectionManager(
    import.meta.env.VITE_DEFAULT_RPC
  );
</script>
