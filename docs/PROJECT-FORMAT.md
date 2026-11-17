# Project format v1

`film.json` is the single timeline and source ledger. Starter resolution is 1920×1080; frame rates: 24/25/30/60. Durations are rounded to frames and accumulated without gaps. `vh storyboard` emits exact frame ranges.

Top-level fields: `version: 1`, `name`, `width`, `height`, `fps`, `brand`, `assets`, `scenes`, optional `audio: {asset: "music-id"}`. Brand has six-digit hex `background`, `foreground`, `accent` and CSS `fontFamily`. The sample uses system Arial so it needs no external font fetch; bundle licensed local fonts and load them in the renderer for exact cross-machine typography.

Asset records have unique lowercase `id`, `kind` (image/video/audio), a `path` relative to `public/`, `source`, `license`, `reviewed`, and optional author/attribution/licenseUrl/hash/design provenance. The validator rejects missing files and paths/symlinks outside `public/`. Imports copy files and refuse existing IDs/filenames. Original files remain unchanged. Unknown license records should say `pending-review` and stay unreviewed.

Scenes have unique `id`, `type`, `seconds` (1–30), `headline` (1–85 characters), optional `body` (up to 180), and `evidence`. Evidence kind is `concept`, `recorded` or `verified`; the latter two require a source. A source string is traceability, not automatic verification.

| Type | Additional fields |
|---|---|
| title | None |
| journey | `steps`: 2–5 strings, each up to 40 characters |
| wireframe | `asset`: image/video ID; optional camera |
| footage | `asset`: image/video ID; optional camera |
| comparison | `before`, `after`: up to 110 characters each |
| metric | numeric `from`, `to`, short `unit`; show denominator/context in body/source |

Camera: `{ "from": 1, "to": 1.6, "focus": [0.67, 0.52] }`. Scales are 1–3, focus coordinates are 0–1. Screens use contain, footage uses cover. Review footage crops manually. Videos currently start at their first frame and are muted; choose sources long enough for their scene. For a custom trim, add explicit media timing in scene code. Audio is a single optional bed; detailed cue mixing is a later extension.

`vh build` regenerates `src/timeline.generated.jsx` with separate authored Sequence nodes. User edits belong in `film.json` and `src/Scene.jsx`, never the generated file. Scene code is intentionally editable: this is an agent toolkit, not a closed template editor.
