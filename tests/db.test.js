const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createStore } = require("../server/db");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-db-"));
  return path.join(dir, "test.db");
}

test("creates and lists entries by date", () => {
  const store = createStore(tempDbPath());

  const entry = store.createEntry({
    entry_date: "2026-07-05",
    content: "first note"
  });

  assert.equal(entry.id, 1);
  assert.equal(entry.entry_date, "2026-07-05");
  assert.equal(entry.content, "first note");
  assert.equal(entry.created_at, entry.updated_at);

  const entries = store.listEntriesByDate("2026-07-05");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].content, "first note");

  store.close();
});

test("updates an entry without changing created_at", () => {
  const store = createStore(tempDbPath());
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

  const oldDateEntries = store.listEntriesByDate("2026-07-05");
  const newDateEntries = store.listEntriesByDate("2026-07-06");
  assert.equal(oldDateEntries.length, 0);
  assert.equal(newDateEntries.length, 1);

  store.close();
});

test("rejects invalid dates and blank content", () => {
  const store = createStore(tempDbPath());

  assert.throws(() => {
    store.createEntry({ entry_date: "07-05-2026", content: "note" });
  }, /entry_date must be YYYY-MM-DD/);

  assert.throws(() => {
    store.createEntry({ entry_date: "2026-07-05", content: "   " });
  }, /content is required/);

  store.close();
});

test("lists all dates with entries in descending order", () => {
  const store = createStore(tempDbPath());

  store.createEntry({ entry_date: "2026-07-04", content: "one" });
  store.createEntry({ entry_date: "2026-07-05", content: "two" });
  store.createEntry({ entry_date: "2026-07-04", content: "three" });

  assert.deepEqual(store.listAllDates(), ["2026-07-05", "2026-07-04"]);

  store.close();
});
