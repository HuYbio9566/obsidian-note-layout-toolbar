# Note Layout Toolbar

Note Layout Toolbar is an Obsidian plugin that adds a compact floating toolbar for page-level layout and table formatting.

It is designed for people who want notes to feel more like editable documents: quickly adjust the current note width, color headings, color selected table cells, align selected cells, and resize table rows or columns without changing every note globally.

## Features

- Floating toolbar shown after selecting content in a note.
- Per-note content width shortcuts: 50%, 60%, 70%, 80%, 90%, and 100%.
- Per-note heading text color and heading background color.
- Selected-cell background color for tables.
- Table tools for equal column width, horizontal alignment, and vertical alignment.
- Drag handles for resizing table columns and rows.
- Per-note persistence for floating toolbar changes.
- Global defaults in the plugin settings page for content width, heading colors, table width, and table row spacing.
- Undo support for the plugin's latest formatting operation with `Command+Z` on macOS.

## Important behavior

The floating toolbar and the plugin settings page intentionally do different jobs:

- Floating toolbar changes apply only to the current note.
- Settings page changes are global defaults.

This lets you keep a clean global setup while still customizing individual notes.

## Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create this folder in your Obsidian vault:

```text
YourVault/.obsidian/plugins/note-layout-toolbar/
```

3. Put the three downloaded files into that folder.
4. In Obsidian, open `Settings -> Community plugins`, then enable `Note Layout Toolbar`.

## Development

```bash
npm install
npm run build
```

The build outputs `main.js` in the repository root.

## License

MIT
