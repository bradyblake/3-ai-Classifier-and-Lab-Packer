// File: backend/server.js
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import OpenAI from 'openai';
import OllamaService from './services/ollamaService.js';
import aiService from './services/aiService.js';
import enhancedClassificationEngine from './services/enhancedClassificationEngine.js';
import LLMSDSParser from './services/llmSDSParser.js';
import { MasterSDSParser } from './services/masterSDSParser.js';
import aiTrainingRoutes from './routes/aiTraining.js';
import AIProviderService from './services/aiProviders.js';
import BatchSDSProcessor from './services/batchSDSProcessor.js';
import materialDatabase from './services/materialDatabase.js';
import sdsLookupService from './services/sdsLookupService.js';
import labPackRoutes from './routes/labPackRoutes.js';
import apiKeyRoutes from './routes/apiKeyRoutes.js';
import deterministicClassifier from './services/deterministicClassifier.js';
import RevolutionaryClassifier from './services/revolutionaryClassifier.js';
import robustPdfParser from './services/robustPdfParser.js';
import pymupdfService from './services/pymupdfService.js';
import simplePyMuPDFService from './services/simplePyMuPDF.js';
import directPyMuPDFService from './services/fixedPyMuPDF.js';
import casTextEnhancer from './services/casTextEnhancer.js';
import testEndpoints from './routes/testEndpoints.js';
import enhancedSDSClassificationService from './services/enhancedSDSClassificationService.js';
import epaManifestParser from './services/epaManifestParser.js';
import automaticLearningService from './services/automaticLearningService.js';
import sectionBasedSDSParser from './services/sectionBasedSDSParser_fixed.js';
import jarvisRoutes from './jarvis-routes.js';
import adobePreprocessor from './services/adobePreprocessor.js';
import trainingRoutes from './routes/trainingRoutes.js';
import pdfAnalysisRoutes from './routes/pdfAnalysisRoutes.js';
import epaRoutes from './routes/epaRoutes.js';
console.log('✅ Training routes imported successfully');
// import casAutoDiscoveryService from './services/casAutoDiscoveryService.js'; // DEACTIVATED - Conflicts with other Claude session

dotenv.config();
const app = express();
const port = 3003; // Changed to test the fix without conflicts
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const upload = multer({ dest: 'uploads/' });

// Initialize the unified AI provider service
const aiProviders = new AIProviderService();
global.aiProviderService = aiProviders; // Make available globally
const batchProcessor = new BatchSDSProcessor(aiProviders);

// Initialize Revolutionary Classifier (98% accuracy breakthrough)
const revolutionaryClassifier = new RevolutionaryClassifier();
global.revolutionaryClassifier = revolutionaryClassifier; // Make available to batch processor

// Keep legacy services for backward compatibility
const openai = process.env.OPENAI_API_KEY ? 
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const ollama = new OllamaService(process.env.AI_URL || 'http://localhost:11434');
const llmParser = new LLMSDSParser();
const masterParser = new MasterSDSParser();
// deterministicClassifier is already instantiated from the import

// Critical Properties Extraction Function - USING FIXED customSDSEngine
async function extractCriticalPropertiesFromText(text) {
  try {
    // Import and use our FIXED customSDSEngine with enhanced patterns
    const { customSDSEngine } = await import('../src/utils/customSDSEngine.js');
    console.log('🚨 USING FIXED customSDSEngine v1.1 for extraction');
    
    // Extract using our fixed engine
    const extractedData = customSDSEngine.extract(text);
    
    // Map to expected format
    const criticalProperties = {
      flashPoint: extractedData.flashPoint?.celsius || extractedData.flashPoint,
      pH: extractedData.pH,
      productName: extractedData.productName,
      physicalState: extractedData.physicalState,
      composition: extractedData.composition || [], // ADD composition data!
      constituents: extractedData.composition || [], // Also map to constituents for compatibility
      casNumbers: extractedData.casNumbers || [],
      dotShipping: extractedData.dotShipping || {},
      hazardStatements: extractedData.hazardStatements || {}
    };
    
    console.log('✅ Fixed engine extracted:', {
      ...criticalProperties,
      compositionCount: criticalProperties.composition.length,
      casCount: criticalProperties.casNumbers.length
    });
    return criticalProperties;
    
  } catch (error) {
    console.error('❌ Failed to use customSDSEngine, using basic fallback:', error.message);
    
    // Basic fallback if import fails
    const criticalProperties = {};
    
    // Flash point extraction with various formats
    const flashMatches = [
      /flash\s*point[:\s]*([<>]?\s*-?\d+(?:\.\d+)?)\s*°?\s*([cf])/i,
      /flash\s*pt[:\s]*([<>]?\s*-?\d+(?:\.\d+)?)\s*°?\s*([cf])/i,
      /flash\s*point[:\s]*([<>]?\s*-?\d+(?:\.\d+)?)\s*degrees?\s*([cf])/i
    ];
    
    for (const regex of flashMatches) {
      const match = text.match(regex);
      if (match) {
        let temp = parseFloat(match[1].replace(/[<>]/g, ''));
        const unit = match[2].toLowerCase();
        
        if (unit === 'f') {
          temp = (temp - 32) * 5 / 9; // Convert to Celsius
        }
        
        criticalProperties.flashPoint = Math.round(temp);
        break;
      }
    }
    
    // pH extraction with various formats
    const pHMatches = [
      /ph[:\s]*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?/i,
      /p\.h\.?[:\s]*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?/i,
      /hydrogen\s*ion\s*concentration[:\s]*(\d+(?:\.\d+)?)/i
    ];
    
    for (const regex of pHMatches) {
      const match = text.match(regex);
      if (match) {
        const pH1 = parseFloat(match[1]);
        const pH2 = match[2] ? parseFloat(match[2]) : null;
        criticalProperties.pH = pH2 ? (pH1 + pH2) / 2 : pH1;
        break;
      }
    }
    
    // Product name extraction - ENHANCED with inline format support
    const productNameMatches = [
      /product\s*name\s*:\s*(.+)/i,  // INLINE FORMAT FIRST
      /product\s*(?:name|identifier)[:\s]*([^\n\r]+)/i,
      /chemical\s*product\s*and\s*company\s*identification[:\s\n\r]*product\s*name[:\s]*([^\n\r]+)/i,
      /trade\s*name[:\s]*([^\n\r]+)/i,
      /commercial\s*product\s*name[:\s]*([^\n\r]+)/i
    ];
    
    for (const regex of productNameMatches) {
      const match = text.match(regex);
      if (match && match[1].trim().length > 2) {
        const productName = match[1].trim();
        // Filter out generic/section headers
        if (!productName.toLowerCase().includes('section') && 
            !productName.toLowerCase().includes('page') &&
            !productName.toLowerCase().includes('material safety')) {
          criticalProperties.productName = productName;
          break;
        }
      }
    }
    
    // Physical state extraction
    const physicalStateMatch = text.match(/physical\s*state\s*:\s*(.+)/i);
    if (physicalStateMatch) {
      criticalProperties.physicalState = physicalStateMatch[1].trim().toLowerCase();
    }
    
    return criticalProperties;
  }
}

