# Release checks — 0.3.0

New checks on 2026-11-17:

- Twenty-one automated tests pass. New integration coverage connects official MCP clients over in-memory, actual stdio subprocess and localhost Streamable HTTP transports. Tools and resources are discovered, projects created and edits validated through the protocol.
- HTTP requests without the bearer token fail; hostile browser origins fail. Project traversal/symlink imports and stale manifest revisions are rejected. Non-loopback listening requires an explicit host allowlist.
- Smallest.ai request shape, Pro voice catalog, WAV parsing, approval, persisted receipt recovery and duplicate suppression are tested using synthetic responses. A lost provider response stays unknown and is not automatically retried. Saved audio can finish importing after a restart without calling the provider again.
- Render/setup jobs are tested with a mock runner for authorization, serialization and completion. This does not claim a distributed job queue or worker recovery after a process crash.
- The updated narration component was compiled in a fresh temporary project and rendered into a one-second H.264/AAC export at 480×270 using a synthetic tone, independently of a music bed. Audio was present in the output. This checks renderer wiring, not narration quality.
- `npm audit --omit=dev` reported zero vulnerabilities at the time of testing. Packaging and whitespace checks passed.
- No Smallest.ai generation was performed live and no generation credits were spent. No public MCP deployment exists yet; remote transport was tested on localhost.

Prior 0.2.0 visual/import checks remain relevant below; they were not all repeated for this connector release.

Checked on macOS Apple Silicon with Node 25.8.1 and npm 11.11.0. Other operating systems have not been tested.

- Twelve automated tests pass: project creation/non-overwrite, custom scene preservation, gapless timeline, malformed manifests, evidence/timing/reference errors, path and symlink containment, import provenance, image search parsing, download restrictions and rate-limit behavior, and Suno approval/schema-change/duplicate-submission handling.
- All four SKILL.md files pass the skill format validator.
- The actual npm archive installed into a separate temporary prefix; its executable created and validated a fresh 930-frame / 31-second project and generated a storyboard.
- A fresh renderer dependency installation completed with no npm audit findings at the time of testing.
- Remotion compiled the full six-scene sample; seven frames across the timeline were rendered and visually inspected. Headline wrapping and the screen close-up were corrected and rechecked.
- A two-second H.264 export passed ffprobe: 480×270, exactly 2 seconds. This is an export smoke test, not a full-resolution master or a continuous viewing of the whole film.
- Additional synthetic fixtures rendered metric and video scenes plus a silent WAV audio bed; the audiovisual export completed. These fixtures are not included as stock assets.
- The CLI preview server returned HTTP 200 for the Journey composition and was stopped after testing.
- OpenPencil 0.16.0 imported the original synthetic HTML into a native .fig file. The adapter exported node 0:4 to a 2× PNG, preserving text and source metadata. The image was visually inspected. An initial unavailable Arial font produced missing text; strict font checking now rejects that outcome, and the included native design uses Inter.
- Live Commons search returned twelve candidates with source/author/license metadata. The live image download hit HTTP 429; the adapter reports rate limiting and leaves no partial asset. Successful download/import behavior is tested with a mock HTTP response, not claimed as a successful live download.
- Pexels and Suno generation were not exercised live. No generation credits were spent. Suno still needs an authenticated host/client and live tool discovery.
- Distribution uses the npm file allowlist and checks archive members for private/build directories and machine-specific absolute paths. No Clove media, user credentials or third-party skill packs are included.

The toolkit is an early developer release for a trusted host. Structure checks do not certify visual quality, licensing, factual claims, account isolation or cross-platform behavior. Review a complete real film before relying on it for public delivery.
