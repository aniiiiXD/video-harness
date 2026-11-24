# Connect an agent

Video Harness exposes MCP tools, resources and a directing prompt. It does not depend on a particular reasoning model. Choose an MCP client that supports the transport you use; client configuration and authentication support differ.

## Local stdio

Install dependencies with `npm ci` in a Git checkout or `npm install` in an unpacked Video Harness archive. Start the server using a client's MCP configuration:

```json
{
  "mcpServers": {
    "video-harness": {
      "command": "node",
      "args": ["/absolute/path/to/video-harness/bin/vh.mjs", "mcp", "--workspace", "/absolute/path/to/film-workspace"],
      "env": {
        "SMALLEST_API_KEY": "YOUR_OWN_KEY"
      }
    }
  }
}
```

Replace both paths. Supply the API key through your client's secure environment configuration; do not commit it. Omit the key for visual work. Stdout contains only protocol messages.

## Remote Streamable HTTP

On a persistent Node.js 22+ host:

```sh
export VIDEO_HARNESS_WORKSPACE=/persistent/film-workspace
export VIDEO_HARNESS_TOKEN="$(openssl rand -hex 32)"
node bin/vh.mjs serve --workspace "$VIDEO_HARNESS_WORKSPACE" --port 8787
```

The endpoint is `/mcp`. A client with custom HTTP header support connects using:

```json
{
  "mcpServers": {
    "video-harness": {
      "url": "https://YOUR_HOST/mcp",
      "headers": {"Authorization": "Bearer YOUR_PRIVATE_SERVER_TOKEN"}
    }
  }
}
```

This URL is an example, not an existing hosted service. Terminate HTTPS at a reverse proxy and preserve the Authorization header. Default binding is loopback. For a container, use `--host 0.0.0.0`, set `VIDEO_HARNESS_ALLOWED_HOSTS` to the comma-separated request hostnames, and restrict direct access to the HTTP port. Browser requests with an Origin are rejected unless the exact origin appears in `VIDEO_HARNESS_ALLOWED_ORIGINS`. No wildcard CORS is enabled. HTTP request bodies are limited to 100 KB.

All authenticated clients share one trusted workspace and the host's provider account. This is an operator/team server, **not a public multi-tenant SaaS**. A customer-facing deployment still needs per-user authorization, isolated storage and workers, quotas/billing and provider credential isolation. Clients requiring OAuth discovery cannot connect using this static-bearer example. Do not give this shared token to untrusted customers.

Run one server process per workspace. Mutation locks and the single render worker are process-local; multiple replicas are not supported. Speech claims persist on disk and prevent resubmission even after a restart. Preserve the workspace volume, including `.harness/`.

## Make a film from a repository

Give the coding agent the Video Harness checkout and the product repository or site URL. It can read [AGENTS.md](../AGENTS.md) and use the CLI, or call the `direct-film` prompt through MCP. For custom scenes and locally staged captures, the agent needs access to the film project on the host.

> Make a 30-second product walkthrough from the repository I give you. Show one real workflow and its result. Use Video Harness to build the edit, export the MP4, and fix any readability issues you see in the exported frames. Leave the timeline editable.

For LTX footage, give the agent access to the working ComfyUI workflow, Python command, or hosted connection. It can use `video-harness://skills/ltx-footage` to direct a shot, run the available pipeline, import the resulting MP4, and review the cut. Finished LTX clips can start at import. [LTX Footage skill](../skills/ltx-footage/SKILL.md)

After export, use `review_frame` with `projectId` and `atSeconds` for a JPEG that a vision-capable client can inspect. The host needs FFmpeg. Sample text at peak zoom, check both sides of cuts, and revisit timestamps after revisions. Local agents can also extract a frame with the CLI.

```sh
node bin/vh.mjs review-frame ./my-product-film --at 8.5 --out ./my-product-film/out/review-8.5.jpg
```

Keep the requested MP4, `film.json`, scene source, and source assets together so another agent can revise the cut. [Motion Review skill](../skills/motion-review/SKILL.md)

## Available workflow

1. Read `video-harness://skills/journey-director`, or use the `direct-film` prompt with a brief.
2. Use `project_read` to find an existing project by ID. `project_create` makes a starter film when a project is new.
3. Read the saved direction with `project_brief_read`. Use `project_brief_update` to record the request, look, format and progress as the user directs the edit. Replace the concept with the user's story using `project_update` and the revision returned by `project_read`.
4. Use `images_search` and `image_fetch`, or `asset_import` for project-relative files staged on the host. `design_export` exports a selected OpenPencil node through the installed host CLI. This release has no remote file-upload endpoint.
5. `project_storyboard` returns exact frame ranges; `project_build` regenerates sequences. Custom component authoring is still done in the project's source through a coding agent with host access. MCP editing currently covers the manifest, not arbitrary source code.
6. For voice, use `tts_voices`, `tts_prepare`, `tts_generate`, `tts_status`. See [Smallest.ai](SMALLEST.md). No synthesis happens during project creation or preparation.
7. `render_start` with `kind: "setup"` installs renderer dependencies. With `kind: "render"` it exports the full MP4. These require explicit host-work authorization. Poll `render_status` for progress. One setup or render job can run at a time and holds the project's timeline and asset mutation lock until it finishes.
8. The completed output is `out/film.mp4` inside the project. HTTP clients can download `/projects/PROJECT_ID/film.mp4` using the same bearer token. The route is authenticated and supports normal file serving; do not embed the private token in a public URL.

Render job records persist, but jobs are not a durable distributed queue. A server restart reports unfinished jobs as `unknown`; inspect the host before resubmitting. This release does not support worker cancellation through MCP. Source changes made outside the server are not covered by mutation locks.

The skills are exposed as MCP resources. Read `video-harness://skills/motion-typography` for directing and setting type. Read `video-harness://skills/talking-head-edit` for timed captions, titles behind the face, and a local rendering workflow. The existing Suno adapter accepts an independently authenticated MCP client; this server does not yet proxy Suno sign-in or music tools.

Use `fonts_search` with a mood or a text role to search the local catalog. Set `provider` to `google` for live family discovery, with an optional Google category such as `/Expressive/Calm` or a language tag such as `en_Latn`. Use `font_fetch` with a catalog ID to import one verified font with its OFL notice into the project. [Google Design MCP search](https://developers.google.com/design-mcp/reference/mcp/tools_list/search_fonts)
