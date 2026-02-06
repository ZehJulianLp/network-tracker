const Storage = (() => {
  const DATA_KEY = "nt_v1_data";
  const SETTINGS_KEY = "nt_v1_settings";

  const defaultData = () => ({
    schemaVersion: 1,
    contacts: [],
    edges: [],
    tags: [],
    lastSavedAt: Utils.nowIso(),
  });

  const defaultSettings = () => ({
    ui: {
      theme: "system",
      compactMode: false,
    },
    contactsView: {
      sort: "name",
      levelFilter: [],
      tagFilter: [],
      search: "",
    },
    importMode: "merge",
  });

  const load = () => {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      return {
        ...defaultData(),
        ...parsed,
      };
    } catch (error) {
      console.warn("Failed to load data", error);
      return defaultData();
    }
  };

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      const parsed = JSON.parse(raw);
      return {
        ...defaultSettings(),
        ...parsed,
        contactsView: {
          ...defaultSettings().contactsView,
          ...(parsed.contactsView || {}),
        },
      };
    } catch (error) {
      console.warn("Failed to load settings", error);
      return defaultSettings();
    }
  };

  const save = (data) => {
    try {
      const payload = { ...data, lastSavedAt: Utils.nowIso() };
      localStorage.setItem(DATA_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn("Failed to save data", error);
      return false;
    }
  };

  const saveSettings = (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.warn("Failed to save settings", error);
      return false;
    }
  };

  const clear = () => {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return {
    DATA_KEY,
    SETTINGS_KEY,
    defaultData,
    defaultSettings,
    load,
    loadSettings,
    save,
    saveSettings,
    clear,
  };
})();
