import streamlit as st
from rag_setup import rag_query
import os

st.title("Indian Traffic Law Chatbot")
st.write("Ask questions about Indian traffic laws (e.g., 'What’s the fine for drunk driving in Delhi?')")

query = st.text_input("Enter your question:")

if query:
    if not os.path.exists("faiss_index.bin") or not os.path.exists("chunks.txt"):
        st.error("Error: Missing faiss_index.bin or chunks.txt. Run preprocessing.py first.")
    else:
        with st.spinner("Processing..."):
            try:
                response, sources = rag_query(query)
                st.write("**Answer**:")
                st.write(response)
                st.write("**Sources**:")
                for i, source in enumerate(sources, 1):
                    st.write(f"{i}. {source.page_content[:200]}...")
            except Exception as e:
                st.error(f"Error processing query: {str(e)}. Ensure Ollama server is running (`ollama serve`).")