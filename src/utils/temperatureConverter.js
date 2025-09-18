/**
 * Temperature Conversion Utility
 * Handles all temperature conversions with proper unit detection
 */

export class TemperatureConverter {
  
  /**
   * Parse and convert temperature to Celsius
   * @param {string|number} temperature - Temperature with or without unit
   * @returns {Object} Conversion result
   */
  static toCelsius(temperature) {
    if (!temperature || temperature === null || temperature === undefined) {
      return {
        success: false,
        error: 'No temperature provided',
        celsius: null,
        originalValue: null,
        originalUnit: null
      };
    }
    
    // Handle text values
    const textValues = ['Not Provided', 'Not Available', 'Not Calculated', 'N/A', 'Not Applicable'];
    if (textValues.includes(temperature)) {
      return {
        success: false,
        error: 'Temperature not provided',
        celsius: null,
        originalValue: temperature,
        originalUnit: 'text'
      };
    }
    
    const tempStr = temperature.toString().trim();
    
    // Extract numeric value
    const numericMatch = tempStr.match(/(-?\d+\.?\d*)/);
    if (!numericMatch) {
      return {
        success: false,
        error: 'Invalid temperature format',
        celsius: null,
        originalValue: temperature,
        originalUnit: 'invalid'
      };
    }
    
    const numericValue = parseFloat(numericMatch[1]);
    if (isNaN(numericValue)) {
      return {
        success: false,
        error: 'Invalid numeric value',
        celsius: null,
        originalValue: temperature,
        originalUnit: 'invalid'
      };
    }
    
    // Detect unit
    let originalUnit = 'C'; // Default to Celsius
    let celsiusValue = numericValue;
    
    // Check for explicit Fahrenheit indicators
    if (tempStr.match(/[Ff]|\u00b0F/)) {
      originalUnit = 'F';
      celsiusValue = (numericValue - 32) * 5 / 9;
    }
    // Check for explicit Celsius indicators  
    else if (tempStr.match(/[Cc]|\u00b0C/)) {
      originalUnit = 'C';
      celsiusValue = numericValue;
    }
    // Auto-detect based on value (assume Fahrenheit if > 100)
    else if (numericValue > 100) {
      originalUnit = 'F (assumed)';
      celsiusValue = (numericValue - 32) * 5 / 9;
    }
    // Values between 50-100 are ambiguous, but default to Celsius
    else {
      originalUnit = 'C (assumed)';
      celsiusValue = numericValue;
    }
    
    // Calculate Fahrenheit value for display
    const fahrenheitValue = this.toFahrenheit(celsiusValue);
    
    return {
      success: true,
      celsius: celsiusValue,
      fahrenheit: fahrenheitValue,
      originalValue: numericValue,
      originalUnit: originalUnit,
      formatted: `${numericValue}°${originalUnit.charAt(0)}`,
      celsiusFormatted: `${celsiusValue.toFixed(1)}°C`,
      fahrenheitFormatted: `${fahrenheitValue.toFixed(1)}°F`
    };
  }
  
  /**
   * Convert Celsius to Fahrenheit
   * @param {number} celsius - Temperature in Celsius
   * @returns {number} Temperature in Fahrenheit
   */
  static toFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
  }
  
  /**
   * Format temperature with appropriate unit
   * @param {number} value - Numeric temperature
   * @param {string} unit - Temperature unit ('C' or 'F')
   * @returns {string} Formatted temperature string
   */
  static format(value, unit = 'C') {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    const unitSymbol = unit.charAt(0).toUpperCase();
    return `${value}°${unitSymbol}`;
  }
  
  /**
   * Format flash point to always display in Fahrenheit
   * @param {string|number|object} flashPoint - Flash point value (can be string, number, or object)
   * @returns {string} Formatted flash point in Fahrenheit
   */
  static formatFlashPoint(flashPoint) {
    // Handle object format (already has celsius/fahrenheit)
    if (typeof flashPoint === 'object' && flashPoint !== null) {
      if (flashPoint.fahrenheit !== undefined) {
        return `${flashPoint.fahrenheit}°F`;
      }
      if (flashPoint.celsius !== undefined) {
        const fahrenheit = this.toFahrenheit(flashPoint.celsius);
        return `${fahrenheit.toFixed(1)}°F`;
      }
    }
    
    // Parse and convert string/number format
    const conversion = this.toCelsius(flashPoint);
    
    if (!conversion.success) {
      return flashPoint || 'N/A';
    }
    
    // Always return in Fahrenheit
    return `${conversion.fahrenheit.toFixed(1)}°F`;
  }
  
  /**
   * Check if temperature indicates ignitable material (D001)
   * Based on flash point < 60°C (140°F)
   * @param {string|number} flashPoint - Flash point temperature
   * @returns {Object} Classification result
   */
  static classifyFlashPoint(flashPoint) {
    const conversion = this.toCelsius(flashPoint);
    
    if (!conversion.success) {
      return {
        isIgnitable: false,
        code: null,
        reason: conversion.error,
        originalValue: flashPoint,
        conversion: conversion
      };
    }
    
    const isIgnitable = conversion.celsius < 60;
    
    return {
      isIgnitable: isIgnitable,
      code: isIgnitable ? 'D001' : null,
      reason: isIgnitable 
        ? `Flash Point ${conversion.formatted} = ${conversion.celsiusFormatted} < 60°C (Ignitable)`
        : `Flash Point ${conversion.formatted} = ${conversion.celsiusFormatted} ≥ 60°C (Not ignitable)`,
      originalValue: conversion.originalValue,
      originalUnit: conversion.originalUnit,
      celsiusValue: conversion.celsius,
      conversion: conversion
    };
  }
  
  /**
   * Test common temperature values
   * @returns {Array} Test results
   */
  static runTests() {
    const testCases = [
      { input: '126°F', expectedC: 52.2, expectedIgnitable: true },
      { input: '126F', expectedC: 52.2, expectedIgnitable: true },
      { input: '126', expectedC: 52.2, expectedIgnitable: true }, // Should assume F
      { input: '50°C', expectedC: 50, expectedIgnitable: true },
      { input: '50', expectedC: 50, expectedIgnitable: true }, // Should assume C
      { input: '140°F', expectedC: 60, expectedIgnitable: false },
      { input: '60°C', expectedC: 60, expectedIgnitable: false },
      { input: 'Not Provided', expectedC: null, expectedIgnitable: false },
      { input: '-20°C', expectedC: -20, expectedIgnitable: true },
      { input: '200°F', expectedC: 93.3, expectedIgnitable: false }
    ];
    
    const results = [];
    
    testCases.forEach((testCase, index) => {
      const conversion = this.toCelsius(testCase.input);
      const classification = this.classifyFlashPoint(testCase.input);
      
      const celsiusMatch = conversion.success ? 
        Math.abs(conversion.celsius - testCase.expectedC) < 0.1 : 
        testCase.expectedC === null;
        
      const ignitableMatch = classification.isIgnitable === testCase.expectedIgnitable;
      
      results.push({
        test: index + 1,
        input: testCase.input,
        expectedCelsius: testCase.expectedC,
        actualCelsius: conversion.celsius,
        celsiusMatch: celsiusMatch,
        expectedIgnitable: testCase.expectedIgnitable,
        actualIgnitable: classification.isIgnitable,
        ignitableMatch: ignitableMatch,
        passed: celsiusMatch && ignitableMatch,
        conversion: conversion,
        classification: classification
      });
    });
    
    return results;
  }
}

// Export default instance
export default TemperatureConverter;