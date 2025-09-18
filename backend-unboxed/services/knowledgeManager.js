// LLM Knowledge Manager - Persistent storage and retrieval system for Qwen model
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KnowledgeManager {
  constructor() {
    this.knowledgeBase = path.join(__dirname, '../llm_knowledge');
    this.documentsPath = path.join(this.knowledgeBase, 'training_documents');
    this.qaPairsPath = path.join(this.knowledgeBase, 'qa_pairs');
    this.correctionsPath = path.join(this.knowledgeBase, 'user_corrections');
    this.embeddingsPath = path.join(this.knowledgeBase, 'embeddings');
    
    this.ensureDirectories();
    console.log('🧠 Knowledge Manager initialized:', this.knowledgeBase);
  }

  ensureDirectories() {
    const dirs = [this.knowledgeBase, this.documentsPath, this.qaPairsPath, this.correctionsPath, this.embeddingsPath];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Store complete documents for training
  async storeDocument(fileName, fullText, metadata = {}) {
    const docId = `doc_${Date.now()}_${this.sanitizeFileName(fileName)}`;
    const filePath = path.join(this.documentsPath, `${docId}.json`);
    
    const document = {
      id: docId,
      fileName,
      timestamp: new Date().toISOString(),
      characterCount: fullText.length,
      wordCount: fullText.split(/\s+/).length,
      fullText,
      metadata,
      // Create searchable chunks
      chunks: this.createSearchableChunks(fullText),
      // Extract key regulatory patterns
      patterns: this.extractRegulatoryPatterns(fullText)
    };

    fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
    console.log(`📚 Stored document: ${fileName} (${fullText.length} chars)`);
    return docId;
  }

  // Store Q&A pairs from documents or user input
  async storeQAPairs(qaPairs, source) {
    const qaId = `qa_${Date.now()}_${this.sanitizeFileName(source)}`;
    const filePath = path.join(this.qaPairsPath, `${qaId}.json`);
    
    const qaData = {
      id: qaId,
      source,
      timestamp: new Date().toISOString(),
      pairs: qaPairs,
      count: qaPairs.length
    };

    fs.writeFileSync(filePath, JSON.stringify(qaData, null, 2));
    console.log(`❓ Stored ${qaPairs.length} Q&A pairs from: ${source}`);
    return qaId;
  }

  // Store user corrections for continuous learning
  async storeCorrection(material, originalClassification, correctedClassification, reasoning) {
    const correctionId = `correction_${Date.now()}_${this.sanitizeFileName(material)}`;
    const filePath = path.join(this.correctionsPath, `${correctionId}.json`);
    
    const correction = {
      id: correctionId,
      material,
      timestamp: new Date().toISOString(),
      original: originalClassification,
      corrected: correctedClassification,
      reasoning,
      // Flag for high-priority learning
      priority: this.calculateCorrectionPriority(originalClassification, correctedClassification)
    };

    fs.writeFileSync(filePath, JSON.stringify(correction, null, 2));
    console.log(`✏️ Stored correction: ${material} (${correction.priority} priority)`);
    return correctionId;
  }

  // Retrieve relevant knowledge for classification
  async getRelevantKnowledge(wasteDescription, limit = 5) {
    const relevantDocs = await this.findRelevantDocuments(wasteDescription, limit);
    const relevantQA = await this.findRelevantQA(wasteDescription, limit);
    const relevantCorrections = await this.findRelevantCorrections(wasteDescription, limit);

    return {
      documents: relevantDocs,
      qaPairs: relevantQA,
      corrections: relevantCorrections,
      totalSources: relevantDocs.length + relevantQA.length + relevantCorrections.length
    };
  }

  // Find documents similar to waste description
  async findRelevantDocuments(wasteDescription, limit = 5) {
    const allDocs = this.loadAllDocuments();
    const scored = allDocs.map(doc => ({
      ...doc,
      relevanceScore: this.calculateRelevanceScore(wasteDescription, doc)
    }));

    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .filter(doc => doc.relevanceScore > 0.1); // Only return reasonably relevant docs
  }

  // Find relevant Q&A pairs
  async findRelevantQA(wasteDescription, limit = 5) {
    const allQA = this.loadAllQAPairs();
    const relevantPairs = [];

    allQA.forEach(qaFile => {
      qaFile.pairs.forEach(pair => {
        const relevance = this.calculateTextSimilarity(wasteDescription, pair.question + ' ' + pair.answer);
        if (relevance > 0.2) {
          relevantPairs.push({
            ...pair,
            source: qaFile.source,
            relevanceScore: relevance
          });
        }
      });
    });

    return relevantPairs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  // Find relevant past corrections
  async findRelevantCorrections(wasteDescription, limit = 3) {
    const allCorrections = this.loadAllCorrections();
    const scored = allCorrections.map(correction => ({
      ...correction,
      relevanceScore: this.calculateTextSimilarity(wasteDescription, correction.material + ' ' + correction.reasoning)
    }));

    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .filter(correction => correction.relevanceScore > 0.15);
  }

  // Build enhanced prompt with knowledge base
  async buildKnowledgeEnhancedPrompt(basePrompt, wasteDescription) {
    const knowledge = await this.getRelevantKnowledge(wasteDescription);
    
    let enhancedPrompt = basePrompt + '\n\n## RELEVANT REGULATORY KNOWLEDGE:\n';

    // Add document excerpts
    if (knowledge.documents.length > 0) {
      enhancedPrompt += '\n### Regulatory Documents:\n';
      knowledge.documents.forEach((doc, i) => {
        const relevantChunk = this.findMostRelevantChunk(doc, wasteDescription);
        enhancedPrompt += `\n**${doc.fileName}:**\n${relevantChunk}\n`;
      });
    }

    // Add Q&A examples
    if (knowledge.qaPairs.length > 0) {
      enhancedPrompt += '\n### Similar Examples:\n';
      knowledge.qaPairs.forEach((qa, i) => {
        enhancedPrompt += `\nQ: ${qa.question}\nA: ${qa.answer}\n`;
      });
    }

    // Add past corrections (high priority)
    if (knowledge.corrections.length > 0) {
      enhancedPrompt += '\n### IMPORTANT CORRECTIONS (Learn from these):\n';
      knowledge.corrections.forEach((correction, i) => {
        enhancedPrompt += `\n**Material:** ${correction.material}\n**Correct Classification:** ${JSON.stringify(correction.corrected)}\n**Reasoning:** ${correction.reasoning}\n`;
      });
    }

    enhancedPrompt += `\n## Now classify the current waste:\n${wasteDescription}\n`;

    return enhancedPrompt;
  }

  // Utility methods
  createSearchableChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push({
        text: text.substring(i, Math.min(i + chunkSize, text.length)),
        startPos: i,
        endPos: Math.min(i + chunkSize, text.length)
      });
    }
    return chunks;
  }

  extractRegulatoryPatterns(text) {
    const patterns = {
      flashPointMentions: (text.match(/flash\s*point[^.]*\d+\s*[°]?[CF]/gi) || []),
      pHMentions: (text.match(/pH[^.]*\d+\.?\d*/gi) || []),
      dCodes: (text.match(/D00[1-9]/g) || []),
      formCodes: (text.match(/form\s*code\s*\d{3}/gi) || []),
      unNumbers: (text.match(/UN\d{4}/g) || [])
    };
    return patterns;
  }

  calculateRelevanceScore(query, document) {
    let score = 0;
    
    // Simple keyword matching (can be enhanced with embeddings)
    const queryWords = query.toLowerCase().split(/\s+/);
    const docText = document.fullText.toLowerCase();
    
    queryWords.forEach(word => {
      if (docText.includes(word)) {
        score += 0.1;
      }
    });

    // Boost score for regulatory patterns
    if (document.patterns) {
      if (document.patterns.flashPointMentions.length > 0 && query.toLowerCase().includes('flash')) score += 0.3;
      if (document.patterns.pHMentions.length > 0 && query.toLowerCase().includes('ph')) score += 0.3;
      if (document.patterns.dCodes.length > 0) score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  calculateCorrectionPriority(original, corrected) {
    // High priority if federal codes changed
    if (original.federal_codes !== corrected.federal_codes) return 'high';
    if (original.texas_form_code !== corrected.texas_form_code) return 'medium';
    return 'low';
  }

  findMostRelevantChunk(document, query) {
    if (!document.chunks || document.chunks.length === 0) {
      return document.fullText.substring(0, 500) + '...';
    }

    const scored = document.chunks.map(chunk => ({
      ...chunk,
      score: this.calculateTextSimilarity(query, chunk.text)
    }));

    const best = scored.sort((a, b) => b.score - a.score)[0];
    return best.text;
  }

  // Load all stored knowledge
  loadAllDocuments() {
    if (!fs.existsSync(this.documentsPath)) return [];
    return fs.readdirSync(this.documentsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => JSON.parse(fs.readFileSync(path.join(this.documentsPath, file), 'utf8')));
  }

  loadAllQAPairs() {
    if (!fs.existsSync(this.qaPairsPath)) return [];
    return fs.readdirSync(this.qaPairsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => JSON.parse(fs.readFileSync(path.join(this.qaPairsPath, file), 'utf8')));
  }

  loadAllCorrections() {
    if (!fs.existsSync(this.correctionsPath)) return [];
    return fs.readdirSync(this.correctionsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => JSON.parse(fs.readFileSync(path.join(this.correctionsPath, file), 'utf8')));
  }

  sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  // Get knowledge base statistics
  getKnowledgeStats() {
    const docs = this.loadAllDocuments();
    const qa = this.loadAllQAPairs();
    const corrections = this.loadAllCorrections();

    return {
      totalDocuments: docs.length,
      totalCharacters: docs.reduce((sum, doc) => sum + doc.characterCount, 0),
      totalQAPairs: qa.reduce((sum, qaFile) => sum + qaFile.count, 0),
      totalCorrections: corrections.length,
      highPriorityCorrections: corrections.filter(c => c.priority === 'high').length,
      knowledgeBasePath: this.knowledgeBase,
      lastUpdated: new Date().toISOString()
    };
  }
}

export default KnowledgeManager;