from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

print("Loading PDF...")

loader = PyPDFLoader("C:\\Users\\babus\\Downloads\\rag\\fighting-fraud-in-financial-services.pdf")
documents = loader.load()

print(f"Pages Loaded: {len(documents)}")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150
)

chunks = splitter.split_documents(documents)

print(f"Chunks Created: {len(chunks)}")

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

print("Creating FAISS index...")

vector_db = FAISS.from_documents(
    chunks,
    embeddings
)

vector_db.save_local("vector_db")

print("FAISS index saved successfully!")