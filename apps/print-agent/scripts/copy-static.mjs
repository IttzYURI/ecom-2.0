import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const rendererSource = path.join(appRoot, "src", "renderer");
const rendererTarget = path.join(appRoot, "dist", "renderer");

await mkdir(rendererTarget, { recursive: true });
await writeFile(
  path.join(rendererTarget, "index.html"),
  await readFile(path.join(rendererSource, "index.html"))
);
await writeFile(
  path.join(rendererTarget, "styles.css"),
  await readFile(path.join(rendererSource, "styles.css"))
);
