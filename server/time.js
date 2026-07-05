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
