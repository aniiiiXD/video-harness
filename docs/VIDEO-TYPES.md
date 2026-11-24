# Videos you can make with Video Harness

| Kind of video | What you could make |
|---|---|
| **Product films** | Launch trailers, feature reveals, app walkthroughs, onboarding videos, changelog recaps |
| **Developer demos** | GitHub README videos, CLI and API demos, open-source project showcases, hackathon submissions |
| **Creator videos** | Talking-head Reels, storytimes, commentary, Q&As, podcast and interview highlights |
| **Tutorials and explainers** | Step-by-step lessons, animated diagrams, screen tutorials, team training videos |
| **Ads and promos** | Short social ads, founder promos, customer testimonials, landing-page loops |
| **Case studies and pitches** | Customer stories, before-and-after redesigns, investor pitch videos, portfolio showreels |
| **Motion graphics** | Animated titles, kinetic typography, logo reveals, animated posters, lyric videos |
| **Data and research stories** | Benchmark comparisons, research demos, animated charts, year-in-review videos |
| **Footage-led edits** | Event recaps, sports highlights, travel montages, behind-the-scenes clips, mini-documentaries |

## Make your first cut

Start with one audience, one thing they should see happen, and one delivery format. Give the agent a repo, a live link, footage, a design file, or the material you already have. The agent directs the edit and prepares the scenes. The harness keeps the brief, assets, timeline, preview, and export together.

### Create or reopen a project

Run these commands from the Video Harness checkout with Node.js 22 or newer and npm. The starter includes a fictional product journey you can preview and use as a reference.

```sh
npm ci
mkdir -p projects
node bin/vh.mjs init projects/my-film
node bin/vh.mjs brief projects/my-film \
  --request "Show a new user running a search and finding the result" \
  --look "Direct product demo with restrained type and a close-up on the result" \
  --format "16:9 walkthrough"
```

For an existing film, run `node bin/vh.mjs brief projects/my-film` to see its direction and history. Use `--note` to save what changed and where to pick up. Set the delivery size in `film.json`. The starter layout is 1920×1080. A vertical cut uses 1080×1920 with scene layouts composed for portrait. [Project format](PROJECT-FORMAT.md)

### Prepare the material

| Starting point | What the agent prepares |
|---|---|
| GitHub repo or live site | Pick one real workflow with an input, an action, and a visible result. Use the running app, a demo site, or a readable terminal session to capture those beats. Record the page or commit as evidence. |
| Talking-head clip or interview | Get word timings from a transcript or local transcriber. Choose the speaker's phrases for captions, behind-the-face titles, and camera moves. Render the opener from the original footage. Use a scene that plays its audio or add the voice as a narration cue. |
| Design or wireframe | Choose the frame that shows each state. Import a screenshot or use OpenPencil to export a specific node from a `.fig` or supported `.pen` file. Compose the relevant controls for close-ups in the film. |
| Footage, photos, or data | Give each shot a job. Select images that establish the person, place, or action. Source metric and comparison claims, then use the proof on screen. |
| A few words or a script | Pick which line deserves the frame. Set its type, line breaks, and reading hold. Use voice, footage, a screen, or the next cut to carry the rest. |

For the QuickRix Reel, Playwright in Chrome captured the public site's share control, recipient panel, and example answer as individual PNGs. The edit used those crops after the spoken hook to show the same sample Reel from sharing to a timestamped answer. Use the same approach when a full-page recording would make the important control too small to read. [QuickRix public walkthrough](https://quickrix.com/#how)

Stage assets with a source and license record. For example, save a screen recording at `captures/demo.mp4` in the checkout and import it into the film.

```sh
node bin/vh.mjs import projects/my-film captures/demo.mp4 \
  --kind video --id workflow-demo \
  --source "Screen recording of the demo workflow" \
  --license "Project-owned demo footage"
```

