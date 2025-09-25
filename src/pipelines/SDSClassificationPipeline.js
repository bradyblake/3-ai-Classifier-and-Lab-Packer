/**
 * SDSClassificationPipeline.js
 * Complete end-to-end pipeline: SDS → API → JSON → Classification
 * Main entry point for the AI-driven SDS extraction and waste classification system
 */

import { MasterWasteClassifier } from '../engines/MasterWasteClassifier.js';
import fs from 'fs';
import path from 'path';

export class SDSClassificationPipeline {
  constructor(apiKeys = {}) {
    this.masterClassifier = new MasterWasteClassifier(apiKeys);
    this.processingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Main pipeline entry point - process single SDS file
   * @param {string} sdsFilePath - Path to SDS file
   * @param {Object} options - Processing options
   * @returns {Object} Complete processing results
   */
  async processSDS(sdsFilePath, options = {}) {
    const defaultOptions = {
      selectedState: 'TX', // Default to Texas
      generateForms: true,
      collectTrainingData: true,
      wasteSource: 'unknown',
      industryType: 'general',
      isSpent: false,
      ...options
    };

    console.log('🚀 Starting SDS Classification Pipeline...');
    console.log(`📁 Input: ${sdsFilePath}`);
    console.log(`🏛️ State: ${defaultOptions.selectedState}`);
    console.log('');

    const startTime = Date.now();

    try {
      // Execute complete pipeline
      const result = await this.masterClassifier.extractAndClassifyFromFile(
        sdsFilePath,
        defaultOptions
      );

      // Update processing stats
      this.updateStats(Date.now() - startTime, true);

      // Generate summary report
      const summaryReport = this.generateSummaryReport(result, sdsFilePath);

      console.log('✅ Pipeline completed successfully!');
      console.log('');
      console.log(summaryReport);

      return {
        success: true,
        filePath: sdsFilePath,
        result,
        summaryReport,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.updateStats(Date.now() - startTime, false);
      console.error('❌ Pipeline failed:', error.message);

      return {
        success: false,
        filePath: sdsFilePath,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Process SDS from raw text content
   * @param {string} sdsText - Raw SDS text
   * @param {Object} options - Processing options
   * @returns {Object} Complete processing results
   */
  async processSDSText(sdsText, options = {}) {
    const defaultOptions = {
      selectedState: 'TX',
      generateForms: true,
      collectTrainingData: true,
      wasteSource: 'unknown',
      industryType: 'general',
      isSpent: false,
      ...options
    };

    console.log('🚀 Starting SDS Text Classification Pipeline...');
    console.log(`🏛️ State: ${defaultOptions.selectedState}`);
    console.log('');

    const startTime = Date.now();

    try {
      const result = await this.masterClassifier.extractAndClassifyFromText(
        sdsText,
        defaultOptions
      );

      this.updateStats(Date.now() - startTime, true);

      const summaryReport = this.generateSummaryReport(result, 'Text Input');

      console.log('✅ Pipeline completed successfully!');
      console.log('');
      console.log(summaryReport);

      return {
        success: true,
        inputType: 'text',
        result,
        summaryReport,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.updateStats(Date.now() - startTime, false);
      console.error('❌ Pipeline failed:', error.message);

      return {
        success: false,
        inputType: 'text',
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Batch process multiple SDS files
   * @param {Array<string>} filePaths - Array of SDS file paths
   * @param {Object} options - Processing options
   * @returns {Object} Batch processing results
   */
  async batchProcess(filePaths, options = {}) {
    console.log(`🔄 Starting batch processing of ${filePaths.length} files...`);
    console.log('');

    const results = await this.masterClassifier.batchProcessSDS(filePaths, options);

    // Generate batch summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('');
    console.log('📊 BATCH PROCESSING SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total Files: ${filePaths.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((successful / filePaths.length) * 100)}%`);

    // Show failed files
    if (failed > 0) {
      console.log('');
      console.log('❌ Failed Files:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  • ${path.basename(r.filePath)}: ${r.error}`);
      });
    }

    return {
      totalFiles: filePaths.length,
      successful,
      failed,
      successRate: Math.round((successful / filePaths.length) * 100),
      results
    };
  }

  /**
   * Generate human-readable summary report
   */
  generateSummaryReport(result, inputSource) {
    const { extractionMeta, classificationResults } = result;
    const { results: classification } = classificationResults;

    let report = '';
    report += '📋 SDS CLASSIFICATION SUMMARY\n';
    report += '═'.repeat(50) + '\n';
    report += `📄 Source: ${path.basename(inputSource)}\n`;
    report += `🤖 API Provider: ${extractionMeta.apiProvider.toUpperCase()}\n`;
    report += `⏱️ Processing Time: ${result.totalProcessingTime}ms\n`;
    report += `📊 Confidence: ${Math.round((extractionMeta.confidence || 0) * 100)}%\n`;
    report += '\n';

    // Material classification
    report += '🧪 MATERIAL CLASSIFICATION\n';
    report += '─'.repeat(30) + '\n';
    report += `Physical State: ${classification.materialState?.toUpperCase() || 'Unknown'}\n`;
    report += `Hazard Status: ${classification.classification?.toUpperCase() || 'Unknown'}\n`;
    report += '\n';

    // RCRA waste codes
    if (classification.rcraWasteCodes && classification.rcraWasteCodes.length > 0) {
      report += '⚠️ RCRA WASTE CODES\n';
      report += '─'.repeat(20) + '\n';
      classification.rcraWasteCodes.forEach(code => {
        report += `• ${code.code}: ${code.description}\n`;
        if (code.reason) {
          report += `  Reason: ${code.reason}\n`;
        }
      });
      report += '\n';
    } else {
      report += '✅ NO RCRA WASTE CODES IDENTIFIED\n\n';
    }

    // State waste codes
    if (classification.stateWasteCodes && classification.stateWasteCodes.length > 0) {
      report += '🏛️ STATE-SPECIFIC CODES\n';
      report += '─'.repeat(25) + '\n';
      classification.stateWasteCodes.forEach(code => {
        if (code.texasWasteCode) {
          report += `• Texas Code: ${code.texasWasteCode}\n`;
          report += `  Class: ${code.class}\n`;
        }
        if (code.oklahomaCategory) {
          report += `• Oklahoma: ${code.oklahomaCategory}\n`;
        }
      });
      report += '\n';
    }

    // Forms generated
    if (classificationResults.forms && Object.keys(classificationResults.forms).length > 0) {
      report += '📋 FORMS GENERATED\n';
      report += '─'.repeat(20) + '\n';
      Object.keys(classificationResults.forms).forEach(formType => {
        report += `• ${formType} Form: Ready for printing\n`;
      });
      report += '\n';
    }

    // Warnings and missing data
    if (extractionMeta.warnings && extractionMeta.warnings.length > 0) {
      report += '⚠️ EXTRACTION WARNINGS\n';
      report += '─'.repeat(25) + '\n';
      extractionMeta.warnings.forEach(warning => {
        report += `• ${warning}\n`;
      });
      report += '\n';
    }

    if (extractionMeta.missingData && extractionMeta.missingData.length > 0) {
      report += '❓ MISSING DATA\n';
      report += '─'.repeat(15) + '\n';
      extractionMeta.missingData.forEach(missing => {
        report += `• ${missing}\n`;
      });
      report += '\n';
    }

    report += '═'.repeat(50);

    return report;
  }

  /**
   * Update processing statistics
   */
  updateStats(processingTime, success) {
    this.processingStats.totalProcessed++;

    if (success) {
      this.processingStats.successful++;
    } else {
      this.processingStats.failed++;
    }

    // Update average processing time
    const currentAvg = this.processingStats.averageProcessingTime;
    const count = this.processingStats.totalProcessed;
    this.processingStats.averageProcessingTime =
      ((currentAvg * (count - 1)) + processingTime) / count;
  }

  /**
   * Get current processing statistics
   */
  getStats() {
    return {
      ...this.processingStats,
      successRate: this.processingStats.totalProcessed > 0
        ? Math.round((this.processingStats.successful / this.processingStats.totalProcessed) * 100)
        : 0
    };
  }

  /**
   * Reset processing statistics
   */
  resetStats() {
    this.processingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Export classification results to JSON file
   */
  async exportResults(results, outputPath) {
    const exportData = {
      timestamp: new Date().toISOString(),
      pipelineVersion: '1.0.0',
      processingStats: this.getStats(),
      results
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`📄 Results exported to: ${outputPath}`);
  }
}

export default SDSClassificationPipeline;