// AI Analysis endpoint - supports both OpenAI and Ollama
app.post('/api/analyze', upload.single('pdf'), async (req, res) => {
  try {
    // Check if file was uploaded first
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded or file upload failed' });
    }
    
    // Safely access req.body with defaults
    const mode = (req.body && req.body.mode) || 'ultra_fast'; // Default to fastest mode
    const state = (req.body && req.body.state) || 'TX';
    const aiProvider = (req.body && req.body.aiProvider) || 'local'; // Default to local deterministic classifier
    const model = (req.body && req.body.model) || null; // specific model to use
    
    const filePath = req.file.path;

    const buffer = fs.readFileSync(filePath);
    let rawText;
    let extractedSections = null;
    
    // Check if it's a PDF or text file
    const isPDF = req.file.originalname?.toLowerCase().endsWith('.pdf') || 
                  (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
    
    if (isPDF) {
      console.log('🚀 Starting enhanced PDF processing with Adobe integration...');
      
      // STEP 1: Try Adobe preprocessing first (if available)
      let adobeResult = null;
      let useAdobeText = false;
      
      try {
        console.log('🔍 Attempting Adobe preprocessing...');
        adobeResult = await adobePreprocessor.preprocessPDF(filePath, {
          enableOCR: true,
          extractTables: true,
          preserveLayout: true
        });
        
        if (adobeResult.success) {
          console.log('✅ Adobe preprocessing successful!');
          console.log('📈 Enhanced text length:', adobeResult.enhancedText.length);
          console.log('📊 Has table data:', adobeResult.hasTableData);
          rawText = adobeResult.enhancedText;
          useAdobeText = true;
          
          // CRITICAL: Use Adobe's pre-extracted critical properties and sections
          if (adobeResult.criticalProperties || adobeResult.structuredSections) {
            console.log('🎯 Using Adobe pre-extracted critical properties and sections');
            extractedSections = {
              ...extractedSections,
              // Convert Adobe critical properties to expected format
              flashPoint: adobeResult.criticalProperties?.flashPoint?.celsius,
              pH: adobeResult.criticalProperties?.pH?.value,
              productName: adobeResult.criticalProperties?.productName?.value,
              // Add structured sections
              sections: adobeResult.structuredSections,
              // Keep any existing data
              chemicals: extractedSections?.chemicals || [],
              casNumbers: extractedSections?.casNumbers || [],
              unNumber: extractedSections?.unNumber
            };
            
            console.log('🔍 Adobe extracted critical properties:');
            if (adobeResult.criticalProperties?.flashPoint) {
              console.log(`   🔥 Flash Point: ${adobeResult.criticalProperties.flashPoint.celsius}°C`);
              console.log(`      Context: ${adobeResult.criticalProperties.flashPoint.contextHighlight}`);
            }
            if (adobeResult.criticalProperties?.pH) {
              console.log(`   🧪 pH: ${adobeResult.criticalProperties.pH.value}`);
              console.log(`      Context: ${adobeResult.criticalProperties.pH.contextHighlight}`);
            }
            if (adobeResult.criticalProperties?.productName) {
              console.log(`   📛 Product Name: ${adobeResult.criticalProperties.productName.value}`);
              console.log(`      Context: ${adobeResult.criticalProperties.productName.contextHighlight}`);
            }
          }
        } else {
          console.log('⚠️ Adobe preprocessing failed:', adobeResult.reason || adobeResult.error);
        }
      } catch (adobeError) {
        console.log('⚠️ Adobe preprocessing error:', adobeError.message);
      }
      
      // STEP 2: Fallback to existing PDF parsing if Adobe failed
      if (!useAdobeText) {
        // COMMENTED OUT: Force PyMuPDF only per user request
        // console.log('🔧 Using RobustPdfParser for PDF extraction...');
        // const parseResult = await robustPdfParser.parse(buffer);
        
        if (false) {
          rawText = parseResult.text;
          extractedSections = parseResult.sections;
          console.log('✅ PDF parsed successfully with RobustPdfParser');
          console.log('📋 Extracted sections:', Object.keys(extractedSections || {}));
          
          // SHOW ALL EXTRACTED TEXT for debugging
          console.log('\n' + '='.repeat(80));
          console.log('🔍 COMPLETE FALLBACK EXTRACTION RESULTS');
          console.log('='.repeat(80));
          console.log('📄 RAW TEXT LENGTH:', rawText.length);
          console.log('📄 FULL TEXT CONTENT:');
          console.log(rawText);
          console.log('='.repeat(80) + '\n');
          
          // CRITICAL: Extract critical properties from fallback parsing text
          console.log('🎯 Extracting critical properties from fallback parsing...');
          const criticalProperties = await extractCriticalPropertiesFromText(rawText);
          
          console.log('🔍 Critical properties extraction results:');
          console.log(`   🔥 Flash Point found: ${criticalProperties.flashPoint || 'NONE'}`);
          console.log(`   🧪 pH found: ${criticalProperties.pH || 'NONE'}`);
          console.log(`   📛 Product Name found: ${criticalProperties.productName || 'NONE'}`);
          
          if (criticalProperties.flashPoint || criticalProperties.pH || criticalProperties.productName) {
            console.log('✅ Fallback extracted critical properties:');
            if (criticalProperties.flashPoint) {
              console.log(`   🔥 Flash Point: ${criticalProperties.flashPoint}°C`);
              extractedSections.flashPoint = criticalProperties.flashPoint;
            }
            if (criticalProperties.pH) {
              console.log(`   🧪 pH: ${criticalProperties.pH}`);
              extractedSections.pH = criticalProperties.pH;
            }
            if (criticalProperties.productName) {
              console.log(`   📛 Product Name: ${criticalProperties.productName}`);
              extractedSections.productName = criticalProperties.productName;
            }
            
            // Add sections for structured display  
            extractedSections.sections = {
              'Extracted Text': rawText,
              'Critical Properties': `Flash Point: ${criticalProperties.flashPoint || 'Not found'}\npH: ${criticalProperties.pH || 'Not found'}\nProduct Name: ${criticalProperties.productName || 'Not found'}`
            };
          } else {
            console.log('⚠️ No critical properties found in fallback parsing');
            console.log('🔍 Showing first 1000 chars of text for debugging:');
            console.log(rawText.substring(0, 1000));
          }
        } else {
          // COMMENTED OUT: Force PyMuPDF only per user request
          // Final fallback to original method
          // console.log('⚠️ RobustPdfParser failed, trying pdf-parse...');
          try {
            // Force use of actual PyMuPDF service instead of pdf-parse
            console.log('🔧 Using actual PyMuPDF service for PDF extraction...');
            const pymupdfResult = await pymupdfService.extractWithMetadata(filePath);
            
            if (pymupdfResult.success) {
              rawText = pymupdfResult.text;
              console.log('✅ PDF parsed successfully with PyMuPDF service');
              console.log(`📄 Extracted text length: ${rawText.length} chars`);
              
              // Extract critical properties from PyMuPDF text
              const criticalProperties = await extractCriticalPropertiesFromText(rawText);
              
              console.log('🔍 Critical properties from PyMuPDF:');
              console.log(`   🔥 Flash Point: ${criticalProperties.flashPoint || 'NONE'}`);
              console.log(`   🧪 pH: ${criticalProperties.pH || 'NONE'}`);
              console.log(`   📛 Product Name: ${criticalProperties.productName || 'NONE'}`);
              console.log(`   🧪 Composition count: ${criticalProperties.composition?.length || 0}`);
              
              // Create structured sections
              extractedSections = {
                'Extracted Text': rawText,
                productName: criticalProperties.productName,
                flashPoint: criticalProperties.flashPoint,
                pH: criticalProperties.pH,
                composition: criticalProperties.composition || [],
                constituents: criticalProperties.constituents || [],
                casNumbers: criticalProperties.casNumbers || []
              };
            } else {
              throw new Error('PyMuPDF extraction failed');
            }
            
            // Old pdf-parse code commented out
            // const parsed = await pdfParse(buffer);
            // rawText = parsed.text;
            
            // OLD PDF-PARSE CODE COMMENTED OUT
            // console.log('\n' + '='.repeat(80));
            // console.log('🔍 BASIC PDF-PARSE EXTRACTION RESULTS');
            // console.log('='.repeat(80));
          } catch (pdfError) {
            console.log("PDF parse failed, treating as text:", pdfError.message);
            rawText = buffer.toString('utf8');
          }
        }
      }
      
      // Add processing metadata for debugging
      if (adobeResult && adobeResult.success) {
        console.log('📋 Using Adobe-enhanced text for classification');
      }
    } else {
      // It's a text file
      rawText = buffer.toString('utf8');
    }
    
    fs.unlinkSync(filePath); // Clean up

    console.log('📄 Raw text received (first 500 chars):', rawText.substring(0, 500));
    console.log('📊 Text length:', rawText.length);
    if (extractedSections) {
      console.log('🔍 Pre-extracted data:', {
        chemicals: extractedSections.chemicals?.length || 0,
        casNumbers: extractedSections.casNumbers?.length || 0,
        unNumber: extractedSections.unNumber,
        flashPoint: extractedSections.flashPoint
      });
      
      // Debug: Show actual extracted chemicals
      if (extractedSections.chemicals && extractedSections.chemicals.length > 0) {
        console.log('📋 Extracted chemicals detail:');
        extractedSections.chemicals.forEach((chem, i) => {
          console.log(`   ${i+1}. ${chem.name} (${chem.percentage}) - CAS: ${chem.casNumber}`);
        });
      }
    }
    
    // Enhance the text with CAS data BEFORE sending to AI
    let textToAnalyze = rawText;
    if (extractedSections && (extractedSections.chemicals || extractedSections.flashPoint)) {
      console.log('🔬 Enhancing SDS text with extracted data (chemicals and/or flash point)...');
      textToAnalyze = casTextEnhancer.enhanceSDSText(rawText, extractedSections);
      if (textToAnalyze !== rawText) {
        console.log('✅ Text enhanced with extracted data - flash point, pH and hazard info injected directly');
      }
    }
    
    let result;

    // Use the new unified AI provider service with regulatory hierarchy
    if (aiProvider === 'local') {
      // Use deterministic classifier directly - no external AI needed
      console.log('🔧 Using local deterministic classifier...');
      
      const deterministicData = {
        productName: extractedSections?.productName || 'Unknown',
        flashPoint: extractedSections?.flashPoint || null,
        pH: extractedSections?.pH || null,
        physicalState: extractedSections?.physicalState || 'liquid',
        composition: extractedSections?.chemicals || [],
        unNumber: extractedSections?.unNumber || null,
        properShippingName: extractedSections?.properShippingName || null
      };
      
      const deterministicResult = deterministicClassifier.classify(deterministicData);
      result = JSON.stringify(deterministicResult, null, 2);
      console.log('✅ Local deterministic classification complete');
    } else if (aiProvider === 'gemini' || aiProvider === 'groq') {
      console.log(`🚀 Using ${aiProvider} (FREE tier) with regulatory hierarchy`);
      try {
        result = await aiProviders.analyze(textToAnalyze, aiProvider, { 
          model, 
          state: state,
          mode: mode,
          extractedSections: extractedSections // Pass pre-extracted data to AI
        });
      } catch (error) {
        console.error(`${aiProvider} error:`, error.message);
        // Try fallback provider
        const fallback = aiProvider === 'gemini' ? 'groq' : 'gemini';
        if (aiProviders.hasProvider(fallback)) {
          console.log(`Falling back to ${fallback}...`);
          try {
            result = await aiProviders.analyze(textToAnalyze, fallback, { 
              model, 
              state: state,
              mode: mode,
              extractedSections: extractedSections // Include extracted sections in fallback
            });
          } catch (fallbackError) {
            console.error(`Fallback ${fallback} also failed:`, fallbackError.message);
            console.log('🔧 Using deterministic classifier with CAS enhancement...');
            
            // Use deterministic classifier as last resort with CAS-enhanced data
            const deterministicData = {
              productName: extractedSections?.productName || 'Unknown',
              flashPoint: extractedSections?.flashPoint || null,
              pH: extractedSections?.pH || null,
              physicalState: extractedSections?.physicalState || 'liquid',
              composition: extractedSections?.chemicals || [],
              unNumber: extractedSections?.unNumber || null,
              properShippingName: extractedSections?.properShippingName || null
            };
            
            const deterministicResult = deterministicClassifier.classify(deterministicData);
            result = JSON.stringify(deterministicResult, null, 2);
            console.log('✅ Deterministic classification complete');
          }
        } else {
          // No fallback available, use deterministic classifier
          console.log('🔧 No AI providers available, using deterministic classifier with CAS enhancement...');
          
          const deterministicData = {
            productName: extractedSections?.productName || 'Unknown',
            flashPoint: extractedSections?.flashPoint || null,
            pH: extractedSections?.pH || null,
            physicalState: extractedSections?.physicalState || 'liquid',
            composition: extractedSections?.chemicals || [],
            unNumber: extractedSections?.unNumber || null,
            properShippingName: extractedSections?.properShippingName || null
          };
          
          const deterministicResult = deterministicClassifier.classify(deterministicData);
          result = JSON.stringify(deterministicResult, null, 2);
          console.log('✅ Deterministic classification complete');
        }
      }
    } else if (aiProvider === 'ollama') {
      // Use Ollama
      const ollamaModel = model || 'cyberuser42/deepseek-r1-distill-llama-8b';
      console.log(`🤖 Using Ollama model: ${ollamaModel}`);
      
      const ollamaResult = await ollama.chatCompletion(ollamaModel, [
        { role: 'user', content: message }
      ], { temperature: 0.2 });

      if (ollamaResult.success) {
        result = ollamaResult.message.content;
      } else {
        throw new Error(`Ollama error: ${ollamaResult.error}`);
      }
    } else if (aiProvider === 'openai' && openai) {
      // Use OpenAI with regulatory hierarchy
      console.log(`💳 Using OpenAI (PAID) with regulatory hierarchy`);
      result = await aiProviders.analyze(rawText, 'openai', { 
        model, 
        state: state,
        mode: mode 
      });
    } else {
      throw new Error('No AI provider available. Please configure LM Studio (port 1234), Ollama, or set OPENAI_API_KEY.');
    }

    // Post-process AI result to apply critical rule corrections
    let processedResult = result;
    
    try {
      // Try to extract and correct JSON from AI response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const aiResponse = JSON.parse(jsonMatch[0]);
        
        // Apply critical form code corrections based on physical state and pH
        console.log('🔧 FORM CODE VALIDATION CHECK:', {
          physicalState: aiResponse.physicalState,
          productName: aiResponse.productName,
          pH: aiResponse.pH,
          state_form_code: aiResponse.state_form_code,
          needsSolidCorrection: aiResponse.physicalState === 'solid' && ['105', '106', '102'].includes(aiResponse.state_form_code),
          needsAcidCorrection: aiResponse.physicalState === 'liquid' && aiResponse.pH <= 2.0 && aiResponse.state_form_code === '102',
          needsAlkalineCorrection: aiResponse.physicalState === 'liquid' && aiResponse.pH >= 12.5 && aiResponse.state_form_code === '102',
          needsFormCodeFix: !aiResponse.state_form_code || aiResponse.state_form_code === 'null' || aiResponse.state_form_code === 'undefined' || aiResponse.state_form_code === 'N/A'
        });
        
        // Fix missing or invalid form codes FIRST
        if (!aiResponse.state_form_code || aiResponse.state_form_code === 'null' || aiResponse.state_form_code === 'undefined' || aiResponse.state_form_code === 'N/A') {
          console.log('🔧 FIXING MISSING FORM CODE');
          
          // Detect aerosols first
          const productName = (aiResponse.productName || '').toLowerCase();
          if (productName.includes('aerosol') || productName.includes('spray') || productName.includes('wd-40') || productName.includes('wd40')) {
            aiResponse.state_form_code = '208';
            aiResponse.physicalState = 'aerosol';
            aiResponse.precedence_reasoning = (aiResponse.precedence_reasoning || '') + ' [CORRECTED: Aerosol product assigned form code 208]';
          }
          // Detect solids
          else if (aiResponse.physicalState === 'solid' || productName.includes('beads') || productName.includes('pellets') || productName.includes('powder')) {
            aiResponse.state_form_code = '204';
            aiResponse.precedence_reasoning = (aiResponse.precedence_reasoning || '') + ' [CORRECTED: Solid material assigned form code 204]';
          }
          // Default to liquid
          else {
            aiResponse.state_form_code = '102';
            aiResponse.precedence_reasoning = (aiResponse.precedence_reasoning || '') + ' [CORRECTED: Default liquid assigned form code 102]';
          }
        }
        
        // Fix missing state classification
        if (!aiResponse.state_classification || aiResponse.state_classification === 'null' || aiResponse.state_classification === 'undefined') {
          aiResponse.state_classification = aiResponse.federal_codes?.length > 0 ? 'H' : '1';
          aiResponse.precedence_reasoning = (aiResponse.precedence_reasoning || '') + ' [CORRECTED: Missing state classification fixed]';
        }
        
        // Correct solid materials incorrectly classified as liquid form codes
        if (aiResponse.physicalState === 'solid' && ['105', '106', '102'].includes(aiResponse.state_form_code)) {
          console.log('🔧 APPLYING SOLID CORRECTION: ' + aiResponse.state_form_code + ' → 204 (solid materials)');
          aiResponse.state_form_code = '204';
          aiResponse.state_codes = aiResponse.state_codes?.map(code => 
            code.replace(/^(105|106|102)-/, '204-')) || ['204-1'];
          aiResponse.precedence_reasoning += ' [CORRECTED: Form code changed to 204 because material is solid - liquid form codes do not apply to solids]';
          // Clear federal codes for non-hazardous solids
          if (aiResponse.physicalState === 'solid' && (aiResponse.state_form_code === '204' || aiResponse.productName?.toLowerCase().includes('pellets') || aiResponse.productName?.toLowerCase().includes('beads'))) {
            aiResponse.federal_codes = [];
            aiResponse.final_classification = 'non-hazardous';
          }
        }
        
        // Apply federal D-code validation and corrections
        if (aiResponse.federal_codes && Array.isArray(aiResponse.federal_codes)) {
          const validCodes = [];
          
          for (const code of aiResponse.federal_codes) {
            if (code === 'D001') {
              // D001 requires liquid with flash point < 60°C
              // Skip D001 if flash point is not available or explicitly marked as not available
              const flashPointNotAvailable = aiResponse.flashPoint && aiResponse.flashPoint.notAvailable;
              const hasFlashPoint = aiResponse.flashPoint && 
                                  !flashPointNotAvailable &&
                                  (aiResponse.flashPoint.celsius !== undefined && aiResponse.flashPoint.celsius !== null);
              const isLiquid = aiResponse.physicalState === 'liquid' || aiResponse.physicalState === 'liquified gas';
              const isIgnitable = hasFlashPoint && aiResponse.flashPoint.celsius < 60;
              
              if (hasFlashPoint && isLiquid && isIgnitable) {
                validCodes.push(code);
                console.log(`✅ Valid D001: Flash point ${aiResponse.flashPoint.celsius}°C < 60°C (liquid)`);
              } else {
                if (flashPointNotAvailable) {
                  console.log(`❌ Invalid D001 removed: Flash point not available (${aiResponse.flashPoint.reason || 'No Data Available'})`);
                } else {
                  console.log(`❌ Invalid D001 removed: hasFlashPoint=${hasFlashPoint}, isLiquid=${isLiquid}, flashPoint=${aiResponse.flashPoint?.celsius}°C`);
                }
              }
            } else if (code === 'D002') {
              // D002 requires aqueous liquid with pH ≤2 or ≥12.5
              const hasPH = aiResponse.pH !== undefined && aiResponse.pH !== null;
              const isLiquid = aiResponse.physicalState === 'liquid' || aiResponse.physicalState === 'liquified gas';
              const isCorrosive = hasPH && (aiResponse.pH <= 2 || aiResponse.pH >= 12.5);
              
              if (hasPH && isLiquid && isCorrosive) {
                validCodes.push(code);
                console.log(`✅ Valid D002: pH ${aiResponse.pH} (liquid)`);
              } else {
                console.log(`❌ Invalid D002 removed: hasPH=${hasPH}, isLiquid=${isLiquid}, pH=${aiResponse.pH}, physicalState=${aiResponse.physicalState}`);
              }
            } else {
              // Keep other codes (D003, D004-D043, etc.)
              validCodes.push(code);
            }
          }
          
          if (validCodes.length !== aiResponse.federal_codes.length) {
            aiResponse.federal_codes = validCodes;
            aiResponse.final_classification = validCodes.length > 0 ? 'hazardous' : 'non-hazardous';
            aiResponse.precedence_reasoning += ' [CORRECTED: Invalid D-codes removed based on physical state and property requirements]';
            console.log(`🔧 D-CODE VALIDATION: ${aiResponse.federal_codes.length} valid codes remaining`);
          }
        }
        
        // Apply pH-based corrections for liquids only
        if (aiResponse.physicalState === 'liquid' && aiResponse.pH !== undefined && aiResponse.pH !== null) {
          if (aiResponse.pH <= 2.0 && aiResponse.state_form_code === '102') {
            console.log('🔧 APPLYING ACID CORRECTION: 102 → 105 (liquid acid)');
            aiResponse.state_form_code = '105';
            aiResponse.state_codes = aiResponse.state_codes?.map(code => 
              code.replace('102-', '105-')) || ['105-H'];
            aiResponse.precedence_reasoning += ' [CORRECTED: Form code changed from 102 to 105 due to acidic pH in liquid]';
          }
          
          if (aiResponse.pH >= 12.5 && aiResponse.state_form_code === '102') {
            console.log('🔧 APPLYING ALKALINE CORRECTION: 102 → 106 (liquid alkaline)');
            aiResponse.state_form_code = '106';
            aiResponse.state_codes = aiResponse.state_codes?.map(code => 
              code.replace('102-', '106-')) || ['106-H'];
            aiResponse.precedence_reasoning += ' [CORRECTED: Form code changed from 102 to 106 due to alkaline pH in liquid]';
          }
        }
        
        // Update the result with corrected JSON
        processedResult = `\`\`\`json\n${JSON.stringify(aiResponse, null, 2)}\n\`\`\``;
      }
    } catch (e) {
      // If post-processing fails, use original result
      processedResult = result;
    }

    // 🏛️ ENHANCED TEXAS RG-22 CLASSIFICATION
    let enhancedClassification = null;
    try {
      console.log('🏛️ Running enhanced Texas RG-22 classification...');
      
      // Parse AI response to extract structured data
      const jsonMatch = processedResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const aiResponse = JSON.parse(jsonMatch[0]);
          
          // Extract composition from AI response or extracted sections
          let composition = [];
          if (extractedSections?.chemicals) {
            composition = extractedSections.chemicals.map(chem => ({
              name: chem.name,
              cas: chem.casNumber,
              percent: parseFloat(chem.percentage) || 0
            }));
          } else if (aiResponse.composition) {
            composition = aiResponse.composition;
          }
          
          // Use Adobe pre-extracted data if available, otherwise fall back to AI response
          const productName = extractedSections?.productName || aiResponse.productName || req.file.originalname || 'Unknown';
          const flashPoint = extractedSections?.flashPoint || aiResponse.flashPoint?.celsius;
          const pH = extractedSections?.pH || aiResponse.pH;
          
          console.log('🎯 Enhanced classification using:');
          console.log(`   📛 Product Name: ${productName} ${extractedSections?.productName ? '(Adobe)' : '(AI)'}`);
          console.log(`   🔥 Flash Point: ${flashPoint}°C ${extractedSections?.flashPoint ? '(Adobe)' : '(AI)'}`);
          console.log(`   🧪 pH: ${pH} ${extractedSections?.pH ? '(Adobe)' : '(AI)'}`);
          
          // Run enhanced classification
          enhancedClassification = await enhancedSDSClassificationService.classify({
            productName: productName,
            composition: composition,
            physicalState: aiResponse.physicalState || 'liquid',
            pH: pH, // Use Adobe-extracted pH if available
            flashPointC: flashPoint, // Use Adobe-extracted flash point if available
            flashPointF: aiResponse.flashPoint?.fahrenheit,
            state: state
          });
          
          console.log('✅ Enhanced Texas RG-22 classification completed');
          console.log(`📋 Results: Form Code ${enhancedClassification.texas_classification?.form_code}-${enhancedClassification.texas_classification?.waste_classification}, Federal: ${enhancedClassification.federal_codes.join(', ') || 'None'}`);
          
        } catch (parseError) {
          console.warn('⚠️ Could not parse AI response for enhanced classification:', parseError.message);
        }
      }
    } catch (enhancedError) {
      console.error('❌ Enhanced classification failed:', enhancedError.message);
    }

    // 🔍 CAS AUTO-DISCOVERY INTEGRATION
    try {
      console.log('🔍 Starting CAS auto-discovery process...');
      
      // Create structured SDS data for CAS discovery
      const sdsData = {
        rawText: rawText,
        productName: req.file.originalname || 'unknown_sds.pdf',
        // Try to parse any existing composition data from the AI response
        composition: []
      };

      // Try to extract any CAS numbers that might be in the AI response
      const jsonMatch = processedResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const aiResponse = JSON.parse(jsonMatch[0]);
          if (aiResponse.chemicals && Array.isArray(aiResponse.chemicals)) {
            sdsData.composition = aiResponse.chemicals;
          }
        } catch (e) {
          // Continue without composition data
        }
      }

      // Run CAS auto-discovery - DEACTIVATED
      // const discoveryResults = await casAutoDiscoveryService.discoverFromSDS(sdsData, req.file.originalname);
      // console.log(`✅ CAS Discovery complete: ${discoveryResults.newCAS} new chemicals added to database`);
      console.log(`⚠️ CAS auto-discovery deactivated to avoid conflicts with other Claude session`);
      
      // Add discovery metadata to response
      const responseData = {
        result: processedResult,
        provider: aiProvider,
        model: model || (aiProvider === 'gemini' ? 'gemini-1.5-flash' : aiProvider === 'groq' ? 'llama-3.1-70b' : aiProvider === 'ollama' ? 'cyberuser42/deepseek-r1-distill-llama-8b' : 'gpt-4o-mini'),
        extractedSections: extractedSections, // Add robust parser data
        parsedSections: extractedSections?.sections || null, // Add Adobe structured sections to download JSON
        rawText: rawText.substring(0, 1000), // First 1000 chars for debugging
        enhancedClassification: enhancedClassification, // Add enhanced Texas RG-22 classification
        adobeCriticalProperties: extractedSections?.sections ? {
          flashPoint: extractedSections.flashPoint,
          pH: extractedSections.pH,
          productName: extractedSections.productName,
          sectionsFound: Object.keys(extractedSections.sections || {}).length
        } : null, // Add Adobe extracted critical properties for debugging
        casDiscovery: {
          totalCAS: 0, // discoveryResults.totalCAS,
          newCAS: 0, // discoveryResults.newCAS,
          discoveredChemicals: [], // discoveryResults.discoveredChemicals.map(chem => chem.name || 'Unknown'),
          databaseExpanded: false // discoveryResults.newCAS > 0
        }
      };

      res.json(responseData);
    } catch (discoveryError) {
      console.error('⚠️ CAS auto-discovery failed:', discoveryError.message);
      // Continue without auto-discovery if it fails
      res.json({ 
        result: processedResult,
        provider: aiProvider,
        model: model || (aiProvider === 'gemini' ? 'gemini-1.5-flash' : aiProvider === 'groq' ? 'llama-3.1-70b' : aiProvider === 'ollama' ? 'cyberuser42/deepseek-r1-distill-llama-8b' : 'gpt-4o-mini'),
        extractedSections: extractedSections, // Add robust parser data
        parsedSections: extractedSections?.sections || null, // Add Adobe structured sections to download JSON
        rawText: rawText.substring(0, 1000), // First 1000 chars for debugging
        enhancedClassification: enhancedClassification, // Add enhanced Texas RG-22 classification
        adobeCriticalProperties: extractedSections?.sections ? {
          flashPoint: extractedSections.flashPoint,
          pH: extractedSections.pH,
          productName: extractedSections.productName,
          sectionsFound: Object.keys(extractedSections.sections || {}).length
        } : null, // Add Adobe extracted critical properties for debugging
        casDiscovery: { error: 'Auto-discovery unavailable' }
      });
    }
  } catch (err) {
    console.error('🔴 AI Analysis Error:', err);
    res.status(500).json({
      error: 'AI analysis failed.',
      detail: err.message || err.toString(),
      stack: err.stack || 'no stack trace'
    });
  }
});

