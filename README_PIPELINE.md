# AI-Powered SDS Classification Pipeline

A complete end-to-end system for extracting data from Safety Data Sheets using AI APIs (Groq/Gemini) and classifying waste according to RCRA regulations and state-specific requirements.

## 🚀 Quick Start

### Installation

```bash
npm install axios fs path
```

### API Setup

You need API keys from at least one provider:

**Groq API (Recommended - Faster & Cheaper)**
```bash
export GROQ_API_KEY="your-groq-api-key"
```
Get your key: https://console.groq.com/

**Gemini API (Fallback)**
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```
Get your key: https://console.cloud.google.com/

### Basic Usage

```javascript
import { SDSClassificationPipeline } from './src/pipelines/SDSClassificationPipeline.js';

// Initialize with API keys
const pipeline = new SDSClassificationPipeline({
  groq: 'your-groq-key',
  gemini: 'your-gemini-key'
});

// Process single SDS file
const result = await pipeline.processSDS('path/to/sds.pdf', {
  selectedState: 'TX',
  wasteSource: 'degreasing operations',
  industryType: 'metal fabrication',
  isSpent: true
});

console.log(result.summaryReport);
```

## 🏗️ System Architecture

### Complete Pipeline Flow

```
📄 SDS Document → 🤖 AI Extraction → 📊 JSON Data → ⚖️ Classification → 📋 Forms
```

1. **AI Extraction**: Groq/Gemini APIs extract structured data from SDS text
2. **JSON Schema**: Standardized data format for consistent processing
3. **Classification**: Comprehensive RCRA and state regulation evaluation
4. **Form Generation**: Automatic compliance document creation

### Core Components

- **`SDSClassificationPipeline.js`** - Main entry point and orchestrator
- **`SDSExtractionService.js`** - AI API integration with fallback logic
- **`SDSExtractionSchema.js`** - Structured data format specification
- **`MasterWasteClassifier.js`** - Complete classification logic coordinator
- **Classification Engines** - Individual waste code evaluation systems

## 📊 Classification Coverage

### RCRA Waste Codes (698+ codes)

| Category | Codes | Description |
|----------|-------|-------------|
| **D001-D043** | 43 codes | Characteristic hazardous wastes |
| **F001-F039** | 39 codes | Non-specific source wastes |
| **P001-P123** | 123 codes | Acutely hazardous wastes |
| **U001-U391** | 391 codes | Toxic wastes |
| **K001-K102** | 102+ codes | Source-specific wastes |

### State Regulations

**Texas TCEQ (RG-22)**
- Waste code format: SSSSFFFH (H=Hazardous, 1/2/3=Class)
- Automatic form generation for STEERS reporting
- Class determination logic

**Oklahoma DEQ**
- VSQG, SQG, LQG generator categories
- EPA form integration
- Biennial report preparation

## 🔧 API Usage Examples

### Process SDS from File

```javascript
const result = await pipeline.processSDS('./documents/acetone-sds.pdf', {
  selectedState: 'TX',
  wasteSource: 'degreasing operations',
  industryType: 'metal fabrication',
  isSpent: true,
  generateForms: true
});

if (result.success) {
  console.log('✅ Processing successful');
  console.log(`Material State: ${result.result.classificationResults.results.materialState}`);
  console.log(`RCRA Codes: ${result.result.classificationResults.results.rcraWasteCodes.length}`);

  // Print forms generated
  Object.keys(result.result.classificationResults.forms).forEach(formType => {
    console.log(`📋 Generated: ${formType} form`);
  });
} else {
  console.error('❌ Processing failed:', result.error);
}
```

### Process SDS from Text

```javascript
const sdsText = `
SAFETY DATA SHEET
1. IDENTIFICATION
Product Name: Industrial Cleaning Solvent
...
`;

const result = await pipeline.processSDSText(sdsText, {
  selectedState: 'OK',
  wasteSource: 'parts cleaning',
  generateForms: true
});
```

### Batch Processing

```javascript
const filePaths = [
  './sds-files/solvent1.pdf',
  './sds-files/solvent2.pdf',
  './sds-files/acid1.pdf'
];

const batchResults = await pipeline.batchProcess(filePaths, {
  selectedState: 'TX',
  generateForms: true
});

console.log(`✅ Success: ${batchResults.successful}/${batchResults.totalFiles}`);
console.log(`📊 Success Rate: ${batchResults.successRate}%`);
```

## 🎯 Classification Examples

### D001 - Ignitability (Liquids)

```javascript
// Input: Flash point ≤ 60°C
{
  physicalProperties: {
    physicalState: "liquid",
    flashPoint: { value: 45, units: "°C" }
  }
}

// Output: D001 Applied
{
  code: "D001",
  description: "Ignitable",
  reason: "Flash point (45°C) ≤ 60°C threshold"
}
```

### D002 - Corrosivity

```javascript
// Input: pH ≤ 2.0 or ≥ 12.5
{
  physicalProperties: {
    pH: 1.5
  }
}

