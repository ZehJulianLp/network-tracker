const Validate = (() => {
  const levels = ["L1", "L2", "L3", "L4"];
  const edgeTypes = ["knows", "met", "worksWith", "family", "other"];
  const edgeStrengths = ["weak", "normal", "strong"];

  const validateContact = (contact) => {
    const errors = [];
    if (!contact.displayName || contact.displayName.trim().length < 1) {
      errors.push("displayName is required");
    }
    if (contact.displayName && contact.displayName.length > 80) {
      errors.push("displayName too long (max 80)");
    }
    if (contact.level && !levels.includes(contact.level)) {
      errors.push("level must be L1-L4");
    }
    const tags = contact.tags || [];
    if (tags.length > 30) {
      errors.push("too many tags (max 30)");
    }
    tags.forEach((tag) => {
      if (!tag.trim()) errors.push("tag cannot be empty");
      if (tag.length > 30) errors.push("tag too long (max 30)");
    });
    const handles = contact.handles || [];
    if (handles.length > 20) {
      errors.push("too many handles (max 20)");
    }
    handles.forEach((handle) => {
      if (!handle.trim()) errors.push("handle cannot be empty");
      if (handle.length > 80) errors.push("handle too long (max 80)");
    });
    return errors;
  };

  const validateEdge = (edge, contactsById) => {
    const errors = [];
    if (!edge.fromId || !contactsById[edge.fromId]) {
      errors.push("fromId missing or unknown");
    }
    if (!edge.toId || !contactsById[edge.toId]) {
      errors.push("toId missing or unknown");
    }
    if (edge.fromId === edge.toId) {
      errors.push("fromId and toId cannot match");
    }
    if (edge.type && !edgeTypes.includes(edge.type)) {
      errors.push("invalid edge type");
    }
    if (edge.strength && !edgeStrengths.includes(edge.strength)) {
      errors.push("invalid edge strength");
    }
    return errors;
  };

  const validateWrapper = (wrapper) => {
    const errors = [];
    if (!wrapper || typeof wrapper !== "object") {
      return ["wrapper must be an object"];
    }
    if (!wrapper.version) errors.push("version missing");
    if (!wrapper.exportedAt) errors.push("exportedAt missing");
    if (!wrapper.data) errors.push("data missing");
    if (!wrapper.data?.contacts || !Array.isArray(wrapper.data.contacts)) {
      errors.push("data.contacts missing or invalid");
    }
    if (!wrapper.data?.edges || !Array.isArray(wrapper.data.edges)) {
      errors.push("data.edges missing or invalid");
    }
    return errors;
  };

  return {
    levels,
    edgeTypes,
    edgeStrengths,
    validateContact,
    validateEdge,
    validateWrapper,
  };
})();
