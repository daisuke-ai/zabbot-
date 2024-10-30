from flask import Flask, request, jsonify
from flask_cors import CORS
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.chat_engine import CondensePlusContextChatEngine
import os

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize OpenAI API key
os.environ["OPENAI_API_KEY"] = "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"

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

# Check if PDF files exist in the data directory
pdf_files = [f for f in os.listdir(data_dir) if f.endswith('.pdf')]
if not pdf_files:
    raise ValueError(f"No PDF files found in {data_dir}. Please add your PDF files to this directory.")

# Load and initialize the index
data = SimpleDirectoryReader(
    input_dir=data_dir,
    required_exts=[".pdf"]
).load_data()

index = VectorStoreIndex.from_documents(data)
memory = ChatMemoryBuffer.from_defaults(token_limit=4500)
chat_engine = CondensePlusContextChatEngine.from_defaults(
   retriever=index.as_retriever(),
   memory=memory,
   llm=llm
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

if __name__ == '__main__':
    app.run(debug=True, port=5000) 