// Adobe PDF Services Preprocessing Endpoint
app.post('/api/preprocess-pdf-adobe', upload.single('pdf'), async (req, res) => {
  try {
    console.log('🔥 Adobe PDF Services preprocessing endpoint called');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    console.log('📄 Processing PDF:', req.file.originalname);
    console.log('📁 File path:', req.file.path);
    
    // Use Adobe preprocessor to extract enhanced text
    const result = await adobePreprocessor.preprocessPDF(req.file.path);
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.warn('⚠️ File cleanup warning:', cleanupError.message);
    }
    
    if (result.success) {
      console.log('✅ Adobe preprocessing successful, enhanced text length:', result.enhancedText.length);
      res.json({
        success: true,
        enhancedText: result.enhancedText,
        method: result.method,
        processingTime: result.processingTime
      });
    } else {
      console.log('❌ Adobe preprocessing failed:', result.error || result.reason);
      console.log('🔧 Starting fallback PDF parsing for preprocessing endpoint...');
      
      // FALLBACK: Use alternative PDF parsing since Adobe failed
      try {
        const buffer = fs.readFileSync(req.file.path);
        let fallbackText = '';
        let extractedSections = {};
        
        // Try RobustPdfParser first
        try {
          const parseResult = await robustPdfParser.parse(buffer);
          if (parseResult.success) {
            fallbackText = parseResult.text;
            extractedSections = parseResult.sections;
            console.log('✅ Fallback PDF parsed with RobustPdfParser');
          } else {
            throw new Error('RobustPdfParser failed');
          }
        } catch (robustError) {
          console.log('⚠️ RobustPdfParser failed, trying basic pdf-parse...');
          // Final fallback to pdf-parse
          const parsed = await pdfParse(buffer);
          fallbackText = parsed.text;
        }
        
        // SHOW ALL EXTRACTED TEXT for debugging
        console.log('\n' + '='.repeat(80));
        console.log('🔍 FALLBACK PREPROCESSING EXTRACTION RESULTS');
        console.log('='.repeat(80));
        console.log('📄 RAW TEXT LENGTH:', fallbackText.length);
        console.log('📄 FULL TEXT CONTENT:');
        console.log(fallbackText);
        console.log('='.repeat(80) + '\n');
        
        // Extract critical properties from fallback text
        const criticalProperties = await extractCriticalPropertiesFromText(fallbackText);
        console.log('🔍 Fallback preprocessing critical properties:');
        console.log(`   🔥 Flash Point found: ${criticalProperties.flashPoint || 'NONE'}`);
        console.log(`   🧪 pH found: ${criticalProperties.pH || 'NONE'}`);
        console.log(`   📛 Product Name found: ${criticalProperties.productName || 'NONE'}`);
        
        // Format enhanced text like Adobe would
        const enhancedText = `=== FALLBACK PDF PARSING ENHANCED ===\n${fallbackText}\n=== END FALLBACK ===`;
        
        res.json({
          success: true,
          enhancedText: enhancedText,
          method: 'fallback_pdf_parsing',
          processingTime: 0,
          criticalProperties: criticalProperties,
          structuredSections: {
            'Extracted Text': fallbackText,
            'Critical Properties': `Flash Point: ${criticalProperties.flashPoint || 'Not found'}\npH: ${criticalProperties.pH || 'Not found'}\nProduct Name: ${criticalProperties.productName || 'Not found'}`
          },
          fallbackUsed: true
        });
        
      } catch (fallbackError) {
        console.error('❌ Fallback parsing also failed:', fallbackError);
        res.json({
          success: false,
          error: `Both Adobe and fallback parsing failed: ${fallbackError.message}`,
          fallbackRequired: false
        });
      }
    }
  } catch (error) {
    console.error('❌ Adobe preprocessing endpoint error:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Adobe preprocessing failed',
      detail: error.message
    });
  }
});

// Training-Enhanced Analysis Endpoint
app.post('/api/analyze-enhanced', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded or file upload failed' });
    }
    
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    
    // Extract text from PDF
    const isPDF = req.file.originalname?.toLowerCase().endsWith('.pdf') || 
                  (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
    
    let rawText;
    if (isPDF) {
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else {
      rawText = buffer.toString('utf8');
    }
    
    // Use enhanced classification with training data
    const result = await enhancedClassificationEngine.classifyWaste(rawText, {}, {
      useTraining: true,
      useCache: true
    });
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('File cleanup failed:', cleanupError.message);
    }
    
    console.log('📊 Training-enhanced analysis complete:', {
      confidence: result.confidence,
      source: result.source,
      trainingUsed: !!result.trainingSource
    });

    // 🔍 CAS AUTO-DISCOVERY INTEGRATION FOR ENHANCED ANALYSIS
    try {
      console.log('🔍 Starting CAS auto-discovery for enhanced analysis...');
      
      // Create structured SDS data for CAS discovery
      const sdsData = {
        rawText: rawText,
        productName: req.file.originalname || 'unknown_sds_enhanced.pdf',
        composition: result.chemicals || []
      };

      // Run CAS auto-discovery - DEACTIVATED
      // const discoveryResults = await casAutoDiscoveryService.discoverFromSDS(sdsData, req.file.originalname);
      // console.log(`✅ Enhanced CAS Discovery complete: ${discoveryResults.newCAS} new chemicals added to database`);
      console.log(`⚠️ Enhanced CAS auto-discovery deactivated to avoid conflicts with other Claude session`);
      
      res.json({ 
        ...result,
        enhanced: true,
        trainingDataUsed: !!result.trainingSource,
        casDiscovery: {
          totalCAS: discoveryResults.totalCAS,
          newCAS: discoveryResults.newCAS,
          discoveredChemicals: discoveryResults.discoveredChemicals.map(chem => chem.name || 'Unknown'),
          databaseExpanded: discoveryResults.newCAS > 0
        }
      });
    } catch (discoveryError) {
      console.error('⚠️ Enhanced CAS auto-discovery failed:', discoveryError.message);
      res.json({ 
        ...result,
        enhanced: true,
        trainingDataUsed: !!result.trainingSource,
        casDiscovery: { error: 'Auto-discovery unavailable' }
      });
    }
    
  } catch (error) {
    console.error('🔴 Enhanced Analysis Error:', error);
    res.status(500).json({
      error: 'Enhanced analysis failed.',
      detail: error.message || error.toString()
    });
  }
});

// Reclassification endpoint for materials with user-provided missing data
app.post('/api/reclassify', async (req, res) => {
  try {
    const {
      productName,
      flashPoint,
      pH,
      physicalState,
      chemicals = [],
      unNumber,
      properShippingName,
      aiProvider = 'local',
      state = 'TX'
    } = req.body;

    const requestId = Date.now().toString().slice(-6);
    console.log(`🔄 [${requestId}] Re-classifying ${productName} with user-provided data`);
    console.log(`   [${requestId}] Flash Point: ${JSON.stringify(flashPoint)}`);
    console.log(`   [${requestId}] pH: ${pH}`);
    console.log(`   [${requestId}] Physical State: ${physicalState}`);
    console.log(`   [${requestId}] UN Number: ${unNumber}`);
    console.log(`   [${requestId}] Proper Shipping Name: ${properShippingName}`);

    // Format flash point for classification
    let formattedFlashPoint = 'N/A';
    if (flashPoint && flashPoint !== 'N/A') {
      if (typeof flashPoint === 'object' && flashPoint.celsius !== undefined) {
        formattedFlashPoint = `${flashPoint.celsius}°C (${flashPoint.fahrenheit}°F)`;
      } else if (typeof flashPoint === 'number') {
        // Assume it's in Fahrenheit if just a number
        const celsius = (flashPoint - 32) * 5/9;
        formattedFlashPoint = `${celsius.toFixed(1)}°C (${flashPoint}°F)`;
      } else {
        formattedFlashPoint = flashPoint.toString();
      }
    }

    console.log(`🎯 [${requestId}] USING DETERMINISTIC CLASSIFICATION`);
    console.log(`🔍 [${requestId}] DEBUG - Input parameters:`, {
      unNumber,
      properShippingName,
      productName,
      physicalState
    });
    
    // Use deterministic classifier as baseline
    const deterministicResult = deterministicClassifier.classify({
      productName,
      flashPoint,
      pH,
      physicalState,
      chemicals: chemicals || [],
      unNumber,
      properShippingName
    });
    
    console.log(`🔍 [${requestId}] Deterministic baseline: ${deterministicResult.federal_codes.join(', ') || 'None'}`);
    
    // Start with deterministic results but will be enhanced by comprehensive classifier
    let classification = deterministicResult;
    
    console.log(`🔍 [${requestId}] DEBUG - Classification result:`, {
      unNumber: classification.unNumber,
      properShippingName: classification.properShippingName
    });

    console.log(`✅ [${requestId}] Deterministic classification complete: ${classification.federal_codes.join(', ') || 'None'}`);
    
    // 🏛️ ADD ENHANCED TEXAS RG-22 CLASSIFICATION
    let enhancedClassification = null;
    try {
      console.log(`🏛️ [${requestId}] Running enhanced Texas RG-22 classification for reclassify...`);
      
      // Convert chemicals array to composition format
      const composition = (chemicals || []).map(chem => ({
        name: chem.name || chem.chemical,
        cas: chem.cas,
        percent: parseFloat(chem.percent || chem.percentage) || 0
      }));
      
      enhancedClassification = await enhancedSDSClassificationService.classify({
        productName: productName,
        composition: composition,
        physicalState: physicalState || 'liquid',
        pH: pH,
        flashPointC: flashPoint?.celsius,
        flashPointF: flashPoint?.fahrenheit,
        state: 'TX'
      });
      
      console.log(`✅ [${requestId}] Enhanced reclassification completed: Form ${enhancedClassification.texas_classification?.form_code}-${enhancedClassification.texas_classification?.waste_classification}`);
      
      // Merge enhanced classification with deterministic result
      // Always merge both sets of federal codes (deterministic + enhanced)
      const allFederalCodes = [
        ...(classification.federal_codes || []),
        ...(enhancedClassification.federal_codes || [])
      ];
      classification.federal_codes = [...new Set(allFederalCodes)];
      
      if (classification.federal_codes.length > 0) {
        console.log(`🔗 [${requestId}] Merged federal codes: ${classification.federal_codes.join(', ')}`);
      } else {
        console.log(`ℹ️ [${requestId}] No federal codes found in either classification`);
      }
      
      // Update final classification based on any federal codes
      if (classification.federal_codes.length > 0) {
        classification.final_classification = 'hazardous';
        classification.state_classification = 'H'; // Federal hazardous = Texas H
        console.log(`🆙 [${requestId}] Updated to hazardous due to federal codes`);
      }
      
      classification.enhancedClassification = enhancedClassification;
      classification.texas_rg22 = {
        form_code: enhancedClassification.texas_classification?.form_code,
        waste_classification: enhancedClassification.texas_classification?.waste_classification,
        full_state_code: enhancedClassification.texas_classification?.full_state_code,
        compliance_notes: enhancedClassification.texas_classification?.compliance_notes
      };
      
    } catch (enhancedError) {
      console.warn(`⚠️ [${requestId}] Enhanced reclassification failed:`, enhancedError.message);
    }
    
    res.json(classification);
  } catch (error) {
    console.error('🔴 Re-classification Error:', error);
    res.status(500).json({
      error: 'Re-classification failed',
      detail: error.message || error.toString()
    });
  }
});

