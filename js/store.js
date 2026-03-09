const Store = (() => {
  let data = Storage.load();
  let settings = Storage.loadSettings();
  let view = "dashboard";

  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => fn());

  const normalizeCustomType = (value) => (value || "").trim().replace(/\s+/g, " ");

  const edgePairKey = (edge) => {
    const [a, b] = [edge.fromId, edge.toId].sort();
    const type = edge.type || "knows";
    const custom = normalizeCustomType(edge.customType).toLowerCase();
    return `${a}::${b}::${type}::${custom}`;
  };

  const collectEdgeTypeSuggestions = (edges, existing = []) => {
    const fromEdges = edges
      .filter((edge) => edge.type === "other")
      .map((edge) => normalizeCustomType(edge.customType))
      .filter(Boolean);
    return Utils.distinct([...(existing || []), ...fromEdges]).sort((a, b) => a.localeCompare(b));
  };

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

  const sanitizeEdgePayload = (payload) => {
    const type = payload.type || "knows";
    return {
      fromId: payload.fromId,
      toId: payload.toId,
      type,
      strength: payload.strength || "normal",
      customType: type === "other" ? normalizeCustomType(payload.customType) : "",
    };
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
    const normalized = sanitizeEdgePayload(payload);
    const edgeA = {
      id: Utils.uid("e"),
      fromId: normalized.fromId,
      toId: normalized.toId,
      type: normalized.type,
      strength: normalized.strength,
      customType: normalized.customType,
      createdAt: now,
    };
    const edgeB = {
      id: Utils.uid("e"),
      fromId: normalized.toId,
      toId: normalized.fromId,
      type: normalized.type,
      strength: normalized.strength,
      customType: normalized.customType,
      createdAt: now,
    };
    data = {
      ...data,
      edges: [edgeA, edgeB, ...data.edges],
      edgeTypeSuggestions: collectEdgeTypeSuggestions(
        [edgeA, edgeB, ...data.edges],
        data.edgeTypeSuggestions
      ),
    };
    saveAll();
    notify();
    return edgeA;
  };

  const deleteEdge = (id) => {
    const target = data.edges.find((edge) => edge.id === id);
    if (!target) return;
    const targetKey = edgePairKey(target);
    const nextEdges = data.edges.filter((edge) => edgePairKey(edge) !== targetKey);
    data = {
      ...data,
      edges: nextEdges,
      edgeTypeSuggestions: collectEdgeTypeSuggestions(nextEdges, data.edgeTypeSuggestions),
    };
    saveAll();
    notify();
  };

  const updateEdge = (id, patch) => {
    const target = data.edges.find((edge) => edge.id === id);
    if (!target) return false;

    const normalized = sanitizeEdgePayload({
      ...target,
      ...patch,
    });
    const oldKey = edgePairKey(target);

    const conflict = data.edges.some((edge) => {
      if (edgePairKey(edge) === oldKey) return false;
      return edgePairKey(edge) === edgePairKey(normalized);
    });
    if (conflict) {
      return false;
    }

    const updatedEdges = data.edges.map((edge) => {
      if (edgePairKey(edge) !== oldKey) return edge;
      const sameDirection = edge.fromId === target.fromId && edge.toId === target.toId;
      const nextFrom = sameDirection ? normalized.fromId : normalized.toId;
      const nextTo = sameDirection ? normalized.toId : normalized.fromId;
      return {
        ...edge,
        fromId: nextFrom,
        toId: nextTo,
        type: normalized.type,
        strength: normalized.strength,
        customType: normalized.customType,
      };
    });

    data = {
      ...data,
      edges: updatedEdges,
      edgeTypeSuggestions: collectEdgeTypeSuggestions(updatedEdges, data.edgeTypeSuggestions),
    };
    saveAll();
    notify();
    return true;
  };

  const replaceData = (nextData) => {
    const nextEdges = nextData.edges || data.edges || [];
    data = {
      ...data,
      ...nextData,
      edges: nextEdges,
      edgeTypeSuggestions: collectEdgeTypeSuggestions(
        nextEdges,
        nextData.edgeTypeSuggestions || data.edgeTypeSuggestions
      ),
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
    updateEdge,
    replaceData,
  };
})();
