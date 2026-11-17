# Suno adapter

Use the [official Suno MCP](https://suno.com/mcp) at `https://api.suno.com/mcp`. For Codex:

```sh
codex mcp add suno --url https://api.suno.com/mcp
codex mcp login suno
```

Adding the server may start OAuth automatically. The user signs in and authorizes access. Registration is not proof of authentication. Suno operations use the connected account's credits and library. Do not put account credentials or tokens in a film project or shared archive.

`adapters/suno.mjs` takes a host-supplied authenticated MCP client implementing `listTools()` and `callTool()`. The CLI does not yet connect this adapter to its renderer; use the configured MCP through the coding agent, or integrate the class into a host. Actual tool names/schemas must be discovered after authentication; tests use synthetic names.

```js
const suno = new SunoAdapter(authenticatedMcpClient);
const tools = await suno.discover();
const plan = await suno.prepare({toolName, args, purpose:'One instrumental candidate'});
// Host displays the exact operation and gets approval.
const receipt = await suno.execute(plan.id, {approved:true});
```

Preparation calls only tool discovery. Execution verifies the tool schema and never automatically retries a submitted operation. A network failure can mean a paid generation was accepted: status becomes unknown and the user must inspect their library before retrying. Plan state is in memory, so a production host needs a durable operation journal across restarts. No provider-enforced budget or idempotency guarantee is implied.

Tool results remain raw until a live contract is inspected. Status polling, downloads and music selection are host responsibilities. Import a selected audio file with `vh import film track.wav --id score --kind audio --source "Suno track URL" --license "Your applicable usage rights"`, then set `audio: {"asset":"score"}` in the manifest. Preserve plan/track provenance and confirm commercial-use rights before public delivery.
