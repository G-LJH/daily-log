# Daily Log MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Daily Log tool that opens from a Mac double-click launcher, saves editable daily notes to SQLite, and exports Markdown only when the user manually requests it.

**Architecture:** The app is a local Express server serving a single-page HTML/CSS/JS interface. SQLite is the source of truth; Markdown export is an explicit user action triggered from the UI. A macOS `.command` launcher starts the server if needed and opens the local page in the default browser.

**Tech Stack:** Node.js, Express, better-sqlite3, Node test runner, native HTML/CSS/JavaScript, macOS shell launcher.

---

## Scope

First version includes:

- Create a new entry for a selected date.
- View entries for the selected date.
- Edit existing entries.
- Manually export the selected date to Markdown.
- Manually export all entries to Markdown.
- Start with `npm start`.
- Double-click `Daily Log.command` on macOS to start and open the app.
- Verify behavior with automated Node tests and a short manual browser checklist.

First version excludes:

- AI summary, AI classification, tags, search, delete, login, cloud sync, images, desktop packaging, menu bar app.

## File Structure

- `package.json`: scripts and dependencies.
- `README.md`: setup, launch, usage, verification.
- `Daily Log.command`: macOS double-click launcher.
- `server/index.js`: Express app and static file server.
- `server/db.js`: SQLite connection, schema creation, CRUD helpers.
- `server/exportMarkdown.js`: Markdown generation from database entries.
- `server/time.js`: date/time formatting helpers.
- `server/paths.js`: project paths and directory creation helpers.
- `public/index.html`: app shell.
- `public/style.css`: quiet, compact local-tool styling.
- `public/app.js`: browser UI state and API calls.
- `tests/db.test.js`: database behavior tests.
- `tests/exportMarkdown.test.js`: manual export behavior tests.
- `tests/api.test.js`: HTTP API behavior tests.
- `data/`: runtime SQLite database directory, ignored by git if git is later initialized.
- `exports/markdown/`: manual Markdown export directory.

## API Contract

### `POST /api/entries`

Request:

```json
{
  "entry_date": "2026-07-05",
  "content": "今天记录了一些想法。"
}
```

Success:

```json
{
  "success": true,
  "entry": {
    "id": 1,
    "entry_date": "2026-07-05",
    "content": "今天记录了一些想法。",
    "created_at": "2026-07-05T13:20:30+08:00",
    "updated_at": "2026-07-05T13:20:30+08:00"
  }
}
```

### `GET /api/entries?date=2026-07-05`

Returns all entries for one date, ordered by `created_at ASC, id ASC`.

### `PUT /api/entries/:id`

Request:

```json
{
  "entry_date": "2026-07-05",
  "content": "改正后的内容。"
}
```

Updates entry date and content. `created_at` stays unchanged; `updated_at` changes.

### `POST /api/export/date`

Request:

```json
{
  "date": "2026-07-05"
}
```

Exports one Markdown file for the selected date.

### `POST /api/export/all`

Exports Markdown files for every date with entries.

### `GET /api/health`

Returns:

```json
{
  "success": true
}
```

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_entry_date_created_at
ON entries (entry_date, created_at);
```

## Markdown Export Format

Path:

```text
exports/markdown/YYYY/MM/YYYY-MM-DD.md
```

Example:

```markdown
# 2026-07-05

## 13:20

今天上午学习了一点 Codex 的 loop 设计。

---

## 21:45

晚上想到一个本地记录工具的设计方案。

---
```

## Tasks

### Task 1: Project Skeleton

**Files:**
- Create: `/Users/ljh/Documents/TOOLS/daily-log/package.json`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/README.md`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/server/paths.js`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/server/time.js`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/public/index.html`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/public/style.css`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/public/app.js`

- [ ] **Step 1: Create package metadata**

```json
{
  "name": "daily-log",
  "version": "0.1.0",
  "private": true,
  "description": "A local editable daily logging tool with manual Markdown export.",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "better-sqlite3": "^11.10.0",
    "express": "^4.21.2"
  }
}
```

- [ ] **Step 2: Add path helpers**

```js
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const exportsDir = path.join(rootDir, "exports");
const markdownDir = path.join(exportsDir, "markdown");
const dbPath = path.join(dataDir, "daily-log.db");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureRuntimeDirs() {
  ensureDir(dataDir);
  ensureDir(markdownDir);
}

