const dateInput = document.getElementById("entry-date");
const contentInput = document.getElementById("entry-content");
const saveButton = document.getElementById("save-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const statusEl = document.getElementById("status");
const entriesList = document.getElementById("entries-list");
const datesList = document.getElementById("dates-list");
const todayButton = document.getElementById("today-button");
const imagePreview = document.getElementById("image-preview");
const exportMonthInput = document.getElementById("export-month");
const exportMonthButton = document.getElementById("export-month-button");
const exportAllButton = document.getElementById("export-all-button");

let editingEntryId = null;
let pendingImages = [];

function todayLocalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function monthFromDate(dateText) {
  return String(dateText || "").slice(0, 7);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function formatTime(isoText) {
  const match = String(isoText).match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "请求失败");
  }
  return body;
}

function clearPendingImages() {
  pendingImages = [];
  renderPendingImages();
}

function resetEditMode() {
  editingEntryId = null;
  saveButton.textContent = "保存";
  cancelEditButton.classList.add("hidden");
  clearPendingImages();
}

function renderPendingImages() {
  imagePreview.innerHTML = "";

  for (const image of pendingImages) {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-image";

    const img = document.createElement("img");
    img.src = image.data_url;
    img.alt = image.name;

    const remove = document.createElement("button");
    remove.className = "remove-image";
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      pendingImages = pendingImages.filter((item) => item.id !== image.id);
      renderPendingImages();
    });

    const name = document.createElement("span");
    name.className = "image-name";
    name.textContent = image.name;

    wrapper.append(img, remove, name);
    imagePreview.appendChild(wrapper);
  }
}

function fileToImagePayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: crypto.randomUUID(),
      name: file.name || `clipboard-${Date.now()}.png`,
      mime_type: file.type,
      data_url: reader.result
    });
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

async function handlePaste(event) {
  const files = Array.from(event.clipboardData?.files || [])
    .filter((file) => file.type.startsWith("image/"));

  if (!files.length) return;

  event.preventDefault();
  const images = await Promise.all(files.map(fileToImagePayload));
  pendingImages = pendingImages.concat(images);
  renderPendingImages();
  setStatus(`已粘贴 ${images.length} 张图片，保存后写入记录`);
}

function renderEntryImages(images) {
  const gallery = document.createElement("div");
  gallery.className = "entry-images";

  for (const image of images || []) {
    const link = document.createElement("a");
    link.className = "entry-image";
    link.href = image.url;
    link.target = "_blank";
    link.rel = "noreferrer";

    const img = document.createElement("img");
    img.src = image.url;
    img.alt = image.original_name;

    const name = document.createElement("span");
    name.className = "image-name";
    name.textContent = image.original_name;

    link.append(img, name);
    gallery.appendChild(link);
  }

  return gallery;
}

function renderEntries(entries) {
  entriesList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "这一天还没有记录。";
    entriesList.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("article");
    item.className = "entry";

    const meta = document.createElement("div");
    meta.className = "entry-meta";

    const time = document.createElement("span");
    time.textContent = formatTime(entry.created_at);

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.type = "button";
    edit.textContent = "编辑";
    edit.addEventListener("click", () => {
      editingEntryId = entry.id;
      dateInput.value = entry.entry_date;
      contentInput.value = entry.content;
      saveButton.textContent = "更新";
      cancelEditButton.classList.remove("hidden");
      setStatus("正在编辑一条记录");
      contentInput.focus();
    });

    const content = document.createElement("div");
    content.className = "entry-content";
    content.textContent = entry.content;

    meta.append(time, edit);
    item.append(meta, content);
    if (entry.images?.length) {
      item.appendChild(renderEntryImages(entry.images));
    }
    entriesList.appendChild(item);
  }
}

