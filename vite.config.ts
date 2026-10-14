import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [{
    name: "serve-design-atlas",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === "/design/" || request.url?.startsWith("/design/?")) {
          request.url = request.url.replace("/design/", "/design/index.html");
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === "/design/" || request.url?.startsWith("/design/?")) {
          request.url = request.url.replace("/design/", "/design/index.html");
        }
        next();
      });
    }
  }],
  server: { host: "127.0.0.1", port: 4173 },
  preview: { host: "127.0.0.1", port: 4173 },
  build: { sourcemap: true }
});
