import os
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from dotenv import load_dotenv

from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq

load_dotenv()

app = Flask(__name__, static_folder="static")
CORS(app)

# --- RAG Setup ---
groq_api_key = os.getenv("GROQ_API_KEY")

print("Loading embeddings model...")
embeddings = FastEmbedEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

print("Loading FAISS index...")
vector_db = FAISS.load_local(
    "vector_db",
    embeddings,
    allow_dangerous_deserialization=True
)

llm = ChatGroq(
    groq_api_key=groq_api_key,
    model="llama-3.3-70b-versatile",
    temperature=0
)

print("RAG Backend Ready!")

# --- Routes ---

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/pdf")
def serve_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), "fighting-fraud-in-financial-services.pdf")
    return send_file(pdf_path, mimetype="application/pdf")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    try:
        docs = vector_db.similarity_search(question, k=5)

        context = "\n\n".join([doc.page_content for doc in docs])

        prompt = f"""
You are a helpful assistant.

Answer ONLY from the provided context.

If the answer is not available in the context,
reply:
"I couldn't find that information in the document."

Provide a detailed answer whenever sufficient information is available.

Context:
{context}

Question:
{question}

Answer:
"""

        response = llm.invoke(prompt)

        # Extract source pages
        source_pages = list(set(
            doc.metadata.get("page", "N/A") for doc in docs
        ))
        source_pages.sort()

        return jsonify({
            "answer": response.content,
            "sources": [f"Page {p + 1}" for p in source_pages if isinstance(p, int)]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
