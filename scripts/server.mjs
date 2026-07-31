import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, relative, resolve } from "node:path";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

export const startPreviewServer = ({
  host = "127.0.0.1",
  port = 8765,
  root = process.cwd(),
  silent = false,
} = {}) =>
  new Promise((resolveServer, rejectServer) => {
    const absoluteRoot = resolve(root);
    const server = createServer((request, response) => {
      const requestedPath = decodeURIComponent(
        new URL(request.url ?? "/", `http://${host}`).pathname,
      );
      const relativePath =
        requestedPath === "/" ? "cv.html" : requestedPath.slice(1);
      const absolutePath = resolve(absoluteRoot, relativePath);
      const pathFromRoot = relative(absoluteRoot, absolutePath);

      if (pathFromRoot.startsWith("..") || pathFromRoot.includes(":")) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      try {
        if (!statSync(absolutePath).isFile()) {
          throw new Error("Not a file");
        }

        response.writeHead(200, {
          "Content-Type":
            contentTypes[extname(absolutePath)] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        });
        createReadStream(absolutePath).pipe(response);
      } catch {
        response.writeHead(404).end("Not found");
      }
    });

    server.once("error", rejectServer);
    server.listen(port, host, () => {
      const address = server.address();
      const assignedPort =
        typeof address === "object" && address ? address.port : port;
      const url = `http://${host}:${assignedPort}/cv.html`;

      if (!silent) {
        console.log(`CV preview: ${url}`);
      }

      resolveServer({
        server,
        url,
        close: () =>
          new Promise((resolveClose, rejectClose) => {
            server.close((error) =>
              error ? rejectClose(error) : resolveClose(),
            );
          }),
      });
    });
  });

