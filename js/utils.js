const Utils = (() => {
  const nowIso = () => new Date().toISOString();

  const uid = (prefix) => {
    if (crypto?.randomUUID) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${hex}`;
  };

  const distinct = (arr) => Array.from(new Set(arr));

  const formatDate = (iso) => {
    if (!iso) return "-";
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const normalizeTag = (tag) => tag.trim().replace(/\s+/g, " ");

  const parseList = (value) => {
    if (!value) return [];
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const downloadJson = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const copyToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return true;
  };

  return {
    nowIso,
    uid,
    distinct,
    formatDate,
    normalizeTag,
    parseList,
    downloadJson,
    readFileAsText,
    copyToClipboard,
  };
})();
