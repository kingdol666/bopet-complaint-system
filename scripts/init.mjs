/**
 * 数据库初始化脚本
 * 执行顺序：
 * 1. 准备 Prisma Schema
 * 2. 生成 Prisma Client
 * 3. 推送数据库 Schema（创建 data/bopet.db）
 * 4. 写入种子数据
 *
 * 使用方法: npm run init
 *   或: node scripts/init.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const dataDir = resolve(rootDir, "data");

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function log(msg, color = "cyan") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function run(cmd, description) {
  log(`\n${colors.bold}[${description}]${colors.reset}`);
  log(`  执行: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: rootDir });
    log(`  ✓ 完成`, "green");
  } catch (error) {
    log(`  ✗ 失败: ${error.message}`, "red");
    process.exit(1);
  }
}

async function main() {
  log("\n========================================", "bold");
  log("  BOPET EDA 数据库初始化", "bold");
  log("========================================\n", "bold");

  // 确保数据目录存在
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    log(`  ✓ 创建数据目录: ${dataDir}`, "green");
  } else {
    log(`  ✓ 数据目录已存在: ${dataDir}`, "green");
  }

  // 步骤 1: 准备 Prisma Schema
  run("node scripts/prepare-prisma-schema.mjs", "步骤 1/4: 准备 Prisma Schema");

  // 步骤 2: 生成 Prisma Client
  run("npx prisma generate", "步骤 2/4: 生成 Prisma Client");

  // 步骤 3: 推送数据库 Schema
  run("npx prisma db push", "步骤 3/4: 推送数据库 Schema");

  // 检查数据库文件是否创建
  const dbPath = resolve(dataDir, "bopet.db");
  if (existsSync(dbPath)) {
    log(`  ✓ 数据库文件已创建: ${dbPath}`, "green");
  }

  // 步骤 4: 写入种子数据
  run("npx tsx prisma/seed.ts", "步骤 4/4: 写入种子数据");

  log("\n========================================", "bold");
  log("  数据库初始化完成！", "green");
  log("========================================\n", "bold");

  log("默认账号:", "yellow");
  log("  超级管理员: admin / admin123", "cyan");
  log("  部门管理员: deptadmin / deptadmin123", "cyan");
  log("  普通用户:   operator / operator123", "cyan");
  log("  普通用户:   quality / quality123", "cyan");
  log("");
}

main().catch((error) => {
  log(`\n初始化失败: ${error.message}`, "red");
  process.exit(1);
});
