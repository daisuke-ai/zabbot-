// Backend server for ZABBOT AI Assistant - v1.0.2 (No Auth)
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
import os from 'os';

import { BufferMemory } from "langchain/memory";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// --- Environment Variable Checks ---
const requiredEnv = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  // 'VITE_CONTENTFUL_SPACE_ID', // Optional, if Contentful is not always used
  // 'VITE_CONTENTFUL_ACCESS_TOKEN', // Optional
];

requiredEnv.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`ERROR: Environment variable ${envVar} is not set. Please ensure your .env file is correctly configured.`);
    // Optionally, you might want to exit the process here if critical variables are missing
    // process.exit(1);
  }
});
// --- End Environment Variable Checks ---

const app = express();

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Define allowed origins using environment variables for flexibility
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://zabbot-git-main-zabbot.vercel.app', 'https://zabbot.vercel.app', frontendUrl]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

// Configure CORS with specific options
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
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
const TTS_CACHE_SIZE_LIMIT = 100;
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

// Regular query endpoint (non-streaming) - FIXED
app.post("/query", async (req, res) => {
  try {
    console.log("--- Hit /query endpoint ---");
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log("[Query Endpoint] Processing query:", query);
    
    // No authentication - always process as public query
    const responseContent = await handleQuery(query, null);
    
    console.log("[Query Endpoint] Response generated:", responseContent ? "Success" : "Failed");
    
    if (!responseContent) {
      return res.status(500).json({ error: "Failed to generate response" });
    }
    
    res.json({ response: responseContent });
  } catch (error) {
    console.error('Query error caught in endpoint:', error);
    res.status(500).json({ error: error.message || "An unknown error occurred." });
  }
});

