import json
import os
import sys

"""
Book to JSON Converter for Stellar Assistant
-------------------------------------------
This script converts text files or extracts text from PDFs (requires PyMuPDF)
into the JSON format used by the BookSearchService.

Requirements:
    pip install pymupdf

Usage:
    python convert_books.py path/to/book.pdf "Book Title"
"""

def extract_text_from_pdf(pdf_path):
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        sections = []

        # Simple extraction: one section per 5 pages to keep segments manageable
        current_content = ""
        section_idx = 1

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            current_content += page.get_text()

            if (page_num + 1) % 5 == 0 or page_num == len(doc) - 1:
                sections.append({
                    "name": f"Chapter/Part {section_idx}",
                    "content": current_content.strip()
                })
                current_content = ""
                section_idx += 1

        return sections
    except ImportError:
        print("Error: PyMuPDF (fitz) not found. Please run 'pip install pymupdf'")
        return None
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_books.py <file_path> <title>")
        return

    file_path = sys.argv[1]
    title = sys.argv[2]

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Processing '{title}'...")

    if file_path.lower().endswith('.pdf'):
        sections = extract_text_from_pdf(file_path)
    else:
        # Fallback for text files
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            sections = [{"name": "Full Text", "content": content}]

    if not sections:
        return

    book_data = {
        "title": title,
        "sections": sections
    }

    # Output file
    output_path = "public/data/books.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # If books.json already exists, append/merge
    existing_data = []
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except:
                pass

    existing_data.append(book_data)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully added '{title}' to {output_path}")
    print(f"Total books in library: {len(existing_data)}")

if __name__ == "__main__":
    main()
