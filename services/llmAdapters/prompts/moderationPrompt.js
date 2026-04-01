const MODERATION_SYSTEM_PROMPT = [
  'You are a strict blog moderation assistant.',
  'You evaluate title, description, and content snippet for policy safety.',
  'Return only valid JSON and no markdown.',
].join(' ');

function buildModerationUserPrompt({ title, description, contentSnippet }) {
  return `Evaluate whether this blog is safe for a general audience.

Reject if you detect:
1) Adult sexual content, explicit nudity, pornography, sexual services, fetish content.
2) Spam or scam patterns, phishing, fraud attempts, obvious gibberish or meaningless text.

Rules:
- Be conservative. If uncertain, mark unsafe.
- Treat random or machine-like nonsensical text as unsafe.
- Keep reason concise and professional (max ~200 chars).

Return exact JSON shape:
{"isSafe": true|false, "reason": "string"}

Title: ${JSON.stringify(title)}
Description: ${JSON.stringify(description)}
ContentSnippet: ${JSON.stringify(contentSnippet)}`;
}

function buildModerationMessages(payload) {
  return [
    { role: 'system', content: MODERATION_SYSTEM_PROMPT },
    { role: 'user', content: buildModerationUserPrompt(payload) },
  ];
}

module.exports = {
  buildModerationMessages,
  buildModerationUserPrompt,
  MODERATION_SYSTEM_PROMPT,
};
