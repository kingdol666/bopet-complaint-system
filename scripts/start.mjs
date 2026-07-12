/**
 * Production start script.
 * Resolves DATABASE_URL to an absolute path based on the startup directory,
 * then launches the Nitro server.
 *
 * Usage: node scripts/start.mjs
 *   or:  npm start
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// Resolve database path relative to project root (data/)
const dbDir = resolve(rootDir, "data");
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}
const dbPath = resolve(dbDir, "data.db");

// Resolve absolute DATABASE_URL
process.env.DATABASE_URL = `file:${dbPath}`;

// 绑定到所有网络接口（0.0.0.0），允许外网访问
// 端口默认 3001，可通过环境变量 PORT 覆盖
process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.PORT = process.env.PORT || "3001";
process.env.NITRO_HOST = process.env.NITRO_HOST || "0.0.0.0";
process.env.NITRO_PORT = process.env.NITRO_PORT || process.env.PORT;

console.log(`[start] DATABASE_URL = ${process.env.DATABASE_URL}`);
console.log(`[start] Server binding: ${process.env.HOST}:${process.env.PORT}`);
console.log(`[start] External access: http://<your-ip>:${process.env.PORT}`);

// Set heap memory limit to avoid OOM (inherits from parent if set via NODE_OPTIONS)
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = "--max-old-space-size=4096";
}
console.log(`[start] NODE_OPTIONS = ${process.env.NODE_OPTIONS}`);

// Launch the Nitro server
const serverEntry = resolve(rootDir, ".output", "server", "index.mjs");
const child = spawn("node", ["--max-old-space-size=4096", serverEntry], {
  stdio: "inherit",
  env: process.env,
  cwd: rootDir,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
