const Store = (() => {
  let data = Storage.load();
  let settings = Storage.loadSettings();
  let view = "dashboard";

  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => fn());

  const ensureSelfContact = () => {
    const existing = data.contacts.find((c) => c?.meta?.isSelf);
    if (existing) return;
    const now = Utils.nowIso();
    const selfContact = {
      id: Utils.uid("c"),
      displayName: "Me",
      handles: [],
      level: "L1",
      tags: ["Self"],
      notes: "Your own profile.",
      createdAt: now,
      updatedAt: now,
      meta: { isSelf: true },
    };
    data = {
      ...data,
      contacts: [selfContact, ...data.contacts],
      tags: Utils.distinct([...(data.tags || []), ...selfContact.tags]),
    };
    saveAll();
  };

  const saveAll = () => {
    const savedData = Storage.save(data);
    const savedSettings = Storage.saveSettings(settings);
    if (!savedData || !savedSettings) {
      window.dispatchEvent(
        new CustomEvent("storage-error", {
          detail: "Saving failed. Local storage may be full or blocked.",
        })
      );
    }
  };

  const getState = () => ({
    data,
    settings,
    view,
  });

  const setView = (nextView) => {
    view = nextView;
    notify();
  };

  const updateSettings = (patch) => {
    settings = {
      ...settings,
      ...patch,
    };
    saveAll();
    notify();
  };

  const updateContactsView = (patch) => {
    settings = {
      ...settings,
      contactsView: {
        ...settings.contactsView,
        ...patch,
      },
    };
    saveAll();
    notify();
  };

  const addContact = (payload) => {
    const now = Utils.nowIso();
    const contact = {
      id: Utils.uid("c"),
      displayName: payload.displayName.trim(),
      handles: payload.handles || [],
      level: payload.level || "L3",
      tags: payload.tags || [],
      notes: payload.notes || "",
      createdAt: now,
      updatedAt: now,
      meta: payload.meta || {},
    };
    data = {
      ...data,
      contacts: [contact, ...data.contacts],
      tags: Utils.distinct([...(data.tags || []), ...contact.tags]),
    };
    saveAll();
    notify();
    return contact;
  };

  const updateContact = (id, patch) => {
    const now = Utils.nowIso();
    data = {
      ...data,
      contacts: data.contacts.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              ...patch,
              updatedAt: now,
            }
          : contact
      ),
    };
    const allTags = data.contacts.flatMap((c) => c.tags || []);
    data = {
      ...data,
      tags: Utils.distinct(allTags),
    };
    saveAll();
    notify();
  };

  const deleteContact = (id) => {
    data = {
      ...data,
      contacts: data.contacts.filter((contact) => contact.id !== id),
      edges: data.edges.filter((edge) => edge.fromId !== id && edge.toId !== id),
    };
    const allTags = data.contacts.flatMap((c) => c.tags || []);
    data = {
      ...data,
      tags: Utils.distinct(allTags),
    };
    saveAll();
    notify();
  };

  const addEdge = (payload) => {
    const now = Utils.nowIso();
    const edgeA = {
      id: Utils.uid("e"),
      fromId: payload.fromId,
      toId: payload.toId,
      type: payload.type || "knows",
      strength: payload.strength || "normal",
      createdAt: now,
    };
    const edgeB = {
      id: Utils.uid("e"),
      fromId: payload.toId,
      toId: payload.fromId,
      type: payload.type || "knows",
      strength: payload.strength || "normal",
      createdAt: now,
    };
    data = {
      ...data,
      edges: [edgeA, edgeB, ...data.edges],
    };
    saveAll();
    notify();
    return edgeA;
  };

  const deleteEdge = (id) => {
    const target = data.edges.find((edge) => edge.id === id);
    if (!target) return;
    data = {
      ...data,
      edges: data.edges.filter(
        (edge) =>
          !(
            edge.type === target.type &&
            ((edge.fromId === target.fromId && edge.toId === target.toId) ||
              (edge.fromId === target.toId && edge.toId === target.fromId))
          )
      ),
    };
    saveAll();
    notify();
  };

  const replaceData = (nextData) => {
    data = {
      ...data,
      ...nextData,
    };
    ensureSelfContact();
    saveAll();
    notify();
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  ensureSelfContact();

  return {
    getState,
    subscribe,
    setView,
    updateSettings,
    updateContactsView,
    addContact,
    updateContact,
    deleteContact,
    addEdge,
    deleteEdge,
    replaceData,
  };
})();
