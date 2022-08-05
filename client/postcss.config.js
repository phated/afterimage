import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
import config from "./tailwind.config.js";

export default {
  plugins: [tailwind(config), autoprefixer],
};
