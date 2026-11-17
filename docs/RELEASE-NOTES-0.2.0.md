# Video Harness v0.2.0 — developer preview

Build editable product journey films with a coding agent, OpenPencil wireframes and sourced imagery.

Included:

- Project CLI with initialization, timeline validation, storyboards and builds.
- Six Remotion scene types and a complete synthetic 31-second sample.
- OpenPencil node export with strict font checking and provenance.
- Commons image search and optional Pexels support; explicit downloads and source records.
- Four skills for journey direction, image sourcing, wireframe handoff and motion review.
- Optional Suno MCP host adapter with explicit execution and no automatic retry after submission.

Twelve automated tests pass. Local checks cover a clean package install, native OpenPencil export, representative rendered frames, preview startup and audiovisual MP4 smoke exports. See RELEASE-CHECKS.md for exact scope.

This release is a local developer toolkit, not a hosted or autonomous text-to-video service. Suno requires authentication and host integration. Pexels was not tested live; Commons search worked but the live download hit a rate limit. Visual review and rights checks remain part of every real production.
