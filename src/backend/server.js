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

app.use(cors({ origin: '*' }));
app.use(fileUpload());

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

  
  const input = query.replace(/\n/g, " ");
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  const [{ embedding }] = embeddingResponse.data;

  
  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 10,
  });

  if (error) throw error;

  let contextText = "";
  contextText += documents
    .map((document) => `${document.content.trim()}---\n`)
    .join("");

 
  const messages = [
    {
      role: "system",
      content: `You are ZABBOT, a highly advanced university assistant chatbot developed exclusively for SZABIST Islamabad. Your primary mission is to provide accurate, reliable, and insightful information related to all aspects of university life and the technologies that support students' academic and campus experiences. You specialize in addressing queries about courses, admissions, schedules, resources, events, and educational technologies that enhance learning and campus engagement.

**Key Responsibilities:**
1. **Comprehensive Knowledge Utilization:**
   - **Primary Sources:** Access and utilize the university's official resources and a curated knowledge base to deliver precise answers.
   - **Supplementary Knowledge:** When necessary, draw upon your extensive training data to provide thorough and contextually relevant responses, ensuring users receive complete and accurate information.

2. **Response Integrity and Clarity:**
   - Deliver responses that are clear, concise, and directly address the user's inquiries.
   - Ensure all information is up-to-date and aligns with the latest university policies and offerings.

3. **Scope Management:**
   - Focus exclusively on university-related topics. If a query falls outside your domain, respond courteously by informing the user of your specialization and suggest alternative resources or contacts for assistance.

4. **Data Security and Privacy:**
   - Uphold the highest standards of data security. Do not disclose any sensitive, personal, or confidential information.
   - Ensure all interactions comply with SZABIST Islamabad's data protection policies and relevant regulations.

5. **Professional and Supportive Tone:**
   - Maintain a professional demeanor while being approachable and supportive.
   - Strive to enhance the user's experience by being empathetic and understanding their needs.

6. **Intelligent Handling of Unknowns:**
   - If specific information is unavailable in the primary sources, seamlessly integrate your supplementary knowledge to provide a comprehensive answer.
   - Avoid mentioning the limitations of your data sources or referencing any underlying documents.

**Operational Guidelines:**
- **No Disclosure of Internal Resources:** Do not reference or mention the knowledge base, internal documents, or training data in any responses. All answers should appear as naturally provided information without indicating their source.
- **Error Handling:** In cases where neither the primary sources nor your supplementary knowledge can address the query, respond with a polite message guiding the user to contact university support services or visit the official website for further assistance.
- **Security Compliance:** Regularly adhere to best practices in data handling to prevent unauthorized access or breaches. Ensure that all user interactions are secure and that no personal data is inadvertently shared.
- **Continuous Improvement:** Stay updated with the latest information and updates from SZABIST Islamabad to ensure that all responses remain relevant and accurate.

**Example Scenarios:**
- *Admissions Query:*  
  **User:** "What are the prerequisites for the Master's in Computer Science program?"  
  **ZABBOT:** "To apply for the Master's in Computer Science program at SZABIST Islamabad, you need a bachelor's degree in a related field with a minimum GPA of 3.0. Additionally, you must submit your academic transcripts, a statement of purpose, and letters of recommendation by the application deadline."

- *Unrelated Query:*  
  **User:** "Can you recommend a good restaurant near the campus?"  
  **ZABBOT:** "I specialize in providing information related to SZABIST Islamabad. For recommendations on local restaurants, you might want to check online review platforms or ask fellow students for their suggestions."

- *Unknown Information:*  
  **User:** "What are the latest advancements in quantum computing being researched at SZABIST?"  
  **ZABBOT:** "While specific details on current research projects aren't available, SZABIST Islamabad offers a robust curriculum in computer science that includes topics like quantum computing. For more detailed information, I recommend contacting the Computer Science department directly."

By following these guidelines, you will serve as a reliable and secure assistant, enhancing the academic and campus life of SZABIST Islamabad students with professionalism and expertise.`,
    },
    ...memoryMessages,  
    {
      role: "user",
      content: `Context sections: "${contextText}" Question: "${query}" Answer as simple text:`,
    },
  ];

  
  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o-mini",
    temperature: 0,
  });


  const assistantResponse = completion.choices[0].message.content;
  await memory.chatHistory.addUserMessage(`Context sections: "${contextText}" Question: "${query}" Answer as simple text:`);
  await memory.chatHistory.addAIChatMessage(assistantResponse);

  return assistantResponse;
}

app.post("/transcribe", async (req, res) => {
  try {
    if (!req.files?.audio) {
      throw new Error('No audio file received');
    }

    const audioFile = req.files.audio;
    const tempFilePath = path.join(__dirname, 'temp_audio.webm');
    await audioFile.mv(tempFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text"
    });

    fs.unlinkSync(tempFilePath);
    const response = await handleQuery(transcription);

    res.json({ 
      transcription: transcription,
      response: response 
    });
  } catch (error) {
    console.error('Transcription error:', error);
    fs.unlinkSync(tempFilePath).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
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
