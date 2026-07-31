import { startPreviewServer } from "./server.mjs";

await startPreviewServer({
  host: process.env.CV_HOST ?? "127.0.0.1",
  port: Number(process.env.CV_PORT ?? 8765),
});