// Streaming query endpoint - FIXED
app.post("/query-stream", async (req, res) => {
  try {
    console.log("--- Hit /query-stream endpoint ---");
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log("[Query Stream Endpoint] Processing query:", query);

    // Set appropriate headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Get embedding for the query
    const input = query.replace(/\n/g, " ").trim();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    const [{ embedding }] = embeddingResponse.data;

    // Get matching documents
    const { data: documents, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: 0.45,
      match_count: 8,
    });

    if (error) throw error;

    // Format context
    let contextText = "";
    if (documents && documents.length > 0) {
      contextText = documents
        .map((doc, index) => `[Document ${index + 1}]: ${doc.content.trim()}`)
        .join("\n\n");
    }

    const systemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.

**IMPORTANT GENERAL GUIDELINES:**
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

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Answer this question: ${query}\n\nRelevant university information:\n${contextText}` }
      ],
      temperature: 0.2,
      stream: true,
    });

    // Stream the response to the client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(content);
      }
    }
    
    // End the response
    res.end();
  } catch (error) {
    console.error('Streaming query error:', error);
    // If headers haven't been sent yet, send error as JSON
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
    // If headers already sent, end the stream with error message
    res.write(`\n\nError: ${error.message}`);
    res.end();
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

      // Generate a unique ID for the document
      const uniqueId = Date.now() + "-" + Math.random().toString(36).substring(2, 10);

      // Store in Supabase
      const { error } = await supabase.from("documents").insert({
        id: uniqueId,
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

// New endpoint for embedding arbitrary text from PM Dashboard
app.post("/api/embed-text", async (req, res) => {
  try {
    const { text } = req.body;
    console.log('[API/Embed-Text] Request received. Checking text content...'); // Added log

    if (!text || text.trim().length === 0) {
      console.warn('[API/Embed-Text] Validation failed: Text content is empty.'); // Changed to warn
      return res.status(400).json({ error: "Text content is required for embedding." });
    }

    console.log(`[API/Embed-Text] Text length: ${text.length}. Preparing content for embedding.`); // Added log

    const cleanContent = text.replace(/\n/g, " ").trim();

    if (cleanContent.length === 0) {
      console.warn('[API/Embed-Text] Validation failed: Cleaned text content is empty.'); // Changed to warn
      return res.status(400).json({ error: "Cleaned text content is empty." });
    }

    console.log('[API/Embed-Text] Attempting to generate embedding with OpenAI...'); // Added log
    // Generate embedding for the text
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanContent,
    });
    const [{ embedding }] = embeddingResponse.data;
    console.log('[API/Embed-Text] Embedding generated successfully. Storing in Supabase...'); // Added log

    // Generate a unique ID for the document
    const uniqueId = `pm-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Store in Supabase
    const { error } = await supabase.from("documents").insert({
      id: uniqueId,
      content: cleanContent,
      embedding,
      source: 'pm-training' // Identify source as PM training data
    });

    if (error) {
      console.error("[API/Embed-Text] Supabase insert error:", error); // Added log
      throw error;
    }

    console.log(`[API/Embed-Text] Successfully embedded and stored text with ID: ${uniqueId}. Sending success response.`); // Added log
    res.status(200).json({ message: "Text successfully embedded and stored for RAG assistant." });

  } catch (error) {
    console.error("[API/Embed-Text] Caught unhandled error:", error); // Added log
    res.status(500).json({ error: error.message || "An unexpected error occurred while embedding text." }); // Improved error message
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

  const promises = allContent.map(async ({ content, source }, index) => {
    const cleanContent = content.replace(/\n/g, " ");

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanContent,
    });

    const [{ embedding }] = embeddingResponse.data;

    // Generate a unique ID for the document with index to ensure uniqueness in parallel operations
    const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 10)}`;

    const { error } = await supabase.from("documents").insert({
      id: uniqueId,
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

// SIMPLIFIED handleQuery function - NO AUTH
async function handleQuery(query, verifiedUser = null) {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = normalizedQuery;
    
    if (queryCache.has(cacheKey)) {
      const { response, timestamp } = queryCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('Cache hit for query:', normalizedQuery);
        return response;
      }
      queryCache.delete(cacheKey);
    }
    
    const previousMessages = await memory.chatHistory.getMessages();
    const memoryMessages = previousMessages.map(msg => ({
      role: msg._getType() === 'human' ? 'user' : 'assistant',
      content: msg.text || msg.content,
    }));

    const input = query.replace(/\n/g, " ").trim();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    const [{ embedding }] = embeddingResponse.data;

    let documents;
    try {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.45,
        match_count: 8,
      });
      if (error) throw error;
      documents = data;
    } catch (err) {
      console.error("Error matching documents:", err);
      throw new Error("Failed to retrieve relevant documents.");
    }

    let contextText = "";
    if (documents && documents.length > 0) {
      contextText = documents
        .map((doc, index) => `[Document ${index + 1}]: ${doc.content.trim()}`)
        .join("\n\n");
    }

    const systemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.

**IMPORTANT GENERAL GUIDELINES:**
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

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...memoryMessages.slice(-4),
      {
        role: "user",
        content: `Answer this question: ${query}\n\nRelevant university information:\n${contextText}`
      }
    ];

    let completion;
    try {
      completion = await openai.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 500
      });
    } catch (e) {
      console.error("Error with OpenAI completion:", e);
      throw new Error("Failed to get a response from the AI model.");
    }

    const assistantResponse = completion.choices[0].message.content;
    
    if (!assistantResponse) {
      throw new Error("No response generated by AI model");
    }
    
    // Update memory
    await memory.chatHistory.addUserMessage(query);
    await memory.chatHistory.addAIChatMessage(assistantResponse);
    
    // Cache the response
    queryCache.set(cacheKey, {
      response: assistantResponse,
      timestamp: Date.now()
    });

    return assistantResponse;
  } catch (error) {
    console.error("Error in handleQuery:", error);
    throw error;
  }
}

app.post("/transcribe", async (req, res) => {
  let tempFilePath = null;

  try {
    console.log('--- TRANSCRIBE ENDPOINT (No Auth) ---');
    console.log('Transcribe request received. Body keys:', Object.keys(req.body));
    
    if (!req.files || !req.files.audio) {
      console.error('No files object in request');
      return res.status(400).json({ error: 'No files were uploaded. Make sure you have access to your microphone.' });
    }

    const audioFile = req.files.audio;
    console.log(`Received audio file: ${audioFile.name}, size: ${audioFile.size} bytes, mimetype: ${audioFile.mimetype}`);
    
    if (audioFile.size > 25 * 1024 * 1024) { 
      console.error('File too large:', audioFile.size);
      return res.status(400).json({ error: 'Audio file too large, please keep recordings under 25MB' });
    }
    
    if (audioFile.size < 1000) { 
      console.error('File too small:', audioFile.size);
      return res.status(400).json({ error: 'Audio file too small or empty. Please try recording again.' });
    }

    const uniqueFilename = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
    tempFilePath = path.join(os.tmpdir(), uniqueFilename);
    console.log(`Attempting to move uploaded file to: ${tempFilePath}`);

    await audioFile.mv(tempFilePath);
    console.log(`File successfully moved to ${tempFilePath}`);
    
    if (!fs.existsSync(tempFilePath)) {
      console.error(`Temp file does not exist after move: ${tempFilePath}`);
      return res.status(500).json({ error: 'Failed to save temporary audio file' });
    }
    
    const stats = fs.statSync(tempFilePath);
    console.log(`Temp file size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      console.error('Temp file is empty');
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ error: 'Audio file is empty' });
    }

    const fileStream = fs.createReadStream(tempFilePath);

    let rawTranscription;
    try {
      console.log(`Sending to Whisper API...`);
      rawTranscription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        response_format: "text",
        language: "en"
      });
      console.log('Transcription successful:', rawTranscription);
    } catch (whisperError) {
      console.error('Whisper API error:', whisperError);
      return res.status(500).json({ 
        error: `Transcription failed: ${whisperError.message}`,
        details: whisperError.toString()
      });
    } 

    if (!rawTranscription || rawTranscription.trim().length < 2) {
      console.log('Transcription empty or too short');
      return res.status(400).json({ 
        error: 'Could not transcribe audio. Please speak clearly or try typing your question.'
      });
    }

    const processTranscriptionPromise = postProcessTranscription(rawTranscription);
    const responsePromise = handleQuery(rawTranscription, null); // No auth
    const [processedTranscription, initialResponse] = await Promise.all([
      processTranscriptionPromise,
      responsePromise
    ]);
    
    if (processedTranscription && 
        rawTranscription.length > 10 &&
        levenshteinDistance(rawTranscription, processedTranscription) / rawTranscription.length > 0.3) {
      console.log('Significant difference in transcription, getting updated response');
      const updatedResponse = await handleQuery(processedTranscription, null); // No auth
      return res.json({ 
        transcription: processedTranscription,
        response: updatedResponse
      });
    } else {
      console.log('Using initial response with processed transcription');
      return res.json({ 
        transcription: processedTranscription || rawTranscription,
        response: initialResponse
      });
    }
  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({ 
      error: `Voice processing failed. Please try again later.`,
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Temp file deleted: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`Failed to delete temp file: `, cleanupError);
      }
    }
  }
});

