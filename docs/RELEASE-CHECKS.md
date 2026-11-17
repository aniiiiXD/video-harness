# Release checks — 0.2.0

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

The toolkit is an early local developer release. Structure checks do not certify visual quality, licensing, factual claims or cross-platform behavior. Review a complete real film before relying on it for public delivery.
