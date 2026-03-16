import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const bom = Buffer.from([0xef, 0xbb, 0xbf]);

const requiredFiles = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.js",
];

const optionalFiles = [
  "jsconfig.json",
  ".vercelignore",
  ".nvmrc",
  ".eslintrc.json",
  "next.config.mjs",
  "next.config.ts",
  "scripts/sync-legacy-assets.mjs",
];

const sourceRoots = ["app", "components", "lib", "scripts", "supabase"];
const scannedExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".sql",
]);

const jsonFiles = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "jsconfig.json",
  ".eslintrc.json",
]);

function exists(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function verifyFile(filePath) {
  const buffer = readFileSync(filePath);

  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(bom)) {
    throw new Error(`${filePath} starts with a UTF-8 BOM`);
  }

  let text;
  try {
    text = textDecoder.decode(buffer);
  } catch {
    throw new Error(`${filePath} is not valid UTF-8`);
  }

  if (jsonFiles.has(path.basename(filePath))) {
    try {
      JSON.parse(text);
    } catch (error) {
      throw new Error(`${filePath} is not valid JSON: ${error.message}`);
    }
  }
}

function walk(dirPath) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (scannedExtensions.has(path.extname(entry.name))) {
      verifyFile(fullPath);
    }
  }
}

for (const relativePath of requiredFiles) {
  const fullPath = path.join(ROOT, relativePath);
  if (!exists(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  verifyFile(fullPath);
}

for (const relativePath of optionalFiles) {
  const fullPath = path.join(ROOT, relativePath);
  if (exists(fullPath)) {
    verifyFile(fullPath);
  }
}

for (const relativePath of sourceRoots) {
  const fullPath = path.join(ROOT, relativePath);
  if (exists(fullPath)) {
    walk(fullPath);
  }
}

console.log("Critical file verification passed.");
