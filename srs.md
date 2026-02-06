# SRS – Network Tracker (Local-First Web App)

## 1. Zweck & Ziel
Eine lokale, datenschutzfreundliche Web-App zur Erfassung und Analyse des persönlichen Netzwerks (Kontakte + Beziehungen).  
Die App läuft komplett im Browser (HTML/CSS/JS), speichert Daten ausschließlich im **Local Storage** und erlaubt **Import/Export als JSON**.

## 2. Geltungsbereich
**In Scope**
- Kontakte anlegen/bearbeiten/löschen
- Beziehungsstärke (Levels L1–L4)
- Tags/Gruppen (z. B. „Work“, „Discord“, „Event“)
- Optional: Verbindungen zwischen Kontakten (wer kennt wen)
- Statistiken (z. B. Anzahl nach Level, Tags, Bridge/Connector Score)
- Suche/Filter/Sortierung
- JSON Import/Export (Datei + Copy/Paste optional)
- Offline-Nutzung

**Out of Scope**
- Cloud-Sync, Login, Accounts
- Automatisches Auslesen aus Kontakten/Discord/Messenger
- Serverseitige Speicherung
- Multi-User Kollaboration

## 3. Zielgruppe
- Einzelperson, die das eigene Netzwerk strukturiert erfassen und besser verstehen will
- Technik-affine Nutzer, die Local-First bevorzugen

## 4. Annahmen & Einschränkungen
- Browser unterstützt Local Storage und File APIs (moderne Chromium/Firefox).
- Datenverlust möglich, wenn Browserdaten gelöscht werden → Export wird empfohlen.
- Keine Garantie für „exakte Netzwerkgröße“; Fokus auf nützliche Metriken.

## 5. Begriffe
- **Kontakt (Node):** Person/Account/Handle in deinem Netzwerk
- **Verbindung (Edge):** Beziehung zwischen zwei Kontakten (optional)
- **Level:** Beziehungsschwere L1–L4
- **Tag:** Kategorie/Gruppe, z. B. „School“, „Minecraft“, „Scalies“

## 6. Produktübersicht
### 6.1 Kernfunktionen
- Kontaktverwaltung
- Level-System
- Tagging
- Netzwerk-Edges (optional)
- Statistiken/Dashboards
- Import/Export
- Lokales Speichern & Versionierung

### 6.2 Nicht-funktionale Ziele
- Schnell, offline, keine Tracker
- UI: klar, minimal, keyboard-friendly
- Robust gegen kaputte Imports (Validierung + Fehlermeldungen)

## 7. Benutzerrollen
- **User (einziger Nutzer):** erstellt und verwaltet alle Daten lokal

## 8. User Stories
### Kontakte
- Als User will ich einen Kontakt mit Name/Handle erstellen, damit ich ihn im Netzwerk habe.
- Als User will ich Kontakte bearbeiten und löschen können.
- Als User will ich Notizen zu einem Kontakt speichern.

### Level & Tags
- Als User will ich für Kontakte einen Level L1–L4 setzen, um Nähe zu modellieren.
- Als User will ich Tags hinzufügen, entfernen und wiederverwenden.
- Als User will ich nach Tags/Level filtern und suchen.

### Verbindungen
- Als User will ich optional Verbindungen zwischen Kontakten anlegen („A kennt B“).
- Als User will ich Verbindungen entfernen können.

### Analyse
- Als User will ich sehen, wie viele Kontakte pro Level existieren.
- Als User will ich sehen, welche Tags am häufigsten vorkommen.
- Als User will ich „Brückenpersonen“ erkennen (Kontakte, die mehrere Gruppen verbinden).
- Als User will ich eine einfache Netzwerk-Ansicht (Liste oder Graph) sehen.

### Import/Export
- Als User will ich alle Daten als JSON exportieren, um Backups zu erstellen.
- Als User will ich JSON importieren, um Daten wiederherzustellen oder zu migrieren.
- Als User will ich beim Import wählen können: **Merge** oder **Replace**.

## 9. Funktionale Anforderungen

### 9.1 Kontaktmodell
Jeder Kontakt MUSS enthalten:
- `id` (string, UUID-like)
- `displayName` (string, required)
- `handles` (array of strings, optional; z. B. Discord/Telegram)
- `level` (enum: `L1 | L2 | L3 | L4`, default L3)
- `tags` (array of strings, optional)
- `notes` (string, optional)
- `createdAt` (ISO string)
- `updatedAt` (ISO string)

Kontakt KANN enthalten:
- `meta` (object, optional; frei für Erweiterungen)

