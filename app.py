from flask import Flask, request, jsonify
from flask_cors import CORS
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.chat_engine import CondensePlusContextChatEngine
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize OpenAI API key from environment variable
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# Get the absolute path to the data directory
current_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(current_dir, 'data')

# Create data directory if it doesn't exist
os.makedirs(data_dir, exist_ok=True)

# Initialize the models and settings
llm = OpenAI(model="gpt-3.5-turbo")
embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.llm = llm
Settings.embed_model = embed_model

# Check if Markdown files exist in the data directory
md_files = [f for f in os.listdir(data_dir) if f.endswith('.md')]
if not md_files:
    raise ValueError(f"No Markdown files found in {data_dir}. Please add your Markdown files to this directory.")

# Load and initialize the index from Markdown files
def rebuild_index():
    data = SimpleDirectoryReader(
        input_dir=data_dir,
        required_exts=[".md"]
    ).load_data()
    return VectorStoreIndex.from_documents(data)

index = rebuild_index()  # Initialize the index
memory = ChatMemoryBuffer.from_defaults(token_limit=4500)

# Custom System Prompt
system_prompt = """
You are a dedicated university assistant chatbot named ZABBOT designed to provide accurate, reliable, and helpful information specifically related to university queries and technology that supports students' academic and campus life. Your role is to assist students with their questions about courses, admissions, schedules, resources, events, and technology that enhances their learning or campus experience.

You are accountable for every response and must ensure that all answers are derived only from the Markdown documents provided in your knowledge base. If a query is unrelated to the university or beyond your scope, politely inform the user that you cannot assist with that and redirect them to focus on university-related matters.

Your purpose is to maintain focus, relevance, and clarity while upholding a professional and supportive tone.
"""

# Modify chat engine to include the system prompt
chat_engine = CondensePlusContextChatEngine.from_defaults(
   retriever=index.as_retriever(),
   memory=memory,
   llm=llm,
   system_prompt=system_prompt
)

@app.route('/')
def home():
    return jsonify({"message": "SZABIST Chatbot API is running"})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get response from chat engine
        response = chat_engine.chat(user_message)
        
        return jsonify({
            'response': str(response)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebuild_index', methods=['POST'])
def rebuild_index_route():
    try:
        global index  # Use the global index variable
        index = rebuild_index()  # Rebuild the index
        return jsonify({"message": "Index rebuilt successfully."}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    
