#!/usr/bin/env python3
"""
PyMuPDF PDF Text Extractor
Simple, fast, local PDF text extraction service
No external dependencies, no API calls, just pure text extraction
"""

import sys
import json
import fitz  # PyMuPDF
import os
from datetime import datetime

def extract_text_from_pdf(pdf_path):
    """
    Extract clean text from PDF using PyMuPDF
    Returns structured data for SDS analysis
    """
    try:
        # Validate file exists
        if not os.path.exists(pdf_path):
            return {
                "success": False,
                "error": f"File not found: {pdf_path}",
                "text": "",
                "metadata": {}
            }
        
        # Open PDF document
        doc = fitz.open(pdf_path)
        
        # Extract metadata
        metadata = {
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "subject": doc.metadata.get("subject", ""),
            "creator": doc.metadata.get("creator", ""),
            "producer": doc.metadata.get("producer", ""),
            "creationDate": doc.metadata.get("creationDate", ""),
            "modDate": doc.metadata.get("modDate", ""),
            "pageCount": doc.page_count,
            "extractionMethod": "PyMuPDF",
            "extractionTime": datetime.now().isoformat()
        }
        
        # Extract text from all pages
        full_text = ""
        page_texts = []
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            
            # Get text with layout preservation
            page_text = page.get_text()
            
            # Store individual page text for debugging
            page_texts.append({
                "pageNumber": page_num + 1,
                "text": page_text,
                "charCount": len(page_text)
            })
            
            # Combine all text
            full_text += f"\n=== PAGE {page_num + 1} ===\n"
            full_text += page_text
            full_text += "\n"
        
        # Close document
        doc.close()
        
        # Clean up text and handle Unicode issues
        clean_text = full_text.strip()
        
        # Remove problematic Unicode characters that cause Windows encoding issues
        clean_text = clean_text.encode('ascii', 'ignore').decode('ascii')
        
        return {
            "success": True,
            "error": None,
            "text": clean_text,
            "metadata": metadata,
            "pages": page_texts,
            "totalCharacters": len(clean_text),
            "processingTime": "local"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "metadata": {},
            "pages": []
        }

def main():
    """
    Main function for command line usage
    Usage: python pymupdf_extractor.py <pdf_path>
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python pymupdf_extractor.py <pdf_path>"
        }))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_text_from_pdf(pdf_path)
    
    # Output JSON result with ASCII encoding for Windows compatibility
    print(json.dumps(result, indent=2, ensure_ascii=True))

if __name__ == "__main__":
    main()