const OpenAI = require('openai');
const { buildModerationMessages } = require('./prompts/moderationPrompt');
const {
  parseModerationResponse,
  prepareModerationPayload,
  technicalFailure,
} = require('./utils/moderationResponse');

let openaiClient;

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
}

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: getOpenAIKey(),
      timeout: Number(process.env.LLM_TIMEOUT_MS || 20000),
      maxRetries: Number(process.env.LLM_MAX_RETRIES || 1),
    });
  }
  return openaiClient;
}

async function classifyContent({ title, description, content }) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return technicalFailure('BLG_OPENAI_KEY');
  }

  const payload = prepareModerationPayload({ title, description, content });
  const model = process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-4o-mini';

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model,
      messages: buildModerationMessages(payload),
      temperature: 0,
      max_tokens: 180,
      response_format: { type: 'json_object' },
    });

    const text = response?.choices?.[0]?.message?.content || '';
    return parseModerationResponse(text, 'BLG_OPENAI_PARSE');
  } catch (error) {
    console.error('❌ OpenAI moderation error:', error?.message || error);
    return technicalFailure('BLG_OPENAI_CALL');
  }
}

module.exports = {
  provider: 'openai',
  classifyContent,
  isConfigured: () => Boolean(getOpenAIKey()),
};
