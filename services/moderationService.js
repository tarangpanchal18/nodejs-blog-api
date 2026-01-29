// Import the LLM adapter
import * as googleGemini from './llmAdapters/googleGemini.js';
import * as openai from './llmAdapters/openai.js';

/**
 * Checks blog content for safety (adult/spam).
 * @param {string} title
 * @param {string} content
 * @returns {Promise<{isSafe: boolean, reason: string}>}
 */
export async function checkBlogContent(title, content) {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();

    if (provider === 'gemini') {
        return await googleGemini.classifyContent(title, content);
    } else if (provider === 'openai') {
        return await openai.classifyContent(title, content);
    } else {
        throw new Error('LLM_PROVIDER environment variable must be set to "gemini" or "openai"');
    }
}
