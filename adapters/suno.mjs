import {createHash} from 'node:crypto';

export const SUNO_ENDPOINT = 'https://api.suno.com/mcp';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Host supplies an authenticated MCP Client (listTools/callTool).
 * OAuth and token storage belong to the host, never the film project.
 * Tool names and input schemas are discovered, not guessed.
 */
export class SunoAdapter {
  #client;
  #plans = new Map();

  constructor(client) {
    if (!client?.listTools || !client?.callTool) throw new TypeError('An authenticated MCP client is required');
    this.#client = client;
  }

  async discover() {
    const tools = [];
    let cursor;
    const seen = new Set();
    do {
      const page = await this.#client.listTools(cursor ? {cursor} : {});
      tools.push(...page.tools);
      cursor = page.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error('Repeated MCP pagination cursor');
      if (cursor) seen.add(cursor);
    } while (cursor);
    if (new Set(tools.map(t => t.name)).size !== tools.length) throw new Error('Duplicate MCP tool names');
    return tools;
  }

  /** Prepare one exact tool call after inspecting discover(). No generation occurs.
   * Arguments must follow that tool's advertised schema; the provider validates them.
   * Keep credit estimates in the host UI; do not invent a price from the tool name.
   */
  async prepare({toolName, args, purpose}) {
    if (!purpose?.trim()) throw new Error('Describe the intended operation');
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new TypeError('args must be an object');
    const tool = (await this.discover()).find(t => t.name === toolName);
    if (!tool) throw new Error(`Suno does not advertise tool: ${toolName}`);
    const plan = structuredClone({provider:'suno', endpoint:SUNO_ENDPOINT, toolName, args, purpose,
      toolSchema:tool.inputSchema, effect:'May spend credits or change your Suno library; review the selected tool.'});
    const id = digest(plan);
    // Duplicate preparation must not reset a submitted request's execution state.
    if (!this.#plans.has(id)) this.#plans.set(id, {plan, state:'prepared'});
    return {id, ...structuredClone(plan)};
  }

  /** Approval belongs to the reviewed plan ID. Never automatically retry a tool call:
   * a lost response may still mean a paid generation was accepted by Suno.
   */
  async execute(planId, {approved = false} = {}) {
    if (!approved) throw new Error('Approve the exact prepared operation before executing');
    const item = this.#plans.get(planId);
    if (!item || item.state !== 'prepared') throw new Error('Unknown or already submitted plan');
    item.state = 'checking';
    try {
      const live = (await this.discover()).find(t => t.name === item.plan.toolName);
      if (!live || digest(live.inputSchema) !== digest(item.plan.toolSchema)) {
        item.state = 'invalidated';
        throw new Error('Provider tool schema changed; prepare and review a new operation');
      }
    } catch (error) {
      if (item.state === 'checking') item.state = 'prepared';
      throw error;
    }
    item.state = 'submitted';
    try {
      const result = await this.#client.callTool({name:item.plan.toolName, arguments:structuredClone(item.plan.args)});
      item.state = result.isError ? 'provider-error' : 'returned';
      return {planId, state:item.state, result};
    } catch {
      item.state = 'unknown';
      throw new Error('Suno response unavailable; outcome unknown. Check your library before trying again.');
    }
  }

  status(planId) { return this.#plans.get(planId)?.state ?? 'missing'; }
}