// Helper function to calculate the Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] !== str2[j - 1] ? 1 : 0;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  return dp[m][n];
}

async function postProcessTranscription(transcription) {
  if (!transcription || transcription.trim().length < 3) {
    return transcription;
  }
  
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
  
  for (const [term, replacement] of Object.entries(quickFixes)) {
    const regex = new RegExp(`\\b${term}\\b`, 'g');
    processedText = processedText.replace(regex, replacement);
  }
  
  if (transcription.length > 20 && !Object.keys(quickFixes).some(term => transcription.toLowerCase().includes(term.toLowerCase()))) {
    try {
      const systemPrompt = `You are ZABBOT, an AI assistant for SZABIST University. Your task is to:
1. Correct any spelling discrepancies in the transcribed text
2. Ensure proper capitalization of university-related terms like SZABIST, departments, course names, etc.
3. Add necessary punctuation such as periods, commas, and capitalization
4. Maintain the original meaning and intent of the transcription
5. Format academic terms, course codes, and program names correctly
Only make these corrections while preserving the original meaning and context.`;

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
        max_tokens: 150
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Post-processing error:', error);
      return processedText;
    }
  }

  return processedText;
}

app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    
    // FIX: Add better validation and type checking
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }
    
    // Ensure text is a string
    let textToProcess;
    if (typeof text === 'string') {
      textToProcess = text;
    } else if (typeof text === 'object') {
      // If it's an object, try to extract meaningful text
      textToProcess = text.response || text.message || JSON.stringify(text);
    } else {
      textToProcess = String(text);
    }
    
    if (!textToProcess.trim()) {
      return res.status(400).json({ error: 'Text content is empty' });
    }
    
    // Clean the text for TTS (remove markdown, limit length)
    const cleanText = textToProcess
      .replace(/[*#_`\[\]]/g, '') // Remove markdown characters
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 4000); // Limit length for TTS
    
    if (!cleanText) {
      return res.status(400).json({ error: 'No valid text content after cleaning' });
    }
    
    console.log('TTS processing text:', cleanText.substring(0, 100) + '...');
    
    const voice = req.body.voice || "alloy";
    const cacheKey = `${voice}:${cleanText}`;
    
    // Check cache
    if (ttsCache.has(cacheKey)) {
      const { audioBuffer, timestamp } = ttsCache.get(cacheKey);
      const now = Date.now();
      
      if (now - timestamp < TTS_CACHE_TTL) {
        console.log('TTS cache hit');
        res.set('Content-Type', 'audio/mpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(audioBuffer);
      } else {
        ttsCache.delete(cacheKey);
      }
    }
    
    // Generate TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: cleanText,
      speed: 1.0
    });

    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    
    // Cache the result
    ttsCache.set(cacheKey, {
      audioBuffer,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (ttsCache.size > TTS_CACHE_SIZE_LIMIT) {
      const oldestKey = [...ttsCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      ttsCache.delete(oldestKey);
    }
    
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ 
      error: 'TTS generation failed', 
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3035;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeEmbeddings();
});