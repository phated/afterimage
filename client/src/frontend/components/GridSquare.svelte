<script lang="ts">
  export let backgroundColor: string = '';
  export let backgroundImage: string = '';
</script>

<div
  on:contextmenu|preventDefault
  style:background-color={backgroundColor ?? ''}
  style:background-image={backgroundImage ?? ''}
/>

<style>
  div {
    width: 30px;
    height: 100%;
    border-color: rgba(0, 0, 0, 0.15);
    border-style: solid;
    border-width: 1px;
    justify-content: center;
    vertical-align: middle;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
