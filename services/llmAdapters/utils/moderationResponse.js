const GENERIC_MODERATION_ERROR =
  'We are experiencing a technical issue on our end. Please try again later. If the problem persists, contact support.';

function technicalFailure(code) {
  return {
    isSafe: false,
    reason: `${GENERIC_MODERATION_ERROR} (code: ${code})`,
  };
}

function sanitizeText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLength);
}

function prepareModerationPayload({ title, description, content }) {
  const titleMax = Number(process.env.MODERATION_TITLE_MAX || 250);
  const descriptionMax = Number(process.env.MODERATION_DESCRIPTION_MAX || 700);
  const contentMax = Number(process.env.MODERATION_CONTENT_SNIPPET_MAX || 1400);

  return {
    title: sanitizeText(title, titleMax),
    description: sanitizeText(description, descriptionMax),
    contentSnippet: sanitizeText(content, contentMax),
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const unfenced = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    return null;
  }

  return unfenced.slice(start, end + 1);
}

function parseModerationResponse(rawText, parseFailureCode = 'BLG_PARSE_FAIL') {
  const jsonBlock = extractJsonObject(rawText);
  if (!jsonBlock) {
    return technicalFailure(parseFailureCode);
  }

  try {
    const parsed = JSON.parse(jsonBlock);
    const isSafe = typeof parsed.isSafe === 'boolean' ? parsed.isSafe : null;
    const reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';

    if (isSafe === null || !reason) {
      return technicalFailure(`${parseFailureCode}_SHAPE`);
    }

    return {
      isSafe,
      reason: reason.slice(0, 280),
    };
  } catch {
    return technicalFailure(`${parseFailureCode}_JSON`);
  }
}

module.exports = {
  technicalFailure,
  prepareModerationPayload,
  parseModerationResponse,
};
