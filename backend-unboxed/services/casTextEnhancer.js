// CAS Text Enhancer - Modifies SDS text directly with CAS data
import basicCasLookup from './basicCasLookup.js';

class CASTextEnhancer {
  /**
   * Enhance SDS text by injecting CAS lookup data directly into the text
   * This ensures AI models can't ignore the enhanced data
   */
  enhanceSDSText(originalText, extractedSections) {
    if (!extractedSections) {
      return originalText;
    }
    
    let enhancedText = originalText;
    
    // Strategy 0: Inject overall flash point from PDF extraction if available
    if (extractedSections.flashPoint && extractedSections.flashPoint.value !== null) {
      const flashPointCelsius = extractedSections.flashPoint.value;
      const flashPointFahrenheit = (flashPointCelsius * 9/5) + 32;
      
      console.log(`🔥 INJECTING EXTRACTED FLASH POINT: ${flashPointCelsius}°C (${flashPointFahrenheit.toFixed(0)}°F)`);
      
      // Add clear flash point statement at the beginning for AI to see
      const flashPointStatement = `
=== EXTRACTED FLASH POINT DATA ===
Flash point: ${flashPointCelsius}°C (${flashPointFahrenheit.toFixed(0)}°F) - CONFIRMED FROM SDS SECTION 9
This material has a flash point of ${flashPointCelsius}°C which is ${flashPointCelsius < 60 ? 'BELOW 60°C (IGNITABLE - D001 HAZARDOUS)' : 'ABOVE 60°C (not ignitable)'}.

`;
      enhancedText = flashPointStatement + enhancedText;
    }
    
    // Continue with chemical-specific enhancements if available
    if (!extractedSections.chemicals || !Array.isArray(extractedSections.chemicals)) {
      return enhancedText;
    }
    
    // Find materials with CAS numbers
    const enhancedMaterials = [];
    extractedSections.chemicals.forEach(chemical => {
      if (chemical.casNumber) {
        const hazardData = basicCasLookup.getHazardCharacteristics(chemical.casNumber);
        if (hazardData) {
          enhancedMaterials.push({
            name: chemical.name,
            casNumber: chemical.casNumber,
            hazardData: hazardData
          });
        }
      }
    });
    
    if (enhancedMaterials.length === 0) {
      return enhancedText;
    }
    
    // Strategy 1: Replace "pH information not available" with actual pH
    enhancedMaterials.forEach(material => {
      if (material.hazardData.pH !== null && material.hazardData.pH !== undefined) {
        // Replace various forms of "pH not available"
        enhancedText = enhancedText.replace(
          /pH\s*(?:information\s*)?(?:is\s*)?not\s*available/gi,
          `pH: ${material.hazardData.pH} (Enhanced from CAS ${material.casNumber} database)`
        );
        
        // Also try to inject after "Physical and chemical properties" section
        enhancedText = enhancedText.replace(
          /(SECTION 9:.*?properties)([\s\S]*?)(SECTION|$)/i,
          (match, section, content, nextSection) => {
            // Check if pH is truly missing
            if (!content.match(/pH\s*[:=]\s*[\d.]+/i)) {
              // Add pH data
              const enhancedContent = content + `\npH: ${material.hazardData.pH} (CAS database value for ${material.hazardData.name})`;
              return section + enhancedContent + nextSection;
            }
            return match;
          }
        );
      }
      
      // Strategy 2: Add flash point if missing
      if (material.hazardData.flashPoint !== null && material.hazardData.flashPoint !== undefined) {
        enhancedText = enhancedText.replace(
          /flash\s*point\s*(?:information\s*)?(?:is\s*)?not\s*available/gi,
          `Flash point: ${material.hazardData.flashPoint}°C (Enhanced from CAS ${material.casNumber} database)`
        );
      }
    });
    
    // Strategy 3: Add a clear enhancement section at the beginning
    const enhancementHeader = `
=== CAS DATABASE ENHANCEMENTS APPLIED ===
The following hazard data has been added from CAS registry:
`;
    
    let enhancementDetails = '';
    enhancedMaterials.forEach(material => {
      enhancementDetails += `\n${material.hazardData.name} (CAS ${material.casNumber}):`;
      if (material.hazardData.pH !== null) {
        enhancementDetails += `\n  - pH: ${material.hazardData.pH}`;
      }
      if (material.hazardData.flashPoint !== null) {
        enhancementDetails += `\n  - Flash Point: ${material.hazardData.flashPoint}°C`;
      }
      if (material.hazardData.federalCodes && material.hazardData.federalCodes.length > 0) {
        enhancementDetails += `\n  - Federal Codes: ${material.hazardData.federalCodes.join(', ')}`;
      }
      enhancementDetails += '\n';
    });
    
    if (enhancementDetails) {
      enhancedText = enhancementHeader + enhancementDetails + '\n=== ORIGINAL SDS FOLLOWS ===\n\n' + enhancedText;
    }
    
    console.log('✅ SDS text enhanced with CAS data injection');
    return enhancedText;
  }
}

export default new CASTextEnhancer();