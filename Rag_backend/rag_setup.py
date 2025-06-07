from langchain_community.llms import Ollama
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from langchain.chains import RetrievalQA
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
import os

# Initialize Ollama LLM (Gemma-2-9B-Instruct)
llm = Ollama(
    model="gemma2:2b",
    temperature=0.7,
    num_predict=150
)

# Load embedding model and FAISS index
embedder = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
index_file = "faiss_index.bin"
chunks_file = "chunks.txt"

if not os.path.exists(index_file) or not os.path.exists(chunks_file):
    print(f"Error: Missing {index_file} or {chunks_file}. Run preprocessing.py first.")
    exit(1)

faiss_index = faiss.read_index(index_file)

# Load chunks
with open(chunks_file, "r", encoding="utf-8") as f:
    chunks = f.read().split("\n---\n")[:-1]

# Create LangChain vector store
documents = [Document(page_content=chunk) for chunk in chunks]
vector_store = FAISS.from_documents(documents, embeddings)

# RAG pipeline
def rag_query(query):
    retriever = vector_store.as_retriever(search_kwargs={"k": 5})
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    prompt = f"Answer the following question based on the provided context about Indian traffic laws: {query}\nProvide a clear, legally accurate response with citations to relevant sections."
    result = qa_chain({"query": prompt})
    return result["result"], result["source_documents"]

# Example usage
if __name__ == "__main__":
    query = "What’s the fine for drunk driving in Delhi?"
    response, sources = rag_query(query)
    print("Answer:", response)
    print("Sources:", [doc.page_content[:100] + "..." for doc in sources])