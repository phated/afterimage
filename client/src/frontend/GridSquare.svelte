<div on:contextmenu|preventDefault><slot /></div>

<style>
  div {
    width: 22px;
    height: 22px;
    border-color: rgba(0, 0, 0, 0.15);
    border-style: solid;
    border-width: 1px;
    justify-content: center;
    vertical-align: middle;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--square-color);
  }
</style>
