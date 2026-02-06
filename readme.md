# Network Tracker

A local-first web app to map, tag, and analyze your personal network. Runs fully in the browser with LocalStorage only. No accounts, no server, no tracking.

## Features

- Contact management (create, edit, delete)
- Relationship levels (L1–L4)
- Tags and notes
- Bidirectional edges between contacts
- Batch edge creation (one-to-many)
- Dashboard stats (counts, top tags, bridge score)
- Search, filter, sort
- JSON import/export with validation
- Offline-first, privacy-focused

## Quick Start

1. Open `index.html` in a modern browser.
2. Add contacts and edges.
3. Export regularly to keep backups.

## Data Storage

All data is stored locally in your browser under:
- `nt_v1_data`
- `nt_v1_settings`

If you clear your browser data, you will lose your data. Use Export for backups.

## Import / Export

- Export creates a JSON backup file.
- Import supports `merge` or `replace` modes.
- Invalid JSON or broken references are rejected with a message.

## Network Graph

- Dynamic, force-based layout
- Zoom (mouse wheel + buttons)
- Pan (drag background)
- Drag nodes to reposition
- Hover nodes/edges for details

## Development

No build step. Plain HTML/CSS/JS.

Project structure:

```
/network-tracker
  index.html
  /assets
    favicon.svg
  /css
    styles.css
  /js
    app.js
    store.js
    storage.js
    importExport.js
    validate.js
    utils.js
```

## License

MIT. See `LICENSE`.
