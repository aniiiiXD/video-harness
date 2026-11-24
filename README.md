# Video Harness

A connectable video toolkit for agents making product journeys, wireframe walkthroughs and launch films. Bring a product brief, design files, brand and assets; work with your preferred agent to build and revise an editable film. MCP exposes the same tools over local stdio or authenticated HTTP.

**This is an early developer release.** The source includes project/build/import commands, six starter scene types, portable skills, image search, a Smallest.ai TTS adapter and an optional Suno host adapter. The agent handles narrative and custom scene design; the harness validates and renders that work. There is no publicly hosted service yet.

## Connect

Run `npm ci`, then `node bin/vh.mjs mcp --workspace /absolute/path/to/films` from an MCP client's server configuration. For a remote team server, use `vh serve` with a persistent workspace and private bearer token. See [connection instructions](docs/CONNECT.md) for client JSON, HTTP hosting and the supported workflow.

The HTTP server is a single trusted workspace. Public customer accounts and isolated cloud workers are not implemented. Reasoning models are chosen by the connecting client; narration uses a separate provider adapter.

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

Give a coding agent this repository and a product repository or live site URL. The handoff walks it through source research, real product captures, optional LTX footage, and review of the finished cut. [Agent handoff](docs/CONNECT.md#make-a-film-from-a-repository)

See the video guide for examples, the full editing workflow, font ideas, and the code stack. [Video guide](docs/VIDEO-TYPES.md)

## What works

| Capability | Included behavior |
|---|---|
| Product journeys | Timed state flows, screen close-ups, comparisons, metrics, footage and title scenes |
| Editing | `film.json` controls brand, timeline and assets; `src/Scene.jsx` is editable React |
| Creative brief | Save the request, look, format and notes with the project for later revisions |
| OpenPencil | Export an explicit `.fig`/`.pen` node through the installed CLI, or import exported images |
| Image search | Commons without a key; optional Pexels with your own API key |
| Asset records | Source, license, author, review status and hashes kept with imports |
| Agent skills | Journey direction, image sourcing, OpenPencil handoff, motion review, [talking-head editing](skills/talking-head-edit/SKILL.md) and [motion typography](skills/motion-typography/SKILL.md) |
| Typography | Search 30 curated faces, discover Google Fonts, and direct headline placement and timing per scene |
| MCP | Project and brief tools, portable skill resources, directing prompt; stdio and authenticated Streamable HTTP |
| Preview/export | Remotion Studio and explicit H.264 MP4 export |
| Visual review | Motion Review skill and JPEG frames from the exported cut over CLI or MCP |
| Narration | Smallest.ai Pro voices, prepared generation plans, persisted receipts and independent voice cues |
| Suno | Official MCP setup plus a host adapter; sign-in and live tool mapping remain separate |

## Everyday commands

Search the font library by name, mood or use. Fetch a selected face and its license into a project. Generate an offline specimen browser to compare the fonts with your own words.

```sh
vh fonts "quiet editorial" --role display
vh fonts --provider google --category "/Expressive/Calm" --language en_Latn --limit 10
vh fetch-font ./my-product-film instrument-serif --role display
node scripts/font-specimens.mjs
```

The specimen browser opens from `out/font-library/index.html`. Live Google search uses the public Design MCP endpoint. Font downloads from the curated catalog come from a pinned revision of the Google Fonts repository.

Open the saved brief at the start of a session. The agent uses suggested questions to fill in creative decisions the user hasn't made yet. Each update records the new direction or note alongside earlier entries in `.harness/brief/`.

```sh
vh brief ./my-product-film --request "Make a Reel introducing the product"
vh brief ./my-product-film --look "Punchy with large titles" --format "9:16 Instagram Reel"
vh brief ./my-product-film --note "First cut is ready for review"
vh brief ./my-product-film
```

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

Read [project format](docs/PROJECT-FORMAT.md), [Smallest.ai narration](docs/SMALLEST.md), [Suno adapter](docs/SUNO.md) and [release checks](docs/RELEASE-CHECKS.md).

## Limits and next steps

The starter scenes target 16:9 films. Use a 1080×1920 manifest and scene layouts for a 9:16 film. This release runs on a persistent trusted host. It has no customer account isolation, automatic full-film visual judgement, distributed render queue, integrated music generation UI or automatic layered design conversion. Video sources should cover their scene duration; custom trims and advanced mixing require scene code edits. System-font rendering can vary across machines. Smallest.ai is tested with mocked API responses; live voice generation has not been verified.

See the [proposed project scope](docs/PROJECT-SCOPE.md) for the next release and its acceptance demos. See [contributing](CONTRIBUTING.md) for development expectations.

The original toolkit code and synthetic sample are MIT licensed. Remotion, OpenPencil, stock assets and provider services have their own licenses/terms; check their current requirements for your use. No third-party packages are bundled in the source archive.

## Development

```sh
npm ci
npm test
npm run pack:release
```

Tests use temporary projects and mock provider calls. Packaging uses an explicit file allowlist and rejects private/build directories and machine-specific absolute paths. It produces a `.tgz` and SHA-256 manifest under `dist/`.
