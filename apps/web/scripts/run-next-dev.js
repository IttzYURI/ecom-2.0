const { spawn } = require("node:child_process");
const path = require("node:path");

const localStorageFile = path.join(process.cwd(), ".node-localstorage");
const nextBin = require.resolve("next/dist/bin/next");

function normalizeNodeOptions(value) {
  const current = value ?? "";
  const stripped = current
    .replace(/--localstorage-file(?:=(?:"[^"]*"|'[^']*'|[^\s]+))?/g, "")
    .trim();

  return [stripped, `--localstorage-file="${localStorageFile}"`]
    .filter(Boolean)
    .join(" ")
    .trim();
}

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: normalizeNodeOptions(process.env.NODE_OPTIONS)
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
