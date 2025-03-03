import express from "express";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { TextLoader } from "langchain/document_loaders/fs/text";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv";
import cors from 'cors';
import { createClient as createContentfulClient } from 'contentful';
import gtts from 'gtts';
import fileUpload from 'express-fileupload';

import { BufferMemory } from "langchain/memory";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure CORS with specific options
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://zabbot-git-main-zabbot.vercel.app', 'https://zabbot.vercel.app']
    : 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const memory = new BufferMemory();

const contentfulClient = createContentfulClient({
  space: process.env.VITE_CONTENTFUL_SPACE_ID,
  accessToken: process.env.VITE_CONTENTFUL_ACCESS_TOKEN
});

// Add a simple in-memory cache for embeddings and responses
const queryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Add TTS cache
const ttsCache = new Map();
const TTS_CACHE_SIZE_LIMIT = 100; // Maximum number of cached TTS responses
const TTS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

async function ensureSourceColumn() {
  const { error } = await supabase.rpc('add_source_column_if_not_exists');
  if (error) {
    console.error('Error ensuring source column:', error);
  }
}

async function initializeEmbeddings() {
  try {
    await ensureSourceColumn();
    
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
      .limit(1);

    if (!existingDocs?.length) {
      console.log('Generating initial embeddings...');
      await generateAndStoreEmbeddings();
      console.log('Initial embeddings generated successfully');
    } else {
      console.log('Embeddings already exist in the database');
    }
  } catch (error) {
    console.error('Error initializing embeddings:', error);
  }
}

app.post("/embed", async (req, res) => {
  try {
    await generateAndStoreEmbeddings();
    res.status(200).json({ message: "Successfully Embedded" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error occurred" });
  }
});

app.post("/query", async (req, res) => {
  try {
    const { query } = req.body;
    const result = await handleQuery(query);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error occurred" });
  }
});

app.post("/embed-blog", async (req, res) => {
  try {
    console.log('Starting blog embedding process...');
    
    // Get blog posts from Contentful
    const blogPosts = await getBlogPosts();
    console.log(`Found ${blogPosts.length} blog posts`);

    // Process each blog post
    const promises = blogPosts.map(async (post) => {
      const content = `Blog Post: ${post.fields.title}\n${post.fields.content.content
        .map(item => item.content?.map(c => c.value).join(' '))
        .join('\n')}`;
      
      const cleanContent = content.replace(/\n/g, " ");

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: cleanContent,
      });

      const [{ embedding }] = embeddingResponse.data;

      // Store in Supabase
      const { error } = await supabase.from("documents").insert({
        content: cleanContent,
        embedding,
        source: `blog-${post.sys.id}`
      });

      if (error) {
        console.error(`Error storing blog post ${post.sys.id}:`, error);
        throw error;
      }

      console.log(`Successfully embedded blog post: ${post.fields.title}`);
    });

    await Promise.all(promises);
    res.status(200).json({ 
      message: "Successfully embedded blog posts",
      count: blogPosts.length
    });
  } catch (error) {
    console.error('Error in blog embedding:', error);
    res.status(500).json({ 
      message: "Error embedding blog posts",
      error: error.message 
    });
  }
});

async function getBlogPosts() {
  const response = await contentfulClient.getEntries({
    content_type: 'universityBlog',
    include: 2,
  });
  return response.items;
}

async function generateAndStoreEmbeddings() {
  // First handle markdown file
  const filePath = path.join(__dirname, "../data/rag_Data.md");
  const loader = new TextLoader(filePath);
  const docs = await loader.load();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const markdownChunks = await textSplitter.splitDocuments(docs);

  // Get blog posts
  const blogPosts = await getBlogPosts();
  
  // Combine markdown chunks and blog posts
  const allContent = [
    ...markdownChunks.map(chunk => ({
      content: chunk.pageContent,
      source: 'markdown'
    })),
    ...blogPosts.map(post => ({
      content: `Blog Post: ${post.fields.title}\n${post.fields.content.content
        .map(item => item.content?.map(c => c.value).join(' '))
        .join('\n')}`,
      source: 'blog'
    }))
  ];

  const promises = allContent.map(async ({ content, source }) => {
    const cleanContent = content.replace(/\n/g, " ");

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanContent,
    });

    const [{ embedding }] = embeddingResponse.data;

    const { error } = await supabase.from("documents").insert({
      content: cleanContent,
      embedding,
      source
    });

    if (error) {
      throw error;
    }
  });

  await Promise.all(promises);
}

