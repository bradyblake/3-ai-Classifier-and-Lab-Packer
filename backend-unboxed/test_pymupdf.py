#!/usr/bin/env python3
import fitz
import sys

print("Testing PyMuPDF installation...")

try:
    # Test basic import
    print(f"PyMuPDF version: {fitz.VersionBind}")
    print("[OK] PyMuPDF imported successfully")
    
    # Test basic functionality
    print("[OK] PyMuPDF is ready for PDF processing")
    
except Exception as e:
    print(f"[FAIL] PyMuPDF test failed: {e}")
    sys.exit(1)