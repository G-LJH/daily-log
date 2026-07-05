const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { ensureDir } = require("./paths");

const allowedMimeTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("image data_url is invalid");
  }

  const mimeType = match[1];
  const extension = allowedMimeTypes.get(mimeType);
  if (!extension) {
    throw new Error("unsupported image type");
  }

  return {
    mimeType,
    extension,
    buffer: Buffer.from(match[2], "base64")
  };
}

function safeImageName(name, fallback) {
  const base = path.basename(String(name || fallback)).replace(/[^\w.-]+/g, "-");
  return base || fallback;
}

function saveEntryImages({ uploadsDir, entryDate, entryId, images = [] }) {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  const [year, month] = entryDate.split("-");
  const relativeDir = path.join(year, month);
  const absoluteDir = path.join(uploadsDir, relativeDir);
  ensureDir(absoluteDir);

  return images.map((image, index) => {
    const parsed = parseImageDataUrl(image.data_url);
    const originalName = safeImageName(image.name, `image-${index + 1}.${parsed.extension}`);
    const filename = `${entryId}-${Date.now()}-${crypto.randomUUID()}.${parsed.extension}`;
    const storagePath = path.join(relativeDir, filename);
    fs.writeFileSync(path.join(uploadsDir, storagePath), parsed.buffer);

    return {
      original_name: originalName,
      mime_type: parsed.mimeType,
      storage_path: storagePath.split(path.sep).join("/"),
      size_bytes: parsed.buffer.length
    };
  });
}

function imageUrl(storagePath) {
  return `/uploads/${String(storagePath).split(path.sep).join("/")}`;
}

function markdownImagePath(markdownFilePath, uploadsDir, imageStoragePath) {
  const imagePath = path.join(uploadsDir, imageStoragePath);
  return path.relative(path.dirname(markdownFilePath), imagePath).split(path.sep).join("/");
}

module.exports = {
  imageUrl,
  markdownImagePath,
  saveEntryImages
};
