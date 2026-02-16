/**
 * AI Blog Seeder
 * - Fetches AI generated cat blog from Gemini
 * - Assigns random user_id
 * - Inserts blog as published
 * - Creates 2–10 AI comments
 * - Uses fixed cat categories as tags
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const User = require('../models/User');

// ---------- CONFIG ----------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash'; // fast + cost efficient

// 20 Controlled Cat Categories (used as tags)
const CAT_CATEGORIES = [
  'cat food',
  'cat breeds',
  'cat grooming',
  'cat health',
  'cat training',
  'cat behavior',
  'kitten care',
  'indoor cats',
  'cat nutrition',
  'cat toys',
  'cat accessories',
  'cat hygiene',
  'cat diet',
  'cat care tips',
  'cat lifestyle',
  'cat facts',
  'cat adoption',
  'cat wellness',
  'cat feeding guide',
  'cat grooming tips',
];

// ---------- DB CONNECTION ----------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ DB Connection Failed:', error.message);
    process.exit(1);
  }
};

// ---------- HELPERS ----------
const getRandomUser = async () => {
  const count = await User.countDocuments({ isActive: true });
  if (!count) throw new Error('No active users found');

  const random = Math.floor(Math.random() * count);
  return User.findOne({ isActive: true }).skip(random).lean();
};

const getRandomCategories = () => {
  // max 5 tags due to schema validation
  const shuffled = [...CAT_CATEGORIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
};

const getRandomImpression = () => {
  return Math.floor(Math.random() * 1000) + 50;
};

// ---------- GEMINI CALL ----------
const generateAIBlog = async () => {
    const prompt = `
        You are a professional pet blog writer specializing in SEO-optimized cat content.
        Generate EXACTLY 3 high-quality, original SEO blogs strictly about cats.
        Return ONLY valid JSON. Do NOT include markdown code blocks, explanations, or any extra text outside JSON.

        JSON structure:
        {
        "blogs": [
            {
            "title": "string (minimum 10 characters, SEO optimized)",
            "description": "SEO meta description between 80 and 160 characters",
            "content": "Markdown formatted blog content (300-600 words). Use proper markdown headings, lists, bold text, and paragraphs. All line breaks must be escaped using \\n",
            "cover_image": "Valid HTTPS image URL related to cats",
            "comments": [
                { "content": "Realistic, human-like short comment (5-20 words)" }
            ]
            }
        ]
        }

        Strict rules:
        - Generate EXACTLY 3 blogs inside the blogs array
        - Topic must be ONLY about cats (breeds, food, grooming, behavior, health, care, etc.)
        - Output must be strictly valid JSON parsable with JSON.parse()
        - Do NOT include HTML tags
        - Do NOT include backticks or code fences
        - Each blog must be unique and not repetitive
        - Generate 2 to 6 natural human-like comments per blog
        - cover_image must be a real HTTPS cat-related image URL
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    
    const response = await axios.post(
        url,
        {
            contents: [
            {
                parts: [{ text: prompt }],
            },
            ],
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 4096,
                response_mime_type: 'application/json',
            },
        },
        {
            params: {
                key: GEMINI_API_KEY, // IMPORTANT: pass key here, not in URL
            },
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        }
    );

    const text =
    response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Step 1: Clean markdown wrappers
    const text =
    response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
    console.error('❌ Empty AI response:', response?.data);
    throw new Error('Empty response from Gemini');
    }

    let parsed;

    // Since we forced application/json, this should work directly
    try {
    parsed = typeof text === 'string' ? JSON.parse(text) : text;
    } catch (err) {
    console.error('❌ Raw AI Response:', text);
    throw new Error('Invalid JSON from Gemini (non-JSON response)');
    }

    // Support multiple formats safely:
    // 1. Direct array -> [blog, blog, blog]
    // 2. Wrapped -> { blogs: [...] }
    // 3. Single object fallback
    const blogsArray = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.blogs)
        ? parsed.blogs
        : [parsed];

    // Normalize for schema safety
    const normalizedBlogs = blogsArray
    .map((blog, index) => {
        if (!blog) return null;

        const safeBlog = {
        title: String(blog.title || '').trim(),
        description: String(
            blog.description || blog.title || ''
        ).trim(),
        content: String(blog.content || ''),
        cover_image: String(blog.cover_image || ''),
        comments: Array.isArray(blog.comments)
            ? blog.comments
                .map((c) => ({
                content: String(c?.content || '').trim(),
                }))
                .filter((c) => c.content.length > 0)
            : [],
        };

        // Hard validation (prevents seeder crash)
        if (!safeBlog.title || !safeBlog.content) {
        console.warn(`⚠️ Skipping invalid blog at index ${index}`);
        return null;
        }

        return safeBlog;
    })
    .filter(Boolean);

    if (normalizedBlogs.length === 0) {
    console.error('❌ Parsed AI Output:', parsed);
    throw new Error('No valid blogs generated from Gemini');
    }

    return normalizedBlogs;
};

// ---------- UNIQUE SLUG ----------
const generateUniqueSlug = async (title) => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (await Blog.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
};

// ---------- CREATE COMMENTS ----------
const createComments = async (blogId, aiComments, users) => {
  if (!Array.isArray(aiComments) || aiComments.length === 0) return;

  const limitedComments = aiComments.slice(0, 10);
  const commentsToInsert = [];

  for (const c of limitedComments) {
    const randomUser = users[Math.floor(Math.random() * users.length)];

    commentsToInsert.push({
      blog_id: blogId,
      user_id: randomUser._id,
      content: c.content?.slice(0, 500) || 'Great blog!',
      status: 'active',
      depth: 0,
    });
  }

  if (commentsToInsert.length) {
    await Comment.insertMany(commentsToInsert);
    console.log(`💬 ${commentsToInsert.length} comments created`);
  }
};

// ---------- MAIN SEEDER ----------
const runSeeder = async () => {
    try {
        console.log('🚀 Starting AI Blog Seeder...');

        if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY missing in .env');
        }

        const aiBlogs = await generateAIBlog();

        // Validate array response
        if (!Array.isArray(aiBlogs) || aiBlogs.length === 0) {
            throw new Error('Invalid AI blogs structure');
        }

        // Step 2: Get Random User (reuse for performance)
        const randomUser = await getRandomUser();

        // Step 3: Fetch multiple users for comments pool (fetch once)
        const users = await User.find({ isActive: true })
        .select('_id')
        .limit(20)
        .lean();

        for (const aiData of aiBlogs) {
            // Safety validation per blog
            if (!aiData?.title || !aiData?.content) {
                console.warn('⚠️ Skipping invalid AI blog');
                continue;
            }

            // Step 4: Get Tags (Cat Categories)
            const tags = getRandomCategories();

            // Step 5: Generate Unique Slug per blog
            const slug = await generateUniqueSlug(aiData.title);

            // Step 6: Create Blog
            const blog = await Blog.create({
                title: aiData.title,
                description: aiData.description || aiData.title,
                content: aiData.content,
                cover_image: aiData.cover_image || '',
                slug,
                user_id: randomUser._id,
                tags,
                status: 'published', // direct publish
                impression: getRandomImpression(),
            });

            console.log(`📝 Blog created: ${blog.title}`);

            // Step 7: Create Comments (per blog)
            await createComments(blog._id, aiData.comments || [], users);
        }

        console.log(`✅ AI Blog Seed Completed Successfully (${aiBlogs.length} blogs)`);
        process.exit(0);
    } catch (error) {
        console.error('❌ AI Blog Seeder Error:', error.message);
        process.exit(1);
    }
};

// ---------- EXECUTE ----------
(async () => {
  await connectDB();
  await runSeeder();
})();
