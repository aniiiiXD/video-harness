# Connect an agent

Video Harness exposes MCP tools, resources and a directing prompt. It does not depend on a particular reasoning model. Choose an MCP client that supports the transport you use; client configuration and authentication support differ.

## Local stdio

Install the repository dependencies with `npm ci`. Start the server using a client's MCP configuration:

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

## Available workflow

1. Read `video-harness://skills/journey-director`, or use the `direct-film` prompt with a brief.
2. `project_create` makes a complete synthetic starter film. `project_read` returns its manifest and revision.
3. Replace the concept with the user's story using `project_update`. Supply the revision you read; stale or invalid updates are rejected.
4. Use `images_search` and `image_fetch`, or `asset_import` for project-relative files staged on the host. `design_export` exports a selected OpenPencil node through the installed host CLI. This release has no remote file-upload endpoint.
5. `project_storyboard` returns exact frame ranges; `project_build` regenerates sequences. Custom component authoring is still done in the project's source through a coding agent with host access. MCP editing currently covers the manifest, not arbitrary source code.
6. For voice, use `tts_voices`, `tts_prepare`, `tts_generate`, `tts_status`. See [Smallest.ai](SMALLEST.md). No synthesis happens during project creation or preparation.
7. `render_start` with `kind: "setup"` installs renderer dependencies; with `kind: "render"` exports the full MP4. These require explicit host-work authorization. Poll `render_status`; do not repeat the start call to poll. Only one setup/render job can run at a time. Jobs lock project mutations until they finish.
8. The completed output is `out/film.mp4` inside the project. HTTP clients can download `/projects/PROJECT_ID/film.mp4` using the same bearer token. The route is authenticated and supports normal file serving; do not embed the private token in a public URL.

Render job records persist, but jobs are not a durable distributed queue. A server restart reports unfinished jobs as `unknown`; inspect the host before resubmitting. This release does not support worker cancellation through MCP. Source changes made outside the server are not covered by mutation locks.

The four directing/sourcing/design/review skills are exposed as MCP resources. The existing Suno adapter accepts an independently authenticated MCP client; this server does not yet proxy Suno sign-in or music tools.