Use `vh images` and `vh fetch-image` to find and import stock images. Wikimedia Commons is the default. Pexels uses a configured `PEXELS_API_KEY`. Review the selected asset for its crop, relevance, and rights. [Image Sourcing](../skills/image-sourcing/SKILL.md)

### Build, watch, and export

| Project file | What to edit or look for |
|---|---|
| `film.json` | Scene order and duration, brand, asset IDs, evidence, camera focus, typography, and audio cues |
| `src/Scene.jsx` | The editable React layouts and motion for product screens, footage, and other custom scenes |
| `src/timeline.generated.jsx` | Frame-aligned Remotion sequences regenerated from `film.json` by the build |
| `.harness/brief/` | The saved request, look, format, and revision notes |
| `public/assets/` | Imported video, images, audio, and fonts |
| `out/` | Storyboard files and rendered exports |

The starter includes title, journey, wireframe, comparison, metric, and footage scenes. Use a scene's `camera` settings to specify the starting and ending zoom and a point of interest. Use scene code when a move needs to land on a particular click, scroll, or spoken cue. [Scene format](PROJECT-FORMAT.md#scene-types)

```sh
node bin/vh.mjs validate projects/my-film
node bin/vh.mjs storyboard projects/my-film
node bin/vh.mjs build projects/my-film
node bin/vh.mjs setup projects/my-film
node bin/vh.mjs preview projects/my-film
```

Setup installs the project's renderer dependencies. Open the Studio URL printed by the preview command. Watch the full cut, then check the entrance, strongest zoom, reading hold, and exit of any busy shot. Review captions and UI at the intended viewing size and listen to the audio through the cuts.

Export from another terminal while reviewing in Studio, or stop the preview first. The result is `projects/my-film/out/film.mp4`.

```sh
node bin/vh.mjs render projects/my-film
```

## Use the skills

`vh init` copies the six skills into `.agents/skills/` and includes an `AGENTS.md` for the project. Ask the agent to use the relevant skills on your brief. For example, ask it to use Journey Director and Motion Typography to make a product cut from a repo, save the direction, and show the first complete preview.

| Skill | When to use it | What to give it |
|---|---|---|
| [Journey Director](../skills/journey-director/SKILL.md) | Make or resume a product film, GitHub demo, or site walkthrough | A repo, live link, or actual workflow and what the viewer should understand |
| [Motion Typography](../skills/motion-typography/SKILL.md) | Design a title, caption treatment, product label, or kinetic type sequence | The exact words, the footage or layout, style references, and the delivery size |
| [Talking-Head Edit](../skills/talking-head-edit/SKILL.md) | Time captions, put text behind the speaker, or animate a shot around speech | The original clip and its transcript or reviewed word timings |
| [OpenPencil to Film](../skills/openpencil-to-film/SKILL.md) | Turn wireframes and design states into shots | A design file and the screen nodes the film should show |
| [Image Sourcing](../skills/image-sourcing/SKILL.md) | Find imagery for a shot | The subject, action, setting, framing, and usage rights needed |
| [Motion Review](../skills/motion-review/SKILL.md) | Check cut timing, legibility, alignment, and camera moves | The stitched preview or export and its target screen size |

Use `node bin/vh.mjs skills ./my-video-skills` to copy the skills to a new folder. An MCP client can read the same instructions at `video-harness://skills/<skill-name>` and start a brief with the `direct-film` prompt. The server exposes project, asset, font, storyboard, and render operations. A coding agent with project access authors custom React scenes. [MCP connection guide](CONNECT.md)

## Font ideas and motion treatments

Give type a role in the shot before choosing a face. Compose the actual words as a still, set the line break and alignment, and review the frame at phone size. Use a cut for an immediate statement, a mask reveal when an edge gives it a reason to move, and a fade for a quieter entrance. Give the final words a readable hold.

