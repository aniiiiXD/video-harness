---
name: openpencil-to-film
description: Turn OpenPencil product wireframes and workflow states into film-ready screen assets and editable motion scenes while preserving the source design.
---

Work from an explicit `.fig` or supported `.pen` file. OpenPencil and Pencil are different products; identify the actual application/format before using a tool. This harness targets the `open-pencil/open-pencil` CLI, tested with 0.16.0. A PNG/SVG exported manually from another design tool also works.

## Inspect before export

Run `openpencil info design.fig --json`, then `openpencil tree design.fig --json` or `openpencil find design.fig --type FRAME --json`. Choose explicit node IDs for meaningful product states. Read the relevant text and inspect exported frames to distinguish an actual interface from a conceptual mockup. If live MCP is available, discover its tools; don't invent names or silently modify the active document.

Export one frame:

```sh
vh pencil-export ./film ./design.fig --node 1:23 --id request-state --license "User-owned design"
```

The command exports a 2× PNG through OpenPencil, imports it, and records the source filename, node ID and design hash. It does not alter the design or copy the original file. Keep the editable design alongside the project yourself when sharing is authorized. It uses strict font checking: if a font is unavailable, resolve the font in the design/editor instead of accepting a blank or substituted export. The included native example uses Inter. If the CLI is unavailable, export PNG/SVG in the editor and use `vh import`.

Assign the asset ID to a wireframe scene in `film.json`. `camera.focus` is normalized `[x,y]` on the image and `camera.from/to` are scales from 1 to 3. Start with the complete screen, move to the control or result that matters, then restore context when useful. Never claim that a flat PNG has editable layers or interactive behavior.

## When the action needs layers

Use `openpencil export design.fig --node 1:23 -f jsx -o frame.jsx` as a reference, or inspect layers through MCP. Exported JSX may depend on OpenPencil-specific primitives and is not automatically a Remotion component. Rebuild the relevant controls and text in `Scene.jsx`, preserving their actual wording, spacing and relationships. Animate input → transition → output with the frame clock; show focus/cursor only when it explains the action. Keep decorative UI static.

Link each state to the same user journey. Label imagined features as concepts. Verify cropped text and cursor position at maximum zoom with the motion-review skill. Reference: [official CLI](https://openpencil.dev/reference/cli).
