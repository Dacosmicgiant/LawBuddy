import PyInstaller.__main__
import os

# Build the Streamlit app into an executable
PyInstaller.__main__.run([
    "app.py",
    "--name=TrafficLawChatbot",
    "--onefile",
    "--add-data=legal_pdfs;legal_pdfs",
    "--add-data=faiss_index.bin;.",
    "--add-data=chunks.txt;.",
    "--hidden-import=langchain",
    "--hidden-import=langchain_community",
    "--hidden-import=sentence_transformers",
    "--hidden-import=faiss",
    "--hidden-import=streamlit",
    "--hidden-import=pdfplumber"
])

print("Executable built successfully. Find it in the 'dist' folder.")