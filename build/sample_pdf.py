import PyPDF2
import sys
import io

# Set encoding for safe output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PDF_PATH = r'C:/Users/k/Downloads/pokemon z guia/guia.pdf'

try:
    reader = PyPDF2.PdfReader(PDF_PATH)
    # Check pages 25-35 as a sample of early trainers
    for i in range(25, 36):
        print(f"--- PAGE {i} ---")
        text = reader.pages[i].extract_text()
        print(text)
        print("\n")
except Exception as e:
    print(f"Error: {e}")
