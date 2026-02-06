const App = (() => {
  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRoot = document.getElementById("toast-root");

  const levelOrder = { L1: 1, L2: 2, L3: 3, L4: 4 };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  };

  const closeModal = () => {
    modalRoot.innerHTML = "";
  };

  const openModal = (content) => {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal" role="dialog" aria-modal="true">
          ${content}
        </div>
      </div>
    `;
  };

  const renderTagChips = (tags) => {
    if (!tags?.length) return "<span class=\"muted\">No tags</span>";
    return tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
  };

  const computeStats = (contacts, edges) => {
    const counts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    const tagCounts = new Map();
    const bridgeScores = [];

    contacts.forEach((contact) => {
      counts[contact.level] = (counts[contact.level] || 0) + 1;
      const tags = contact.tags || [];
      tags.forEach((tag) => {
        const key = tag.trim();
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      });
      bridgeScores.push({
        id: contact.id,
        name: contact.displayName,
        score: Utils.distinct(tags).length,
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);

    const topBridge = bridgeScores
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 10);

    return { counts, topTags, topBridge, total: contacts.length, edges: edges.length };
  };

  const filterContacts = (contacts, settings) => {
    const search = settings.search?.toLowerCase().trim() || "";
    const levelFilter = settings.levelFilter || [];
    const tagFilter = settings.tagFilter || [];

    return contacts.filter((contact) => {
      const haystack = [
        contact.displayName,
        ...(contact.handles || []),
        ...(contact.tags || []),
        contact.notes || "",
      ]
        .join(" ")
        .toLowerCase();

      if (search && !haystack.includes(search)) return false;
      if (levelFilter.length && !levelFilter.includes(contact.level)) return false;
      if (tagFilter.length) {
        const tags = contact.tags || [];
        const hasAny = tagFilter.some((tag) => tags.includes(tag));
        if (!hasAny) return false;
      }
      return true;
    });
  };

  const sortContacts = (contacts, sortBy) => {
    const sorted = [...contacts];
    if (sortBy === "updated") {
      sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (sortBy === "level") {
      sorted.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
    } else {
      sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    sorted.sort((a, b) => (b?.meta?.isSelf ? 1 : 0) - (a?.meta?.isSelf ? 1 : 0));
    return sorted;
  };

  const renderDashboard = (state) => {
    const stats = computeStats(state.data.contacts, state.data.edges);
    return `
      <section class="section">
        <h2>Dashboard</h2>
        <div class="grid kpis">
          <div class="kpi">
            <div class="value">${stats.total}</div>
            <div class="label">Total Contacts</div>
          </div>
          <div class="kpi">
            <div class="value">${stats.counts.L1}</div>
            <div class="label">Level L1</div>
          </div>
          <div class="kpi">
            <div class="value">${stats.counts.L2}</div>
            <div class="label">Level L2</div>
          </div>
          <div class="kpi">
            <div class="value">${stats.counts.L3}</div>
            <div class="label">Level L3</div>
          </div>
          <div class="kpi">
            <div class="value">${stats.counts.L4}</div>
            <div class="label">Level L4</div>
          </div>
        </div>
      </section>
      <section class="section grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        <div>
          <h2>Top Tags</h2>
          <div class="list">
            ${stats.topTags
              .map(([tag, count]) => `<div class="card"><div class="card-row"><strong>${tag}</strong><span class="muted">${count}</span></div></div>`)
              .join("") || "<div class=\"muted\">No tags yet</div>"}
          </div>
        </div>
        <div>
          <h2>Top Bridge Scores</h2>
          <div class="list">
            ${stats.topBridge
              .map((item) => `<div class="card"><div class="card-row"><strong>${item.name}</strong><span class="muted">${item.score}</span></div></div>`)
              .join("") || "<div class=\"muted\">No data yet</div>"}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="notice">
          Data stays in this browser only. Export regularly to keep backups.
        </div>
      </section>
    `;
  };

  const renderContacts = (state) => {
    const settings = state.settings.contactsView;
    const filtered = filterContacts(state.data.contacts, settings);
    const sorted = sortContacts(filtered, settings.sort);
    const allTags = Utils.distinct(state.data.tags || []).sort((a, b) => a.localeCompare(b));

    return `
      <section class="section">
        <div class="toolbar" style="margin-bottom: 12px; justify-content: flex-start;">
          <h2 style="margin: 0;">Contacts</h2>
          <button class="btn" data-action="new-contact">New Contact</button>
        </div>
        <div class="toolbar">
          <input id="contact-search" class="input" type="search" placeholder="Search name, handle, note, tag" value="${settings.search || ""}" />
          <select id="sort-by">
            <option value="name" ${settings.sort === "name" ? "selected" : ""}>Sort: Name</option>
            <option value="updated" ${settings.sort === "updated" ? "selected" : ""}>Sort: Updated</option>
            <option value="level" ${settings.sort === "level" ? "selected" : ""}>Sort: Level</option>
          </select>
        </div>
        <div class="toolbar" style="margin-top: 12px;">
          ${["L1", "L2", "L3", "L4"]
            .map(
              (level) => `
              <label class="tag">
                <input type="checkbox" class="level-filter" value="${level}" ${
                  settings.levelFilter?.includes(level) ? "checked" : ""
                } /> ${level}
              </label>
            `
            )
            .join("")}
          <select id="tag-filter" multiple size="1" title="Filter by tag">
            ${allTags
              .map(
                (tag) => `
              <option value="${tag}" ${settings.tagFilter?.includes(tag) ? "selected" : ""}>${tag}</option>
            `
              )
              .join("")}
          </select>
        </div>
      </section>
      <section class="section">
        <h2>Results (${sorted.length})</h2>
        <div class="list">
          ${sorted
            .map(
              (contact) => `
            <div class="card">
              <div class="card-row">
                <div>
                  <strong>${contact.displayName}</strong>
                  <div class="muted">Updated ${Utils.formatDate(contact.updatedAt)}</div>
                </div>
                <div class="actions">
                  ${contact?.meta?.isSelf ? `<span class="badge">Me</span>` : ""}
                  <span class="badge level-${contact.level}">${contact.level}</span>
                </div>
              </div>
              <div>${renderTagChips(contact.tags)}</div>
              <div class="actions">
                <button class="btn ghost" data-action="edit-contact" data-id="${contact.id}">Edit</button>
                ${contact?.meta?.isSelf ? "" : `<button class="btn ghost" data-action="delete-contact" data-id="${contact.id}">Delete</button>`}
              </div>
            </div>
          `
            )
            .join("") || "<div class=\"muted\">No contacts found.</div>"}
        </div>
      </section>
    `;
  };

  const dedupeEdges = (edges) => {
    const key = (edge) => [edge.fromId, edge.toId].sort().join("::") + `::${edge.type || "knows"}`;
    const seen = new Set();
    return edges.filter((edge) => {
      const k = key(edge);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const renderNetwork = (state) => {
    const contactsById = Object.fromEntries(state.data.contacts.map((c) => [c.id, c]));
    const uniqueEdges = dedupeEdges(state.data.edges);
    return `
      <section class="section">
        <h2>Network</h2>
        <div class="toolbar">
          <button class="btn ghost" data-action="new-edge">Add Edge</button>
          <button class="btn ghost" data-action="delete-all-edges">Delete All Edges</button>
          <div class="muted">Edges are bidirectional.</div>
        </div>
      </section>
      <section class="section">
        <h2>Graph View</h2>
        <div class="toolbar" style="margin-bottom: 10px;">
          <button class="btn ghost" data-action="graph-zoom-out">Zoom -</button>
          <button class="btn ghost" data-action="graph-zoom-in">Zoom +</button>
          <button class="btn ghost" data-action="graph-reset">Reset</button>
          <button class="btn ghost" data-action="graph-toggle">Freeze</button>
        </div>
        <div class="graph-wrap">
          <canvas id="network-canvas" class="network-graph"></canvas>
          <div id="graph-tooltip" class="graph-tooltip hidden"></div>
        </div>
        <div class="muted" style="margin-top: 8px;">Dynamic layout. For large graphs, use the table below.</div>
      </section>
      <section class="section">
        <table class="table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Type</th>
              <th>Strength</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${uniqueEdges
              .map(
                (edge) => `
              <tr>
                <td>${contactsById[edge.fromId]?.displayName || "Unknown"}</td>
                <td>${contactsById[edge.toId]?.displayName || "Unknown"}</td>
                <td>${edge.type}</td>
                <td>${edge.strength}</td>
                <td>${Utils.formatDate(edge.createdAt)}</td>
                <td><button class="btn ghost" data-action="delete-edge" data-id="${edge.id}">Remove</button></td>
              </tr>
            `
              )
              .join("") ||
              `
              <tr>
                <td colspan="6" class="muted">No edges yet.</td>
              </tr>
            `}
          </tbody>
        </table>
      </section>
    `;
  };

  const renderSettings = (state) => {
    const mode = state.settings.importMode || "merge";
    return `
      <section class="section">
        <h2>Import / Export</h2>
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
          <div class="card">
            <strong>Export JSON</strong>
            <p class="muted">Download a full backup of your data.</p>
            <button class="btn" data-action="export">Download JSON</button>
            <button class="btn ghost" data-action="copy-json" style="margin-top: 8px;">Copy JSON</button>
          </div>
          <div class="card">
            <strong>Import JSON</strong>
            <p class="muted">Choose merge or replace before importing.</p>
            <select id="import-mode">
              <option value="merge" ${mode === "merge" ? "selected" : ""}>Merge</option>
              <option value="replace" ${mode === "replace" ? "selected" : ""}>Replace</option>
            </select>
            <label class="btn ghost" style="margin-top: 8px;">
              Select File
              <input type="file" accept="application/json" data-action="import-file" />
            </label>
          </div>
        </div>
      </section>
      <section class="section">
        <h2>Paste JSON</h2>
        <textarea id="paste-json" class="input" placeholder="Paste exported JSON here"></textarea>
        <div class="actions" style="margin-top: 12px;">
          <button class="btn ghost" data-action="import-paste">Import Paste</button>
        </div>
      </section>
      <section class="section">
        <h2>Danger Zone</h2>
        <p class="muted">Clear all local data and reset the app.</p>
        <button class="btn" data-action="clear-data" style="background: var(--danger); color: #1b1b1b;">Clear All Data</button>
      </section>
    `;
  };

  let graphCache = null;
  let graphSim = null;
  let graphAnimId = null;
  let graphRunning = false;
  let graphHover = null;

  const drawNetworkGraph = (hover = null) => {
    if (hover !== null) {
      graphHover = hover;
    }
    const canvas = document.getElementById("network-canvas");
    if (!canvas) return;
    const state = Store.getState();
    const contacts = state.data.contacts;
    const edges = dedupeEdges(state.data.edges);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(320, rect.height);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, width, height);

    if (!contacts.length) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "14px Candara, sans-serif";
      ctx.fillText("No contacts yet.", 16, 24);
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    const angleStep = (Math.PI * 2) / Math.max(1, contacts.length);
    const contactsHash = contacts.map((c) => c.id).join("|");
    const positions = graphSim?.positions ?? new Map();

    if (!graphSim || graphSim.contactsHash !== contactsHash) {
      positions.clear();
      contacts.forEach((contact, idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        positions.set(contact.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          vx: 0,
          vy: 0,
          isSelf: contact?.meta?.isSelf,
        });
      });
      graphSim = {
        positions,
        contactsHash,
        width,
        height,
        view: {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        draggingId: null,
        isPanning: false,
        lastPan: null,
      };
    } else {
      graphSim.width = width;
      graphSim.height = height;
    }

    const toScreen = (p) => ({
      x: p.x * graphSim.view.scale + graphSim.view.offsetX,
      y: p.y * graphSim.view.scale + graphSim.view.offsetY,
    });

    const edgeStyle = (strength) => {
      if (strength === "strong") {
        return { color: "rgba(255, 122, 89, 0.75)", width: 2.6 };
      }
      if (strength === "weak") {
        return { color: "rgba(122, 182, 255, 0.25)", width: 0.9 };
      }
      return { color: "rgba(61, 214, 166, 0.35)", width: 1.6 };
    };

    const effectiveHover = graphHover;

    edges.forEach((edge) => {
      const from = positions.get(edge.fromId);
      const to = positions.get(edge.toId);
      if (!from || !to) return;
      const fromScreen = toScreen(from);
      const toScreenPos = toScreen(to);
      if (effectiveHover?.type === "edge" && effectiveHover?.id === edge.id) {
        ctx.strokeStyle = "rgba(255, 122, 89, 0.95)";
        ctx.lineWidth = 3;
      } else {
        const style = edgeStyle(edge.strength);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
      }
      ctx.beginPath();
      ctx.moveTo(fromScreen.x, fromScreen.y);
      ctx.lineTo(toScreenPos.x, toScreenPos.y);
      ctx.stroke();
    });

    const levelColor = (level) => {
      if (level === "L1") return "#f2c94c";
      if (level === "L2") return "#3dd6a6";
      if (level === "L3") return "#7ab6ff";
      if (level === "L4") return "#ff7a59";
      return "#3dd6a6";
    };

    contacts.forEach((contact) => {
      const pos = positions.get(contact.id);
      const screenPos = toScreen(pos);
      const nodeRadius = contact?.meta?.isSelf ? 9 : 6;
      const isHovered = effectiveHover?.type === "node" && effectiveHover?.id === contact.id;
      ctx.beginPath();
      ctx.fillStyle = contact?.meta?.isSelf ? "#ffb347" : levelColor(contact.level);
      ctx.strokeStyle = isHovered ? "rgba(255, 122, 89, 0.9)" : "rgba(0,0,0,0.35)";
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.arc(screenPos.x, screenPos.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.font = "12px Candara, sans-serif";
    ctx.textBaseline = "middle";
    const placed = [];
    const labelBoxes = new Map();
    contacts.forEach((contact) => {
      const pos = positions.get(contact.id);
      const screenPos = toScreen(pos);
      const label = contact.displayName.length > 18 ? `${contact.displayName.slice(0, 17)}…` : contact.displayName;
      const angle = Math.atan2(screenPos.y - centerY, screenPos.x - centerX);
      const baseOffset = 12;
      const dirX = Math.cos(angle) >= 0 ? 1 : -1;
      const dirY = Math.sin(angle) >= 0 ? 1 : -1;
      let x = screenPos.x + baseOffset * dirX;
      let y = screenPos.y + baseOffset * dirY;
      const widthText = ctx.measureText(label).width + 6;
      const heightText = 16;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const box = {
          x: dirX > 0 ? x : x - widthText,
          y: y - heightText / 2,
          w: widthText,
          h: heightText,
        };
        const overlaps = placed.some(
          (b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y
        );
        if (!overlaps) {
          placed.push(box);
          labelBoxes.set(contact.id, box);
          break;
        }
        x += 10 * dirX;
        y += 10 * dirY;
      }

      const box = labelBoxes.get(contact.id) || { x: x, y: y - heightText / 2, w: widthText, h: heightText };
      const textX = box.x + 3;
      const textY = box.y + box.h / 2;
      ctx.strokeStyle = "rgba(8,10,14,0.8)";
      ctx.lineWidth = 4;
      ctx.strokeText(label, textX, textY);
      ctx.fillStyle = "rgba(232,237,242,0.9)";
      ctx.fillText(label, textX, textY);
    });

    graphCache = {
      contacts,
      edges,
      positions,
      rect: canvas.getBoundingClientRect(),
      width,
      height,
      view: graphSim.view,
    };
  };

  const render = () => {
    const state = Store.getState();
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.view === state.view);
    });

    if (state.view === "dashboard") {
      stopGraphSimulation();
      app.innerHTML = renderDashboard(state);
    } else if (state.view === "contacts") {
      stopGraphSimulation();
      app.innerHTML = renderContacts(state);
    } else if (state.view === "network") {
      app.innerHTML = renderNetwork(state);
      startGraphSimulation();
      bindGraphInteractions();
    } else if (state.view === "settings") {
      stopGraphSimulation();
      app.innerHTML = renderSettings(state);
    }

    bindViewEvents();
  };

  const bindViewEvents = () => {
    const state = Store.getState();
    if (state.view === "contacts") {
      const search = document.getElementById("contact-search");
      if (search) {
        search.addEventListener("input", (event) => {
          Store.updateContactsView({ search: event.target.value });
        });
      }
      document.querySelectorAll(".level-filter").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const selected = Array.from(document.querySelectorAll(".level-filter:checked")).map(
            (el) => el.value
          );
          Store.updateContactsView({ levelFilter: selected });
        });
      });
      const tagFilter = document.getElementById("tag-filter");
      if (tagFilter) {
        tagFilter.addEventListener("change", () => {
          const selected = Array.from(tagFilter.selectedOptions).map((opt) => opt.value);
          Store.updateContactsView({ tagFilter: selected });
        });
      }
      const sortBy = document.getElementById("sort-by");
      if (sortBy) {
        sortBy.addEventListener("change", () => {
          Store.updateContactsView({ sort: sortBy.value });
        });
      }
    }

    if (state.view === "settings") {
      const importMode = document.getElementById("import-mode");
      if (importMode) {
        importMode.addEventListener("change", () => {
          Store.updateSettings({ importMode: importMode.value });
        });
      }
    }
  };

  const bindGraphInteractions = () => {
    const canvas = document.getElementById("network-canvas");
    const tooltip = document.getElementById("graph-tooltip");
    if (!canvas || !tooltip) return;
    if (canvas.dataset.bound === "true") return;
    canvas.dataset.bound = "true";

    const pointToSegmentDistance = (p, a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
      const clamped = Math.max(0, Math.min(1, t));
      const proj = { x: a.x + clamped * dx, y: a.y + clamped * dy };
      return Math.hypot(p.x - proj.x, p.y - proj.y);
    };

    const updateTooltip = (html, x, y) => {
      tooltip.innerHTML = html;
      tooltip.classList.remove("hidden");
      tooltip.style.left = `${x + 12}px`;
      tooltip.style.top = `${y + 12}px`;
    };

    const hideTooltip = () => {
      tooltip.classList.add("hidden");
    };

    const toWorld = (point) => {
      const view = graphSim?.view || { scale: 1, offsetX: 0, offsetY: 0 };
      return {
        x: (point.x - view.offsetX) / view.scale,
        y: (point.y - view.offsetY) / view.scale,
      };
    };

    const handleMove = (event) => {
      if (!graphCache) return;
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const worldPoint = toWorld(point);

      let hoveredNode = null;
      let minNodeDist = Infinity;
      graphCache.contacts.forEach((contact) => {
        const pos = graphCache.positions.get(contact.id);
        const dist = Math.hypot(worldPoint.x - pos.x, worldPoint.y - pos.y);
        const threshold = (contact?.meta?.isSelf ? 12 : 9) / (graphSim?.view?.scale || 1);
        if (dist < threshold && dist < minNodeDist) {
          minNodeDist = dist;
          hoveredNode = contact;
        }
      });

      if (hoveredNode) {
        drawNetworkGraph({ type: "node", id: hoveredNode.id });
        const tags = (hoveredNode.tags || []).slice(0, 6).join(", ") || "—";
        updateTooltip(
          `<strong>${hoveredNode.displayName}</strong><br/>Level: ${hoveredNode.level}<br/>Tags: ${tags}`,
          point.x,
          point.y
        );
        return;
      }

      let hoveredEdge = null;
      let minEdgeDist = Infinity;
      graphCache.edges.forEach((edge) => {
        const from = graphCache.positions.get(edge.fromId);
        const to = graphCache.positions.get(edge.toId);
        if (!from || !to) return;
        const dist = pointToSegmentDistance(worldPoint, from, to);
        const edgeThreshold = 6 / (graphSim?.view?.scale || 1);
        if (dist < edgeThreshold && dist < minEdgeDist) {
          minEdgeDist = dist;
          hoveredEdge = edge;
        }
      });

      if (hoveredEdge) {
        drawNetworkGraph({ type: "edge", id: hoveredEdge.id });
        const fromName = graphCache.contacts.find((c) => c.id === hoveredEdge.fromId)?.displayName || "Unknown";
        const toName = graphCache.contacts.find((c) => c.id === hoveredEdge.toId)?.displayName || "Unknown";
        updateTooltip(
          `<strong>${fromName} ↔ ${toName}</strong><br/>Type: ${hoveredEdge.type}<br/>Strength: ${hoveredEdge.strength}`,
          point.x,
          point.y
        );
        return;
      }

      graphHover = null;
      drawNetworkGraph();
      hideTooltip();
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", () => {
      graphHover = null;
      hideTooltip();
      drawNetworkGraph();
    });

    canvas.addEventListener("mousedown", (event) => {
      if (!graphCache || !graphSim) return;
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const worldPoint = toWorld(point);
      let grabbed = null;
      graphCache.contacts.forEach((contact) => {
        const pos = graphCache.positions.get(contact.id);
        const dist = Math.hypot(worldPoint.x - pos.x, worldPoint.y - pos.y);
        const threshold = (contact?.meta?.isSelf ? 12 : 9) / (graphSim?.view?.scale || 1);
        if (dist < threshold) grabbed = contact.id;
      });
      if (grabbed) {
        graphSim.draggingId = grabbed;
        const pos = graphCache.positions.get(grabbed);
        pos.x = worldPoint.x;
        pos.y = worldPoint.y;
        pos.vx = 0;
        pos.vy = 0;
      } else {
        graphSim.isPanning = true;
        graphSim.lastPan = { x: point.x, y: point.y };
      }
    });

    canvas.addEventListener("mousemove", (event) => {
      if (!graphSim) return;
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (graphSim.draggingId) {
        const worldPoint = toWorld(point);
        const pos = graphCache.positions.get(graphSim.draggingId);
        if (pos) {
          pos.x = worldPoint.x;
          pos.y = worldPoint.y;
          pos.vx = 0;
          pos.vy = 0;
        }
        drawNetworkGraph({ type: "node", id: graphSim.draggingId });
      } else if (graphSim.isPanning && graphSim.lastPan) {
        const dx = point.x - graphSim.lastPan.x;
        const dy = point.y - graphSim.lastPan.y;
        graphSim.view.offsetX += dx;
        graphSim.view.offsetY += dy;
        graphSim.lastPan = { x: point.x, y: point.y };
        drawNetworkGraph();
      }
    });

    window.addEventListener("mouseup", () => {
      if (!graphSim) return;
      graphSim.draggingId = null;
      graphSim.isPanning = false;
      graphSim.lastPan = null;
    });

    canvas.addEventListener("wheel", (event) => {
      if (!graphSim) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const worldBefore = toWorld(point);
      const delta = Math.sign(event.deltaY);
      const factor = delta > 0 ? 0.92 : 1.08;
      zoomGraphAt(point, factor);
    }, { passive: false });
  };

  const tickGraph = () => {
    if (!graphSim || !graphCache || !graphRunning) return;
    const { contacts, edges, positions } = graphCache;
    const width = graphCache.width;
    const height = graphCache.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const repulsion = 9000;
    const spring = 0.004;
    const centerPull = 0.002;
    const damping = 0.86;

    contacts.forEach((c) => {
      const p = positions.get(c.id);
      if (!p) return;
      if (graphSim.draggingId === c.id) {
        p.vx = 0;
        p.vy = 0;
        return;
      }
      p.vx = (p.vx || 0) * damping;
      p.vy = (p.vy || 0) * damping;
    });

    for (let i = 0; i < contacts.length; i += 1) {
      for (let j = i + 1; j < contacts.length; j += 1) {
        const a = positions.get(contacts[i].id);
        const b = positions.get(contacts[j].id);
      if (!a || !b) continue;
      if (graphSim.draggingId === contacts[i].id || graphSim.draggingId === contacts[j].id) {
        continue;
      }
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist2 = dx * dx + dy * dy + 0.01;
        const force = repulsion / dist2;
        const dist = Math.sqrt(dist2);
        dx /= dist;
        dy /= dist;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }

    edges.forEach((edge) => {
      const from = positions.get(edge.fromId);
      const to = positions.get(edge.toId);
      if (!from || !to) return;
      if (graphSim.draggingId === edge.fromId || graphSim.draggingId === edge.toId) {
        return;
      }
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      from.vx += dx * spring;
      from.vy += dy * spring;
      to.vx -= dx * spring;
      to.vy -= dy * spring;
    });

    contacts.forEach((c) => {
      const p = positions.get(c.id);
      if (!p) return;
      if (graphSim.draggingId === c.id) return;
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      p.vx += dx * centerPull;
      p.vy += dy * centerPull;
      p.x += p.vx;
      p.y += p.vy;
      p.x = Math.max(20, Math.min(width - 20, p.x));
      p.y = Math.max(20, Math.min(height - 20, p.y));
    });

    drawNetworkGraph();
    graphAnimId = window.requestAnimationFrame(tickGraph);
  };

  const startGraphSimulation = () => {
    graphRunning = true;
    graphHover = null;
    drawNetworkGraph();
    if (graphAnimId) window.cancelAnimationFrame(graphAnimId);
    graphAnimId = window.requestAnimationFrame(tickGraph);
    updateGraphControls();
  };

  const stopGraphSimulation = () => {
    graphRunning = false;
    if (graphAnimId) window.cancelAnimationFrame(graphAnimId);
    graphAnimId = null;
    updateGraphControls();
  };

  const updateGraphControls = () => {
    const toggle = document.querySelector("[data-action=\"graph-toggle\"]");
    if (toggle) toggle.textContent = graphRunning ? "Freeze" : "Play";
  };

  const zoomGraphAt = (centerPoint, factor) => {
    if (!graphSim) return;
    const scale = graphSim.view.scale;
    const nextScale = Math.max(0.4, Math.min(2.5, scale * factor));
    const worldX = (centerPoint.x - graphSim.view.offsetX) / scale;
    const worldY = (centerPoint.y - graphSim.view.offsetY) / scale;
    graphSim.view.scale = nextScale;
    graphSim.view.offsetX = centerPoint.x - worldX * nextScale;
    graphSim.view.offsetY = centerPoint.y - worldY * nextScale;
    drawNetworkGraph();
  };

  const handleContactForm = (form) => {
    const formData = new FormData(form);
    const payload = {
      displayName: formData.get("displayName"),
      level: formData.get("level"),
      handles: Utils.parseList(formData.get("handles")),
      tags: Utils.parseList(formData.get("tags")).map(Utils.normalizeTag),
      notes: formData.get("notes") || "",
    };
    payload.tags = Utils.distinct(payload.tags).filter(Boolean);

    const errors = Validate.validateContact(payload);
    if (errors.length) {
      showToast(`Invalid contact: ${errors[0]}`);
      return;
    }

    const existingId = formData.get("id");
    if (existingId) {
      Store.updateContact(existingId, payload);
      showToast("Contact updated");
    } else {
      Store.addContact(payload);
      showToast("Contact added");
    }
    closeModal();
  };

  const openContactModal = (contact) => {
    const mode = contact ? "Edit Contact" : "New Contact";
    const tagsHint = (Store.getState().data.tags || []).join(", ");

    openModal(`
      <h3>${mode}</h3>
      <form id="contact-form" class="modal-grid">
        <input type="hidden" name="id" value="${contact?.id || ""}" />
        <div class="modal-section">
          <h4>Basics</h4>
          <div class="modal-grid two">
            <label>
              Display Name
              <input class="input" name="displayName" required value="${contact?.displayName || ""}" />
              <div class="modal-help">The visible name of the person or account.</div>
            </label>
            <label>
              Level
              <select name="level">
                ${["L1", "L2", "L3", "L4"]
                  .map(
                    (level) => `
                  <option value="${level}" ${contact?.level === level ? "selected" : ""}>${level}</option>
                `
                  )
                  .join("")}
              </select>
              <div class="modal-help">Closeness: L1 = very close, L4 = more distant.</div>
            </label>
          </div>
        </div>
        <div class="modal-section">
          <h4>Profiles & Channels</h4>
          <label>
            Handles (comma or newline separated)
            <textarea name="handles">${(contact?.handles || []).join("\n")}</textarea>
            <div class="modal-help">Usernames, e.g. discord:Name#1234 or telegram:@handle.</div>
          </label>
        </div>
        <div class="modal-section">
          <h4>Groups & Context</h4>
          <label>
            Tags (comma or newline separated)
            <textarea name="tags">${(contact?.tags || []).join("\n")}</textarea>
            <div class="modal-help">Categories like Work, Discord, Event.</div>
            <div class="modal-help">Suggestions: ${tagsHint || "-"}</div>
          </label>
          <label>
            Notes
            <textarea name="notes">${contact?.notes || ""}</textarea>
            <div class="modal-help">Free text: context, how you know them, important details.</div>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    `);

    const form = document.getElementById("contact-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handleContactForm(form);
    });
  };

  const openEdgeModal = () => {
    const contacts = Store.getState().data.contacts;
    if (!contacts.length) {
      showToast("Add contacts first");
      return;
    }
    const selfContact = contacts.find((c) => c?.meta?.isSelf);
    const orderedContacts = selfContact
      ? [selfContact, ...contacts.filter((c) => c.id !== selfContact.id)]
      : contacts;

    openModal(`
      <h3>New Edge</h3>
      <form id="edge-form" class="modal-grid">
        <div class="modal-grid two">
          <label>
            From
            <select name="fromId">
              ${orderedContacts
                .map(
                  (c) =>
                    `<option value="${c.id}" ${c?.meta?.isSelf ? "selected" : ""}>${c.displayName}</option>`
                )
                .join("")}
            </select>
          </label>
          <label>
            To
            <select name="toId" id="to-single">
              ${orderedContacts.map((c) => `<option value="${c.id}">${c.displayName}</option>`).join("")}
            </select>
          </label>
        </div>
        <label class="tag" style="width: fit-content;">
          <input type="checkbox" id="edge-batch" /> Create multiple edges
        </label>
        <div id="to-multi-wrap" style="display: none;">
          <div class="modal-help" style="margin-bottom: 8px;">Select multiple people; each will get the same edge properties.</div>
          <div class="checkbox-list">
            ${orderedContacts
              .map(
                (c) => `
              <label class="checkbox-item">
                <input type="checkbox" name="toIds" value="${c.id}" />
                <span>${c.displayName}</span>
              </label>
            `
              )
              .join("")}
          </div>
        </div>
        <div class="modal-grid two">
          <label>
            Type
            <select name="type">
              ${Validate.edgeTypes.map((type) => `<option value="${type}">${type}</option>`).join("")}
            </select>
          </label>
          <label>
            Strength
            <select name="strength">
              ${Validate.edgeStrengths
                .map((strength) => `<option value="${strength}">${strength}</option>`)
                .join("")}
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    `);

    const form = document.getElementById("edge-form");
    const batchToggle = document.getElementById("edge-batch");
    const toMultiWrap = document.getElementById("to-multi-wrap");
    const toSingle = document.getElementById("to-single");
    const toMulti = document.querySelectorAll("input[name=\"toIds\"]");
    if (batchToggle && toMultiWrap && toSingle) {
      batchToggle.addEventListener("change", () => {
        const on = batchToggle.checked;
        toMultiWrap.style.display = on ? "block" : "none";
        toSingle.disabled = on;
      });
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        fromId: formData.get("fromId"),
        type: formData.get("type"),
        strength: formData.get("strength"),
      };
      const contactsById = Object.fromEntries(contacts.map((c) => [c.id, c]));

      const toIds = batchToggle?.checked
        ? Array.from(toMulti || []).filter((input) => input.checked).map((input) => input.value)
        : [formData.get("toId")];

      const created = [];
      const skipped = [];

      toIds.forEach((toId) => {
        if (!toId) return;
        const edgePayload = { ...payload, toId };
        const errors = Validate.validateEdge(edgePayload, contactsById);
        if (errors.length) {
          skipped.push({ toId, reason: errors[0] });
          return;
        }
        const exists = Store.getState().data.edges.some(
          (edge) =>
            edge.type === edgePayload.type &&
            ((edge.fromId === edgePayload.fromId && edge.toId === edgePayload.toId) ||
              (edge.fromId === edgePayload.toId && edge.toId === edgePayload.fromId))
        );
        if (exists) {
          skipped.push({ toId, reason: "exists" });
          return;
        }
        Store.addEdge(edgePayload);
        created.push(edgePayload);
      });

      if (created.length) {
        showToast(created.length > 1 ? `Edges added (${created.length})` : "Edge added");
      } else if (skipped.length) {
        showToast("No edges created");
      }
      closeModal();
    });
  };

  const handleImportText = (text) => {
    try {
      const wrapper = JSON.parse(text);
      const errors = ImportExport.validateImport(wrapper);
      if (errors.length) {
        showToast(`Import failed: ${errors[0]}`);
        return;
      }
      const mode = Store.getState().settings.importMode || "merge";
      if (mode === "replace") {
        const confirmReplace = window.confirm("Replace all current data with the import?");
        if (!confirmReplace) return;
      }
      const next = ImportExport.applyImport(Store.getState().data, wrapper, mode);
      Store.replaceData(next);
      showToast("Import successful");
    } catch (error) {
      showToast("Invalid JSON import");
    }
  };

  const bindGlobalEvents = () => {
    document.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const state = Store.getState();
      if (action === "close-modal") {
        const isBackdrop = event.target.classList.contains("modal-backdrop");
        const isButton = actionEl.tagName === "BUTTON";
        if (!isBackdrop && !isButton) return;
      }

      if (action === "new-contact") {
        openContactModal();
      }

      if (action === "edit-contact") {
        const contact = state.data.contacts.find((c) => c.id === actionEl.dataset.id);
        if (contact) openContactModal(contact);
      }

      if (action === "delete-contact") {
        const contact = state.data.contacts.find((c) => c.id === actionEl.dataset.id);
        if (!contact) return;
        if (contact?.meta?.isSelf) {
          showToast("Self profile cannot be deleted");
          return;
        }
        const edgeCount = state.data.edges.filter(
          (edge) => edge.fromId === contact.id || edge.toId === contact.id
        ).length;
        const warning = edgeCount ? ` This will also delete ${edgeCount} edges.` : "";
        const confirmed = window.confirm(`Delete ${contact.displayName}?${warning}`);
        if (!confirmed) return;
        Store.deleteContact(contact.id);
        showToast("Contact deleted");
      }

      if (action === "new-edge") {
        openEdgeModal();
      }

      if (action === "delete-edge") {
        const confirmed = window.confirm("Remove this edge?");
        if (!confirmed) return;
        Store.deleteEdge(actionEl.dataset.id);
        showToast("Edge removed");
      }

      if (action === "delete-all-edges") {
        const confirmed = window.confirm("Delete all edges?");
        if (!confirmed) return;
        Store.replaceData({ ...Store.getState().data, edges: [] });
        showToast("All edges deleted");
      }

      if (action === "graph-zoom-in") {
        const canvas = document.getElementById("network-canvas");
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          zoomGraphAt({ x: rect.width / 2, y: rect.height / 2 }, 1.12);
        }
      }

      if (action === "graph-zoom-out") {
        const canvas = document.getElementById("network-canvas");
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          zoomGraphAt({ x: rect.width / 2, y: rect.height / 2 }, 0.88);
        }
      }

      if (action === "graph-reset") {
        if (graphSim) {
          graphSim.view.scale = 1;
          graphSim.view.offsetX = 0;
          graphSim.view.offsetY = 0;
          drawNetworkGraph();
        }
      }

      if (action === "graph-toggle") {
        if (graphRunning) {
          stopGraphSimulation();
        } else {
          startGraphSimulation();
        }
      }

      if (action === "export") {
        const wrapper = ImportExport.exportWrapper(state.data);
        const filename = `network-tracker-${new Date().toISOString().slice(0, 10)}.json`;
        Utils.downloadJson(filename, wrapper);
        showToast("Export ready");
      }

      if (action === "copy-json") {
        const wrapper = ImportExport.exportWrapper(state.data);
        Utils.copyToClipboard(JSON.stringify(wrapper, null, 2)).then(() => {
          showToast("JSON copied");
        });
      }

      if (action === "clear-data") {
        const confirmed = window.confirm("Clear all local data?");
        if (!confirmed) return;
        Storage.clear();
        window.location.reload();
      }

      if (action === "import-paste") {
        const textarea = document.getElementById("paste-json");
        if (textarea?.value) {
          handleImportText(textarea.value);
        }
      }

      if (action === "close-modal") {
        closeModal();
      }
    });

    document.addEventListener("change", (event) => {
      const input = event.target;
      if (input?.dataset?.action === "import-file" && input.files?.length) {
        const file = input.files[0];
        Utils.readFileAsText(file).then(handleImportText).catch(() => showToast("Import failed"));
        input.value = "";
      }
    });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        Store.setView(tab.dataset.view);
        if (tab.dataset.view !== "network") stopGraphSimulation();
      });
    });

    window.addEventListener("resize", () => {
      if (Store.getState().view === "network") {
        drawNetworkGraph();
      }
    });

    window.addEventListener("storage-error", (event) => {
      showToast(event.detail || "Storage error");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (modalRoot.innerHTML) closeModal();
      }
      if (event.key === "/") {
        const active = document.activeElement;
        if (active && ["INPUT", "TEXTAREA"].includes(active.tagName)) return;
        event.preventDefault();
        Store.setView("contacts");
        setTimeout(() => document.getElementById("contact-search")?.focus(), 0);
      }
      if (event.key.toLowerCase() === "n") {
        const active = document.activeElement;
        if (active && ["INPUT", "TEXTAREA"].includes(active.tagName)) return;
        openContactModal();
      }
    });
  };

  const init = () => {
    Store.subscribe(render);
    bindGlobalEvents();
    render();
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", App.init);