module.exports = {
  rootDir,
  dataDir,
  exportsDir,
  markdownDir,
  dbPath,
  ensureDir,
  ensureRuntimeDirs
};
```

- [ ] **Step 3: Add time helpers**

```js
function pad(value) {
  return String(value).padStart(2, "0");
}

function todayLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function nowIsoLocal() {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`;
}

function formatTimeForMarkdown(isoText) {
  const match = String(isoText).match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "00:00";
}

function isValidDateText(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

module.exports = {
  todayLocalDate,
  nowIsoLocal,
  formatTimeForMarkdown,
  isValidDateText
};
```

- [ ] **Step 4: Add empty UI files**

`public/index.html`, `public/style.css`, and `public/app.js` can start minimal and become functional in Task 5.

- [ ] **Step 5: Verify skeleton**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm install
npm test
```

Expected: dependencies install; tests may report no tests until Task 2 adds them.

### Task 2: SQLite Data Layer

**Files:**
- Create: `/Users/ljh/Documents/TOOLS/daily-log/server/db.js`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/tests/db.test.js`

- [ ] **Step 1: Write failing database tests**

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createStore } = require("../server/db");

test("creates and lists entries by date", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-db-"));
  const store = createStore(path.join(dir, "test.db"));

  const entry = store.createEntry({
    entry_date: "2026-07-05",
    content: "first note"
  });

  assert.equal(entry.id, 1);
  assert.equal(entry.entry_date, "2026-07-05");
  assert.equal(entry.content, "first note");

  const entries = store.listEntriesByDate("2026-07-05");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].content, "first note");

  store.close();
});

test("updates an entry without changing created_at", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-db-"));
  const store = createStore(path.join(dir, "test.db"));
  const entry = store.createEntry({
    entry_date: "2026-07-05",
    content: "typo"
  });

  const updated = store.updateEntry(entry.id, {
    entry_date: "2026-07-06",
    content: "fixed"
  });

  assert.equal(updated.id, entry.id);
  assert.equal(updated.entry_date, "2026-07-06");
  assert.equal(updated.content, "fixed");
  assert.equal(updated.created_at, entry.created_at);
  assert.notEqual(updated.updated_at, "");

  store.close();
});
```

- [ ] **Step 2: Run failing database tests**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm test -- tests/db.test.js
```

Expected: FAIL because `server/db.js` does not exist yet.

- [ ] **Step 3: Implement `server/db.js`**

Implement `createStore(dbFilePath)` with:

- Schema creation on construction.
- `createEntry({ entry_date, content })`.
- `listEntriesByDate(date)`.
- `listAllDates()`.
- `listEntriesForExport(date)`.
- `updateEntry(id, { entry_date, content })`.
- `close()`.

Validation:

- `entry_date` must match `YYYY-MM-DD`.
- trimmed `content` must not be empty.
- updating a missing entry throws `Entry not found`.

- [ ] **Step 4: Run database tests**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm test -- tests/db.test.js
```

Expected: PASS.

### Task 3: Manual Markdown Export

**Files:**
- Create: `/Users/ljh/Documents/TOOLS/daily-log/server/exportMarkdown.js`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/tests/exportMarkdown.test.js`

- [ ] **Step 1: Write failing export tests**

Test these behaviors:

- Export one date to `exports/markdown/2026/07/2026-07-05.md`.
- Include all entries for that date.
- Preserve `created_at` order.
- Export all dates by calling the single-date exporter for each date.

- [ ] **Step 2: Implement export functions**

Implement:

- `markdownPathForDate(baseMarkdownDir, date)`.
- `renderDateMarkdown(date, entries)`.
- `exportDateMarkdown({ markdownDir, date, entries })`.
- `exportAllMarkdown({ markdownDir, dates, getEntries })`.

