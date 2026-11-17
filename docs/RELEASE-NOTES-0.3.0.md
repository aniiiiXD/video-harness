# 0.3.0 — Connectable tools and narration

Adds an MCP server so compatible agents can work with the same film projects through stdio or authenticated Streamable HTTP. Sixteen tools cover project editing, storyboards, image sourcing, design export, prepared narration and setup/render jobs. Four portable skills are available as resources, with a directing prompt.

Smallest.ai is the first TTS provider. It uses the Pro voice catalog, stores exact generation plans and persistent receipts, and imports measured WAV audio without automatically retrying uncertain submissions. Narration cues are independent of the existing music bed. Suno remains a separate host adapter.

Project revisions prevent stale edits. Host jobs serialize renderer work. This remains a trusted single-workspace server: there is no public service, customer isolation, OAuth onboarding or remote upload interface yet. Live Smallest.ai generation has not been verified. See [connection instructions](CONNECT.md), [narration](SMALLEST.md) and [validation evidence](RELEASE-CHECKS.md).

Existing custom scene files are preserved. To play new narration cues in an older project, merge the updated Soundtrack component from the template; a manifest update alone cannot update custom source.
