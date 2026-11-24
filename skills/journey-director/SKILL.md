---
name: journey-director
description: Make, direct, or resume a video for a product in Video Harness. Use for GitHub projects, live sites, product walkthroughs, launch films, and revisions to saved edits.
---

Use this for a product journey, feature walkthrough or launch film in a Video Harness project. Read `film.json`, `AGENTS.md` and `src/Scene.jsx` before editing. The sample Relay product is fictional, not evidence about the user's product.

## Open the brief

- When the user names a product, look for its existing project before initializing one. Search the active MCP workspace or the local Video Harness checkout's `projects/<product-slug>` folder. For a linked skill installation, resolve the skill directory to find its source checkout and `bin/vh.mjs`.
- Run `vh brief <project>` or `project_brief_read` to recover the request, visual direction, format and latest progress. Run `node <checkout>/bin/vh.mjs brief <project>` when the CLI is available from source.
- Save a new request with `--request` or `project_brief_update`. Use the existing direction for revisions unless the user changes it. Ask one concrete creative question when the answer changes the edit. Offer a few suitable looks when useful. Use existing assets and the user's message to fill in answers they have already given.
- Save the user's direction with `--look` and `--format`. Keep assumptions and review feedback in a `--note`, along with the cut or asset to pick up next. Save cues, footage and scene changes in the project as you work.

## Start from a repository or live site

1. Open the local checkout or supplied GitHub link. Read the README, the relevant entry point, and the documented way to run the feature. For a live site, identify the page where the viewer can see the feature. Record the commit or URL in the brief.
2. Pick one demonstration with an input, an action, and a visible result. Run the documented app or CLI with sample data, or use a supplied demo. Record which steps you observed and which claims come from project documentation. Mark mockups and proposed interactions as concepts in the storyboard.
3. Capture the useful states at a fixed viewport. Use a browser capture tool or Playwright to record the interaction or screenshot individual controls and result panels. Save the bounds of anything you want the camera to follow. For a CLI, record the actual command and its output at a legible terminal size.
4. Import captures with `vh import` or `asset_import`. Record the source URL, commit, or command with each asset. Set the scene's evidence and camera focus in `film.json`, then build a storyboard with enough time to read the result.

## Make the workflow visible

Identify the actor, trigger, input, meaningful decisions, product actions, outputs and human approvals. Follow one concrete request through changing states. Each scene must change what the audience understands; avoid a sequence of unrelated feature names. Establish the product and action early. For branches, show both the condition and consequence. Never label a proposed interaction as shipped behavior.

Map states to `film.json` scenes. Choose a device for its job: journey for sequence, wireframe for interaction, comparison for a changed outcome, metric for sourced measurements, footage for physical context, title for the promise or ending. These are starter devices, not a mandatory visual grammar. Build a new component in `Scene.jsx` when the story needs one; update the manifest validator/compiler if adding a new type.

Use the user's brand. Keep related objects stable through a camera move. Zoom to inspect a real control, record or result; pull back to restore context. Do not use the same framed screen for every beat. Pace copy for reading, even when transitions are quick.

## Work in the project

- Edit `film.json` for ordering, timing, claims and assets; `src/Scene.jsx` for rendering. Never hand-edit `timeline.generated.jsx`.
- Use `vh storyboard .`, `vh validate .`, then `vh build .`. Fix validation errors; review warnings in context.
- Preview the whole cut with `vh preview .`. Use the motion-review skill for visual checks and fixes.
- Use openpencil-to-film for design sources and image-sourcing for external images. Preserve provenance in the manifest.
- Use motion-typography when the type carries a scene or the user wants a particular look for titles or captions.
- Use `vh render .` when the user requests an export. The command renders the complete timeline; optional music is `audio.asset`.

For a new project, `vh init <new-folder>` includes a working synthetic example and these skills. `vh setup <project>` installs the renderer. A coding agent supplies the story and scene edits; the CLI is not a text-to-video model and has no automatic LLM calls.

Keep external actions within the user's request. Configuring Suno does not authorize spending. A completed delivery reports the actual output and remaining issues, not just commands attempted.