- [ ] **Step 3: Run export tests**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm test -- tests/exportMarkdown.test.js
```

Expected: PASS.

### Task 4: Express API

**Files:**
- Create: `/Users/ljh/Documents/TOOLS/daily-log/server/index.js`
- Create: `/Users/ljh/Documents/TOOLS/daily-log/tests/api.test.js`

- [ ] **Step 1: Write failing API tests**

Use Node `fetch` against a server started on a random port. Cover:

- `GET /api/health`.
- `POST /api/entries` rejects blank content.
- `POST /api/entries` creates an entry.
- `GET /api/entries?date=...` returns entries.
- `PUT /api/entries/:id` edits content.
- `POST /api/export/date` creates one Markdown file.
- `POST /api/export/all` creates Markdown files for all dates.

- [ ] **Step 2: Implement API**

`server/index.js` should:

- Create runtime directories.
- Create the SQLite store.
- Serve `public/`.
- Expose the API contract above.
- Export `createApp(options)` for tests.
- Start on `PORT || 3000` only when run directly.

- [ ] **Step 3: Run API tests**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm test -- tests/api.test.js
```

Expected: PASS.

### Task 5: Frontend UI

**Files:**
- Modify: `/Users/ljh/Documents/TOOLS/daily-log/public/index.html`
- Modify: `/Users/ljh/Documents/TOOLS/daily-log/public/style.css`
- Modify: `/Users/ljh/Documents/TOOLS/daily-log/public/app.js`

- [ ] **Step 1: Build the page**

The page should have:

- Date input defaulting to today.
- Textarea focused on load.
- Save button.
- Entries list for selected date.
- Edit button per entry.
- Manual export selected date button.
- Manual export all button.
- Status line for save/export/edit feedback.

- [ ] **Step 2: Implement browser behavior**

Required behavior:

- Changing date loads that date's entries.
- Save rejects blank content before sending.
- Save clears textarea and reloads entries.
- Edit loads the selected entry into the textarea and switches save button text to `更新`.
- Update preserves entry id and returns to create mode after success.
- Export buttons call the manual export endpoints.

- [ ] **Step 3: Manual UI check**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm start
```

Open:

```text
http://localhost:3000
```

Verify:

- The date defaults to today.
- A blank note is rejected.
- A note saves and appears in the list.
- Editing a note changes its displayed content.
- `导出当天` creates the date Markdown file.
- `导出全部` succeeds.

### Task 6: Mac Double-Click Launcher

**Files:**
- Create: `/Users/ljh/Documents/TOOLS/daily-log/Daily Log.command`
- Modify: `/Users/ljh/Documents/TOOLS/daily-log/README.md`

- [ ] **Step 1: Create launcher**

The launcher should:

- Resolve its own directory.
- Run `npm install` if `node_modules` is missing.
- Start `npm start` in the background.
- Wait briefly for `http://localhost:3000/api/health`.
- Open `http://localhost:3000`.

- [ ] **Step 2: Make launcher executable**

Run:

```bash
chmod +x "/Users/ljh/Documents/TOOLS/daily-log/Daily Log.command"
```

- [ ] **Step 3: Verify launcher**

Run:

```bash
open "/Users/ljh/Documents/TOOLS/daily-log/Daily Log.command"
```

Expected:

- Terminal opens briefly or stays open with server logs.
- Default browser opens `http://localhost:3000`.
- Health endpoint returns success.

### Task 7: End-to-End Verification

**Files:**
- Modify: `/Users/ljh/Documents/TOOLS/daily-log/README.md`

- [ ] **Step 1: Run automated tests**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Start app**

Run:

```bash
cd /Users/ljh/Documents/TOOLS/daily-log
npm start
```

Expected:

```text
Daily Log running at http://localhost:3000
```

- [ ] **Step 3: Verify API manually**

Run in another terminal:

```bash
curl -s http://localhost:3000/api/health
```

Expected:

```json
{"success":true}
```

- [ ] **Step 4: Verify persistence**

Create a note from the UI, stop the server, restart it, and reload the same date. The note should still appear.

- [ ] **Step 5: Verify manual export**

Click `导出当天`, then check:

```bash
find /Users/ljh/Documents/TOOLS/daily-log/exports/markdown -type f -name '*.md' -print
```

Expected: a Markdown file exists for the selected date.

## Self-Review

- Spec coverage: manual export, editable records, local web app, Mac launcher, SQLite persistence, and verification are covered by Tasks 2-7.
- Placeholder scan: no placeholder markers or unspecified later work remains in required scope.
- Type consistency: API names, database fields, export paths, and scripts are consistent across the plan.