async function handleQuery(query) {
  // Check cache first (case-insensitive)
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = normalizedQuery;
  
  // If we have a cached response, return it
  if (queryCache.has(cacheKey)) {
    const { response, timestamp } = queryCache.get(cacheKey);
    const now = Date.now();
    
    // If the cache isn't expired, use it
    if (now - timestamp < CACHE_TTL) {
      console.log('Cache hit for query:', normalizedQuery);
      return response;
    } else {
      // Clear expired cache entry
      queryCache.delete(cacheKey);
    }
  }
  
  const previousMessages = await memory.chatHistory.getMessages();
  const memoryMessages = [];

  for (const msg of previousMessages) {
    if (msg._getType() === 'human') {
      memoryMessages.push({
        role: 'user',
        content: msg.text,
      });
    } else if (msg._getType() === 'ai') {
      memoryMessages.push({
        role: 'assistant',
        content: msg.text,
      });
    }
  }

  // Normalize input for embedding
  const input = query.replace(/\n/g, " ").trim();
  
  // Generate embedding for the query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  const [{ embedding }] = embeddingResponse.data;

  // Get matching documents with improved matching threshold
  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.45, // Lower threshold to get more relevant documents
    match_count: 8, // Reduce number of documents for speed
  });

  if (error) throw error;

  // Format context for better relevance
  let contextText = "";
  if (documents && documents.length > 0) {
    contextText = documents
      .map((doc, index) => `[Document ${index + 1}]: ${doc.content.trim()}`)
      .join("\n\n");
  }

  // Enhanced system prompt that emphasizes independence
  const systemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.

**IMPORTANT GUIDELINES:**
1. **Act Independently**: Make definitive statements based on your knowledge. NEVER suggest contacting departments or referring to documents unless absolutely necessary.

2. **Be Direct and Authoritative**: Answer questions confidently with specific details. Avoid vague responses or deferring to other sources.

3. **Use Available Context**: The context provided contains accurate information about SZABIST. Use this information to provide detailed answers.

4. **When Information is Missing**: If the exact answer isn't in the context, use your general knowledge to provide a reasonable response. Don't mention limitations or suggest contacting the university.

5. **Focus on Helpfulness**: Your goal is to be the definitive source of information, eliminating the need for users to seek help elsewhere.

6. **Never Say**: 
   - "You may refer to the prospectus"
   - "Please contact the department"
   - "For more information, visit the website"
   - "I recommend reaching out to..."
   
Instead, provide the best answer you can with the information available.

