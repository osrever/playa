import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });

await cp(".openai/hosting.json", "dist/.openai/hosting.json");

const files = new Map();
await addFile("/", "dist/index.html", "text/html; charset=utf-8");
await addFile("/index.html", "dist/index.html", "text/html; charset=utf-8");
await addFile("/manifest.webmanifest", "dist/manifest.webmanifest", "application/manifest+json; charset=utf-8");
await addFile("/icon.svg", "dist/icon.svg", "image/svg+xml; charset=utf-8");
await addFile("/sw.js", "dist/sw.js", "text/javascript; charset=utf-8");

for (const asset of await readdir("dist/assets")) {
  const contentType = asset.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
  await addFile(`/assets/${asset}`, join("dist/assets", asset), contentType);
}

await writeFile(
  "dist/server/index.js",
  `const FILES = new Map(${JSON.stringify([...files.entries()])});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const file = FILES.get(url.pathname) || FILES.get("/index.html");

    return new Response(file.body, {
      headers: {
        "content-type": file.contentType,
        "cache-control": url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300"
      }
    });
  }
};
`,
  "utf8"
);

async function addFile(route, path, contentType) {
  files.set(route, {
    contentType,
    body: await readFile(path, "utf8"),
  });
}
