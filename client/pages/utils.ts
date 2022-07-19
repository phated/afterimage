export const tileTypeToColor: { [key: number]: string } = {
  0: "#ffac17",
  1: "#ffb83f",
  2: "#f27100",
  3: "#ffae5d",
  4: "#ff9915",
};
export function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// NOTE: eventually defined based on player/contract seed, perlin noise (for tile type) etc.
export function buildMap(width: number = 100, height: number = 100) {
  const rows = [];
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      row.push({ y: i, x: j, tileType: 2 });
    }

    rows.push(row);
  }
  return rows;
}
