const ImportExport = (() => {
  const exportWrapper = (data) => ({
    version: "1.0",
    app: "network-tracker",
    exportedAt: Utils.nowIso(),
    data: {
      contacts: data.contacts,
      edges: data.edges,
      tags: data.tags,
    },
  });

  const validateImport = (wrapper) => {
    const errors = Validate.validateWrapper(wrapper);
    if (errors.length) return errors;

    const contacts = wrapper.data.contacts;
    const edges = wrapper.data.edges;
    const contactsById = {};
    const seenIds = new Set();
    for (const contact of contacts) {
      if (!contact.id) {
        errors.push("contact missing id");
        continue;
      }
      if (seenIds.has(contact.id)) {
        errors.push(`duplicate contact id ${contact.id}`);
      }
      seenIds.add(contact.id);
      const contactErrors = Validate.validateContact(contact);
      if (contactErrors.length) {
        errors.push(`contact ${contact.id}: ${contactErrors.join(", ")}`);
      }
      contactsById[contact.id] = contact;
    }

    for (const edge of edges) {
      if (!edge.id) {
        errors.push("edge missing id");
      }
      const edgeErrors = Validate.validateEdge(edge, contactsById);
      if (edgeErrors.length) {
        errors.push(`edge ${edge.id || "unknown"}: ${edgeErrors.join(", ")}`);
      }
    }

    return errors;
  };

  const mergeData = (current, incoming) => {
    const mergedContacts = [...current.contacts];
    const contactIndex = Object.fromEntries(mergedContacts.map((c, idx) => [c.id, idx]));

    for (const contact of incoming.contacts) {
      if (contactIndex[contact.id] !== undefined) {
        mergedContacts[contactIndex[contact.id]] = contact;
      } else {
        mergedContacts.push(contact);
      }
    }

    const mergedEdges = [...current.edges];
    const edgeKey = (edge) => `${edge.fromId}::${edge.toId}::${edge.type}`;
    const edgeIndex = new Set(mergedEdges.map(edgeKey));
    for (const edge of incoming.edges) {
      const key = edgeKey(edge);
      if (!edgeIndex.has(key)) {
        mergedEdges.push(edge);
        edgeIndex.add(key);
      }
    }

    const mergedTags = Utils.distinct([...(current.tags || []), ...(incoming.tags || [])]);

    return {
      ...current,
      contacts: mergedContacts,
      edges: mergedEdges,
      tags: mergedTags,
    };
  };

  const applyImport = (current, wrapper, mode) => {
    const incoming = {
      contacts: wrapper.data.contacts || [],
      edges: wrapper.data.edges || [],
      tags: wrapper.data.tags || [],
    };

    if (mode === "replace") {
      return {
        ...current,
        contacts: incoming.contacts,
        edges: incoming.edges,
        tags: incoming.tags,
      };
    }

    return mergeData(current, incoming);
  };

  return {
    exportWrapper,
    validateImport,
    applyImport,
  };
})();