// Output: D002 Applied
{
  code: "D002",
  description: "Corrosive",
  reason: "pH (1.5) ≤ 2.0 threshold"
}
```

### F003 - Spent Solvents

```javascript
// Input: Spent acetone from degreasing
{
  composition: [
    { chemicalName: "Acetone", casNumber: "67-64-1", percentage: 70 }
  ],
  wasteSource: "degreasing operations",
  isSpent: true
}

// Output: F003 Applied
{
  code: "F003",
  description: "Spent non-halogenated solvents",
  reason: "Contains acetone from degreasing operations"
}
```

## 📋 Form Generation

The system automatically generates compliance forms based on classification results:

### Texas Forms
- **Hazardous Waste Profile Sheet** - Required for hazardous waste shipments
- **STEERS Waste Classification** - State reporting format
- **Generator Manifest** - EPA Form 8700-12

### Oklahoma Forms
- **SQG Self-Certification** - Small quantity generator certification
- **EPA Biennial Report** - Large quantity generator reporting
- **Hazardous Waste Manifest** - EPA Form 8700-12

### Form Access

```javascript
const result = await pipeline.processSDS('sds-file.pdf', {
  selectedState: 'TX',
  generateForms: true,
  generatorInfo: {
    companyName: 'ABC Manufacturing',
    epaId: 'TXD123456789',
    address: '123 Industrial Blvd',
    contactPerson: 'John Smith'
  }
});

// Forms are returned as printable HTML
console.log('Forms generated:');
Object.entries(result.result.classificationResults.forms).forEach(([type, html]) => {
  console.log(`📋 ${type}: Ready for printing`);
  // Save to file or send to printer
  fs.writeFileSync(`./forms/${type}.html`, html);
});
```

## 🧪 Testing

### Run Test Suite

```bash
# Run all tests
npm test

# Run integration tests
npm test -- test/integration/

# Run with coverage
npm run test:coverage
```

### Test Categories

- **Unit Tests** - Individual component testing
- **Integration Tests** - End-to-end pipeline testing
- **Classification Tests** - Waste code logic validation
- **Form Generation Tests** - Compliance document verification
- **API Tests** - Groq/Gemini extraction validation

## 📈 Performance & Monitoring

### Processing Statistics

```javascript
const stats = pipeline.getStats();
console.log(`Total Processed: ${stats.totalProcessed}`);
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Avg Processing Time: ${stats.averageProcessingTime}ms`);
```

### Typical Performance
- **Single SDS**: 2-5 seconds
- **API Extraction**: 1-3 seconds
- **Classification**: 0.5-1 seconds
- **Form Generation**: 0.2-0.5 seconds

## 🔒 Security & Compliance

### API Key Management
- Environment variables recommended
- Support for multiple key sources
- Automatic key rotation support

### Data Privacy
- No SDS data stored permanently
- Processing occurs in memory only
- Optional training data collection (disabled by default)

### Regulatory Compliance
- Based on current RCRA regulations
- State regulations updated regularly
- Audit trail for all decisions

## 🚨 Error Handling

### API Fallback Logic
1. **Primary**: Groq API (faster, cheaper)
2. **Fallback**: Gemini API
3. **Graceful Degradation**: Partial classification if extraction fails

### Common Issues

**API Key Missing**
```javascript
// Error: No API keys provided
// Solution: Set environment variables or pass keys to constructor
const pipeline = new SDSClassificationPipeline({
  groq: 'your-key-here'
});
```

**Network Timeout**
```javascript
// Error: Request timeout
// Solution: Increase timeout in options
const result = await pipeline.processSDS('file.pdf', {
  timeout: 120000 // 2 minutes
});
```

**Invalid SDS Format**
```javascript
// Error: Could not extract required data
// Solution: Check SDS file format and content quality
```

## 🛣️ Roadmap

### Planned Features
- [ ] Additional state regulations (California, New York)
- [ ] Enhanced form customization
- [ ] Real-time collaboration features
- [ ] Cloud deployment templates
- [ ] Advanced analytics dashboard

### Integration Points
- [ ] ERP system connectors
- [ ] Laboratory information systems
- [ ] Waste tracking databases
- [ ] Compliance management platforms

## 📞 Support

### Documentation
- **API Reference**: See inline code documentation
- **Examples**: Check `example-usage.js`
- **Test Cases**: Review test suites for usage patterns

### Troubleshooting
1. Verify API keys are valid and have sufficient credits
2. Check SDS file format (PDF, text, or image)
3. Ensure network connectivity for API calls
4. Review classification results for data completeness

---

**Ready for Production Use** ✅

This system provides a complete, autonomous solution for SDS-driven waste classification with AI-powered extraction, comprehensive regulatory coverage, and automatic compliance form generation.