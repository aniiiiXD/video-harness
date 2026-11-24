# Video Harness project scope

## Product

Video Harness helps founders, designers, and developers turn actual product screens and their own recordings into editable walkthroughs, launch clips, and short explainers. A user describes what matters in the clip. The agent finds the relevant control, action, or spoken phrase and builds a cut the user can preview and revise.

The first release in this scope targets short films in a trusted local workspace. It uses the existing CLI, MCP tools, and Remotion Studio. Video Harness 0.3 already exports selected design frames, renders coordinate-based zooms, imports footage, searches stock images, and saves editable projects. The new work connects those capabilities to actual design layers and source speech. [Current project format](PROJECT-FORMAT.md) · [Connection guide](CONNECT.md)

## First release

### Direct the camera from the actual wireframe

- Accept a supported OpenPencil `.fig` or `.pen` file and the product states the user wants to show. Read the selected frames, visible text, layer IDs, and bounds alongside the rendered screens.
- Turn a request like “show the screen, then zoom into Review action” into an editable camera move. Resolve the label to its containing control, fit that control with surrounding context, and hold the shot long enough to read it. Offer a target choice when several controls match.
- Use supplied result states for the follow-through shot. Keep the design file, frame ID, and target layer ID with the camera cue so someone can trace the shot back to its source. [OpenPencil inspection docs](https://openpencil.dev/developers/cli/inspecting) · [Existing design workflow](../skills/openpencil-to-film/SKILL.md)

### Edit a talking-head clip from a brief

- Accept one speaker's source MP4 or MOV, an optional `.ttf` or `.otf`, and a plain-language brief. Inspect orientation, timing, and audio at import. Make a compatible working copy when needed and use it for both transcription and the cutout. Let the user correct the timed transcript or revise the cut. Keep the speaker's original audio in sync with any trims.
- Support source in/out points, cuts, word-timed captions, and editable text overlays in the supplied font. A cue can target a chosen phrase, such as “when I say ‘five minutes,’ put ‘5 MIN’ behind me.”
- For the behind-person effect, stack the clip, the title, and a synchronized transparent cutout of the speaker. Use the source audio once. Generate or import the cutout and reuse it when the user changes the font or title. Keep durations and cue times editable. [Remotion matting example](https://www.remotion.dev/docs/video-matting-guide#text-behind-a-subject) · [Remotion font loading](https://www.remotion.dev/docs/fonts)

### Assemble, source, and review the film

- Let a film mix speaker, product screen, and stock shots on the same timeline. Test a landscape product demo and a portrait edit from already-framed footage. Start with standard cuts, zooms, and text reveals.
- Run the existing Pexels and Wikimedia Commons image search against a particular storyboard beat. Shortlist up to three visually relevant candidates with their intended crop, source, creator, and license. Save the selected asset and its attribution with the film. [Existing image-sourcing skill](../skills/image-sourcing/SKILL.md) · [Pexels API](https://www.pexels.com/api/documentation/) · [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en)
- Deliver an editable `film.json`, a frame-aligned storyboard, a Studio preview, and an MP4 export. Show the source behind each meaningful cut, zoom, or title so the user can revise it from the brief or timeline.

## Code, tools, and ideas we can reuse

Keep the original copyright and permission notices with MIT code we adapt. For Apache-2.0 code we redistribute, carry the license and applicable notices and mark modified files as required. Record the upstream file and revision for any code we bring in. Apply the terms of each model, template, font, or media asset separately.

| Source | What to take | Reuse decision |
| --- | --- | --- |
| Video Harness | Asset imports, project revisions, storyboard and build, provider adapters, and render jobs | Extend the existing CLI, MCP server, and Remotion template. [Project format](PROJECT-FORMAT.md) · [MCP workflow](CONNECT.md) |
| OpenPencil | Frame and layer inspection, text and geometry, and screen export | Use the existing CLI integration and add a structured design read. OpenPencil is MIT licensed. [Inspection docs](https://openpencil.dev/developers/cli/inspecting) · [License](https://github.com/open-pencil/open-pencil/blob/master/LICENSE) |
| `video-use` and `faster-whisper` | Timed transcripts and filmstrip/waveform checks around tricky cuts | Adapt a small MIT helper such as `helpers/timeline_view.py` where useful. Try `faster-whisper` for local word timestamps and accept an existing timed transcript as an input. [Video-use helper](https://github.com/browser-use/video-use/blob/main/helpers/timeline_view.py) · [Video-use license](https://github.com/browser-use/video-use/blob/main/LICENSE) · [Faster Whisper](https://github.com/SYSTRAN/faster-whisper#word-level-timestamps) · [License](https://github.com/SYSTRAN/faster-whisper/blob/master/LICENSE) |
| AI Video Edit Kit | Caption emphasis behind the speaker and separate effects passes | Its own code is MIT. Use the layering recipe as a reference. Its matting script calls Robust Video Matting, which has a separate GPL-3.0 code license. The first release will evaluate Remotion's matting path with MODNet. [Kit license](https://github.com/rockwithsystems/AIvideokit/blob/main/LICENSE) · [Matting script](https://github.com/rockwithsystems/AIvideokit/blob/main/02_matte_rvm.py) · [RVM license](https://github.com/PeterL1n/RobustVideoMatting/blob/master/LICENSE) |
| Remotion and MODNet | Playback, trimming, local fonts, editable graphics, and a candidate portrait cutout | Use Remotion as the renderer. Evaluate the MIT `@remotion/video-matting` package with its Apache-2.0 MODNet model. Check WebGPU availability and cutout quality around hair and hands on the pilot clip. Confirm the applicable Remotion license before offering hosted rendering. [Matting package](https://www.remotion.dev/docs/video-matting#license) · [Model licenses](https://www.remotion.dev/docs/video-matting/get-available-models) · [Remotion terms](https://www.remotion.dev/docs/terms) |
| `vertical-motion-editor`, HyperFrames, and OpenMotion | Transcript-to-plan workflow, timed titles, frame review, and turning reference motion into reusable recipes | Use these as implementation references. The repos publish MIT, Apache-2.0, and Apache-2.0 licenses respectively. Build the first release's recipes in the existing Remotion scene renderer. [Vertical editor workflow](https://github.com/davidtvrdon/vertical-motion-editor) · [Vertical editor license](https://github.com/davidtvrdon/vertical-motion-editor/blob/main/LICENSE) · [HyperFrames license](https://github.com/heygen-com/hyperframes/blob/main/LICENSE) · [OpenMotion license](https://github.com/nexu-io/openmotion/blob/main/LICENSE) |
| Screen Studio, Figma Motion, and creator demos | Click-timed zooms, editable keyframes, and review of rendered frames | Use these interactions as references and design our own interface, visuals, and motion presets. [Screen Studio zooms](https://screen.studio/guide/adding-editing-zooms) · [Figma motion handoff](https://help.figma.com/hc/en-us/articles/41296356954263-Hand-off-animations-to-development) · [Creator walkthrough on X](https://x.com/virgilerietsch/status/2110064024645746820) |

Use stock for specific shots under the provider and item terms. Keep attribution with the source record and carry it into delivery where required. Use original or separately licensed media, fonts, and design files in anything we distribute. [Pexels terms](https://www.pexels.com/terms-of-service/) · [Commons license guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en)

## What we build ourselves

1. **References the editor can follow.** A shot points to a design node, a time range in the source clip, or a spoken phrase. The agent makes the editorial choice. The harness resolves coordinates and frame numbers so the same project renders consistently. This lets a brief connect speech and product actions, such as cutting to a settings panel when the speaker mentions it.
2. **One timeline for both kinds of footage.** Extend `film.json` with source ranges, font references, and camera and text cues. Keep source time distinct from edited timeline time so titles and captions follow trims. Read existing projects with their saved defaults. Use the existing revision checks and build path for CLI and MCP edits.
3. **Reusable moves on real inputs.** Start with a wide shot into a named control, a title behind the speaker, and a cut from speaker to screen. Save timing, easing, and the target reference so each move can be adapted to another brand or clip.
4. **Preview tied to the edit.** Show frames before, during, and after a key zoom or title, and check the audio around a cut. Cache analysis and cutouts by source and processing settings so an editorial change can reuse them.

## Build order and acceptance

| Milestone | Acceptance |
| --- | --- |
| 1. Named-control zoom | From the bundled `request.fig` and the brief “zoom into Review action,” generate a wide shot followed by a readable close-up without asking for coordinates. The storyboard identifies the actual control layer `0:16`. Change the hold time in the timeline and preview it again. |
| 2. Speech-triggered typography | From a short portrait clip with a false start and a known phrase, generate the transcript and cutout. Trim the false start and trigger a title in the supplied font at the selected word's mapped frame. In the preview and export, the title sits behind the moving speaker and the original voice stays synchronized. A font change reuses the transcript and cutout. |
| 3. Combined pilot | Assemble a short film using the speaker, a real design shot, and one reviewed stock image where it helps the story. Deliver the editable project and an MP4 from the same timeline. Reopen a 0.3 starter project and verify that it still validates and renders with its saved settings. |

## After the first release

- **Capture motion from a live product.** Start with a Playwright flow against a supplied test site. Record the footage with timed clicks, scrolls, target bounds, and before/after screenshots. Use the capture to propose zoom, pan, and hold cues the user can change. [Playwright tracing](https://playwright.dev/docs/trace-viewer) · [Playwright license](https://github.com/microsoft/playwright/blob/main/LICENSE)
- **Bring in authored motion and references.** Read Figma metadata and existing keyframes via `get_metadata` and `get_motion_context`. For a reference clip, describe its camera path, timing, and easing as a reusable move for the user's own assets. [Figma MCP tools](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- **Expand the editing pilot.** Try a second brand, add stock video search and timed B-roll, then consider multi-speaker editing, more reframing options, and handoff to desktop editors. [Pexels video search](https://www.pexels.com/api/documentation/)
- **Plan distribution and integrations.** Scope hosted workspaces, user isolation, uploads, render capacity, and the live Suno handoff as separate milestones. [Current hosting model](CONNECT.md) · [Suno adapter](SUNO.md)

## Compute policy

Use existing transcripts, derived cutouts, and short fixtures for development. Before each compute-heavy validation run, get approval for the exact command, machine, expected duration, cost, and output. Use approved cloud capacity for heavy runs and tear down dedicated workers when they finish. Use the laptop for approved short media smoke tests.
