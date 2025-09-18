# LLM Knowledge Base Structure

This folder contains the persistent knowledge base for your Qwen2.5-3B-Instruct model.

## Folder Structure

### `/training_documents/`
**Complete regulatory documents** - Full text, no filtering
- EPA 40 CFR regulations
- TCEQ RG-22 guidance documents  
- DOT shipping regulations
- Internal classification procedures
- Format: JSON files with full document text + metadata

### `/embeddings/`
**Document embeddings and vectors** for similarity search
- Pre-computed embeddings of all training documents
- Enables fast document retrieval during classification
- Format: Binary embedding files + index

### `/qa_pairs/`
**Question-Answer pairs** generated from documents
- Automatically extracted Q&A from regulatory docs
- User-created classification examples
- Format: JSON with question/answer/source document

### `/user_corrections/`
**Learning from your expertise**
- Every manual correction you make
- Builds your personal regulatory knowledge
- Format: JSON with original AI result + your correction + reasoning

## How Qwen Uses This Knowledge

1. **Context Injection**: During classification, relevant documents are injected into the prompt
2. **Similarity Search**: Finds most relevant past examples for current classification
3. **Continuous Learning**: Saves every correction you make as new knowledge
4. **Full Document Access**: No filtering - AI can reference any part of any document

## Benefits

✅ **Persistent Learning** - Knowledge survives system restarts
✅ **Fast Retrieval** - Pre-indexed for quick access
✅ **Full Context** - Complete documents, not just "principles"
✅ **Personal Expertise** - Learns your specific regulatory interpretations
✅ **Unlimited Growth** - Can store thousands of documents and corrections

## File Naming Convention

- Documents: `doc_[timestamp]_[filename].json`
- QA Pairs: `qa_[timestamp]_[source].json` 
- Corrections: `correction_[timestamp]_[material].json`
- Embeddings: `embed_[document_id].bin`