| Direction | Faces to try | How to use them in a shot |
|---|---|---|
| Quiet editorial opener | Instrument Serif 400 with DM Sans 500 for supporting text | Start the serif on the cut, left-aligned in the space beside the subject. Hold it while the shot settles. |
| Fashion or end titles | Bodoni Moda 500 with Inter 600 for small labels | Give the fine strokes a large, simple frame. Check them in the actual export before using the same weight over busy texture. |
| Personal, food, or craft story | Fraunces 700 with DM Sans 500 | Give one warm display line the frame, then cut or pull back to show the thing being made. |
| Product walkthrough | Bricolage Grotesque 750 or the product's own face, with Inter 600 | Align the headline with the screen edge. Move a label as the relevant UI changes and hold on the result. |
| Sports or fast vertical title | Barlow Condensed 800 or Bebas Neue 400, with Atkinson Hyperlegible Next 600 for captions | Break a short title into two lines. Reveal it through a mask on a beat, then let the caption baseline stay steady. |
| Developer demo or benchmark | Space Grotesk 700 with IBM Plex Mono 500 | Keep commands and numbers aligned as values update. Give the result its own frame and reading hold. |
| Documentary or report | Newsreader 500 with Archivo Narrow 600 | Set quotes calmly with enough line spacing. Keep names and dates attached to a consistent edge. |
| Exhibition teaser or showreel | Syne 700 with DM Mono 400 | Use a few wide words as the visual focus, with date or location in small aligned type. |
| Sci-fi or retro technical opener | Oxanium 700 or Unbounded 700, with Space Mono 700 for readouts | Time a short status change to the action in frame. Keep repeated labels in the same place so the change reads. |
| Handwritten annotation | Gochi Hand 400 or Caveat 600 with Inter 600 | Place a brief note near the object it refers to and hold the framing long enough to connect the two. |
| Hindi or Japanese titles | Noto Sans Devanagari 500 or Zen Kaku Gothic New 500 | Preview the real translated phrase and its line breaks. Give vowel marks and characters room at the intended size. |

These are directions for testing. Type the actual line into the preview browser and compare a few faces against the footage. The full catalog has 30 families, specimen weights, role suggestions, and license sources. [Font catalog](../lib/font-catalog.json)

### References worth borrowing from

