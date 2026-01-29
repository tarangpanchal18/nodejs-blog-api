import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const OPENAI_API_KEY = process.env.LLM_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Check your .env file.');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function classifyContent(title, content) {
    const snippet = content.slice(0, 300);

    const prompt = `
    You are a content moderation assistant. Carefully analyze the following blog title and first few lines of content.
    Your task is to determine if the content is **safe** for general audiences. 

    Categories to check:
    1. Adult content (sex, pornography, nudity, sexual guides)
    2. Spam, gibberish, or scammy content (random letters, meaningless text, phishing attempts)

    **Instructions:**
    - Respond **only in valid JSON** using this exact structure:
    {
    "isSafe": true/false,
    "reason": "A concise, professional explanation of why this content is safe or not."
    }
    - Do not include any extra text, markdown, or formatting.
    - Keep the reason professional, clear, and specific to the content.

    Title: "${title}"
    Content: "${snippet}"
    `;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a content moderation assistant.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0,
            max_tokens: 200,
        });

        const text = response.choices?.[0]?.message?.content?.trim();
        // console.log('OpenAI raw response:', text);

        if (!text) {
            console.warn('⚠️ OpenAI returned empty response.');
            return { isSafe: false, reason: 'We are experiencing a technical issue on our end. Please try again later. If the problem persists, contact support for assistance with code BLG_EMPT_RSPNS.' };
        }

        // Try parsing the JSON from OpenAI
        try {
            const result = JSON.parse(text);
            if (typeof result.isSafe === 'boolean' && typeof result.reason === 'string') {
                return result;
            } else {
                console.warn('⚠️ OpenAI JSON does not match expected structure:', text);
                return { isSafe: false, reason: 'We are experiencing a technical issue on our end. Please try again later. If the problem persists, contact support for assistance with code BLG_INVLD_RSPNS1.' };
            }
        } catch {
            console.warn('⚠️ Failed to parse JSON from OpenAI:', text);
            return { isSafe: false, reason: 'We are experiencing a technical issue on our end. Please try again later. If the problem persists, contact support for assistance with code BLG_INVLD_RSPNS2.' };
        }
    } catch (error) {
        console.error('❌ Error during OpenAI call:', error.message);
        return {
            isSafe: false,
            reason:
                'We are experiencing a technical issue on our end. Please try again later. If the problem persists, contact support for assistance with code BLG_INVLD_RSPNS3.',
        };
    }
}