### 9.2 Verbindungsmodell (Edges)
Eine Verbindung MUSS enthalten:
- `id` (string)
- `fromId` (Kontakt-ID)
- `toId` (Kontakt-ID)
- `type` (enum: `knows | met | worksWith | family | other`, default `knows`)
- `strength` (enum: `weak | normal | strong`, default `normal`)
- `createdAt` (ISO string)

Regeln:
- Keine Self-Edges (`fromId !== toId`)
- Doppelte Edges sind entweder zu verhindern ODER als Mehrfachkanten zu erlauben (MVP: verhindern)

### 9.3 CRUD Anforderungen
- App MUSS Kontakte erstellen, lesen, aktualisieren, löschen.
- App MUSS Verbindungen erstellen, lesen, löschen (Update optional).
- App MUSS Tags als Freitext akzeptieren; UI sollte Vorschläge aus bestehenden Tags anbieten.

### 9.4 Suche/Filter/Sortierung
- Suche über `displayName`, `handles`, `notes`, `tags`
- Filter:
  - nach `level`
  - nach `tag` (multi-select)
- Sortierung:
  - Name A–Z
  - zuletzt bearbeitet
  - Level

### 9.5 Statistiken
Die App MUSS anzeigen:
- Anzahl Kontakte insgesamt
- Anzahl pro Level
- Top Tags (Häufigkeit)
- „Bridge Score“ pro Kontakt (Definition unten)

Bridge Score (MVP-Definition):
- Für jeden Kontakt: Anzahl **distinct Tags** (oder Gruppen), die er trägt.
- Optional erweitert: wenn Edges aktiv sind → Kontakt verbindet Cluster (später).

### 9.6 Persistenz (Local Storage)
- App MUSS alle Daten in Local Storage speichern.
- App SOLL autosave nach jeder Änderung machen.
- Key-Namen (fix):
  - `nt_v1_data`
  - `nt_v1_settings` (UI prefs)

### 9.7 Import/Export
**Export**
- App MUSS JSON Datei exportieren können (download).
- App SOLL zusätzlich „Copy JSON to clipboard“ anbieten.

**Import**
- App MUSS JSON Datei importieren können (file picker).
- App MUSS JSON validieren:
  - Schema: `version`, `exportedAt`, `data`
  - Kontakte: required fields
  - Edges: referenzierte IDs müssen existieren (oder als Fehler melden)
- Import-Modi:
  - `replace`: vorhandene Daten überschreiben
  - `merge`: neue Daten hinzufügen, IDs deduplizieren; bei Konflikt: „import wins“ oder „skip“ (MVP: import wins)

### 9.8 Fehlerbehandlung
- Bei invalidem Import MUSS eine verständliche Fehlermeldung angezeigt werden.
- App MUSS vor „Replace Import“ warnen (Bestätigung).

## 10. Datenformat (JSON)

