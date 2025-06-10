from sentence_transformers import SentenceTransformer
import re
import faiss
import numpy as np
import os

# Initialize embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Chunk and clean text
def chunk_text(text):
    # Flexible regex for section headers
    sections = re.split(r"(Section\s*\d+[A-Z]?[.:]?\s*|Amendment of section\s*\d+[A-Z]?[.:]?\s*|Insertion of new section\s*\d+[A-Z]?[.:]?\s*|\n{2,})", text, flags=re.IGNORECASE)
    chunks = []
    current_chunk = ""
    for section in sections:
        if section and section.strip():
            if re.match(r"Section\s*\d+[A-Z]?[.:]?\s*|Amendment of section\s*\d+[A-Z]?[.:]?\s*|Insertion of new section\s*\d+[A-Z]?[.:]?\s*", section, re.IGNORECASE):
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = section
            else:
                current_chunk += "\n" + section
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    # Fallback: Split by newlines if too few chunks
    if len(chunks) < 2:
        chunks = [chunk for chunk in text.split("\n\n") if 50 < len(chunk) < 1500]
    return [chunk for chunk in chunks if 50 < len(chunk) < 1500]

# Generate and store embeddings
def create_embeddings(chunks, index_file="faiss_index.bin", chunks_file="chunks.txt"):
    embeddings = model.encode(chunks, show_progress_bar=True, batch_size=32)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings.astype(np.float32))
    faiss.write_index(index, index_file)
    with open(chunks_file, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(chunk + "\n---\n")
    return chunks, embeddings

# Example usage
if __name__ == "__main__":
    input_path = "legal_pdfs\mv_act_text.txt"
    if os.path.exists(input_path):
        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read()
        pdf_chunks = chunk_text(text)
        if not pdf_chunks:
            print("Error: No valid chunks created. Check mv_act_text.txt format.")
        else:
            chunks, embeddings = create_embeddings(pdf_chunks)
            print(f"Created {len(chunks)} chunks and saved FAISS index to faiss_index.bin")
    else:
        print(f"Error: {input_path} not found. Run data_collection.py first.")