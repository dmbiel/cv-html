import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const host = process.env.CV_HOST ?? "127.0.0.1";
const port = Number(process.env.CV_PORT ?? 8765);
const root = process.cwd();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

createServer((request, response) => {
  const requestedPath = decodeURIComponent(
    new URL(request.url ?? "/", `http://${host}`).pathname,
  );
  const relativePath = requestedPath === "/" ? "cv.html" : requestedPath.slice(1);
  const absolutePath = normalize(join(root, relativePath));

  if (!absolutePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    if (!statSync(absolutePath).isFile()) {
      throw new Error("Not a file");
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extname(absolutePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(absolutePath).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, host, () => {
  console.log(`CV preview: http://${host}:${port}/cv.html`);
});

