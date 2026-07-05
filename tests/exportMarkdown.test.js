const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const {
  exportAllMarkdown,
  exportDateMarkdown,
  exportMonthMarkdown,
  markdownPathForMonth,
  markdownPathForDate,
  renderMonthMarkdown,
  renderDateMarkdown
} = require("../server/exportMarkdown");

test("builds markdown path from date", () => {
  const filePath = markdownPathForDate("/tmp/markdown", "2026-07-05");
  assert.equal(filePath, path.join("/tmp/markdown", "2026", "2026-07-05.md"));
});

test("builds markdown path from month", () => {
  const filePath = markdownPathForMonth("/tmp/markdown", "2026-07");
  assert.equal(filePath, path.join("/tmp/markdown", "2026", "2026-07.md"));
});

test("renders month markdown grouped by date without time or images", () => {
  const markdown = renderMonthMarkdown("2026-07", [
    {
      entry_date: "2026-07-05",
      content: "first note",
      created_at: "2026-07-05T09:15:00+08:00",
      images: [{ original_name: "ignored.png", storage_path: "2026/07/ignored.png" }]
    },
    {
      entry_date: "2026-07-05",
      content: "second note",
      created_at: "2026-07-05T21:45:00+08:00"
    },
    {
      entry_date: "2026-07-06",
      content: "next day",
      created_at: "2026-07-06T08:00:00+08:00"
    }
  ]);

  assert.equal(markdown, [
    "# Daily Log 2026-07",
    "",
    "## 2026-07-05",
    "",
    "### 记录 1",
    "",
    "first note",
    "",
    "### 记录 2",
    "",
    "second note",
    "",
    "---",
    "",
    "## 2026-07-06",
    "",
    "### 记录 1",
    "",
    "next day",
    ""
  ].join("\n"));
});

test("renders entries for one date in created order", () => {
  const markdown = renderDateMarkdown("2026-07-05", [
    {
      content: "morning note",
      created_at: "2026-07-05T09:15:00+08:00"
    },
    {
      content: "evening note",
      created_at: "2026-07-05T21:45:00+08:00"
    }
  ]);

  assert.equal(markdown, [
    "# 2026-07-05",
    "",
    "## 09:15",
    "",
    "morning note",
    "",
    "---",
    "",
    "## 21:45",
    "",
    "evening note",
    "",
    "---",
    ""
  ].join("\n"));
});

test("exports one date markdown file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-export-"));
  const filePath = exportDateMarkdown({
    markdownDir: dir,
    date: "2026-07-05",
    entries: [
      {
        content: "note",
        created_at: "2026-07-05T13:20:00+08:00"
      }
    ]
  });

  assert.equal(filePath, path.join(dir, "2026", "2026-07-05.md"));
  assert.match(fs.readFileSync(filePath, "utf8"), /## 13:20\n\nnote/);
});

test("exports one month markdown file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-export-"));
  const filePath = exportMonthMarkdown({
    markdownDir: dir,
    month: "2026-07",
    entries: [
      {
        entry_date: "2026-07-05",
        content: "monthly note",
        created_at: "2026-07-05T13:20:00+08:00"
      }
    ]
  });

  assert.equal(filePath, path.join(dir, "2026", "2026-07.md"));
  assert.match(fs.readFileSync(filePath, "utf8"), /# Daily Log 2026-07/);
  assert.match(fs.readFileSync(filePath, "utf8"), /monthly note/);
});

test("exports all months", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-export-"));
  const exported = exportAllMarkdown({
    markdownDir: dir,
    months: ["2026-07", "2026-08"],
    getEntries: (month) => [
      {
        entry_date: `${month}-05`,
        content: `note for ${month}`,
        created_at: `${month}-05T08:00:00+08:00`
      }
    ]
  });

  assert.deepEqual(exported, [
    path.join(dir, "2026", "2026-07.md"),
    path.join(dir, "2026", "2026-08.md")
  ]);
  assert.match(fs.readFileSync(exported[1], "utf8"), /note for 2026-08/);
});