### 10.1 Export Wrapper
```json
{
  "version": "1.0",
  "app": "network-tracker",
  "exportedAt": "2026-02-06T12:34:56.000Z",
  "data": {
    "contacts": [],
    "edges": [],
    "tags": []
  }
}
````

### 10.2 Beispiel Kontakt

```json
{
  "id": "c_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "displayName": "PatchNote",
  "handles": ["discord:PatchNote#1234"],
  "level": "L2",
  "tags": ["Discord", "Memes"],
  "notes": "kennt sich mit absurd-humor aus",
  "createdAt": "2026-02-06T10:00:00.000Z",
  "updatedAt": "2026-02-06T10:10:00.000Z"
}
```

### 10.3 Beispiel Edge

```json
{
  "id": "e_1f2c3d4e",
  "fromId": "c_a",
  "toId": "c_b",
  "type": "knows",
  "strength": "normal",
  "createdAt": "2026-02-06T10:20:00.000Z"
}
```

## 11. UI/UX Anforderungen

### 11.1 Seiten / Views

* **Dashboard**

  * KPIs: Total, L1–L4 Counts
  * Top Tags
  * Top Bridge Scores
* **Contacts**

  * Liste + Search/Filter/Sort
  * Add/Edit Modal oder Side Panel
* **Contact Detail**

  * Felder, Tags, Notes
  * (Optional) Edges Liste: „connected to“
* **Network**

  * MVP: Tabellen-/Listenansicht der Edges
  * Optional später: Graph-Visual (Canvas/SVG)
* **Settings**

  * Export / Import
  * Danger Zone: Clear All Data

### 11.2 Bedienung

* Tastatur:

  * `/` Fokus Suche
  * `N` neuer Kontakt
  * `Esc` schließt Modal
* Mobile: responsive Layout (kein Muss, aber Ziel)

### 11.3 Accessibility

* Kontraste ausreichend
* Form Labels korrekt
* Fokus-States sichtbar

## 12. Nicht-funktionale Anforderungen

* Keine externen Requests (außer wenn du später bewusst Libraries lädst; MVP: none)
* Performance: 5.000 Kontakte sollen flüssig filterbar sein (best effort)
* Datenintegrität: keine stillen Fehler beim Speichern/Import

## 13. Sicherheits- & Datenschutzanforderungen

* App MUSS klar anzeigen: „Daten bleiben lokal im Browser“.
* Keine Telemetrie.
* Export enthält alle Daten im Klartext → User wird darauf hingewiesen.

## 14. Validierung & Tests (MVP)

* Unit-ish Tests optional (kann später)
* Manuelle Testfälle:

  1. Kontakt anlegen → reload → vorhanden
  2. Tag hinzufügen → Filter nach Tag funktioniert
  3. Export → JSON gültig
  4. Import Replace → Daten ersetzt
  5. Import Merge → neue Kontakte + Konfliktregel greift
  6. Invalid JSON → verständliche Fehlermeldung
  7. Edge mit unbekannter ID → Import blockt / meldet

## 15. Roadmap (optional)

* Graph Visualisierung (force layout)
* Duplicate detection (ähnliche Namen/Handles)
* „Intro Planner“: über wen du Person X erreichen könntest (BFS)
* Multi-Profile / mehrere Datensets
* Encrypted export (Passphrase)

````md
## 16. Systemarchitektur (Client-only)

### 16.1 Komponenten
- **UI Layer (HTML/CSS)**
  - Views: Dashboard, Contacts, Contact Detail, Network, Settings
  - Komponenten: Toolbar, Search/Filter, ContactForm, TagChips, StatsCards, Toasts/Dialogs

- **State Layer (JS)**
  - In-Memory State: `state = { contacts, edges, tags, settings }`
  - „Single source of truth“ im Speicher, persistiert nach Änderungen.

- **Storage Layer (JS)**
  - LocalStorage Adapter:
    - `load(): AppData`
    - `save(AppData): void`
    - `clear(): void`
  - Key-Namespace: `nt_v1_*`

- **Import/Export Layer (JS)**
  - `exportToJson(): ExportWrapper`
  - `downloadJsonFile(wrapper)`
  - `importFromJson(fileOrText, mode)`

- **Validation Layer (JS)**
  - `validateWrapper(obj): ValidationResult`
  - `validateContacts(contacts)`
  - `validateEdges(edges, contactsById)`

### 16.2 Datenfluss (MVP)
1) User Action → 2) State Update → 3) Validate (light) → 4) Persist → 5) UI re-render

### 16.3 Render-Strategie
MVP ohne Framework:
- „Re-render on state change“ für Listenbereiche
- Virtualisierung optional (erst bei sehr großen Listen)

---

## 17. Detailanforderungen: Algorithmen & Metriken

### 17.1 KPIs
- **Total Contacts**: `contacts.length`
- **Counts by Level**:
  - `countL1 = contacts.filter(c => c.level === "L1").length` usw.

### 17.2 Tag-Statistik
- `tagCounts: Map<tag, count>`
- Top N Tags nach Count, Ties alphabetisch

### 17.3 Bridge Score (MVP)
Ziel: Leute finden, die mehrere Kontexte verbinden.
- `bridgeScore(contact) = distinct(contact.tags).length`

Optional (wenn Edges aktiv):
- **Group-bridge Score**:
  - Für Kontakt X: sammle Tags aller Nachbarn + eigene Tags
  - Score = Anzahl distinct Tags im „Neighborhood“
  - Achtung: das ist eher „Connector Potential“, nicht mathematisch sauberer Community-Bridge.

### 17.4 2-Hop Reach (heuristisch, optional)
Nur wenn Edges gepflegt werden:
- `reach2(contactId)`:
  - `neighbors1 = direct neighbors`
  - `neighbors2 = neighbors of neighbors1`
  - Entferne `contactId` und `neighbors1`
  - Ergebnisgröße = `neighbors2.size`

Hinweis im UI: „Nur so gut wie deine gepflegten Verbindungen“.

---

## 18. UI Spezifikation (MVP)

### 18.1 Globale UI Elemente
- Header/Toolbar:
  - App-Name
  - Search Input (global oder in Contacts View)
  - Buttons: `New Contact`, `Export`, `Import`

- Toast/Notifications:
  - „Saved“
  - „Import successful“
  - „Invalid JSON: …“

- Confirm Dialogs:
  - Delete Contact
  - Clear All Data
  - Import Replace

### 18.2 View: Dashboard
MUSS enthalten:
- Cards: Total, L1, L2, L3, L4
- Top Tags (Top 10)
- Top Bridge Scores (Top 10)
SOLL enthalten:
- Quicklinks: „Add Contact“, „Go to Contacts“, „Export“

### 18.3 View: Contacts (Liste)
MUSS enthalten:
- Search (Name/Handle/Notes/Tag)
- Filter:
  - Level (multi)
  - Tags (multi)
- Sort:
  - Name
  - UpdatedAt
  - Level
- List Item:
  - Name
  - Level Badge
  - Tags (max 3 + „+x“)
  - UpdatedAt (optional)

### 18.4 View: Contact Detail / Editor
MUSS enthalten:
- displayName (required)
- level (dropdown L1–L4)
- handles (chips oder textarea, newline-separated)
- tags (chips + autocomplete)
- notes (textarea)
- createdAt/updatedAt (read-only)
Buttons:
- Save
- Cancel
- Delete

### 18.5 View: Network (Edges)
MVP: Tabellenansicht
- Spalten: From, To, Type, Strength, CreatedAt
- Add Edge Dialog:
  - fromId (select)
  - toId (select)
  - type (select)
  - strength (select)

Regeln:
- from != to
- keine doppelten Edges (from-to-type) im MVP

### 18.6 View: Settings
MUSS enthalten:
- Export JSON (Download)
- Copy JSON (optional)
- Import JSON (File)
- Import Mode: Merge / Replace
- Danger Zone:
  - Clear All Data

---

## 19. Validierungsregeln (konkret)

### 19.1 Kontakt Validierung
- `displayName`: min 1, max 80 chars
- `level`: muss in {L1,L2,L3,L4} sein
- `tags`: max 30 tags, each tag:
  - trimmed, max 30 chars, keine leeren Strings
- `handles`: max 20, each:
  - trimmed, max 80 chars

### 19.2 Edge Validierung
- `fromId` und `toId` existieren in contacts
- `fromId !== toId`
- `type` in allowed set
- `strength` in allowed set

### 19.3 Import Validierung
- Wrapper muss `version`, `exportedAt`, `data` enthalten
- `data.contacts` Array muss existieren
- `data.edges` Array existiert (kann leer sein)
- Bei `merge`:
  - wenn Kontakt-ID schon existiert → überschreiben (import wins) ODER neue ID vergeben (MVP: überschreiben)

---

## 20. Persistenz & Versionierung

### 20.1 LocalStorage Schema
- `nt_v1_data` enthält:
```json
{
  "schemaVersion": 1,
  "contacts": [],
  "edges": [],
  "tags": [],
  "lastSavedAt": "ISO"
}
````