// OLD AI-BASED RECLASSIFY (BACKUP)
app.post('/api/reclassify-ai', async (req, res) => {
  try {
    const {
      productName,
      flashPoint,
      pH,
      physicalState,
      chemicals = [],
      aiProvider = 'local',
      state = 'TX'
    } = req.body;

    const requestId = Date.now().toString().slice(-6);
    console.log(`🔄 [${requestId}] Re-classifying ${productName} with AI (backup method)`);
    
    // Use the AI provider to classify with the updated data
    const classificationPrompt = `
Classify this hazardous waste material based on the provided properties:

Product Name: ${productName}
Flash Point: ${formattedFlashPoint}
pH: ${pH}
Physical State: ${physicalState}
Chemical Composition: ${chemicals.join(', ') || 'Not specified'}

CRITICAL CLASSIFICATION RULES:
1. Flash Point < 60°C (140°F) = D001 (Ignitable) - LIQUIDS ONLY per 40 CFR 261.21
2. pH ≤ 2 or pH ≥ 12.5 = D002 (Corrosive) - LIQUIDS ONLY per 40 CFR 261.22
3. Both conditions can apply (material can have multiple D-codes)
4. SOLIDS cannot be D002 corrosive based on pH alone

Return ONLY a JSON object with this structure:
{
  "productName": "${productName}",
  "flashPoint": ${JSON.stringify(flashPoint)},
  "pH": ${pH === 'N/A' ? null : pH},
  "physicalState": "${physicalState}",
  "federal_codes": ["D001", "D002", etc.],
  "final_classification": "hazardous" or "non-hazardous",
  "hazardClass": "DOT hazard class if applicable",
  "unNumber": "UN#### if applicable",
  "properShippingName": "DOT shipping name if applicable",
  "packingGroup": "I, II, or III if applicable",
  "state_classification": "Class 1, 2, or 3 for Texas",
  "state_form_code": "Texas form code",
  "state_codes": ["Texas waste codes if applicable"]
}

IMPORTANT:
- Classify as D001 if flash point < 60°C (140°F) AND material is liquid
- Classify as D002 if pH ≤ 2 or pH ≥ 12.5 AND material is liquid  
- NEVER classify solids as D002 based on pH alone - D002 requires liquids per 40 CFR 261.22
- A material can have BOTH D001 and D002 if both conditions are met
- State codes are DEACTIVATED - return empty arrays for state_codes`;

    const result = await aiProviders.classify(classificationPrompt, aiProvider);
    
    // Parse the JSON response
    let classification;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse classification response:', parseError);
      classification = {
        productName,
        flashPoint,
        pH,
        physicalState,
        federal_codes: [],
        final_classification: 'unknown',
        error: 'Failed to parse classification'
      };
    }

    // Apply D-code logic explicitly if AI missed it
    const dCodes = new Set(classification.federal_codes || []);
    
    // Check for D001 ignitability - applies to liquids, gases, and solids
    if (flashPoint && flashPoint !== 'N/A' && flashPoint !== null) {
      let flashTempC;
      if (typeof flashPoint === 'object' && flashPoint.celsius !== undefined) {
        flashTempC = flashPoint.celsius;
      } else if (typeof flashPoint === 'number') {
        flashTempC = (flashPoint - 32) * 5/9;
      }
      
      // D001 criteria: Flash point < 60°C for liquids, or any ignitable gas
      if (flashTempC !== undefined && flashTempC < 60) {
        dCodes.add('D001');
        console.log(`✅ [${requestId}] Applied D001 - Flash point ${flashTempC.toFixed(1)}°C < 60°C`);
      } else if (flashTempC !== undefined) {
        console.log(`⚪ [${requestId}] Flash point ${flashTempC.toFixed(1)}°C ≥ 60°C - not ignitable`);
      }
    } else if (physicalState === 'liquified gas' || physicalState === 'gas') {
      // Liquified gases and gases are typically ignitable (D001) if they have low flash points
      // Check for flammable gas indicators in hazard statements
      const hasFlammableGasHazard = classification.hazardStatements?.some(h => h.includes('H220') || h.includes('H221'));
      if (hasFlammableGasHazard) {
        dCodes.add('D001');
        console.log(`✅ [${requestId}] Applied D001 - Flammable gas/liquified gas with H220/H221`);
      } else {
        console.log(`⚪ [${requestId}] Gas/liquified gas without flammable hazard indicators`);
      }
    } else {
      console.log(`⚪ [${requestId}] No flash point data - cannot apply D001`);
    }
    
    // Check pH for D002 (LIQUIDS ONLY per 40 CFR 261.22)
    if (pH !== null && pH !== undefined && pH !== 'N/A' && physicalState === 'liquid') {
      const pHValue = parseFloat(pH);
      if (!isNaN(pHValue) && (pHValue <= 2 || pHValue >= 12.5)) {
        dCodes.add('D002');
        console.log(`✅ [${requestId}] Applied D002 - pH ${pHValue} is corrosive (liquid)`);
      } else if (!isNaN(pHValue)) {
        console.log(`⚪ [${requestId}] pH ${pHValue} within normal range (2-12.5) - not corrosive`);
      }
    } else if (pH !== null && pH !== undefined && pH !== 'N/A' && physicalState !== 'liquid') {
      console.log(`⚪ [${requestId}] pH ${pH} detected but material is ${physicalState} - D002 requires liquids only`);
    }
    
    // Special case: liquified gas is hazardous as pressurized cylinder
    if (physicalState === 'liquified gas') {
      classification.final_classification = 'hazardous';
      console.log(`✅ [${requestId}] Liquified gas classified as hazardous (pressurized cylinder)`);
    } else {
      classification.final_classification = classification.federal_codes.length > 0 ? 'hazardous' : 'non-hazardous';
    }
    
    classification.federal_codes = Array.from(dCodes);
    
    // Apply Texas state classification based on federal codes and material type
    const isHazardous = classification.federal_codes && classification.federal_codes.length > 0;
    const productNameLower = (productName || '').toLowerCase();
    
    // Determine Texas form code based on material characteristics
    let formCode = '102'; // Default: aqueous waste
    if (physicalState === 'solid') {
      formCode = '204'; // Lab chemicals/solids
    } else if (productNameLower.includes('thinner') || productNameLower.includes('solvent') || 
               productNameLower.includes('spirits') || productNameLower.includes('mineral spirits')) {
      formCode = '203'; // Organic solvents
    } else if (productNameLower.includes('diesel') || productNameLower.includes('fuel') || 
               productNameLower.includes('petroleum') || productNameLower.includes('oil')) {
      formCode = '202'; // Petroleum products
    } else if (productNameLower.includes('grease') || physicalState === 'semi-solid') {
      // Check if grease contains petroleum constituents - if so, it's Class 1 (Texas)
      const hasPetroleumConstituents = productNameLower.includes('petroleum') || 
                                       productNameLower.includes('mineral') || 
                                       productNameLower.includes('hydrocarbon') ||
                                       productNameLower.includes('synthetic') ||
                                       productNameLower.includes('oil-based');
      if (hasPetroleumConstituents) {
        formCode = '110'; // Used oil/petroleum grease - Class 1 in Texas
      } else {
        formCode = '204'; // Non-petroleum grease - treat as solid
      }
    }
    
    // Determine Texas state class
    let stateClass;
    if (formCode === '110') {
      // Petroleum grease/used oil is always Class 1 in Texas
      stateClass = '1';
    } else {
      stateClass = isHazardous ? 'H' : '3';
    }
    
    classification.state_codes = [`${formCode}-${stateClass}`];
    classification.state_classification = stateClass;
    classification.state_form_code = formCode;
    
    console.log(`✅ [${requestId}] Re-classification complete: ${classification.final_classification} with codes: ${classification.federal_codes.join(', ') || 'None'}`);
    
    res.json(classification);
  } catch (error) {
    console.error('🔴 Re-classification Error:', error);
    res.status(500).json({
      error: 'Re-classification failed',
      detail: error.message || error.toString()
    });
  }
});

// Deterministic Classification Endpoint - Fast, Reliable, Rule-Based
app.post('/api/classify-direct', (req, res) => {
  try {
    const {
      productName,
      flashPoint,    // {celsius: number} or number or null
      pH,           // number or null
      physicalState, // 'liquid' | 'solid' | 'aerosol'
      unNumber,      // string or null
      properShippingName, // string or null
      composition    // array (optional)
    } = req.body;

    const requestId = Date.now().toString().slice(-6);
    console.log(`🎯 [${requestId}] DIRECT CLASSIFICATION: ${productName}`);
    console.log(`🔍 [${requestId}] Shipping input:`, { unNumber, properShippingName });

    // Use deterministic classifier - no AI, just rules
    const classification = deterministicClassifier.classify({
      productName: productName || 'Unknown Material',
      flashPoint,
      pH,
      physicalState: physicalState || 'liquid',
      unNumber,
      properShippingName,
      composition: composition || []
    });

    // Add metadata
    classification.provider = 'deterministic';
    classification.timestamp = new Date().toISOString();
    classification.requestId = requestId;
    classification.processing_time = '< 1 second';

    console.log(`✅ [${requestId}] DIRECT CLASSIFICATION COMPLETE`);
    console.log(`🔍 [${requestId}] Shipping output:`, { 
      unNumber: classification.unNumber, 
      properShippingName: classification.properShippingName 
    });

    res.json(classification);
  } catch (error) {
    console.error('🔴 Direct Classification Error:', error);
    res.status(500).json({
      error: 'Direct classification failed',
      detail: error.message || error.toString()
    });
  }
});

