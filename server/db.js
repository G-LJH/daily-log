const path = require("path");
const Database = require("better-sqlite3");
const { ensureDir } = require("./paths");
const { isValidDateText, nowIsoLocal } = require("./time");

function normalizeContent(content) {
  const normalized = String(content || "").trim();
  if (!normalized) {
    throw new Error("content is required");
  }
  return normalized;
}

function validateDate(entryDate) {
  if (!isValidDateText(entryDate)) {
    throw new Error("entry_date must be YYYY-MM-DD");
  }
}

function validateMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) {
    throw new Error("month must be YYYY-MM");
  }
}

function rowOrNotFound(row) {
  if (!row) {
    throw new Error("Entry not found");
  }
  return row;
}

function createStore(dbFilePath) {
  ensureDir(path.dirname(dbFilePath));
  const db = new Database(dbFilePath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_entry_date_created_at
    ON entries (entry_date, created_at);

    CREATE TABLE IF NOT EXISTS entry_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entry_images_entry_id
    ON entry_images (entry_id, id);
  `);

  const getById = db.prepare(`
    SELECT id, entry_date, content, created_at, updated_at
    FROM entries
    WHERE id = ?
  `);

  function listImagesForEntry(entryId) {
    return db.prepare(`
      SELECT id, entry_id, original_name, mime_type, storage_path, size_bytes, created_at
      FROM entry_images
      WHERE entry_id = ?
      ORDER BY id ASC
    `).all(entryId);
  }

  function withImages(entry) {
    if (!entry) return entry;
    return {
      ...entry,
      images: listImagesForEntry(entry.id)
    };
  }

  function addEntryImages(entryId, images) {
    if (!Array.isArray(images) || images.length === 0) {
      return [];
    }

    const timestamp = nowIsoLocal();
    const insert = db.prepare(`
      INSERT INTO entry_images (entry_id, original_name, mime_type, storage_path, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const image of images) {
      insert.run(
        entryId,
        image.original_name,
        image.mime_type,
        image.storage_path,
        image.size_bytes,
        timestamp
      );
    }

    return listImagesForEntry(entryId);
  }

  function createEntry({ entry_date, content }) {
    validateDate(entry_date);
    const cleanContent = normalizeContent(content);
    const timestamp = nowIsoLocal();
    const result = db.prepare(`
      INSERT INTO entries (entry_date, content, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(entry_date, cleanContent, timestamp, timestamp);

    return withImages(getById.get(result.lastInsertRowid));
  }

  function listEntriesByDate(date) {
    validateDate(date);
    return db.prepare(`
      SELECT id, entry_date, content, created_at, updated_at
      FROM entries
      WHERE entry_date = ?
      ORDER BY created_at ASC, id ASC
    `).all(date).map(withImages);
  }

  function listEntriesForExport(date) {
    return listEntriesByDate(date);
  }

  function listEntriesByMonth(month) {
    validateMonth(month);
    return db.prepare(`
      SELECT id, entry_date, content, created_at, updated_at
      FROM entries
      WHERE entry_date >= ? AND entry_date < ?
      ORDER BY entry_date ASC, created_at ASC, id ASC
    `).all(`${month}-01`, nextMonth(month)).map(withImages);
  }

  function nextMonth(month) {
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    const next = monthNumber === 12
      ? { year: year + 1, month: 1 }
      : { year, month: monthNumber + 1 };
    return `${next.year}-${String(next.month).padStart(2, "0")}-01`;
  }

  function listAllDates() {
    return db.prepare(`
      SELECT DISTINCT entry_date
      FROM entries
      ORDER BY entry_date DESC
    `).all().map((row) => row.entry_date);
  }

  function listAllMonths() {
    return db.prepare(`
      SELECT DISTINCT substr(entry_date, 1, 7) AS month
      FROM entries
      ORDER BY month DESC
    `).all().map((row) => row.month);
  }

  function listDateSummaries() {
    return db.prepare(`
      SELECT entry_date, COUNT(*) AS count
      FROM entries
      GROUP BY entry_date
      ORDER BY entry_date DESC
    `).all();
  }

  function updateEntry(id, { entry_date, content }) {
    validateDate(entry_date);
    const cleanContent = normalizeContent(content);
    rowOrNotFound(getById.get(id));

    db.prepare(`
      UPDATE entries
      SET entry_date = ?, content = ?, updated_at = ?
      WHERE id = ?
    `).run(entry_date, cleanContent, nowIsoLocal(), id);

    return withImages(rowOrNotFound(getById.get(id)));
  }

  function close() {
    db.close();
  }

  return {
    createEntry,
    addEntryImages,
    listEntriesByDate,
    listEntriesByMonth,
    listEntriesForExport,
    listAllDates,
    listAllMonths,
    listDateSummaries,
    updateEntry,
    close
  };
}

module.exports = {
  createStore
};
