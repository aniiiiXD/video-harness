# Project format v1

`film.json` holds the timeline and source ledger. Use 1920×1080 for the starter scenes or 1080×1920 with scene code laid out for portrait. Frame rates are 24, 25, 30, or 60 fps. Durations are rounded to frames and accumulated without gaps. `vh storyboard` emits exact frame ranges.

Top-level fields: `version: 1`, `name`, `width`, `height`, `fps`, `brand`, `assets`, `scenes`, optional `audio: {asset: "music-id"}`. Brand has six-digit hex `background`, `foreground`, `accent` and CSS `fontFamily`. The sample uses system Arial so it needs no external font fetch; bundle licensed local fonts and load them in the renderer for exact cross-machine typography.

Asset records have unique lowercase `id`, `kind` (image, video, audio or font), a `path` relative to `public/`, `source`, `license`, `reviewed`, and optional author/attribution/licenseUrl/hash/design provenance. The validator rejects missing files and paths/symlinks outside `public/`. Imports copy files and refuse existing IDs/filenames. Original files remain unchanged. Unknown license records should say `pending-review` and stay unreviewed.

## Typography

Import a licensed font with `vh import . typeface.ttf --kind font --id title-face --role display --source "Foundry name" --license "SIL OFL 1.1"`. Font assets accept TTF, OTF, WOFF and WOFF2. Use `--weight 800` for a static face or a range such as `--weight "100 900"` for a browser variable font. The asset stores the source, license and weight.

`brand.fonts` assigns font IDs to `display`, `body`, `face-title` and `caption`. The Remotion starter loads display and body faces locally and uses `brand.fontFamily` as the fallback. The talking-head renderer reads the face-title and caption roles with `--project .` and accepts TTF or OTF for those roles. Use a static instance for the desired weight in those layers.

Catalog imports include `fontFamily`, `sampleWeight` and the path to the bundled `licensePath` under `public/`. Set the scene's typography weight to the catalog's sample weight to reproduce its specimen when using a variable font.

Add optional `typography` to a scene to compose its headline. An authored title scene uses a plain background and the specified text placement. Set `font` to use another imported face in that shot. The box is `[left, top, width]` in fractions of the frame. Size is a fraction of frame height. Tracking is in em. Line height is a multiplier. The entrance uses seconds relative to the scene. A cut uses only a start time. Fade and mask can also set a duration.

```json
{
  "font": "title-face",
  "box": [0.10, 0.28, 0.80],
  "size": 0.14,
  "weight": 400,
  "tracking": -0.02,
  "lineHeight": 0.94,
  "align": "left",
  "entrance": {"kind": "mask", "start": 0.15, "duration": 0.38}
}
```

Existing projects with custom scene code can copy `typography.js` and `Title.jsx` from `templates/journey/src`. Call `loadProjectFonts(project)` in the Remotion entry point and use `fontFamily(brand, role)` for a font stack. Mount `Title` for a scene that uses the typography settings.

## Scene types

Scenes have unique `id`, `type`, `seconds` (1–30), `headline` (1–85 characters), optional `body` (up to 180), and `evidence`. Evidence kind is `concept`, `recorded` or `verified`; the latter two require a source. A source string is traceability, not automatic verification.

| Type | Additional fields |
|---|---|
| title | None |
| journey | `steps`: 2–5 strings, each up to 40 characters |
| wireframe | `asset`: image/video ID; optional camera |
| footage | `asset`: image/video ID; optional camera |
| comparison | `before`, `after`: up to 110 characters each |
| metric | numeric `from`, `to`, short `unit`; show denominator/context in body/source |

Camera: `{ "from": 1, "to": 1.6, "focus": [0.67, 0.52] }`. Scales are 1–3, focus coordinates are 0–1. Screens use contain, footage uses cover. Review footage crops manually. Videos currently start at their first frame and are muted; choose sources long enough for their scene. For a custom trim, add explicit media timing in scene code.

Music uses optional `audio: {asset: "music-id"}`. Independent narration uses `narration: [{asset: "voice-id", startSeconds: 0, durationSeconds: 2.4, volume: 1}]`. Both references must point to audio assets. Cue start is nonnegative, duration positive, volume 0–1, and the cue must end within the film. Use measured voice duration; there is no automatic stretching or ducking. Older custom Scene.jsx files need the new Soundtrack component to play narration; the harness never overwrites custom source during an update.

`vh build` regenerates `src/timeline.generated.jsx` with separate authored Sequence nodes. User edits belong in `film.json` and `src/Scene.jsx`, never the generated file. Scene code is intentionally editable: this is an agent toolkit, not a closed template editor.
