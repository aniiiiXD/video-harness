# Product journey workspace

Use `.agents/skills/journey-director/SKILL.md` for a new film or narrative revision.
Use the image-sourcing, openpencil-to-film and motion-review skills when those tasks apply.
Use `.agents/skills/talking-head-edit/SKILL.md` for spoken clips, timed captions and titles behind the speaker.
Use `.agents/skills/motion-typography/SKILL.md` to choose and direct type for each film.

Run `vh brief .` when opening or resuming a project. Record the user's request, ask about creative choices that affect the edit, save their answers and leave a progress note after each pass. Use `project_brief_read` and `project_brief_update` over MCP.

`film.json` owns timeline, claims, asset provenance and brand. `src/Scene.jsx` owns scene design. `vh build .` regenerates only `src/timeline.generated.jsx`; edit the manifest or Scene.jsx instead of that generated file. Do not overwrite user-edited scene code during revisions.

This is a synthetic sample until the user supplies their own product facts. Mark concept screens honestly. Build a complete cut before polishing individual scenes. Reuse sources where appropriate, not prior rendered films unless requested. Default to preview; render on request. Do not upload assets, spend provider credits or publish a project merely because an integration is configured.

When connected through MCP, use project_read/project_update with the revision returned by the server. Smallest.ai narration uses tts_prepare, then tts_generate only after the exact generation is authorized. Add completed voice assets to the narration cue array; keep music in audio.asset. Do not edit .harness receipts or claims.
