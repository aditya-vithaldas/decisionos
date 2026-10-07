export const starterPrompts = [
  { id: 'starter-unanswered', title: 'Unanswered prospects', text: 'Find genuine business prospects whose latest message has no later reply from me in the same thread. Show the exact evidence and a suggested next step.', illustrative: true },
  { id: 'starter-followups', title: 'Follow-ups worth checking', text: 'Find business conversations where my latest message has not received a reply and a thoughtful follow-up may be useful. Do not assume urgency or purchase intent.', illustrative: true },
  { id: 'starter-repeat', title: 'Possible repeat business', text: 'Find opportunities to reconnect, only where previous paid work, an order, or a purchase is explicitly evidenced. Show that evidence and do not invent customer history.', illustrative: true },
];
export function checkedPrompt(input) {
  if (typeof input?.title !== 'string' || !input.title.trim() || input.title.length > 80 ||
      typeof input.text !== 'string' || !input.text.trim() || input.text.length > 3000)
    throw Object.assign(new Error('Give your prompt a title (up to 80 characters) and instructions (up to 3,000 characters).'), { status: 400 });
  if (input.search !== undefined && (typeof input.search !== 'string' || input.search.length > 500 || /[\r\n]/.test(input.search)))
    throw Object.assign(new Error('Keep the optional Gmail search under 500 characters on one line.'), { status: 400 });
  return { title: input.title.trim(), text: input.text.trim(), ...(input.search !== undefined ? { search: input.search.trim() } : {}) };
}