function renderDates(dates) {
  datesList.innerHTML = "";

  if (!dates.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "还没有历史记录。";
    datesList.appendChild(empty);
    return;
  }

  for (const item of dates) {
    const button = document.createElement("button");
    button.className = "date-item";
    if (item.entry_date === dateInput.value) {
      button.classList.add("active");
    }
    button.type = "button";
    button.innerHTML = `<span>${item.entry_date}</span><span class="date-count">${item.count}</span>`;
    button.addEventListener("click", () => {
      dateInput.value = item.entry_date;
      resetEditMode();
      contentInput.value = "";
      loadEntries().catch((error) => setStatus(error.message));
      loadDates().catch((error) => setStatus(error.message));
    });
    datesList.appendChild(button);
  }
}

async function loadDates() {
  const body = await apiJson("/api/dates");
  renderDates(body.dates);
}

async function loadEntries() {
  const date = dateInput.value;
  if (!date) return;

  const body = await apiJson(`/api/entries?date=${encodeURIComponent(date)}`);
  renderEntries(body.entries);
}

async function saveEntry() {
  const entry_date = dateInput.value;
  const content = contentInput.value.trim();

  if (!content) {
    setStatus("请输入内容");
    contentInput.focus();
    return;
  }

  saveButton.disabled = true;
  setStatus(editingEntryId ? "更新中..." : "保存中...");
  const images = pendingImages.map(({ name, mime_type, data_url }) => ({
    name,
    mime_type,
    data_url
  }));

  try {
    if (editingEntryId) {
      await apiJson(`/api/entries/${editingEntryId}`, {
        method: "PUT",
        body: JSON.stringify({ entry_date, content, images })
      });
      setStatus("已更新");
    } else {
      await apiJson("/api/entries", {
        method: "POST",
        body: JSON.stringify({ entry_date, content, images })
      });
      setStatus("已保存");
    }

    contentInput.value = "";
    resetEditMode();
    await loadEntries();
    await loadDates();
    contentInput.focus();
  } catch (error) {
    setStatus(error.message);
  } finally {
    saveButton.disabled = false;
  }
}

async function exportMonth() {
  exportMonthButton.disabled = true;
  setStatus("导出本月...");

  try {
    const body = await apiJson("/api/export/month", {
      method: "POST",
      body: JSON.stringify({ month: exportMonthInput.value })
    });
    setStatus(`已导出：${body.file}`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    exportMonthButton.disabled = false;
  }
}

async function exportAll() {
  exportAllButton.disabled = true;
  setStatus("导出全部...");

  try {
    const body = await apiJson("/api/export/all", {
      method: "POST",
      body: JSON.stringify({})
    });
    setStatus(`已导出 ${body.files.length} 个文件`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    exportAllButton.disabled = false;
  }
}

dateInput.value = todayLocalDate();
exportMonthInput.value = monthFromDate(dateInput.value);
dateInput.addEventListener("change", () => {
  resetEditMode();
  contentInput.value = "";
  exportMonthInput.value = monthFromDate(dateInput.value);
  loadEntries().catch((error) => setStatus(error.message));
  loadDates().catch((error) => setStatus(error.message));
});
contentInput.addEventListener("paste", (event) => {
  handlePaste(event).catch((error) => setStatus(error.message));
});
saveButton.addEventListener("click", saveEntry);
cancelEditButton.addEventListener("click", () => {
  resetEditMode();
  contentInput.value = "";
  setStatus("已取消编辑");
  contentInput.focus();
});
exportMonthButton.addEventListener("click", exportMonth);
exportAllButton.addEventListener("click", exportAll);
todayButton.addEventListener("click", () => {
  dateInput.value = todayLocalDate();
  exportMonthInput.value = monthFromDate(dateInput.value);
  resetEditMode();
  contentInput.value = "";
  loadEntries().catch((error) => setStatus(error.message));
  loadDates().catch((error) => setStatus(error.message));
  contentInput.focus();
});

Promise.all([loadEntries(), loadDates()])
  .then(() => contentInput.focus())
  .catch((error) => setStatus(error.message));
