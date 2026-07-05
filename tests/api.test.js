const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { createApp } = require("../server/index");

function tempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-log-api-"));
  return {
    dbPath: path.join(dir, "test.db"),
    markdownDir: path.join(dir, "markdown"),
    uploadsDir: path.join(dir, "uploads")
  };
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

test("health endpoint returns success", async () => {
  const app = createApp(tempPaths());
  const { server, baseUrl } = await listen(app);

  try {
    const response = await requestJson(baseUrl, "/api/health");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true });
  } finally {
    server.close();
    app.locals.store.close();
  }
});

test("creates, lists, and updates entries", async () => {
  const app = createApp(tempPaths());
  const { server, baseUrl } = await listen(app);

  try {
    const blank = await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-05", content: " " })
    });
    assert.equal(blank.status, 400);
    assert.equal(blank.body.success, false);

    const created = await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-05", content: "first note" })
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.success, true);
    assert.equal(created.body.entry.content, "first note");

    const listed = await requestJson(baseUrl, "/api/entries?date=2026-07-05");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.entries.length, 1);
    assert.equal(listed.body.entries[0].content, "first note");

    const updated = await requestJson(baseUrl, `/api/entries/${created.body.entry.id}`, {
      method: "PUT",
      body: JSON.stringify({ entry_date: "2026-07-05", content: "fixed note" })
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.entry.content, "fixed note");
    assert.equal(updated.body.entry.created_at, created.body.entry.created_at);
  } finally {
    server.close();
    app.locals.store.close();
  }
});

test("exports selected date and all months on demand", async () => {
  const paths = tempPaths();
  const app = createApp(paths);
  const { server, baseUrl } = await listen(app);

  try {
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-05", content: "july fifth" })
    });
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-04", content: "july fourth" })
    });
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-08-01", content: "august first" })
    });

    const oneDate = await requestJson(baseUrl, "/api/export/date", {
      method: "POST",
      body: JSON.stringify({ date: "2026-07-05" })
    });
    assert.equal(oneDate.status, 200);
    assert.equal(oneDate.body.success, true);
    assert.match(fs.readFileSync(oneDate.body.file, "utf8"), /july fifth/);

    const allDates = await requestJson(baseUrl, "/api/export/all", {
      method: "POST",
      body: JSON.stringify({})
    });
    assert.equal(allDates.status, 200);
    assert.equal(allDates.body.success, true);
    assert.equal(allDates.body.files.length, 2);
    assert.ok(fs.existsSync(path.join(paths.markdownDir, "2026", "2026-07.md")));
    assert.ok(fs.existsSync(path.join(paths.markdownDir, "2026", "2026-08.md")));
    assert.match(fs.readFileSync(path.join(paths.markdownDir, "2026", "2026-07.md"), "utf8"), /july fourth/);
    assert.match(fs.readFileSync(path.join(paths.markdownDir, "2026", "2026-08.md"), "utf8"), /august first/);
  } finally {
    server.close();
    app.locals.store.close();
  }
});

test("exports selected month markdown grouped by date", async () => {
  const paths = tempPaths();
  const app = createApp(paths);
  const { server, baseUrl } = await listen(app);

  try {
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-05", content: "first monthly note" })
    });
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-06", content: "second monthly note" })
    });
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-08-01", content: "other month" })
    });

    const exported = await requestJson(baseUrl, "/api/export/month", {
      method: "POST",
      body: JSON.stringify({ month: "2026-07" })
    });

    assert.equal(exported.status, 200);
    assert.equal(exported.body.success, true);
    assert.equal(exported.body.file, path.join(paths.markdownDir, "2026", "2026-07.md"));

    const markdown = fs.readFileSync(exported.body.file, "utf8");
    assert.match(markdown, /# Daily Log 2026-07/);
    assert.match(markdown, /## 2026-07-05/);
    assert.match(markdown, /first monthly note/);
    assert.match(markdown, /second monthly note/);
    assert.doesNotMatch(markdown, /other month/);
    assert.doesNotMatch(markdown, /!\[/);
  } finally {
    server.close();
    app.locals.store.close();
  }
});

test("creates entries with pasted images and exports image links", async () => {
  const paths = tempPaths();
  const app = createApp(paths);
  const { server, baseUrl } = await listen(app);

  try {
    const created = await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({
        entry_date: "2026-07-05",
        content: "note with image",
        images: [
          {
            name: "clipboard.png",
            mime_type: "image/png",
            data_url: "data:image/png;base64,aGVsbG8="
          }
        ]
      })
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.entry.images.length, 1);
    assert.equal(created.body.entry.images[0].mime_type, "image/png");
    assert.ok(fs.existsSync(path.join(paths.uploadsDir, created.body.entry.images[0].storage_path)));

    const listed = await requestJson(baseUrl, "/api/entries?date=2026-07-05");
    assert.equal(listed.body.entries[0].images.length, 1);
    assert.equal(listed.body.entries[0].images[0].url.startsWith("/uploads/"), true);

    const exported = await requestJson(baseUrl, "/api/export/date", {
      method: "POST",
      body: JSON.stringify({ date: "2026-07-05" })
    });
    const markdown = fs.readFileSync(exported.body.file, "utf8");
    assert.match(markdown, /!\[clipboard\.png\]\(\.\.\/\.\.\/uploads\/2026\/07\//);
  } finally {
    server.close();
    app.locals.store.close();
  }
});

test("lists dates with record counts for history navigation", async () => {
  const app = createApp(tempPaths());
  const { server, baseUrl } = await listen(app);

  try {
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-04", content: "old note" })
    });
    await requestJson(baseUrl, "/api/entries", {
      method: "POST",
      body: JSON.stringify({ entry_date: "2026-07-05", content: "new note" })
    });

    const response = await requestJson(baseUrl, "/api/dates");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.dates, [
      { entry_date: "2026-07-05", count: 1 },
      { entry_date: "2026-07-04", count: 1 }
    ]);
  } finally {
    server.close();
    app.locals.store.close();
  }
});
