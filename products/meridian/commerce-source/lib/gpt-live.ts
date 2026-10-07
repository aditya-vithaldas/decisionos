import { instructions, searchTool } from './live';
import { productDetailsTool } from './product-context';

export const voiceInstructions = `You are Loop, an electronics shopping companion. Speak ONLY English, regardless of the user's language. Keep answers to one or two short sentences, at most 40 words. Delegate every product search, refinement, comparison, feature question and review question to the backend. Delegate requests to open a product's full details, go back to results, or stop listening too. When a product page is open, unqualified questions such as 'does it have Wi-Fi?' refer to that product. Never guess product facts or numbers. Use the backend's numbered products and sample reviews. Let the user interrupt or add details while you work. Wait for the user's request before speaking. Do not narrate a list of every result; give a brief useful answer. The interface displays your spoken transcript, so keep it concise.`;
export const openProductTool = {
  ...productDetailsTool,
  name: 'open_product',
  description:
    'Open the full product page without ending the live conversation. Use when the user asks to open, show, or get the details of a product. Resolve a single displayed number or model name; ask which product if ambiguous. The opened product becomes number 1 in the detail view.',
};
export const closeProductTool = {
  type: 'function',
  name: 'close_product',
  description:
    'Return from the product detail page to the search results while staying live.',
  parameters: { type: 'object', properties: {}, additionalProperties: false },
};
export const liveSession = {
  model: 'gpt-live-1',
  instructions: voiceInstructions,
  audio: { output: { voice: 'marin' } },
  delegation: {
    type: 'responses',
    responses: {
      model: 'gpt-5.6-terra',
      instructions: `You run the catalog backend for Loop. Use the tools to search or retrieve current product context on every new request. Return concise facts for the voice companion, including displayed product numbers. Use open_product when asked to get/show details or go inside a product. Use get_product_details for specific questions about its features and reviews. Use close_product to go back. When a detail page is open, it contains one product, numbered 1; pronouns refer to that product. For ambiguous open requests ask which product. After receiving tool results, answer directly without repeating the same lookup.\n${instructions.slice(instructions.indexOf('SEARCH:'))}`,
      tools: [
        searchTool,
        productDetailsTool,
        openProductTool,
        closeProductTool,
        {
          type: 'function',
          name: 'stop_listening',
          description:
            'Stop listening only when the user explicitly asks to end the voice session.',
          parameters: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
      ],
      tool_choice: 'auto',
      parallel_tool_calls: false,
    },
  },
};

export type LiveFunctionCall = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
};
/** Live wraps Responses events; terminal snapshots omit their output items. */
export class LiveToolBatches {
  private pending = new Map<string, LiveFunctionCall[]>();
  private seen = new Set<string>();
  private activeResponses = new Map<string, string>();
  receive(envelope: any): LiveFunctionCall[] {
    if (envelope.type !== 'response.event') return [];
    const event = envelope.event;
    const delegation = envelope.delegation_id ?? 'manual';
    if (event.type === 'response.created') {
      const id = event.response.id;
      this.activeResponses.set(delegation, id);
      this.pending.set(id, []);
    }
    const key =
      event.response?.id ?? this.activeResponses.get(delegation) ?? delegation;
    if (
      event.type === 'response.output_item.done' &&
      event.item?.type === 'function_call'
    ) {
      const call = event.item as LiveFunctionCall;
      if (!this.seen.has(call.call_id)) {
        this.seen.add(call.call_id);
        this.pending.set(key, [...(this.pending.get(key) ?? []), call]);
      }
    }
    if (
      ['response.failed', 'response.incomplete', 'response.cancelled'].includes(
        event.type,
      )
    ) {
      this.pending.delete(key);
      return [];
    }
    if (event.type !== 'response.completed') return [];
    const calls = this.pending.get(key) ?? [];
    this.pending.delete(key);
    return calls;
  }
}