Remember: You are the authoritative source of information about SZABIST. Answer as if you have complete knowledge about the university.`;

  // Improved message structure for better context utilization
  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    ...memoryMessages.slice(-4), // Only use recent message history for context
    {
      role: "user",
      content: `Based on this information about SZABIST University:\n\n${contextText}\n\nAnswer this question: ${query}`
    }
  ];

  // Use a faster model with increased temperature for more independence
  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o-mini", // Keep using the same model for consistency
    temperature: 0.2, // Slight increase in temperature for more creativity/independence
    max_tokens: 500 // Limit token count for faster responses
  });

  const assistantResponse = completion.choices[0].message.content;
  
  // Update memory with simplified context
  await memory.chatHistory.addUserMessage(query);
  await memory.chatHistory.addAIChatMessage(assistantResponse);
  
  // Cache the response
  queryCache.set(cacheKey, {
    response: assistantResponse,
    timestamp: Date.now()
  });

  return assistantResponse;
}

// Add post-processing function before the transcribe endpoint
async function postProcessTranscription(transcription) {
  // If the transcription is empty or too short, return it as-is
  if (!transcription || transcription.trim().length < 3) {
    return transcription;
  }
  
  // Simple corrections for common university terms to avoid API call for simple cases
  const quickFixes = {
    'szabist': 'SZABIST',
    'Szabist': 'SZABIST',
    'zabbot': 'ZABBOT',
    'Zabbot': 'ZABBOT',
    'computer science': 'Computer Science',
    'bs cs': 'BS CS',
    'ms cs': 'MS CS',
  };
  
  let processedText = transcription;
  
  // Apply quick fixes
  for (const [term, replacement] of Object.entries(quickFixes)) {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    processedText = processedText.replace(regex, replacement);
  }
  
  // Only call the API for longer transcriptions that need more processing
  if (transcription.length > 20 && !Object.keys(quickFixes).some(term => transcription.toLowerCase().includes(term.toLowerCase()))) {
    try {
      const systemPrompt = `
        You are ZABBOT, an AI assistant for SZABIST University. Your task is to:
        1. Correct any spelling discrepancies in the transcribed text
        2. Ensure proper capitalization of university-related terms like SZABIST, departments, course names, etc.
        3. Add necessary punctuation such as periods, commas, and capitalization
        4. Maintain the original meaning and intent of the transcription
        5. Format academic terms, course codes, and program names correctly
        Only make these corrections while preserving the original meaning and context.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: processedText
          }
        ],
        max_tokens: 150 // Limit token count for faster processing
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Post-processing error:', error);
      // If the API call fails, return the text with quick fixes applied
      return processedText;
    }
  }

  return processedText;
}

