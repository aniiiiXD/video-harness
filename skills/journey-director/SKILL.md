---
name: journey-director
description: Build or revise product workflow films from a brief, real product states and supplied assets using the Video Harness manifest and Remotion scenes.
---

Use this for a product journey, feature walkthrough or launch film in a Video Harness project. Read `film.json`, `AGENTS.md` and `src/Scene.jsx` before editing. The sample Relay product is fictional, not evidence about the user's product.

## Make the workflow visible

Identify the actor, trigger, input, meaningful decisions, product actions, outputs and human approvals. Follow one concrete request through changing states. Each scene must change what the audience understands; avoid a sequence of unrelated feature names. Establish the product and action early. For branches, show both the condition and consequence. Never label a proposed interaction as shipped behavior.

Map states to `film.json` scenes. Choose a device for its job: journey for sequence, wireframe for interaction, comparison for a changed outcome, metric for sourced measurements, footage for physical context, title for the promise or ending. These are starter devices, not a mandatory visual grammar. Build a new component in `Scene.jsx` when the story needs one; update the manifest validator/compiler if adding a new type.

Use the user's brand. Keep related objects stable through a camera move. Zoom to inspect a real control, record or result; pull back to restore context. Do not use the same framed screen for every beat. Pace copy for reading, even when transitions are quick.

## Work in the project

- Edit `film.json` for ordering, timing, claims and assets; `src/Scene.jsx` for rendering. Never hand-edit `timeline.generated.jsx`.
- Use `vh storyboard .`, `vh validate .`, then `vh build .`. Fix validation errors; review warnings in context.
- Preview the whole cut with `vh preview .`. Use the motion-review skill for visual checks and fixes.
- Use openpencil-to-film for design sources and image-sourcing for external images. Preserve provenance in the manifest.
- Use `vh render .` when the user requests an export. The command renders the complete timeline; optional music is `audio.asset`.

For a new project, `vh init <new-folder>` includes a working synthetic example and these skills. `vh setup <project>` installs the renderer. A coding agent supplies the story and scene edits; the CLI is not a text-to-video model and has no automatic LLM calls.

Keep external actions within the user's request. Configuring Suno does not authorize spending. A completed delivery reports the actual output and remaining issues, not just commands attempted.
