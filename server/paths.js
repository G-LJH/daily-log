const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const exportsDir = path.join(rootDir, "exports");
const markdownDir = path.join(exportsDir, "markdown");
const uploadsDir = path.join(dataDir, "uploads");
const dbPath = path.join(dataDir, "daily-log.db");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureRuntimeDirs() {
  ensureDir(dataDir);
  ensureDir(markdownDir);
  ensureDir(uploadsDir);
}

module.exports = {
  rootDir,
  dataDir,
  exportsDir,
  markdownDir,
  uploadsDir,
  dbPath,
  ensureDir,
  ensureRuntimeDirs
};
