import { resolve } from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/models.mts"),
      name: "models",
      fileName: (format) => `models.${format}.js`,
    },
  },
  plugins: [dts()],
})
