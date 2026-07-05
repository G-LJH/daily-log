const express = require("express");
const path = require("path");
const { createStore } = require("./db");
const { exportAllMarkdown, exportDateMarkdown, exportMonthMarkdown } = require("./exportMarkdown");
const { imageUrl, saveEntryImages } = require("./images");
const {
  dbPath: defaultDbPath,
  ensureRuntimeDirs,
  markdownDir: defaultMarkdownDir,
  rootDir,
  uploadsDir: defaultUploadsDir
} = require("./paths");

function toErrorResponse(error) {
  return {
    success: false,
    message: error.message || "Unexpected error"
  };
}

function decorateEntryImages(entry) {
  return {
    ...entry,
    images: entry.images.map((image) => ({
      ...image,
      url: imageUrl(image.storage_path)
    }))
  };
}

function createApp(options = {}) {
  ensureRuntimeDirs();

  const store = options.store || createStore(options.dbPath || defaultDbPath);
  const markdownDir = options.markdownDir || defaultMarkdownDir;
  const uploadsDir = options.uploadsDir || defaultUploadsDir;
  const app = express();

  app.locals.store = store;
  app.locals.markdownDir = markdownDir;
  app.locals.uploadsDir = uploadsDir;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.static(path.join(rootDir, "public")));
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (req, res) => {
    res.json({ success: true });
  });

  app.post("/api/entries", (req, res) => {
    try {
      const entry = store.createEntry({
        entry_date: req.body.entry_date,
        content: req.body.content
      });
      const images = saveEntryImages({
        uploadsDir,
        entryDate: entry.entry_date,
        entryId: entry.id,
        images: req.body.images
      });
      store.addEntryImages(entry.id, images);
      const savedEntry = store.listEntriesByDate(entry.entry_date).find((item) => item.id === entry.id);
      res.status(201).json({ success: true, entry: decorateEntryImages(savedEntry) });
    } catch (error) {
      res.status(400).json(toErrorResponse(error));
    }
  });

  app.get("/api/entries", (req, res) => {
    try {
      const entries = store.listEntriesByDate(req.query.date).map((entry) => ({
        ...decorateEntryImages(entry)
      }));
      res.json({ success: true, entries });
    } catch (error) {
      res.status(400).json(toErrorResponse(error));
    }
  });

  app.get("/api/dates", (req, res) => {
    res.json({ success: true, dates: store.listDateSummaries() });
  });

  app.put("/api/entries/:id", (req, res) => {
    try {
      const entry = store.updateEntry(Number(req.params.id), {
        entry_date: req.body.entry_date,
        content: req.body.content
      });
      const images = saveEntryImages({
        uploadsDir,
        entryDate: entry.entry_date,
        entryId: entry.id,
        images: req.body.images
      });
      store.addEntryImages(entry.id, images);
      const savedEntry = store.listEntriesByDate(entry.entry_date).find((item) => item.id === entry.id);
      res.json({
        success: true,
        entry: decorateEntryImages(savedEntry)
      });
    } catch (error) {
      const status = error.message === "Entry not found" ? 404 : 400;
      res.status(status).json(toErrorResponse(error));
    }
  });

  app.post("/api/export/date", (req, res) => {
    try {
      const date = req.body.date;
      const file = exportDateMarkdown({
        markdownDir,
        uploadsDir,
        date,
        entries: store.listEntriesForExport(date)
      });
      res.json({ success: true, file });
    } catch (error) {
      res.status(400).json(toErrorResponse(error));
    }
  });

  app.post("/api/export/month", (req, res) => {
    try {
      const month = req.body.month;
      const file = exportMonthMarkdown({
        markdownDir,
        month,
        entries: store.listEntriesByMonth(month)
      });
      res.json({ success: true, file });
    } catch (error) {
      res.status(400).json(toErrorResponse(error));
    }
  });

  app.post("/api/export/all", (req, res) => {
    try {
      const files = exportAllMarkdown({
        markdownDir,
        months: store.listAllMonths(),
        getEntries: (month) => store.listEntriesByMonth(month)
      });
      res.json({ success: true, files });
    } catch (error) {
      res.status(400).json(toErrorResponse(error));
    }
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Daily Log running at http://localhost:${port}`);
  });

  process.on("SIGINT", () => {
    server.close(() => {
      app.locals.store.close();
      process.exit(0);
    });
  });
}

module.exports = {
  createApp
};
