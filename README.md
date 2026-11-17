# Video Harness

A local-first toolkit for coding agents and people making product journeys, wireframe walkthroughs and launch films. Bring a product brief, design files, brand and assets; work with your agent to build and revise an editable film.

**This is an early developer release.** It includes working project/build/import commands, six starter scene types, four agent skills, image search, and a Suno adapter. It is not an autonomous one-prompt video service. The agent handles narrative and custom scene design; the CLI validates and renders that work.

## Install and try

Requires Node.js 22+ and npm. From the repository root:

```sh
npm install -g .
vh init ./my-product-film
vh setup ./my-product-film
vh preview ./my-product-film
```

Open the local URL printed by Remotion. The sample is a complete 31-second fictional Relay workflow. Installation and preview do not call a model or spend generation credits. Renderer setup downloads npm dependencies; rendering may download a compatible headless browser.

Or run `node bin/vh.mjs help` directly; a global installation is optional.

Start your coding agent in the generated project and ask:

> Use the journey-director skill. Turn these product states into a 45-second onboarding film. Keep my brand, show the approval step, use OpenPencil screens, and find two relevant industry images. Build the complete preview before polishing it.

Skills are copied into `.agents/skills` inside each project, with an `AGENTS.md` entrypoint. For clients using a different skill directory, `vh skills <new-folder>` copies the same portable SKILL.md folders. No account configuration is modified by project creation.

## What works

| Capability | Included behavior |
|---|---|
| Product journeys | Timed state flows, screen close-ups, comparisons, metrics, footage and title scenes |
| Editing | `film.json` controls brand, timeline and assets; `src/Scene.jsx` is editable React |
| OpenPencil | Export an explicit `.fig`/`.pen` node through the installed CLI, or import exported images |
| Image search | Commons without a key; optional Pexels with your own API key |
| Asset records | Source, license, author, review status and hashes kept with imports |
| Agent skills | Journey direction, image sourcing, OpenPencil handoff and motion review |
| Preview/export | Remotion Studio and explicit H.264 MP4 export |
| Suno | Official MCP setup plus a host adapter; sign-in and live tool mapping remain separate |

## Everyday commands

```sh
vh storyboard ./my-product-film
vh validate ./my-product-film
vh build ./my-product-film
vh render ./my-product-film
```

Export lands at `my-product-film/out/film.mp4`. `build` overwrites only the generated timeline module, preserving custom scene code. The validator checks structure and asset references; it does not replace visual review.

OpenPencil (optional; tested with CLI 0.16.0):

```sh
npm install -g @open-pencil/cli@0.16.0
openpencil find design.fig --type FRAME --json
vh pencil-export ./my-product-film design.fig --node 1:23 --id request-screen --license "User-owned design"
```

Replace `1:23` with an actual node returned by your design. The command preserves the original file. Flattened image import supports zooms; per-control animation requires rebuilding the relevant layers in the editable React scene. See [OpenPencil skill](skills/openpencil-to-film/SKILL.md).

Images:

```sh
vh images "solar farm aerial" --out candidates.json
vh fetch-image ./my-product-film candidates.json --index 1 --id solar-farm
```

For Pexels set `PEXELS_API_KEY` locally, then add `--provider pexels` to search. [Photos provided by Pexels](https://www.pexels.com). Candidates retain photographer and license links. Inspect content and rights before marking an asset reviewed; downloads do not prove permission. User-supplied media uses `vh import`; run `vh help` for arguments.

## How the harness is structured

`brief → story states → film.json → scene components → full-cut review → optional audio → export`

The same timeline drives preview and export. Original design files, references and evidence stay attributable. Providers remain optional: a film can use supplied images/music and run without Suno or a stock API key. No Clove assets, personal account files or third-party skill packs are included.

Read [project format](docs/PROJECT-FORMAT.md), [Suno adapter](docs/SUNO.md) and [release checks](docs/RELEASE-CHECKS.md).

## Limits and next steps

This release targets 16:9 local workflows. It has no hosted collaboration, automatic full-film visual judgement, durable cloud render queue, integrated music generation UI or automatic layered design conversion. Video sources should cover their scene duration; custom trims and audio cue mixing require scene code edits. System-font rendering can vary across machines.

Next: a second-brand acceptance film, per-scene revision controls, persisted job/credit records, and audio provider result mapping after live authentication. See [contributing](CONTRIBUTING.md) for development expectations.

The original toolkit code and synthetic sample are MIT licensed. Remotion, OpenPencil, stock assets and provider services have their own licenses/terms; check their current requirements for your use. No third-party packages are bundled in the source archive.

## Development

```sh
npm test
npm run pack:release
```

Tests use temporary projects and mock provider calls. Packaging uses an explicit file allowlist and rejects private/build directories and machine-specific absolute paths. It produces a `.tgz` and SHA-256 manifest under `dist/`.