- **School of Motion.** Joey Korenman's kinetic typography tutorial uses markers to align changes in type with the audio. For a talking-head cut, identify the phrase that carries the beat and use its time as the cue for the title or camera move. [Kinetic typography tutorial](https://schoolofmotion.com/blog/kinetic-typography-after-effects-part-1)
- **Studio Dumbar.** The North Sea Jazz identity takes its movement from the rhythm of live performance. For a music-led piece, look at where the performance stretches or lands and use that rhythm to decide how the type moves. [North Sea Jazz case study](https://studiodumbar.com/work/north-sea-jazz)
- **Pentagram.** The *Landscapers* titles use Western-influenced letterforms and project them onto fabric. For a film with strong objects or texture, look for a way to place the type in that world, such as bringing it in behind the subject or revealing it at a real edge. [Landscapers title case study](https://www.pentagram.com/work/landscapers)
- **Hoefler & Co.** The foundry's article on tight tracking recommends display cuts whose spacing holds up at close quarters. Try tighter spacing where the headline benefits from it, then look closely at the real pairs of letters and keep small supporting text comfortable to read. [Choosing Fonts for Tight Tracking](https://www.typography.com/blog/fonts-for-tight-tracking)

### Find and apply a face

```sh
node bin/vh.mjs fonts "quiet editorial" --role display
node bin/vh.mjs fonts --provider google \
  --category "/Expressive/Calm" --language en_Latn --limit 10
node bin/vh.mjs fetch-font projects/my-film instrument-serif --role display
node scripts/font-specimens.mjs
```

The last command makes the browser at `out/font-library/index.html`. Search the catalog by mood or use, select a text role, and type your own words into the sample field. The Google mode searches by category and language through Google Design MCP. Import a curated result with `fetch-font` to bring its font file and SIL OFL notice into the project. [Google Design MCP font search](https://developers.google.com/design-mcp/reference/mcp/tools_list/search_fonts)

Set project-wide font roles in `brand.fonts`. Use `display` for headlines, `body` for supporting text, `face-title` for the layer behind the speaker, and `caption` for the readable speech layer. Import your own licensed TTF, OTF, WOFF, or WOFF2 with `vh import --kind font`. Use TTF or OTF for the two talking-head roles. Choose a static face to get a specific weight in that renderer.

For a title scene, put this example in the scene's `typography` field after importing `instrument-serif`. The box and size are fractions of the frame. Tracking is in em. Entrance timing is relative to the scene.

```json
{
  "font": "instrument-serif",
  "box": [0.09, 0.30, 0.82],
  "size": 0.14,
  "weight": 400,
  "tracking": -0.015,
  "lineHeight": 0.94,
  "align": "left",
  "entrance": {"kind": "cut", "start": 0}
}
```

Use the talking-head skill for the masked portrait layer. Its renderer accepts `--project` to read the configured face-title and caption fonts. [Typography fields](PROJECT-FORMAT.md#typography) · [Talking-head local workflow](../skills/talking-head-edit/references/local-render.md)

## The code stack

| Part | What it uses | Where to look |
|---|---|---|
| CLI and project state | Node.js 22+, npm, JavaScript ES modules, local files and JSON | [CLI](../bin/vh.mjs) · [Project validation and build](../lib/project.mjs) · [Brief history](../lib/brief.mjs) |
| Scene rendering | React 19.3.1 and JSX, Remotion 4.0.543 with `@remotion/cli` and `@remotion/media`, Chromium for preview and H.264 MP4 export | [Renderer dependencies](../templates/journey/package.json) · [Starter scenes](../templates/journey/src/Scene.jsx) |
| Agent tools | Model Context Protocol SDK 1.32.2 and Zod 4.6.7, with local stdio or authenticated Streamable HTTP | [Server and tools](../lib/mcp.mjs) · [Dependencies](../package.json) |
| Typography | Local font files loaded with the browser's `FontFace` API, React title styles, a JSON catalog, and a plain HTML/CSS/JavaScript preview browser | [Typography loader](../templates/journey/src/typography.js) · [Title component](../templates/journey/src/Title.jsx) · [Catalog code](../lib/font-catalog.mjs) · [Preview template](../templates/font-library/index.html) |
| Talking-head compositing | Python 3 and Pillow for text layers. Swift, Apple Vision, Core Image, and AVFoundation on macOS for the portrait mask and compositing. FFmpeg and FFprobe handle audio and media inspection. MLX Whisper is an optional local source of word timings. | [Talking-head scripts](../skills/talking-head-edit/scripts) · [Local workflow](../skills/talking-head-edit/references/local-render.md) |
| Product capture and design | Agent-driven Playwright and Chrome for browser captures, and the optional OpenPencil CLI for exporting specific design frames | [Journey Director](../skills/journey-director/SKILL.md) · [Import and export code](../lib/import.mjs) |
| Image and font sources | Wikimedia Commons, optional Pexels, pinned Google Fonts files, and Google Design MCP for live discovery | [Image code](../lib/images.mjs) · [Font catalog code](../lib/font-catalog.mjs) |
| Audio | Imported music and voice tracks, configured Smallest.ai narration, and an optional Suno host adapter for a separately connected Suno MCP client | [Smallest.ai setup](SMALLEST.md) · [Suno adapter](SUNO.md) |
| Tests and packaging | Node's built-in test runner and an npm tarball with a SHA-256 release manifest | [Tests](../test) · [Packaging script](../scripts/package.mjs) |

Keep the project folder with the final cut. Its brief, assets, source notes, and editable scene code give the next agent enough context to pick up the work.
