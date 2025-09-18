#!/usr/bin/env python3
"""
Real PyMuPDF PDF Text Extractor
Extracts actual text from PDF files - no mock data!
"""
import sys
import json
import fitz  # PyMuPDF
from pathlib import Path

def extract_pdf_text(pdf_path):
    """Extract text from PDF using PyMuPDF"""
    try:
        # Verify file exists
        if not Path(pdf_path).exists():
            return {
                "success": False,
                "error": f"File not found: {pdf_path}",
                "text": "",
                "metadata": {}
            }
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Extract text from all pages
        full_text = ""
        page_texts = []
        
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            page_text = page.get_text()
            page_texts.append(page_text)
            full_text += page_text + "\n"
        
        # Get file stats
        file_size = Path(pdf_path).stat().st_size
        
        # Prepare result
        result = {
            "success": True,
            "text": full_text.strip(),
            "totalCharacters": len(full_text.strip()),
            "metadata": {
                "pageCount": doc.page_count,
                "fileSize": file_size,
                "extractionMethod": "PyMuPDF-Python",
                "extractionTime": "",  # Will be set by Node.js
                "pages": page_texts
            }
        }
        
        doc.close()
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": f"PDF extraction failed: {str(e)}",
            "text": "",
            "metadata": {}
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python pdf_extractor.py <pdf_path>",
            "text": "",
            "metadata": {}
        }))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_pdf_text(pdf_path)
    print(json.dumps(result))