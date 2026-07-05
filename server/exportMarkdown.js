const fs = require("fs");
const path = require("path");
const { ensureDir, uploadsDir: defaultUploadsDir } = require("./paths");
const { markdownImagePath } = require("./images");
const { formatTimeForMarkdown, isValidDateText } = require("./time");

function assertDate(date) {
  if (!isValidDateText(date)) {
    throw new Error("date must be YYYY-MM-DD");
  }
}

function assertMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) {
    throw new Error("month must be YYYY-MM");
  }
}

function markdownPathForDate(baseMarkdownDir, date) {
  assertDate(date);
  const [year] = date.split("-");
  return path.join(baseMarkdownDir, year, `${date}.md`);
}

function markdownPathForMonth(baseMarkdownDir, month) {
  assertMonth(month);
  const [year] = month.split("-");
  return path.join(baseMarkdownDir, year, `${month}.md`);
}

function renderDateMarkdown(date, entries, markdownFilePath = "", uploadsDir = defaultUploadsDir) {
  assertDate(date);
  const lines = [`# ${date}`, ""];

  for (const entry of entries) {
    lines.push(`## ${formatTimeForMarkdown(entry.created_at)}`);
    lines.push("");
    lines.push(entry.content);
    lines.push("");
    for (const image of entry.images || []) {
      const imagePath = markdownFilePath
        ? markdownImagePath(markdownFilePath, uploadsDir, image.storage_path)
        : image.storage_path;
      lines.push(`![${image.original_name}](${imagePath})`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function renderMonthMarkdown(month, entries) {
  assertMonth(month);
  const lines = [`# Daily Log ${month}`, ""];
  let currentDate = "";
  let recordNumber = 0;

  for (const entry of entries) {
    if (entry.entry_date !== currentDate) {
      if (currentDate) {
        lines.push("---");
        lines.push("");
      }
      currentDate = entry.entry_date;
      recordNumber = 1;
      lines.push(`## ${entry.entry_date}`);
      lines.push("");
    } else {
      recordNumber += 1;
    }

    lines.push(`### 记录 ${recordNumber}`);
    lines.push("");
    lines.push(entry.content);
    lines.push("");
  }

  return lines.join("\n");
}

function exportDateMarkdown({ markdownDir, uploadsDir = defaultUploadsDir, date, entries }) {
  const filePath = markdownPathForDate(markdownDir, date);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, renderDateMarkdown(date, entries, filePath, uploadsDir), "utf8");
  return filePath;
}

function exportMonthMarkdown({ markdownDir, month, entries }) {
  const filePath = markdownPathForMonth(markdownDir, month);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, renderMonthMarkdown(month, entries), "utf8");
  return filePath;
}

function exportAllMarkdown({ markdownDir, months, getEntries }) {
  return months.map((month) => exportMonthMarkdown({
    markdownDir,
    month,
    entries: getEntries(month)
  }));
}

module.exports = {
  exportAllMarkdown,
  exportDateMarkdown,
  exportMonthMarkdown,
  markdownPathForMonth,
  markdownPathForDate,
  renderMonthMarkdown,
  renderDateMarkdown
};