app.post("/transcribe", async (req, res) => {
  let tempFilePath;
  try {
    console.log('Transcribe request received');
    
    // Check if req.files exists
    if (!req.files) {
      console.error('No files object in request');
      return res.status(400).json({ error: 'No files were uploaded. Make sure you have access to your microphone.' });
    }
    
    // Check for audio file
    if (!req.files.audio) {
      console.error('No audio file in request.files');
      return res.status(400).json({ error: 'No audio file received. Please check your microphone permissions.' });
    }

    const audioFile = req.files.audio;
    console.log(`Received audio file: ${audioFile.name}, size: ${audioFile.size} bytes, mimetype: ${audioFile.mimetype}`);
    
    // Check audio file size before processing
    if (audioFile.size > 25 * 1024 * 1024) { // 25MB limit
      console.error('File too large:', audioFile.size);
      return res.status(400).json({ error: 'Audio file too large, please keep recordings under 25MB' });
    }
    
    // Check for tiny files which might indicate recording issues
    if (audioFile.size < 1000) { // Less than 1KB
      console.error('File too small:', audioFile.size);
      return res.status(400).json({ error: 'Audio file too small or empty. Please try recording again.' });
    }
    
    // Generate a unique filename with timestamp
    tempFilePath = path.join('/tmp', `audio-${Date.now()}-${Math.floor(Math.random() * 1000)}.webm`);
    console.log(`Saving to temp file: ${tempFilePath}`);
    
    try {
      await audioFile.mv(tempFilePath);
    } catch (moveError) {
      console.error('Error moving audio file:', moveError);
      return res.status(500).json({ error: `Failed to process audio file: ${moveError.message}` });
    }
    
    console.log('File moved successfully, sending to Whisper API');
    
    // Verify the file exists and is readable
    if (!fs.existsSync(tempFilePath)) {
      console.error('Temp file does not exist after move');
      return res.status(500).json({ error: 'Failed to save audio file' });
    }
    
    // Get file stats
    const stats = fs.statSync(tempFilePath);
    console.log(`Temp file size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      console.error('Temp file is empty');
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ error: 'Audio file is empty' });
    }

    // Create readable stream
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
    });

    // Specify response format as text for faster processing
    let rawTranscription;
    try {
      rawTranscription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        response_format: "text",
        language: "en" // Specify language for faster processing
      });
      console.log('Transcription successful:', rawTranscription);
    } catch (whisperError) {
      console.error('Whisper API error:', whisperError);
      
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      return res.status(500).json({ 
        error: `Transcription failed: ${whisperError.message}`,
        details: whisperError.toString()
      });
    }

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('Temp file deleted');
    }

    // If transcription is empty or too short
    if (!rawTranscription || rawTranscription.trim().length < 2) {
      console.log('Transcription empty or too short');
      return res.status(400).json({ 
        error: 'Could not transcribe audio. Please speak clearly or try typing your question.'
      });
    }

    // Post-process the transcription - run this in parallel with getting the response
    const processTranscriptionPromise = postProcessTranscription(rawTranscription);
    
    // Start getting the chatbot response with the raw transcription to save time
    // We'll use the processed version later when available
    const responsePromise = handleQuery(rawTranscription);
    
    // Wait for both operations to complete
    const [processedTranscription, initialResponse] = await Promise.all([
      processTranscriptionPromise,
      responsePromise
    ]);
    console.log('Both processing steps completed');
    
    // If the processed transcription is significantly different, get a new response
    if (processedTranscription && 
        rawTranscription.length > 10 &&
        levenshteinDistance(rawTranscription, processedTranscription) / rawTranscription.length > 0.3) {
      // If the processed transcription is very different, get a new response
      console.log('Significant difference in transcription, getting updated response');
      const updatedResponse = await handleQuery(processedTranscription);
      
      return res.json({ 
        transcription: processedTranscription,
        response: updatedResponse
      });
    } else {
      // If the processed transcription isn't very different, use the initial response
      console.log('Using initial response with processed transcription');
      return res.json({ 
        transcription: processedTranscription || rawTranscription,
        response: initialResponse
      });
    }
  } catch (error) {
    console.error('Transcription error:', error);
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temp file deleted after error');
      } catch (cleanupError) {
        console.error('Failed to delete temp file:', cleanupError);
      }
    }
    res.status(500).json({ 
      error: `Voice processing failed: ${error.message}`,
      details: error.stack
    });
  }
});

// Helper function to calculate the Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  // Initialize the matrix
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] !== str2[j - 1] ? 1 : 0;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,        // deletion
        dp[i][j - 1] + 1,        // insertion
        dp[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  
  return dp[m][n];
}

app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    
    // Generate a cache key based on the text and voice
    const voice = req.body.voice || "alloy"; // Default voice if not specified
    const cacheKey = `${voice}:${text}`;
    
    // Check if we have a cached audio for this text
    if (ttsCache.has(cacheKey)) {
      const { audioBuffer, timestamp } = ttsCache.get(cacheKey);
      const now = Date.now();
      
      // If the cache isn't expired, use it
      if (now - timestamp < TTS_CACHE_TTL) {
        console.log('TTS cache hit for:', text.substring(0, 20) + '...');
        res.set('Content-Type', 'audio/mpeg');
        res.set('Cache-Control', 'public, max-age=86400'); // Client-side cache for 1 day
        return res.send(audioBuffer);
      } else {
        // Clear expired cache entry
        ttsCache.delete(cacheKey);
      }
    }
    
    // Generate speech using OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      speed: 1.0 // Slightly increase speed for faster playback
    });

    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    
    // Store in cache
    ttsCache.set(cacheKey, {
      audioBuffer,
      timestamp: Date.now()
    });
    
    // Manage cache size - remove oldest entries if cache gets too large
    if (ttsCache.size > TTS_CACHE_SIZE_LIMIT) {
      const oldestKey = [...ttsCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      ttsCache.delete(oldestKey);
    }
    
    // Set headers for browser caching
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Client-side cache for 1 day
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3035;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeEmbeddings();
});