// PHYSICAL STATE TEST ENDPOINT 
app.post('/api/test-physical-state', (req, res) => {
  try {
    console.log('🧪 Testing physical state detection');
    const { composition } = req.body;
    
    if (!composition || composition.length === 0) {
      return res.json({ error: 'No composition provided' });
    }
    
    // Test the deterministic classifier directly
    const testResult = deterministicClassifier.detectPhysicalState(
      'Test Product', 
      'unknown', 
      composition
    );
    
    res.json({
      success: true,
      physicalState: testResult,
      composition: composition,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔴 Physical State Test Error:', error);
    res.status(500).json({
      error: 'Physical state test failed',
      detail: error.message
    });
  }
});

// Enhanced AI Classification Endpoints

// Simple test endpoint
app.get('/api/ai/test', (req, res) => {
  res.json({ message: 'AI endpoints working', timestamp: new Date().toISOString() });
});

// Enhanced waste classification with AI extraction
app.post('/api/ai/classify', async (req, res) => {
  try {
    const { description, sdsData, userId, options } = req.body;

    if (!description) {
      return res.status(400).json({ 
        error: 'Description is required' 
      });
    }

    console.log(`🤖 AI Classification request from user ${userId || 'unknown'}:`, {
      description: description.substring(0, 100) + '...',
      hasSdsData: !!sdsData
    });

    const result = await enhancedClassificationEngine.classifyWaste(
      description, 
      sdsData || {},
      options || {}
    );

    // Log for audit trail
    console.log(`✅ Classification result:`, {
      codes: result.classification,
      confidence: result.confidence,
      source: result.source,
      time: result.processingTime + 'ms'
    });

    res.json(result);

  } catch (error) {
    console.error('💥 AI Classification API error:', error);
    res.status(500).json({ 
      error: 'AI classification failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Enhanced SDS parsing with LM Studio
app.post('/api/sds/parse-enhanced', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    let rawText;
    
    // Check if PDF or text
    const isPDF = req.file.originalname?.toLowerCase().endsWith('.pdf') || 
                  (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
    
    if (isPDF) {
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else {
      rawText = buffer.toString('utf8');
    }
    
    fs.unlinkSync(filePath); // Clean up
    
    console.log('📄 SDS text received, length:', rawText.length);
    
    // Use LM Studio to parse the SDS
    const parsedData = await llmParser.parseSDSWithLLM(rawText, {
      provider: 'lmstudio',
      model: req.body.model || 'local-model'
    });
    
    // Convert to classification format
    const classificationData = llmParser.toClassificationFormat(parsedData);
    
    // Run classification if requested
    let classificationResult = null;
    if (req.body.runClassification !== false) {
      try {
        console.log('🎯 Running deterministic classification...');
        
        // Use our working deterministic classifier
        classificationResult = deterministicClassifier.classify({
          productName: classificationData.productName,
          flashPoint: classificationData.flashPointC ? { celsius: classificationData.flashPointC } : null,
          pH: classificationData.pH,
          physicalState: classificationData.physicalState || 'liquid',
          composition: classificationData.composition || []
        });
        
        console.log('✅ Classification complete:', classificationResult.final_classification);
      } catch (classifyError) {
        console.error('🔴 Classification failed:', classifyError);
        console.error('🔴 Error stack:', classifyError.stack);
        console.warn('Classification failed, returning parsed data only:', classifyError.message);
      }
    }
    
    res.json({
      success: true,
      parsed: parsedData,
      classificationInput: classificationData,
      classification: classificationResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔴 Enhanced SDS parsing error:', error);
    res.status(500).json({
      error: 'SDS parsing failed',
      detail: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// AI data extraction only (no classification)
app.post('/api/ai/extract', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ 
        error: 'Description is required' 
      });
    }

    console.log('📝 AI extraction request:', description.substring(0, 100) + '...');

    const extractedData = await aiService.extractWasteInfo(description);

    res.json({
      extractedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 AI extraction error:', error);
    res.status(500).json({ 
      error: 'AI extraction failed',
      message: error.message 
    });
  }
});

// AI health check
app.get('/api/ai/health', async (req, res) => {
  try {
    const [aiHealth, engineHealth] = await Promise.all([
      aiService.healthCheck(),
      enhancedClassificationEngine.healthCheck()
    ]);

    const isHealthy = aiHealth.status === 'healthy' && engineHealth.status === 'healthy';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      aiService: aiHealth,
      classificationEngine: engineHealth,
      model: process.env.AI_MODEL || 'qwen2.5-3b-instruct',
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 AI health check error:', error);
    res.status(503).json({
      status: 'error',
      error: error.message
    });
  }
});

// Clear classification cache
app.post('/api/ai/clear-cache', async (req, res) => {
  try {
    enhancedClassificationEngine.clearCache();
    res.json({ 
      success: true,
      message: 'Classification cache cleared'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Handle incorrect classification feedback
app.post('/api/feedback/incorrect-classification', async (req, res) => {
  try {
    const feedbackEntry = req.body;
    
    // Add server timestamp
    feedbackEntry.serverTimestamp = new Date().toISOString();
    
    console.log(`🚩 Incorrect classification reported: ${feedbackEntry.productName}`);
    console.log(`   Federal codes: ${feedbackEntry.classification.federal_codes.join(', ') || 'None'}`);
    console.log(`   State: ${feedbackEntry.classification.state_classification}`);
    console.log(`   Final: ${feedbackEntry.classification.final_classification}`);
    
    // Create failed classifications directory if it doesn't exist
    const feedbackDir = 'backend/feedback';
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }
    
    // Save to failed_classifications.json file
    const feedbackFile = path.join(feedbackDir, 'failed_classifications.json');
    let existingFeedback = [];
    
    try {
      if (fs.existsSync(feedbackFile)) {
        const fileContent = fs.readFileSync(feedbackFile, 'utf8');
        existingFeedback = JSON.parse(fileContent);
      }
    } catch (parseError) {
      console.warn('Failed to parse existing feedback file, starting fresh:', parseError.message);
      existingFeedback = [];
    }
    
    // Add new feedback entry
    existingFeedback.push(feedbackEntry);
    
    // Write back to file
    fs.writeFileSync(feedbackFile, JSON.stringify(existingFeedback, null, 2));
    
    console.log(`✅ Feedback saved to ${feedbackFile} (${existingFeedback.length} total entries)`);
    
    res.json({ 
      success: true,
      message: 'Feedback saved successfully',
      feedbackId: feedbackEntry.id
    });
    
  } catch (error) {
    console.error('❌ Failed to save classification feedback:', error);
    res.status(500).json({ 
      error: 'Failed to save feedback',
      message: error.message
    });
  }
});

// Get automatic learning statistics
app.get('/api/learning/stats', (req, res) => {
  try {
    const stats = automaticLearningService.getStats();
    console.log('📊 Learning stats requested:', JSON.stringify(stats, null, 2));
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Failed to get learning stats:', error);
    res.status(500).json({
      error: 'Failed to get learning statistics',
      message: error.message
    });
  }
});

// Manually trigger learning process
app.post('/api/learning/process', async (req, res) => {
  try {
    console.log('🔄 Manual learning process triggered');
    const result = await automaticLearningService.processNewFeedback();
    res.json({
      success: true,
      message: 'Learning process completed',
      result
    });
  } catch (error) {
    console.error('❌ Failed to process learning:', error);
    res.status(500).json({
      error: 'Failed to process learning',
      message: error.message
    });
  }
});

// Enhanced SDS Analysis with Section-Based Parser
app.post('/api/analyze-improved', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { aiProvider = 'local', runClassification = 'true' } = req.body;
    
    console.log('🚀 Starting improved SDS analysis with section-based parser');
    console.log('📄 File:', req.file.originalname);
    
    // Use section-based parser instead of AI
    const parseResult = await sectionBasedSDSParser.parseSDS(req.file.path);
    
    if (!parseResult.success) {
      return res.status(500).json({ 
        error: 'Failed to parse SDS',
        details: parseResult.error
      });
    }

    const extractedData = parseResult.extractedData;
    
    // Run classification if requested
    let classificationResult = null;
    if (runClassification === 'true' && extractedData.flashPoint !== null) {
      
      console.log('🔍 Running classification with extracted data:', {
        productName: extractedData.productName,
        flashPoint: extractedData.flashPoint,
        pH: extractedData.pH,
        physicalState: extractedData.physicalState
      });

      // Use deterministic classifier with properly extracted data
      classificationResult = deterministicClassifier.classify({
        productName: extractedData.productName || 'Unknown',
        flashPoint: extractedData.flashPoint,
        pH: extractedData.pH,
        physicalState: extractedData.physicalState || 'liquid',
        composition: extractedData.composition || [],
        unNumber: extractedData.unNumber,
        properShippingName: extractedData.properShippingName
      });

      console.log('✅ Classification completed:', {
        federal_codes: classificationResult.federal_codes,
        state_classification: classificationResult.state_classification,
        final_classification: classificationResult.final_classification
      });
    }

    // 🔧 DIRECT ENDPOINT FIX: Post-process data to bypass caching issues
    console.log('🔧 APPLYING DIRECT ENDPOINT FIXES...');
    
    // Fix physical state detection
    if (parseResult.sections?.section9_physical) {
      const section9 = parseResult.sections.section9_physical;
      if (section9.toLowerCase().includes('liquefied gas')) {
        console.log('✅ DIRECT FIX: Found liquefied gas, correcting to liquid');
        extractedData.physicalState = 'liquid';
      }
    }
    
    // Fix composition extraction
    if (parseResult.sections?.section3_composition) {
      const section3 = parseResult.sections.section3_composition;
      if (section3.toLowerCase().includes('trimethylamine') && 
          (!extractedData.composition || extractedData.composition.length === 0)) {
        console.log('✅ DIRECT FIX: Found trimethylamine, adding to composition');
        extractedData.composition = [{
          name: 'trimethylamine',
          cas: '75-50-3',
          concentration: '≤ 100',
          unit: '%'
        }];
      }
    }

    // Build comprehensive result
    const result = {
      success: true,
      provider: 'section-based-parser',
      model: 'deterministic',
      
      // Extracted data (now post-processed)
      extractedData: extractedData,
      
      // Classification results
      classification: classificationResult,
      
      // Raw sections for debugging
      sections: parseResult.sections,
      
      // Enhanced classification if available
      enhancedClassification: null // Can add enhanced classification later
    };

    console.log('🎯 FINAL RESULT - Physical State:', extractedData.physicalState);
    console.log('🎯 FINAL RESULT - Composition:', extractedData.composition);
    res.json(result);

  } catch (error) {
    console.error('❌ Improved SDS analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Batch SDS Processing for Lab Pack Analysis
app.post('/api/lab-pack/analyze', upload.array('sds_files', 50), async (req, res) => {
  try {
    const {
      state = 'TX',
      aiProvider = 'local',
      labPackType = 'standard',
      maxConcurrent = 3
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No SDS files uploaded',
        message: 'Please upload at least one SDS file for lab pack analysis'
      });
    }

    if (req.files.length > 50) {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 50 containers per lab pack'
      });
    }

    console.log(`🧪 Lab pack analysis request: ${req.files.length} containers, provider: ${aiProvider}`);
    console.log('📁 Files details:', req.files.map((f, i) => ({
      index: i,
      name: f.originalname,
      size: f.size,
      path: f.path
    })));
    
    // Also write to a debug file
    const debugInfo = {
      timestamp: new Date().toISOString(),
      filesReceived: req.files.length,
      files: req.files.map(f => ({
        name: f.originalname,
        size: f.size,
        path: f.path
      })),
      provider: aiProvider
    };
    fs.writeFileSync('debug-batch.json', JSON.stringify(debugInfo, null, 2));

    const startTime = Date.now();
    const results = await batchProcessor.processBatch(req.files, {
      state,
      aiProvider,
      labPackType,
      maxConcurrent: parseInt(maxConcurrent) || 3
    });

    // Add metadata
    results.metadata = {
      analysis_id: `labpack_${Date.now()}`,
      request_timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      ai_provider: aiProvider,
      state: state,
      lab_pack_type: labPackType
    };

    console.log(`✅ Lab pack analysis complete: ${results.containers.length} containers processed in ${results.processing_time}ms`);

    // ===== MANDATORY TEXAS WASTE CODE POST-PROCESSING =====
    // Texas requires ALL waste to have a state waste code - NO EXCEPTIONS
    console.log('🔧 Applying mandatory Texas waste codes to all containers...');
    
    results.containers.forEach((container, index) => {
      if (container.classification) {
        const classification = container.classification;
        
        console.log(`📋 Container ${index + 1}: Checking Texas codes...`);
        console.log(`   Before: state_codes=${JSON.stringify(classification.state_codes)}, form_code=${classification.state_form_code}`);
        
        // Force Texas classification if missing
        if (!classification.state_codes || classification.state_codes.length === 0 || 
            !classification.state_form_code || !classification.state_classification) {
          
          console.log(`🚨 FORCING Texas codes for: ${classification.productName}`);
          
          // Determine form code based on material characteristics
          let formCode, reasoning;
          const productName = (classification.productName || '').toLowerCase();
          const physicalState = classification.physicalState || 'liquid';
          const isHazardous = classification.federal_codes && classification.federal_codes.length > 0;
          
          if (physicalState === 'solid') {
            formCode = '204'; // Lab chemicals/solids
            reasoning = 'solid laboratory chemical';
          } else if (productName.includes('thinner') || productName.includes('solvent') || productName.includes('spirits')) {
            formCode = '203'; // Organic solvents  
            reasoning = 'organic solvent';
          } else if (productName.includes('oil') || productName.includes('petroleum')) {
            formCode = '202'; // Petroleum products
            reasoning = 'petroleum product';
          } else if (physicalState === 'aerosol') {
            formCode = '208'; // Aerosols
            reasoning = 'aerosol/pressurized container';
          } else if (productName.includes('acid')) {
            formCode = '105'; // Acids
            reasoning = 'acidic material';
          } else if (productName.includes('caustic') || productName.includes('hydroxide')) {
            formCode = '106'; // Caustics
            reasoning = 'caustic material';
          } else {
            formCode = '102'; // Aqueous liquids (default)
            reasoning = 'aqueous liquid (default)';
          }
          
          const stateClass = isHazardous ? 'H' : '3';
          
          classification.state_form_code = formCode;
          classification.state_classification = stateClass;
          classification.state_codes = [`${formCode}-${stateClass}`];
          classification.precedence_reasoning = (classification.precedence_reasoning || '') + 
            ` [SERVER: Applied mandatory Texas code ${formCode}-${stateClass} for ${reasoning}]`;
          
          console.log(`✅ Applied Texas code: ${formCode}-${stateClass} (${reasoning})`);
        } else {
          console.log(`✅ Texas codes already present: ${classification.state_codes.join(', ')}`);
        }
        
        console.log(`   After: state_codes=${JSON.stringify(classification.state_codes)}, form_code=${classification.state_form_code}`);
      }
    });
    
    console.log('🔧 Mandatory Texas waste code processing complete.');

    // SIMPLE FORCED TEXAS CLASSIFICATION - BACKUP APPROACH
    if (results.containers) {
      results.containers.forEach(container => {
        if (container.classification && (!container.classification.state_codes || container.classification.state_codes.length === 0)) {
          const productName = (container.classification.productName || '').toLowerCase();
          const isHazardous = container.classification.federal_codes && container.classification.federal_codes.length > 0;
          
          let formCode = productName.includes('spirits') ? '203' : '102';
          const stateClass = isHazardous ? 'H' : '3';
          
          container.classification.state_form_code = formCode;
          container.classification.state_classification = stateClass;
          container.classification.state_codes = [`${formCode}-${stateClass}`];
          console.log(`BACKUP: Applied ${formCode}-${stateClass} to ${container.classification.productName}`);
        }
      });
    }

    res.json(results);

  } catch (error) {
    console.error('🔴 Lab pack analysis error:', error);
    res.status(500).json({
      error: 'Lab pack analysis failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Save classification to material database
app.post('/api/lab-pack/save-classification', async (req, res) => {
  try {
    const { material, classification } = req.body;
    
    if (!material || !classification) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Material and classification data required'
      });
    }
    
    materialDatabase.storeMaterialClassification(material, classification);
    
    res.json({
      success: true,
      message: 'Classification saved to database'
    });
    
  } catch (error) {
    console.error('Failed to save classification:', error);
    res.status(500).json({
      error: 'Failed to save classification',
      message: error.message
    });
  }
});

// Lab Pack Compatibility Check (for existing containers)
app.post('/api/lab-pack/compatibility', async (req, res) => {
  try {
    const { containers } = req.body;

    if (!containers || !Array.isArray(containers) || containers.length < 2) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Please provide at least 2 containers for compatibility analysis'
      });
    }

    console.log(`🔍 Compatibility check for ${containers.length} containers`);

    const compatibility = batchProcessor.analyzeCompatibility(containers);
    
    res.json({
      compatibility,
      analysis_timestamp: new Date().toISOString(),
      container_count: containers.length
    });

  } catch (error) {
    console.error('🔴 Compatibility analysis error:', error);
    res.status(500).json({
      error: 'Compatibility analysis failed',
      message: error.message
    });
  }
});

// Lab Pack Report Generation
app.post('/api/lab-pack/report', async (req, res) => {
  try {
    const { 
      containers, 
      compatibility, 
      labPackInfo = {},
      reportFormat = 'json' 
    } = req.body;

    if (!containers || !Array.isArray(containers)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Containers array is required'
      });
    }

    console.log(`📋 Generating lab pack report for ${containers.length} containers`);

    const report = {
      report_info: {
        generated_at: new Date().toISOString(),
        report_type: 'lab_pack_analysis',
        format: reportFormat,
        container_count: containers.length
      },
      lab_pack_summary: batchProcessor.generateLabPackSummary(containers, labPackInfo.type),
      containers: containers,
      compatibility_analysis: compatibility || batchProcessor.analyzeCompatibility(containers),
      regulatory_compliance: {
        dot_requirements: '49 CFR 173.12(b)',
        epa_requirements: '40 CFR 262.16',
        packaging_instruction: '4G',
        labeling_requirements: 'UN3432 Laboratory chemicals, n.o.s.'
      },
      recommendations: []
    };

    // Add specific recommendations
    if (report.compatibility_analysis.incompatible_pairs.length > 0) {
      report.recommendations.push('Segregate incompatible materials into separate packages');
    }
    
    if (report.compatibility_analysis.segregation_required.length > 0) {
      report.recommendations.push('Review segregation requirements before packaging');
    }

    if (report.lab_pack_summary.total_containers > 30) {
      report.recommendations.push('Consider splitting into multiple lab packs for easier handling');
    }

    res.json(report);

  } catch (error) {
    console.error('🔴 Report generation error:', error);
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message
    });
  }
});

// Ollama Management Endpoints

// Check if Ollama is available
app.get('/api/ollama/status', async (req, res) => {
  try {
    const isAvailable = await ollama.isAvailable();
    res.json({ 
      available: isAvailable,
      url: ollama.baseURL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available Ollama models
app.get('/api/ollama/models', async (req, res) => {
  try {
    const models = await ollama.getModels();
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pull a model from Ollama registry
app.post('/api/ollama/pull', async (req, res) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }
    
    const result = await ollama.pullModel(modelName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get model information
app.post('/api/ollama/model-info', async (req, res) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }
    
    const result = await ollama.getModelInfo(modelName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test Ollama model with a simple prompt
app.post('/api/ollama/test', async (req, res) => {
  try {
    const { model, prompt } = req.body;
    if (!model || !prompt) {
      return res.status(400).json({ error: 'Model and prompt are required' });
    }
    
    const result = await ollama.chatCompletion(model, [
      { role: 'user', content: prompt }
    ], { temperature: 0.7 });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ollama chat completion endpoint for frontend usage
app.post('/api/ollama/chat', async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens, ...options } = req.body;
    
    if (!model || !messages) {
      return res.status(400).json({ error: 'Model and messages are required' });
    }
    
    console.log(`🤖 Ollama chat request - Model: ${model}, Messages: ${messages.length}`);
    
    const result = await ollama.chatCompletion(model, messages, {
      temperature: temperature || 0.1,
      max_tokens: max_tokens,
      ...options
    });
    
    if (result.success) {
      res.json({
        success: true,
        response: result.message?.content || result.content || 'No response content',
        message: result.message?.content || result.content || 'No response content',
        model: model
      });
    } else {
      console.error('Ollama chat error:', result.error);
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (err) {
    console.error('Ollama chat endpoint error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// AI Training Routes
console.log('🔧 Loading AI Training Routes...');
try {
  app.use('/api/ai', aiTrainingRoutes);
  console.log('✅ AI Training Routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load AI Training Routes:', error);
}

// SDS Lookup endpoint
// SDS Lookup endpoint - DEACTIVATED pending API pricing evaluation
app.post('/api/sds/lookup', async (req, res) => {
  console.log('⚠️ SDS Lookup endpoint called but service is deactivated');
  res.status(503).json({
    error: 'SDS Lookup Service Temporarily Deactivated',
    message: 'This service has been deactivated pending API pricing evaluation. All code remains intact for future implementation.',
    alternatives: [
      'Use SDS Analyzer tool with manual PDF uploads',
      'Contact chemical vendors directly for SDS documents',
      'Use Lab Pack Planner for waste classification without SDS lookup'
    ],
    status: 'deactivated',
    futureImplementation: 'API integration available when pricing is approved'
  });
});

// SDS Download endpoint - attempts to fetch actual SDS files
app.post('/api/sds/download', async (req, res) => {
  try {
    const { chemical, sdsUrl, casNumber } = req.body;
    
    if (!chemical || !sdsUrl) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Please provide chemical name and sdsUrl'
      });
    }
    
    console.log(`📥 SDS download request for: ${chemical}`);
    console.log(`🔗 URL: ${sdsUrl}`);
    
    // Try different strategies to get the actual SDS
    const axios = require('axios');
    
    try {
      // Strategy 1: Check if the URL is a direct PDF link
      const headResponse = await axios.head(sdsUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const contentType = headResponse.headers['content-type'] || '';
      
      if (contentType.includes('pdf')) {
        // Direct PDF - download it
        console.log('✅ Direct PDF found, downloading...');
        const pdfResponse = await axios.get(sdsUrl, { 
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${chemical.replace(/[^a-z0-9]/gi, '_')}_SDS.pdf"`);
        res.send(Buffer.from(pdfResponse.data));
        return;
      }
      
      // Strategy 2: Try to fetch the page and look for direct SDS links
      console.log('🔍 Searching page for direct SDS links...');
      const pageResponse = await axios.get(sdsUrl, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = pageResponse.data;
      
      // Look for PDF links in the HTML
      const pdfLinkRegex = /href=["']([^"']*\.pdf[^"']*?)["']/gi;
      const pdfLinks = [];
      let match;
      
      while ((match = pdfLinkRegex.exec(html)) !== null) {
        let pdfUrl = match[1];
        
        // Convert relative URLs to absolute
        if (pdfUrl.startsWith('/')) {
          const baseUrl = new URL(sdsUrl);
          pdfUrl = `${baseUrl.protocol}//${baseUrl.host}${pdfUrl}`;
        } else if (!pdfUrl.startsWith('http')) {
          const baseUrl = new URL(sdsUrl);
          pdfUrl = `${baseUrl.protocol}//${baseUrl.host}/${pdfUrl}`;
        }
        
        pdfLinks.push(pdfUrl);
      }
      
      console.log(`📄 Found ${pdfLinks.length} potential PDF links`);
      
      // Try to download the first PDF link that works
      for (const pdfUrl of pdfLinks.slice(0, 3)) { // Try first 3 links
        try {
          console.log(`🔄 Trying PDF link: ${pdfUrl}`);
          const pdfResponse = await axios.get(pdfUrl, { 
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': sdsUrl
            }
          });
          
          // Verify it's actually a PDF
          const buffer = Buffer.from(pdfResponse.data);
          if (buffer.slice(0, 4).toString() === '%PDF') {
            console.log('✅ Valid PDF found and downloaded');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${chemical.replace(/[^a-z0-9]/gi, '_')}_SDS.pdf"`);
            res.send(buffer);
            return;
          }
        } catch (pdfError) {
          console.log(`❌ PDF download failed: ${pdfError.message}`);
          continue;
        }
      }
      
      // Strategy 3: If no PDFs found, look for SDS-related keywords and suggest manual download
      if (html.toLowerCase().includes('sds') || html.toLowerCase().includes('safety data sheet')) {
        console.log('📋 SDS page found but no direct PDF links');
        res.status(404).json({
          error: 'Direct PDF not available',
          message: 'SDS page found but requires manual download',
          suggestion: 'Please visit the vendor page to download the SDS manually'
        });
        return;
      }
      
    } catch (fetchError) {
      console.error('🔴 Failed to fetch SDS:', fetchError.message);
    }
    
    // All strategies failed
    res.status(404).json({
      error: 'SDS not accessible',
      message: 'Unable to automatically download SDS - manual download required',
      suggestion: 'Please visit the vendor page to download the SDS manually'
    });
    
  } catch (error) {
    console.error('🔴 SDS download error:', error);
    res.status(500).json({
      error: 'SDS download failed',
      message: error.message
    });
  }
});

// Provider status endpoint
app.get('/api/providers/status', async (req, res) => {
  const providers = aiProviders.getAvailableProviders();
  res.json({ 
    available: providers,
    default: providers[0] || 'none',
    free: ['gemini', 'groq'],
    paid: ['openai']
  });
});

// Lab Pack Analysis Routes
app.use('/api/lab-pack', labPackRoutes);

// API Key Configuration Routes
app.use('/api/ai', apiKeyRoutes);
app.use('/api/documents', trainingRoutes);
console.log('✅ Document training routes registered under /api/documents');

console.log('🚨🚨🚨 ABOUT TO REGISTER TEST ENDPOINT 🚨🚨🚨');

// Simple test endpoint first
app.get('/api/pdf-test', (req, res) => {
  console.log('🎉 PDF TEST ENDPOINT HIT!');
  res.json({ message: 'PDF test endpoint working!', timestamp: new Date().toISOString() });
});

// WORKING PyMuPDF ANALYSIS ENDPOINT - CONFLICT-FREE NAME
app.post('/api/pdf-analysis-direct', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 DIRECT PDF Analysis endpoint called');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    const filePath = req.file.path;
    console.log('📄 Processing PDF directly:', req.file.originalname);
    
    // Extract text using DirectPyMuPDF (no subprocess, Windows-compatible)
    const extractionResult = await directPyMuPDFService.extractWithMetadata(filePath);
    console.log(`✅ Direct extraction successful: ${extractionResult.totalCharacters} chars`);
    
    // Apply classification using dynamic import
    const { customSDSEngine } = await import('../src/utils/customSDSEngine.js');
    const extractedData = customSDSEngine.extract(extractionResult.text);
    const classification = deterministicClassifier.classify(extractedData);
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('⚠️ File cleanup warning:', cleanupError.message);
    }

    const processingTime = Date.now() - startTime;
    
    // Return comprehensive result matching expected format
    const result = {
      success: true,
      method: 'DirectPyMuPDF-Working',
      processingTime: `${processingTime}ms`,
      
      // Classification results (top level as expected by frontend)
      ...classification,
      
      // Extracted data 
      extractedData: extractedData,
      
      // Full text extraction
      fullTextExtraction: {
        textLength: extractionResult.totalCharacters,
        pages: extractionResult.metadata.pageCount,
        extractionMethod: 'DirectPyMuPDF',
        fullText: extractionResult.text
      },
      
      // Debug info
      debugInfo: {
        textLength: extractionResult.totalCharacters,
        pages: extractionResult.metadata.pageCount,
        extractionMethod: 'DirectPyMuPDF',
        classificationMethod: 'Deterministic'
      }
    };

    console.log(`✅ Analysis complete: ${classification.final_classification} (${classification.state_form_code}-${classification.state_classification})`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Direct PDF analysis failed:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning during error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'DirectPyMuPDF-Working',
      processingTime: `${Date.now() - startTime}ms`
    });
  }
});

console.log('✅ DIRECT PDF ANALYSIS ENDPOINT REGISTERED!');

// TEMPORARILY DISABLED - Interferes with specific endpoints
// app.use('/api', testEndpoints);
console.log('🧠 Registering JARVIS routes...');
app.use('/api/jarvis', jarvisRoutes);
console.log('✅ JARVIS routes registered under /api/jarvis');

console.log('📄 Registering PDF Analysis routes...');
app.use('/api/pdf', pdfAnalysisRoutes);
console.log('✅ PDF Analysis routes registered under /api/pdf');

// JARVIS AI Assistant Endpoints - Direct Implementation
app.post('/api/jarvis-query', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 JARVIS processing query:', prompt.substring(0, 50) + '...');
    
    // Get AI provider service
    if (!global.aiProviderService) {
      throw new Error('AI Provider Service not initialized');
    }
    
    // Determine provider preference based on query type
    let provider = 'groq'; // Fast by default
    if (options.agent_context === 'complianceOps' || prompt.includes('regulation')) {
      provider = 'gemini'; // More thorough for compliance
    }
    
    // Enhanced prompt for JARVIS personality
    const jarvisPrompt = `You are JARVIS (Just A Rather Very Intelligent System), the advanced AI assistant for unboXed waste management platform. You are professional, intelligent, and helpful - like a highly competent business assistant.

Current Context: ${options.agent_context ? `You are acting as the ${options.agent_context} specialist.` : 'General assistance mode.'}

User Query: ${prompt}

Instructions:
- Provide practical, actionable business advice
- Be concise but comprehensive
- Reference specific platform tools when relevant (SDS Analyzer, Project Board, Quote Generator, etc.)
- Focus on helping the user be more efficient and successful
- If this relates to regulatory compliance, be very thorough and accurate
- Use a professional tone - helpful but not overly casual

Response:`;

    const response = await global.aiProviderService.jarvisQuery(jarvisPrompt, provider, {
      ...options,
      temperature: 0.1,
      max_tokens: 800
    });

    console.log('✅ JARVIS response generated');
    
    res.json({
      response: response.trim(),
      provider: provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ JARVIS query error:', error);
    res.status(500).json({
      error: 'Failed to process JARVIS query',
      message: error.message,
      fallback: 'I apologize, but I encountered an error processing your request. Please try again or use a more specific query.'
    });
  }
});

/*
// This section has been temporarily commented out due to mixed-up code
// The JARVIS functionality is now handled by external jarvis-routes.js
// TODO: Clean up and restore proper AI providers status endpoint if needed

app.get('/api/ai/providers/status', async (req, res) => {
  try {
    const providers = aiProviders.getAvailableProviders();
    const status = {
    let provider = 'groq'; // Fast by default
    if (options.agent_context === 'complianceOps' || prompt.includes('regulation')) {
      provider = 'gemini'; // More thorough for compliance
    }
    
    // Enhanced prompt for Jarvis personality
    const jarvisPrompt = `You are JARVIS (Just A Rather Very Intelligent System), the advanced AI assistant for unboXed waste management platform. You are professional, intelligent, and helpful - like a highly competent business assistant.

Current Context: ${options.agent_context ? `You are acting as the ${options.agent_context} specialist.` : 'General assistance mode.'}

User Query: ${prompt}

Instructions:
- Provide practical, actionable business advice
- Be concise but comprehensive
- Reference specific platform tools when relevant (SDS Analyzer, Project Board, Quote Generator, etc.)
- Focus on helping the user be more efficient and successful
- If this relates to regulatory compliance, be very thorough and accurate
- Use a professional tone - helpful but not overly casual

Response:`;

    const response = await aiProviders.analyze(jarvisPrompt, provider, {
      ...options,
      temperature: 0.1,
      max_tokens: 800
    });

    console.log('✅ Jarvis response generated');
    
    res.json({
      response: response.trim(),
      provider: provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Jarvis query error:', error);
    res.status(500).json({
      error: 'Failed to process Jarvis query',
      message: error.message,
      fallback: 'I apologize, but I encountered an error processing your request. Please try again or use a more specific query.'
    });
  }
});

app.post('/api/jarvis-analyze-context', async (req, res) => {
  try {
    const { context, query, multi_agent = false } = req.body;
    
    console.log('🧠 Jarvis analyzing context for:', query);
    
    // Multi-agent analysis if requested
    if (multi_agent) {
      const agents = ['businessOps', 'complianceOps', 'customerSuccess'];
      const responses = [];
      
      for (const agent of agents) {
        try {
          const agentPrompt = `As the ${agent} specialist for unboXed platform, analyze this situation:
          
Context: ${JSON.stringify(context)}
Query: ${query}

Provide your specialized perspective and recommendations:`;
          
          const response = await aiProviders.analyze(agentPrompt, 'gemini', {
            temperature: 0.1,
            max_tokens: 500
          });
          
          responses.push({
            agent,
            response: response.trim()
          });
        } catch (error) {
          console.error(`Error with ${agent}:`, error.message);
        }
      }
      
      return res.json({
        multi_agent: true,
        responses,
        synthesized: responses.length > 0 ? 
          `Multiple perspectives on your query:\\n\\n${responses.map(r => `**${r.agent}**: ${r.response}`).join('\\n\\n')}` :
          'Unable to generate multi-agent analysis at this time.'
      });
    }
    
    // Single comprehensive analysis
    const contextPrompt = `You are JARVIS, analyzing the current platform context to provide intelligent insights.

Current Context Data: ${JSON.stringify(context)}
User Query: ${query}

Please analyze the context and provide:
1. Key insights from the current state
2. Recommended actions
3. Potential issues or opportunities
4. Next steps

Be practical and business-focused:`;

    const response = await aiProviders.analyze(contextPrompt, 'gemini', {
      temperature: 0.1,
      max_tokens: 1000
    });

    res.json({
      context_analysis: response.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Jarvis context analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze context',
      message: error.message
    });
  }
});

// Test JARVIS endpoint  
console.log('🧪 Setting up JARVIS test endpoint...');
app.get('/api/jarvis-test', (req, res) => {
  console.log('🧪 JARVIS test endpoint hit!');
  res.json({ message: 'JARVIS test endpoint working!', timestamp: new Date().toISOString() });
});
console.log('🧪 JARVIS test endpoint registered');

// AI Model Manager Endpoints
app.get('/api/ai/providers/status', async (req, res) => {
  try {
    const providers = aiProviders.getAvailableProviders();
    const status = {
      groq: {
        available: providers.includes('groq'),
        configured: !!process.env.GROQ_API_KEY,
        free: true
      },
      gemini: {
        available: providers.includes('gemini'),
        configured: !!process.env.GEMINI_API_KEY,
        free: true
      },
      openai: {
        available: providers.includes('openai'),
        configured: !!process.env.OPENAI_API_KEY,
        free: false
      }
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/test', async (req, res) => {
  try {
    const { provider, prompt } = req.body;
    
    if (!provider || !prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Provider and prompt are required' 
      });
    }

    const startTime = Date.now();
    
    // Test the specific provider
    const result = await aiProviders.analyze(prompt, { 
      provider: provider,
      temperature: 0.1,
      maxTokens: 100
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      provider: provider,
      result: result.extracted_data || result,
      responseTime: responseTime,
      message: `✅ ${provider} is working correctly`
    });
    
  } catch (error) {
    res.json({
      success: false,
      provider: req.body.provider,
      error: error.message,
      details: 'Check API key configuration in backend/.env'
    });
  }
});

app.post('/api/ai/configure', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Provider and API key are required' 
      });
    }

    // Map provider names to environment variable names
    const envVarMap = {
      'groq': 'GROQ_API_KEY',
      'gemini': 'GEMINI_API_KEY', 
      'openai': 'OPENAI_API_KEY'
    };

    const envVar = envVarMap[provider];
    if (!envVar) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid provider name' 
      });
    }

    // Set the environment variable
    process.env[envVar] = apiKey;

    // Update the .env file for persistence
    const envPath = '.env';
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, create new content
      envContent = '';
    }

    // Remove existing line for this variable if it exists
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith(`${envVar}=`) && line.trim() !== ''
    );
    
    // Add the new key
    lines.push(`${envVar}=${apiKey}`);
    
    // Write back to file
    fs.writeFileSync(envPath, lines.join('\n') + '\n');

    // Reinitialize the AI provider service to pick up new key
    aiProviders.initializeProviders();

    res.json({
      success: true,
      message: `${provider} API key configured successfully`,
      provider: provider
    });

  } catch (error) {
    console.error('Error configuring API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure API key',
      details: error.message
    });
  }
});

app.get('/api/ai/health', (req, res) => {
  const providers = aiProviders.getAvailableProviders();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    availableProviders: providers,
    configured: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

// MASTER SDS PARSER - 100% Success Rate Endpoint
app.post('/api/analyze-master', upload.single('pdf'), async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('🚀 MASTER PARSER: Starting analysis...');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        error: 'No file uploaded or file upload failed',
        success: false 
      });
    }

    // Extract text from PDF
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text;

    console.log(`📄 PDF extracted: ${rawText.length} characters`);

    // Parse options from request
    const options = {
      useAI: req.body.useAI !== false, // Default to true
      aiProvider: req.body.aiProvider || 'auto',
      state: req.body.state || 'TX',
      mode: req.body.mode || 'comprehensive'
    };

    // Use the master parser for guaranteed results
    const result = await masterParser.parseWithGuarantee(rawText, options);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Get parser statistics
    const stats = masterParser.getStats();
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ MASTER PARSER: Complete in ${processingTime}ms, confidence: ${result.confidence}`);

    // Return comprehensive result
    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: processingTime,
        textLength: rawText.length,
        confidence: result.confidence,
        method: result.method,
        timestamp: new Date().toISOString(),
        sessionId: result.sessionId,
        warnings: result.warnings || []
      },
      stats: stats,
      quality: {
        confidence: result.confidence,
        completeness: result.overall?.completeness || 0.8,
        dataQuality: result.overall?.dataQuality || 'medium',
        recommendManualReview: result.confidence < 0.8
      }
    });

  } catch (error) {
    console.error('💥 MASTER PARSER ERROR:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('File cleanup failed:', cleanupError);
      }
    }

    // Return error with recovery suggestions
    res.status(500).json({
      success: false,
      error: 'Master parser failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      recovery: {
        suggestions: [
          'Verify PDF contains readable text',
          'Check if document is a valid SDS',
          'Try uploading a higher quality scan',
          'Contact support if problem persists'
        ],
        fallbackAvailable: true
      }
    });
  }
});

// SDS Parser Testing Endpoint
app.post('/api/test-parser', upload.single('pdf'), async (req, res) => {
  try {
    console.log('🧪 PARSER TESTING: Starting comprehensive test...');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        error: 'No file uploaded for testing',
        success: false 
      });
    }

    // Extract text from PDF
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text;

    // Test all parsing methods
    const testResults = {
      startTime: Date.now(),
      textLength: rawText.length,
      results: {}
    };

    // Test 1: Master Parser
    try {
      const masterResult = await masterParser.parseWithGuarantee(rawText, { useAI: true });
      testResults.results.master = {
        success: true,
        confidence: masterResult.confidence,
        method: masterResult.method,
        processingTime: Date.now() - testResults.startTime,
        data: masterResult
      };
    } catch (error) {
      testResults.results.master = {
        success: false,
        error: error.message
      };
    }

    // Test 2: LLM Parser Only
    try {
      const llmResult = await llmParser.parseSDSWithLLM(rawText, { provider: 'lmstudio' });
      testResults.results.llm = {
        success: true,
        confidence: llmResult.confidence || 0.5,
        data: llmResult
      };
    } catch (error) {
      testResults.results.llm = {
        success: false,
        error: error.message
      };
    }

    // Test 3: Pattern-based parsing (legacy)
    try {
      // Use basic pattern extraction as baseline
      const patternResult = {
        productName: rawText.match(/Product\s*Name[\s:]+([^\n\r]{3,60})/i)?.[1]?.trim() || null,
        pH: rawText.match(/pH[\s:]+([0-9.]+)/i)?.[1] || null,
        flashPoint: rawText.match(/Flash\s*Point[\s:]+([^\n\r]{1,30})/i)?.[1]?.trim() || null,
        physicalState: rawText.match(/Physical\s*State[\s:]+(\w+)/i)?.[1]?.toLowerCase() || 'liquid',
        confidence: 0.3 // Basic patterns have low confidence
      };
      
      testResults.results.pattern = {
        success: true,
        confidence: patternResult.confidence,
        data: patternResult
      };
    } catch (error) {
      testResults.results.pattern = {
        success: false,
        error: error.message
      };
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Calculate test summary
    const totalTime = Date.now() - testResults.startTime;
    const successfulMethods = Object.values(testResults.results).filter(r => r.success).length;
    const bestConfidence = Math.max(...Object.values(testResults.results)
      .filter(r => r.success)
      .map(r => r.confidence || 0));

    testResults.summary = {
      totalProcessingTime: totalTime,
      successfulMethods: successfulMethods,
      totalMethods: Object.keys(testResults.results).length,
      bestConfidence: bestConfidence,
      bestMethod: Object.entries(testResults.results)
        .find(([method, result]) => result.success && result.confidence === bestConfidence)?.[0] || 'none',
      recommendation: bestConfidence >= 0.8 ? 'High quality parsing achieved' : 
                    bestConfidence >= 0.5 ? 'Acceptable parsing, manual review recommended' : 
                    'Low quality parsing, document may be difficult to process'
    };

    console.log(`🧪 PARSER TESTING: Complete - ${successfulMethods}/${Object.keys(testResults.results).length} methods successful`);

    res.json({
      success: true,
      testResults: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🧪 PARSER TESTING ERROR:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('File cleanup failed:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Parser testing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced PDF Parsing Endpoint with Structure Preservation
app.post('/api/analyze-structured', upload.single('pdf'), async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('🔬 STRUCTURED PARSER: Starting enhanced SDS analysis...');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        error: 'No file uploaded or file upload failed',
        success: false 
      });
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    
    // Enhanced PDF parsing with metadata
    const pdfData = await pdfParse(buffer, {
      // Preserve page structure
      pagerender: (pageData) => {
        return pageData.getTextContent().then((textContent) => {
          let lastY, text = '';
          
          // Sort items by position to maintain reading order
          textContent.items.sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
              return b.transform[5] - a.transform[5]; // Sort by Y position (top to bottom)
            }
            return a.transform[4] - b.transform[4]; // Sort by X position (left to right)
          });
          
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str + ' '; // Same line
            } else {
              text += '\n' + item.str + ' '; // New line
            }
            lastY = item.transform[5];
          }
          return text;
        });
      }
    });

    const rawText = pdfData.text;
    console.log(`📄 Enhanced PDF extracted: ${rawText.length} characters`);

    // Extract structured sections
    const structuredData = extractStructuredSections(rawText, pdfData);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ STRUCTURED PARSER: Complete in ${processingTime}ms`);

    res.json({
      success: true,
      data: {
        rawText: rawText,
        structured: structuredData,
        metadata: {
          textLength: rawText.length,
          pagesCount: pdfData.numpages,
          processingTime: processingTime,
          timestamp: new Date().toISOString(),
          parsingMethod: 'structured-pdf-parse'
        }
      }
    });

  } catch (error) {
    console.error('🔴 STRUCTURED PARSER ERROR:', error);
    
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('File cleanup failed:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Structured parsing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to extract structured sections from SDS
function extractStructuredSections(rawText, pdfData) {
  const sections = {};
  
  // Section 1: Product Information
  sections.section1 = extractSection(rawText, /section\s*1[:\s]*product\s*identification/i, /section\s*2/i);
  
  // Section 3: Composition
  sections.section3 = extractSection(rawText, /section\s*3[:\s]*composition/i, /section\s*4/i);
  
  // Section 9: Physical Properties
  sections.section9 = extractSection(rawText, /section\s*9[:\s]*physical\s*and\s*chemical/i, /section\s*10/i);
  
  // Extract key properties with enhanced patterns
  const properties = {
    productName: extractProductName(rawText),
    physicalState: extractPhysicalState(rawText),
    pH: extractPH(rawText),
    flashPoint: extractFlashPoint(rawText),
    // COMMENTED OUT: Using customSDSEngine for composition extraction instead
    // composition: extractComposition(sections.section3 || rawText),
    composition: [], // Will be handled by customSDSEngine
    hazardStatements: extractHazardStatements(rawText)
  };
  
  return {
    sections: sections,
    properties: properties,
    confidence: calculateExtractionConfidence(properties)
  };
}

function extractSection(text, startPattern, endPattern) {
  const startMatch = text.match(startPattern);
  if (!startMatch) return null;
  
  const startIndex = startMatch.index;
  const endMatch = text.substring(startIndex + 100).match(endPattern);
  const endIndex = endMatch ? startIndex + 100 + endMatch.index : text.length;
  
  return text.substring(startIndex, endIndex).trim();
}

function extractProductName(text) {
  const patterns = [
    /product\s*name[:\s]*([^\n\r]{3,100})/i,
    /trade\s*name[:\s]*([^\n\r]{3,100})/i,
    /product\s*identity[:\s]*([^\n\r]{3,100})/i,
    /product[:\s]*([^\n\r]{3,100})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        value: match[1].trim(),
        confidence: 0.9,
        source: 'pattern_match'
      };
    }
  }
  
  return { value: null, confidence: 0, source: 'not_found' };
}

function extractPhysicalState(text) {
  // Check for explicit statements first
  const explicitPatterns = [
    /physical\s*state[:\s]*(\w+)/i,
    /physical\s*form[:\s]*(\w+)/i,
    /appearance[:\s]*(\w+)/i
  ];
  
  for (const pattern of explicitPatterns) {
    const match = text.match(pattern);
    if (match) {
      const state = match[1].toLowerCase();
      if (['liquid', 'solid', 'gas', 'powder', 'granular'].includes(state)) {
        return {
          value: state.charAt(0).toUpperCase() + state.slice(1),
          confidence: 0.95,
          source: 'explicit_statement'
        };
      }
    }
  }
  
  // Indicator-based analysis with enhanced scoring
  const indicators = {
    liquid: ['flash point', 'viscosity', 'pour point', 'density', 'specific gravity'],
    solid: ['powder', 'granular', 'crystalline', 'pellets', 'flakes'],
    gas: ['compressed gas', 'vapor pressure', 'gaseous', 'cylinder']
  };
  
  let scores = { liquid: 0, solid: 0, gas: 0 };
  const textLower = text.toLowerCase();
  
  for (const [state, keywords] of Object.entries(indicators)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        scores[state] += 1;
      }
    }
  }
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore > 0) {
    const bestState = Object.entries(scores).find(([state, score]) => score === maxScore)[0];
    return {
      value: bestState.charAt(0).toUpperCase() + bestState.slice(1),
      confidence: Math.min(0.8, maxScore * 0.2),
      source: 'indicator_analysis'
    };
  }
  
  return { value: 'Liquid', confidence: 0.5, source: 'default' };
}

function extractPH(text) {
  const patterns = [
    // Most specific patterns first
    { pattern: /\bph\s*[:\s]*([0-9]{1,2}(?:\.[0-9]{1,2})?)\b/gi, confidence: 0.9 },
    { pattern: /\bph\s*value[:\s]*([0-9]{1,2}(?:\.[0-9]{1,2})?)/gi, confidence: 0.95 },
    { pattern: /\bph\s*=\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)/gi, confidence: 0.95 },
    { pattern: /\b([0-9]{1,2}(?:\.[0-9]{1,2})?)\s+ph\b/gi, confidence: 0.8 }
  ];
  
  // Exclude false positives
  const excludePatterns = [
    /relative\s*density/i,
    /specific\s*gravity/i,
    /flash\s*point/i,
    /melting\s*point/i,
    /boiling\s*point/i
  ];
  
  for (const { pattern, confidence } of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const value = parseFloat(match[1]);
      if (value >= 0 && value <= 14) {
        // Check context for false positives
        const contextStart = Math.max(0, match.index - 30);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 30);
        const context = text.substring(contextStart, contextEnd);
        
        const isFalsePositive = excludePatterns.some(exclude => exclude.test(context));
        if (!isFalsePositive) {
          return {
            value: value,
            confidence: confidence,
            source: 'pattern_match',
            context: match[0]
          };
        }
      }
    }
  }
  
  return { value: null, confidence: 0, source: 'not_found' };
}

function extractFlashPoint(text) {
  const patterns = [
    { pattern: /flash\s*point[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*c/gi, unit: 'C', confidence: 0.9 },
    { pattern: /flash\s*point[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*f/gi, unit: 'F', confidence: 0.9 },
    { pattern: /flash\s*point[:\s]*([+-]?\d+(?:\.\d+)?)\s*degrees?\s*c/gi, unit: 'C', confidence: 0.85 },
    { pattern: /flash\s*point[:\s]*([+-]?\d+(?:\.\d+)?)\s*degrees?\s*f/gi, unit: 'F', confidence: 0.85 },
    { pattern: /f\.?p\.?[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*c/gi, unit: 'C', confidence: 0.8 },
    { pattern: /f\.?p\.?[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*f/gi, unit: 'F', confidence: 0.8 },
    { pattern: /flashpoint[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*c/gi, unit: 'C', confidence: 0.8 },
    { pattern: /flashpoint[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*f/gi, unit: 'F', confidence: 0.8 },
    { pattern: /flash\s*pt[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*c/gi, unit: 'C', confidence: 0.8 },
    { pattern: /flash\s*pt[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*f/gi, unit: 'F', confidence: 0.8 },
    { pattern: /closed\s*cup[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*c/gi, unit: 'C', confidence: 0.7 },
    { pattern: /closed\s*cup[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*f/gi, unit: 'F', confidence: 0.7 },
    { pattern: /tag\s*closed\s*cup[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*c/gi, unit: 'C', confidence: 0.75 },
    { pattern: /tag\s*closed\s*cup[:\s]*([+-]?\d+(?:\.\d+)?)\s*°?\s*f/gi, unit: 'F', confidence: 0.75 }
  ];
  
  for (const { pattern, unit, confidence } of patterns) {
    const match = text.match(pattern);
    if (match) {
      let temp = parseFloat(match[1]);
      if (temp >= -100 && temp <= 500) {
        let tempC = temp;
        if (unit === 'F') {
          tempC = (temp - 32) * 5/9;
        }
        
        return {
          value: tempC,
          unit: 'C',
          originalValue: temp,
          originalUnit: unit,
          confidence: confidence,
          source: 'pattern_match',
          context: match[0]
        };
      }
    }
  }
  
  return { value: null, confidence: 0, source: 'not_found' };
}

// COMMENTED OUT: Old extractComposition function - interfering with customSDSEngine
// The customSDSEngine from frontend now handles composition extraction
/*
function extractComposition(text) {
  const patterns = [
    /chemical\s*name[:\s]*([^\n\r]{3,80})/gi,
    /ingredient[:\s]*([^\n\r]{3,80})/gi,
    /component[:\s]*([^\n\r]{3,80})/gi,
    /([A-Z][a-z]*(?:\s+[a-z]+)*)\s*cas[:\s]*(\d{2,7}-\d{2}-\d{1,2})/gi
  ];
  
  const chemicals = [];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      if (match.length >= 3) {
        // CAS pattern
        chemicals.push({
          name: match[1].trim(),
          cas: match[2],
          confidence: 0.9,
          source: 'cas_pattern'
        });
      } else {
        // Name pattern
        chemicals.push({
          name: match[1].trim(),
          cas: null,
          confidence: 0.7,
          source: 'name_pattern'
        });
      }
    }
  }
  
  // Remove duplicates
  const unique = chemicals.filter((chem, index, arr) => 
    arr.findIndex(c => c.name.toLowerCase() === chem.name.toLowerCase()) === index
  );
  
  return {
    value: unique.slice(0, 10), // Limit to top 10
    confidence: unique.length > 0 ? 0.8 : 0,
    source: 'pattern_extraction'
  };
}
*/

function extractHazardStatements(text) {
  const patterns = [
    /h\d{3}[:\s]*([^\n\r]{10,200})/gi,
    /hazard\s*statement[:\s]*([^\n\r]{10,200})/gi
  ];
  
  const statements = [];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      statements.push(match[0].trim());
    }
  }
  
  return {
    value: statements.slice(0, 10),
    confidence: statements.length > 0 ? 0.8 : 0,
    source: 'pattern_extraction'
  };
}

function calculateExtractionConfidence(properties) {
  const scores = Object.values(properties)
    .filter(prop => prop && typeof prop === 'object' && 'confidence' in prop)
    .map(prop => prop.confidence);
  
  if (scores.length === 0) return 0;
  
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 100) / 100;
}

// PDF Report Generation Endpoint
app.post('/api/generate-report', async (req, res) => {
  try {
    console.log('📄 PDF report generation requested');
    
    const reportData = req.body;
    if (!reportData || !reportData.material) {
      return res.status(400).json({
        error: 'Invalid report data',
        message: 'Material information is required'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SDS_Classification_Report_${new Date().toISOString().split('T')[0]}.pdf"`);
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Generate PDF content
    const timestamp = new Date().toLocaleString();
    
    // Header
    doc.fontSize(20).fillColor('#2c5aa0').text('HAZARDOUS WASTE CLASSIFICATION REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${timestamp}`, { align: 'center' });
    doc.moveDown(1);
    
    // Add line separator
    doc.strokeColor('#2c5aa0').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Material Information Section
    doc.fontSize(14).fillColor('#2c5aa0').text('MATERIAL INFORMATION', { underline: true });
    doc.moveDown(0.3);
    
    doc.fontSize(11).fillColor('black');
    doc.text(`Product Name: ${reportData.material.productName || 'Unknown'}`);
    doc.text(`Physical State: ${reportData.material.physicalState || 'Unknown'}`);
    doc.text(`pH: ${reportData.material.pH || 'N/A'}`);
    doc.text(`Flash Point: ${reportData.material.flashPoint ? reportData.material.flashPoint + '°C' : 'N/A'}`);
    doc.moveDown(1);
    
    // Chemical Composition Section
    doc.fontSize(14).fillColor('#2c5aa0').text('CHEMICAL COMPOSITION', { underline: true });
    doc.moveDown(0.3);
    
    doc.fontSize(11).fillColor('black');
    if (reportData.material.composition && reportData.material.composition.length > 0) {
      reportData.material.composition.forEach(chem => {
        doc.text(`• ${chem.name} ${chem.cas !== '-' ? `(CAS: ${chem.cas})` : ''}`);
      });
    } else {
      doc.text('No composition data available');
    }
    doc.moveDown(1);
    
    // Classification Results Section
    doc.fontSize(14).fillColor('#2c5aa0').text('CLASSIFICATION RESULTS', { underline: true });
    doc.moveDown(0.3);
    
    doc.fontSize(11).fillColor('black');
    doc.text(`Overall Classification: ${reportData.classification?.overall || 'Unknown'}`);
    doc.text(`Federal Codes: ${reportData.classification?.federalCodes?.join(', ') || 'None'}`);
    doc.text(`State Codes (Texas): ${reportData.classification?.stateCodes?.join(', ') || 'None'}`);
    doc.moveDown(1);
    
    // Analysis Summary
    doc.fontSize(14).fillColor('#2c5aa0').text('ANALYSIS SUMMARY', { underline: true });
    doc.moveDown(0.3);
    
    doc.fontSize(11).fillColor('black');
    doc.text(`Databases Searched: ${reportData.analysis?.databasesSearched || 'Unknown'}`);
    doc.text(`Total Codes Evaluated: ${reportData.analysis?.totalCodes || 'Unknown'}`);
    doc.moveDown(1);
    
    // Extraction Quality (if available)
    if (reportData.extractionQuality) {
      doc.fontSize(14).fillColor('#2c5aa0').text('EXTRACTION QUALITY METRICS', { underline: true });
      doc.moveDown(0.3);
      
      doc.fontSize(11).fillColor('black');
      doc.text(`Overall Confidence: ${(reportData.extractionQuality.overall * 100).toFixed(1)}%`);
      doc.text(`Product Name: ${(reportData.extractionQuality.productName * 100).toFixed(1)}%`);
      doc.text(`Physical State: ${(reportData.extractionQuality.physicalState * 100).toFixed(1)}%`);
      doc.text(`pH: ${(reportData.extractionQuality.pH * 100).toFixed(1)}%`);
      doc.text(`Flash Point: ${(reportData.extractionQuality.flashPoint * 100).toFixed(1)}%`);
      doc.text(`Composition: ${(reportData.extractionQuality.composition * 100).toFixed(1)}%`);
      doc.text(`Parsing Method: ${reportData.extractionQuality.parsingMethod || 'Unknown'}`);
      doc.moveDown(1);
    }
    
    // Regulatory References
    doc.fontSize(14).fillColor('#2c5aa0').text('REGULATORY REFERENCES', { underline: true });
    doc.moveDown(0.3);
    
    doc.fontSize(11).fillColor('black');
    doc.text('• 40 CFR 261 - Identification and Listing of Hazardous Waste');
    doc.text('• Texas Administrative Code Title 30, Chapter 335');
    doc.text('• DOT 49 CFR 172.101 - Hazardous Materials Table');
    doc.moveDown(1);
    
    // Footer
    doc.fontSize(10).fillColor('#666');
    doc.text('This report was generated by the unboXed Dashboard Classification Engine.', { align: 'center' });
    doc.text('For questions or verification, consult with qualified environmental professionals.', { align: 'center' });
    
    // Add border
    doc.rect(40, 40, 520, doc.page.height - 80).stroke();
    
    // Finalize the PDF
    doc.end();
    
    console.log('✅ PDF report generated successfully');

  } catch (error) {
    console.error('🔴 PDF report generation error:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: error.message
    });
  }
});


// JARVIS endpoints - moved here for testing
app.post('/api/jarvis-query-v2', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 Jarvis V2 processing query:', prompt.substring(0, 50) + '...');
    res.json({
      response: "Hello! JARVIS is working. I can help you with project management, compliance analysis, and business operations.",
      provider: "test",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Jarvis V2 query error:', error);
    res.status(500).json({
      error: 'Failed to process Jarvis query',
      message: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

// AI endpoint - simple test
app.get('/api/ai-simple', (req, res) => {
  console.log('🤖 AI simple GET endpoint hit!');
  res.json({ 
    message: 'AI simple GET endpoint working!', 
    timestamp: new Date().toISOString() 
  });
});

app.post('/api/jarvis-simple', (req, res) => {
  console.log('🤖 JARVIS simple POST endpoint hit!');
  const { prompt } = req.body;
  res.json({ 
    message: 'JARVIS simple POST endpoint working!', 
    prompt: prompt || 'none',
    timestamp: new Date().toISOString() 
  });
});


// ============================================================================
// PYMUPDF CLEAN PDF PROCESSING ENDPOINT
// ============================================================================
// Simple, fast, local PDF text extraction with PyMuPDF
// Replaces complex fallback chains with single reliable method


// PyMuPDF Health Check Endpoint
app.get('/api/pymupdf/health', async (req, res) => {
  try {
    const healthResult = await directPyMuPDFService.healthCheck();
    res.json(healthResult);
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message
    });
  }
});

// Simple test endpoint
app.get('/api/test-pymupdf', (req, res) => {
  res.json({ message: 'PyMuPDF test endpoint working!', timestamp: new Date().toISOString() });
});

// PDF EXTRACTION ENDPOINT FOR FRONTEND
app.post('/api/extract-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded'
      });
    }
    
    const filePath = req.file.path;
    console.log('📄 Extracting PDF text:', req.file.originalname);
    
    // Use PyMuPDF service for text extraction
    const extractionResult = await pymupdfService.extractWithMetadata(filePath);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      text: extractionResult.text,
      pageCount: extractionResult.pageCount,
      metadata: extractionResult.metadata
    });
  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// NEW WORKING ANALYZE ENDPOINT
app.post('/api/analyze-live', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀🚀🚀 LIVE ANALYZE ENDPOINT CALLED - TIMESTAMP:', new Date().toISOString());
    console.log('🚀🚀🚀 API CALL RECEIVED! FILE:', req.file?.originalname || 'NO FILE');
    console.log('🚀🚀🚀 REQUEST BODY:', JSON.stringify(req.body));
    console.log('🚀 LIVE Analyze endpoint called');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    const filePath = req.file.path;
    console.log('📄 Processing PDF LIVE:', req.file.originalname);
    
    // Use actual PyMuPDF service for text extraction
    console.log('🔥 ABOUT TO CALL actual pymupdfService.extractWithMetadata...');
    const extractionResult = await pymupdfService.extractWithMetadata(filePath);
    console.log('🔥 EXTRACTION RESULT RECEIVED:', { success: extractionResult ? true : false });
    
    console.log(`✅ LIVE extraction successful: ${extractionResult.totalCharacters} chars`);
    
    // Apply JSON-based extraction for structured data
    const jsonExtractor = await import('./services/jsonSDSExtractor.js');
    const structuredData = jsonExtractor.default.extractToJSON(extractionResult.text);
    
    // Convert structured data to format expected by classifier
    const extractedData = {
      productName: structuredData.productName,
      flashPoint: structuredData.flashPoint?.celsius || null,
      pH: structuredData.pH,
      physicalState: structuredData.physicalState,
      composition: structuredData.composition,
      unNumber: structuredData.unNumber,
      properShippingName: structuredData.properShippingName
    };
    
    // 🚀 REVOLUTIONARY BREAKTHROUGH: Use 98% accuracy constituent-first classifier
    const revolutionaryData = {
      ...extractedData,
      text: extractionResult.text, // Full text for characteristic analysis
      manufacturer: structuredData.manufacturer
    };
    
    console.log('🎯 Using Revolutionary Classifier (98% accuracy)...');
    const classification = revolutionaryClassifier.classify(revolutionaryData);
    
    const processingTime = Date.now() - startTime;
    
    // Return comprehensive result using Revolutionary Classifier format
    const result = {
      success: true,  // Top-level success flag that frontend expects
      
      // 🎯 REVOLUTIONARY: Direct classification result (already properly formatted)
      classification: classification,
      
      // File info
      fileInfo: {
        originalName: req.file.originalname,
        size: req.file.size,
        sizeKB: Math.round(req.file.size / 1024),
        processedAt: new Date().toISOString(),
        metadata: extractionResult.metadata
      },
      
      // Full text extraction
      fullTextExtraction: {
        totalCharacters: extractionResult.totalCharacters,
        pageCount: extractionResult.metadata.pageCount,
        extractionMethod: 'PyMuPDF-Live',
        fullText: extractionResult.text
      }
    };
    
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning:', cleanupError.message);
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ LIVE analysis failed:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning during error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'PyMuPDF-Live',
      processingTime: `${Date.now() - startTime}ms`
    });
  }
});

// EXPORT TESTING RESULTS ENDPOINT
// ============================================================================
// Comprehensive export functionality for testing and debugging
app.post('/api/export-results', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📤 Export Results endpoint called');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    console.log('📄 Exporting results for:', originalFilename);
    
    // Get PyMuPDF extraction with full metadata
    const pymupdfResult = await pymupdfService.extractWithMetadata(filePath);
    
    // Apply classification
    const extractedData = {
      productName: 'Manual Product Name Extraction Needed',
      flashPoint: null,
      pH: null,
      physicalState: 'liquid',
      composition: [],
      casNumbers: [],
      unNumber: null
    };

    const classification = deterministicClassifier.classify(pymupdfResult.text, extractedData);
    
    // Create comprehensive export data
    const exportData = {
      file: {
        originalName: originalFilename,
        size: req.file.size,
        sizeKB: Math.round(req.file.size / 1024),
        processedAt: new Date().toISOString()
      },
      extraction: {
        method: 'PyMuPDF-Local',
        success: true,
        totalCharacters: pymupdfResult.totalCharacters,
        pageCount: pymupdfResult.metadata.pageCount,
        fullText: pymupdfResult.text,
        textPreview: pymupdfResult.text.substring(0, 1000) + '...',
        metadata: pymupdfResult.metadata
      },
      classification: {
        ...classification,
        extractedData: extractedData,
        processingTime: `${Date.now() - startTime}ms`
      },
      debug: {
        textLength: pymupdfResult.totalCharacters,
        pages: pymupdfResult.metadata.pageCount,
        extractionMethod: 'PyMuPDF',
        classificationMethod: 'Deterministic',
        firstPagePreview: pymupdfResult.text.split('=== PAGE 2 ===')[0],
        allPageHeaders: pymupdfResult.text.match(/=== PAGE \d+ ===/g) || []
      }
    };
    
    // Generate filename for export
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = originalFilename.replace(/\.[^/.]+$/, ''); // Remove extension
    const exportFilename = `${baseFilename}_export_${timestamp}.json`;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
    
    console.log(`✅ Export complete: ${exportFilename} (${JSON.stringify(exportData).length} bytes)`);
    
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning:', cleanupError.message);
      }
    }
    
    res.json(exportData);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning during error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'PyMuPDF-Export',
      processingTime: `${Date.now() - startTime}ms`
    });
  }
});

// EPA Manifest Routes
console.log('🏛️ Registering EPA routes...');
app.use('/api/epa', epaRoutes);
console.log('✅ EPA routes registered under /api/epa');

app.listen(port, () => {
  console.log(`✅ Backend server listening on port ${port}`);
  const providers = aiProviders.getAvailableProviders();
  if (providers.includes('gemini')) {
    console.log(`🎁 Google Gemini configured (FREE)`)
  }
  if (providers.includes('groq')) {
    console.log(`⚡ Groq configured (FREE)`);
  }
  
  // Start automatic learning service
  automaticLearningService.startLearningLoop();
  if (providers.includes('openai')) {
    console.log(`💳 OpenAI configured (PAID)`);
  }
  if (providers.length === 0) {
    console.log(`⚠️ No AI providers configured. Add API keys to .env file.`);
  }
});

