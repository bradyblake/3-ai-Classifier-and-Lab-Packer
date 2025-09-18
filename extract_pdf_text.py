#!/usr/bin/env python3
"""
PDF Text Extraction Script for Revolutionary Classifier
Extracts complete text from PDF while preserving sections structure
"""

import sys
import fitz  # PyMuPDF
import unicodedata
import re

def clean_unicode_text(text):
    """Clean problematic Unicode characters from text"""
    # Replace problematic characters with similar ASCII equivalents
    replacements = {
        '\uf084': ' ',  # Private Use Area character
        '\u02da': '°',  # Ring above (degree)
        '\uf0b0': '°',  # Private Use Area character (degree-like)
        '\u2019': "'",  # Right single quotation mark
        '\u201c': '"',  # Left double quotation mark
        '\u201d': '"',  # Right double quotation mark
        '\u2013': '-',  # En dash
        '\u2014': '-',  # Em dash
        '\u00a0': ' ',  # Non-breaking space
    }
    
    # Replace known problematic characters
    for old_char, new_char in replacements.items():
        text = text.replace(old_char, new_char)
    
    # Remove or replace other problematic Unicode characters
    # Keep only printable ASCII and common extended characters
    cleaned_chars = []
    for char in text:
        if ord(char) < 128:  # ASCII
            cleaned_chars.append(char)
        elif ord(char) in range(160, 256):  # Extended ASCII
            cleaned_chars.append(char)
        elif unicodedata.category(char)[0] in ['L', 'N', 'P', 'S', 'Z']:  # Letters, Numbers, Punctuation, Symbols, Separators
            try:
                # Try to normalize the character
                normalized = unicodedata.normalize('NFKD', char)
                if len(normalized) == 1 and ord(normalized) < 256:
                    cleaned_chars.append(normalized)
                else:
                    # Replace with closest ASCII equivalent
                    ascii_equiv = unicodedata.normalize('NFKD', char).encode('ascii', 'ignore').decode('ascii')
                    cleaned_chars.append(ascii_equiv if ascii_equiv else ' ')
            except:
                cleaned_chars.append(' ')  # Replace with space if all else fails
        else:
            cleaned_chars.append(' ')  # Replace control/format characters with space
    
    return ''.join(cleaned_chars)

def extract_pdf_text(pdf_path):
    """Extract text from PDF preserving section structure"""
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)
        
        text_parts = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Extract text with layout preservation
            text = page.get_text("text")  # Preserves line breaks and formatting
            
            if text.strip():
                # Clean Unicode characters that cause encoding issues
                cleaned_text = clean_unicode_text(text)
                text_parts.append(f"--- Page {page_num + 1} ---\n{cleaned_text}")
        
        doc.close()
        
        # Combine all pages with clear separation
        full_text = "\n\n".join(text_parts)
        
        return full_text
        
    except Exception as e:
        print(f"Error extracting PDF: {str(e)}", file=sys.stderr)
        return ""

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_pdf_text.py <pdf_file_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    extracted_text = extract_pdf_text(pdf_path)
    
    if extracted_text:
        # Force UTF-8 encoding for stdout
        sys.stdout.reconfigure(encoding='utf-8')
        print(extracted_text)
    else:
        print("Failed to extract text from PDF", file=sys.stderr)
        sys.exit(1)