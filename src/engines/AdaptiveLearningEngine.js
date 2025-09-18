/**
 * Adaptive Learning Engine for Material Classification
 * 
 * This engine learns from user classifications and historical data to improve
 * material detection accuracy and reduce ambiguous classifications over time.
 */

export class AdaptiveLearningEngine {
  constructor() {
    this.storageKey = 'adaptiveLearningData';
    this.learningData = this.loadLearningData();
    this.confidenceThreshold = 0.7; // Above this, skip user input
    this.minSampleSize = 3; // Minimum classifications needed for confidence
  }

  /**
   * Load historical learning data from localStorage
   */
  loadLearningData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Ensure data structure exists
        return {
          materialPatterns: data.materialPatterns || {},
          classificationHistory: data.classificationHistory || [],
          confidenceScores: data.confidenceScores || {},
          correctionPatterns: data.correctionPatterns || {},
          lastUpdated: data.lastUpdated || Date.now(),
          ...data
        };
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
    
    return {
      materialPatterns: {},
      classificationHistory: [],
      confidenceScores: {},
      correctionPatterns: {},
      lastUpdated: Date.now()
    };
  }

  /**
   * Save learning data to localStorage
   */
  saveLearningData() {
    try {
      this.learningData.lastUpdated = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(this.learningData));
    } catch (error) {
      console.warn('Failed to save learning data:', error);
    }
  }

  /**
   * Record a user classification for learning
   */
  recordClassification(material, userClassification, originalDetection) {
    const pattern = this.extractMaterialPattern(material);
    const timestamp = Date.now();

    // Store classification history
    const historyEntry = {
      timestamp,
      material: {
        productName: material.productName,
        composition: material.composition,
        physicalState: material.physicalState,
        packaging: material.packaging,
        unNumber: material.unNumber
      },
      userClassification,
      originalDetection,
      pattern
    };

    this.learningData.classificationHistory.push(historyEntry);

    // Update pattern confidence
    this.updatePatternConfidence(pattern, userClassification);

    // Store material-specific patterns
    const materialKey = this.generateMaterialKey(material);
    if (!this.learningData.materialPatterns[materialKey]) {
      this.learningData.materialPatterns[materialKey] = {
        classifications: [],
        confidence: 0,
        lastSeen: timestamp
      };
    }

    this.learningData.materialPatterns[materialKey].classifications.push({
      classification: userClassification,
      timestamp,
      context: originalDetection
    });

    this.learningData.materialPatterns[materialKey].lastSeen = timestamp;
    this.learningData.materialPatterns[materialKey].confidence = this.calculateMaterialConfidence(materialKey);

    // Clean old data (keep last 1000 entries)
    if (this.learningData.classificationHistory.length > 1000) {
      this.learningData.classificationHistory = this.learningData.classificationHistory.slice(-1000);
    }

    this.saveLearningData();
  }

  /**
   * Extract key patterns from material for learning
   */
  extractMaterialPattern(material) {
    const name = material.productName?.toLowerCase() || '';
    const composition = material.composition?.map(c => c.name?.toLowerCase()).join(',') || '';
    const packaging = material.packaging?.toLowerCase() || '';
    const unNumber = material.unNumber || '';

    return {
      nameKeywords: this.extractKeywords(name),
      compositionKeywords: this.extractKeywords(composition),
      packagingKeywords: this.extractKeywords(packaging),
      unNumber,
      physicalState: material.physicalState
    };
  }

  /**
   * Extract important keywords from text
   */
  extractKeywords(text) {
    if (!text) return [];
    
    // Common important keywords for material classification
    const keywords = text.match(/\b(acetone|brake|cleaner|aerosol|cylinder|propane|wd-40|spray|gas|liquid|acid|base|caustic|flammable|combustible|diesel|oil|thinner|solvent)\b/gi);
    return keywords ? keywords.map(k => k.toLowerCase()) : [];
  }

  /**
   * Generate unique key for material
   */
  generateMaterialKey(material) {
    const name = material.productName?.toLowerCase().trim() || '';
    const unNumber = material.unNumber || '';
    
    // Use UN number if available, otherwise use normalized product name
    if (unNumber) {
      return `un_${unNumber}`;
    }
    
    // Create normalized key from product name
    return name.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  /**
   * Update confidence for a specific pattern
   */
  updatePatternConfidence(pattern, classification) {
    const patternKey = JSON.stringify(pattern);
    
    if (!this.learningData.confidenceScores[patternKey]) {
      this.learningData.confidenceScores[patternKey] = {
        classifications: {},
        totalCount: 0
      };
    }

    const patternData = this.learningData.confidenceScores[patternKey];
    
    if (!patternData.classifications[classification]) {
      patternData.classifications[classification] = 0;
    }
    
    patternData.classifications[classification]++;
    patternData.totalCount++;
  }

  /**
   * Calculate confidence score for a specific material
   */
  calculateMaterialConfidence(materialKey) {
    const materialData = this.learningData.materialPatterns[materialKey];
    if (!materialData || materialData.classifications.length === 0) {
      return 0;
    }

    // Count classifications
    const counts = {};
    materialData.classifications.forEach(c => {
      counts[c.classification] = (counts[c.classification] || 0) + 1;
    });

    const total = materialData.classifications.length;
    const maxCount = Math.max(...Object.values(counts));
    
    // Confidence based on consistency and sample size
    const consistency = maxCount / total;
    const sampleFactor = Math.min(total / this.minSampleSize, 1);
    
    return consistency * sampleFactor;
  }

  /**
   * Predict classification for a material based on historical data
   */
  predictClassification(material) {
    const materialKey = this.generateMaterialKey(material);
    const pattern = this.extractMaterialPattern(material);

    // Check exact material match first
    const exactMatch = this.learningData.materialPatterns[materialKey];
    if (exactMatch && exactMatch.confidence > this.confidenceThreshold) {
      const mostCommon = this.getMostCommonClassification(exactMatch.classifications);
      return {
        prediction: mostCommon.classification,
        confidence: exactMatch.confidence,
        source: 'exact_match',
        requiresUserInput: false
      };
    }

    // Check pattern similarity
    const similarPatterns = this.findSimilarPatterns(pattern);
    if (similarPatterns.length > 0) {
      const aggregatedConfidence = this.calculateAggregatedConfidence(similarPatterns);
      const prediction = this.getWeightedPrediction(similarPatterns);
      
      return {
        prediction: prediction.classification,
        confidence: aggregatedConfidence,
        source: 'pattern_match',
        requiresUserInput: aggregatedConfidence < this.confidenceThreshold,
        similarMaterials: similarPatterns.slice(0, 3) // Top 3 similar materials
      };
    }

    // No historical data available
    return {
      prediction: null,
      confidence: 0,
      source: 'no_data',
      requiresUserInput: true
    };
  }

  /**
   * Find materials with similar patterns
   */
  findSimilarPatterns(targetPattern) {
    const similarities = [];

    Object.keys(this.learningData.materialPatterns).forEach(materialKey => {
      const materialData = this.learningData.materialPatterns[materialKey];
      
      // Get the most recent classification for this material
      const recentClassifications = materialData.classifications.slice(-5); // Last 5 classifications
      if (recentClassifications.length === 0) return;

      // Calculate pattern similarity
      const similarity = this.calculatePatternSimilarity(
        targetPattern,
        this.extractMaterialPatternFromHistory(materialKey)
      );

      if (similarity > 0.3) { // Minimum similarity threshold
        const mostCommon = this.getMostCommonClassification(recentClassifications);
        similarities.push({
          materialKey,
          similarity,
          classification: mostCommon.classification,
          confidence: materialData.confidence,
          count: recentClassifications.length
        });
      }
    });

    // Sort by similarity * confidence
    return similarities.sort((a, b) => (b.similarity * b.confidence) - (a.similarity * a.confidence));
  }

  /**
   * Calculate similarity between two patterns
   */
  calculatePatternSimilarity(pattern1, pattern2) {
    let similarity = 0;
    let totalFactors = 0;

    // Compare keywords
    const nameOverlap = this.calculateKeywordOverlap(pattern1.nameKeywords, pattern2.nameKeywords);
    const compOverlap = this.calculateKeywordOverlap(pattern1.compositionKeywords, pattern2.compositionKeywords);
    const packOverlap = this.calculateKeywordOverlap(pattern1.packagingKeywords, pattern2.packagingKeywords);

    similarity += nameOverlap * 0.4; // Name is most important
    similarity += compOverlap * 0.3; // Composition is second
    similarity += packOverlap * 0.2; // Packaging is third
    totalFactors += 0.9;

    // UN Number exact match
    if (pattern1.unNumber && pattern2.unNumber) {
      similarity += (pattern1.unNumber === pattern2.unNumber) ? 0.1 : 0;
      totalFactors += 0.1;
    }

    return totalFactors > 0 ? similarity / totalFactors : 0;
  }

  /**
   * Calculate keyword overlap between two arrays
   */
  calculateKeywordOverlap(keywords1, keywords2) {
    if (!keywords1.length && !keywords2.length) return 1;
    if (!keywords1.length || !keywords2.length) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Get most common classification from an array
   */
  getMostCommonClassification(classifications) {
    const counts = {};
    classifications.forEach(c => {
      counts[c.classification] = (counts[c.classification] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort(([,a], [,b]) => b - a);
    return {
      classification: sorted[0][0],
      count: sorted[0][1],
      total: classifications.length
    };
  }

  /**
   * Calculate aggregated confidence from similar patterns
   */
  calculateAggregatedConfidence(similarPatterns) {
    if (similarPatterns.length === 0) return 0;

    // Weight by similarity and individual confidence
    let weightedSum = 0;
    let totalWeight = 0;

    similarPatterns.slice(0, 5).forEach(pattern => { // Top 5 patterns
      const weight = pattern.similarity * pattern.confidence;
      weightedSum += pattern.confidence * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get weighted prediction from similar patterns
   */
  getWeightedPrediction(similarPatterns) {
    const votes = {};
    let totalWeight = 0;

    similarPatterns.slice(0, 5).forEach(pattern => {
      const weight = pattern.similarity * pattern.confidence;
      votes[pattern.classification] = (votes[pattern.classification] || 0) + weight;
      totalWeight += weight;
    });

    const sorted = Object.entries(votes).sort(([,a], [,b]) => b - a);
    return {
      classification: sorted[0][0],
      confidence: sorted[0][1] / totalWeight
    };
  }

  /**
   * Extract pattern from historical data
   */
  extractMaterialPatternFromHistory(materialKey) {
    // This is a simplified version - in practice, we'd reconstruct the pattern
    // from the stored historical data
    const historyEntries = this.learningData.classificationHistory.filter(
      entry => this.generateMaterialKey(entry.material) === materialKey
    );

    if (historyEntries.length > 0) {
      return historyEntries[historyEntries.length - 1].pattern;
    }

    return { nameKeywords: [], compositionKeywords: [], packagingKeywords: [], unNumber: '', physicalState: '' };
  }

  /**
   * Get learning statistics for debugging/monitoring
   */
  getStatistics() {
    const totalClassifications = this.learningData.classificationHistory.length;
    const uniqueMaterials = Object.keys(this.learningData.materialPatterns).length;
    const highConfidenceMaterials = Object.values(this.learningData.materialPatterns)
      .filter(m => m.confidence > this.confidenceThreshold).length;

    const classificationTypes = {};
    this.learningData.classificationHistory.forEach(entry => {
      classificationTypes[entry.userClassification] = 
        (classificationTypes[entry.userClassification] || 0) + 1;
    });

    return {
      totalClassifications,
      uniqueMaterials,
      highConfidenceMaterials,
      confidenceThreshold: this.confidenceThreshold,
      classificationTypes,
      lastUpdated: new Date(this.learningData.lastUpdated).toISOString()
    };
  }

  /**
   * Export learning data for backup/analysis
   */
  exportData() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: this.learningData
    };
  }

  /**
   * Import learning data from backup
   */
  importData(exportedData) {
    if (exportedData.version === '1.0' && exportedData.data) {
      this.learningData = exportedData.data;
      this.saveLearningData();
      return true;
    }
    return false;
  }

  /**
   * Clear all learning data (for testing/reset)
   */
  clearLearningData() {
    this.learningData = {
      materialPatterns: {},
      classificationHistory: [],
      confidenceScores: {},
      correctionPatterns: {},
      lastUpdated: Date.now()
    };
    this.saveLearningData();
  }
}