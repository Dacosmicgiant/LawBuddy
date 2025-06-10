import pdfplumber
import os

# Create directory for data storage
os.makedirs("legal_pdfs", exist_ok=True)

# Extract text from PDF
def extract_pdf_text(pdf_path, output_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            if not text.strip():
                raise ValueError("No text extracted from PDF. Ensure the PDF is text-based, not scanned.")
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(text)
            return text
    except Exception as e:
        print(f"Error extracting PDF: {str(e)}")
        raise

# Example usage
if __name__ == "__main__":
    pdf_path = "legal_pdfs\MV Act English.pdf"
    output_path = "legal_pdfs\mv_act_text.txt"
    if os.path.exists(pdf_path):
        try:
            extracted_text = extract_pdf_text(pdf_path, output_path)
            print(f"Extracted text saved to {output_path} ({len(extracted_text)} characters)")
        except Exception as e:
            print(f"Failed to process PDF: {str(e)}")
    else:
        print(f"Error: {pdf_path} not found. Place MV_Act_English.pdf in legal_pdfs/")