* `nt_v1_settings` enthält:

```json
{
  "ui": {
    "theme": "dark|light|system",
    "compactMode": false
  },
  "contactsView": {
    "sort": "name|updated|level",
    "levelFilter": ["L1","L2"],
    "tagFilter": ["Discord"]
  }
}
```

### 20.2 Migrations

* App SOLL beim Laden prüfen:

  * `schemaVersion` fehlt oder alt → Migration ausführen
* MVP: nur Version 1, Migration später.

---

## 21. Fehlerfälle & Edge Cases

* Local Storage voll / blocked

  * Muss melden: „Speichern fehlgeschlagen (Local Storage nicht verfügbar)“

* Import enthält doppelte IDs in sich selbst

  * Muss melden + Import abbrechen

* Import edges referenzieren fehlende contacts

  * MVP: Fehler + Import abbrechen
  * Option später: „skip invalid edges“

* Delete Contact mit bestehenden Edges

  * MUSS alle Edges entfernen, die diese ID referenzieren
  * Muss warnen: „X Verbindungen werden mitgelöscht“

---

## 22. Akzeptanzkriterien (MVP)

1. **Persistenz**

* Wenn ich einen Kontakt anlege und Seite neu lade, ist er noch da.

2. **Filter/Suche**

* Suche nach Tag oder Handle findet den Kontakt.

3. **Export**

* Export lädt eine JSON-Datei herunter, die alle Kontakte enthält.

4. **Import Replace**

* Import im Replace-Modus ersetzt den gesamten Datensatz.

5. **Import Merge**

* Import im Merge-Modus fügt neue Kontakte hinzu und überschreibt Konflikte nach Regel.

6. **Validierung**

* Import eines kaputten JSON wird sauber abgelehnt (UI Fehlertext).

7. **Delete**

* Löschen eines Kontakts entfernt zugehörige Edges.

---

## 23. Projektstruktur (empfohlen)

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

---

## 24. Open Questions (bewusst offen)

* Soll ein Edge gerichtet sein (A kennt B) oder ungerichtet?
  MVP: gerichtet, UI kann „bidirectional“ als Shortcut anbieten.
* Wie sollen Konflikte beim Merge gehandhabt werden?
  MVP: import wins.
* Soll es Duplikat-Erkennung geben (ähnlicher Name/Handle)?
  Später.

