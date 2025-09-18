import React, { useState, useEffect } from 'react';
import '../styles/ManualDataInput.css';

const ManualDataInput = ({ 
  productName, 
  missingData, 
  extractedText,
  onDataSubmit, 
  onCancel 
}) => {
  const [flashPoint, setFlashPoint] = useState('');
  const [flashPointUnit, setFlashPointUnit] = useState('F');
  const [flashPointCategory, setFlashPointCategory] = useState('');
  const [pH, setPH] = useState('');
  const [pHCategory, setPHCategory] = useState('');
  const [relevantSection, setRelevantSection] = useState('');

  useEffect(() => {
    // Extract relevant section from the SDS text
    if (extractedText) {
      const sections = [];
      
      if (missingData.includes('flashPoint')) {
        // Look for Section 5 (Fire-fighting) or Section 9 (Physical properties)
        const fireSection = extractedText.match(/(?:SECTION\s*5|5\.\s*FIRE[\s\S]*?)(?=SECTION\s*\d|$)/i);
        const physicalSection = extractedText.match(/(?:SECTION\s*9|9\.\s*PHYSICAL[\s\S]*?)(?=SECTION\s*\d|$)/i);
        
        if (physicalSection) {
          sections.push("=== SECTION 9: PHYSICAL PROPERTIES ===\n" + physicalSection[0].substring(0, 2000));
        } else if (fireSection) {
          sections.push("=== SECTION 5: FIRE-FIGHTING ===\n" + fireSection[0].substring(0, 2000));
        }
      }
      
      if (missingData.includes('pH')) {
        // Look for Section 9 (Physical properties)
        const physicalSection = extractedText.match(/(?:SECTION\s*9|9\.\s*PHYSICAL[\s\S]*?)(?=SECTION\s*\d|$)/i);
        if (physicalSection && !sections.some(s => s.includes('SECTION 9'))) {
          sections.push("=== SECTION 9: PHYSICAL PROPERTIES ===\n" + physicalSection[0].substring(0, 2000));
        }
      }
      
      setRelevantSection(sections.join('\n\n') || 'Unable to extract relevant section. Please refer to the SDS document.');
    }
  }, [extractedText, missingData]);

  const handleFlashPointChange = (value) => {
    setFlashPoint(value);
    
    // Auto-select category based on value
    let temp = parseFloat(value);
    if (flashPointUnit === 'C') {
      temp = (temp * 9/5) + 32; // Convert to F for comparison
    }
    
    if (!value || value === 'DNF') {
      setFlashPointCategory('DNF');
    } else if (temp <= 140) {
      setFlashPointCategory('<=140');
    } else if (temp > 140 && temp < 200) {
      setFlashPointCategory('>140<200');
    } else {
      setFlashPointCategory('>=200');
    }
  };

  const handlePHChange = (value) => {
    setPH(value);
    
    // Auto-select category based on value
    const ph = parseFloat(value);
    if (!isNaN(ph)) {
      if (ph <= 2.0) {
        setPHCategory('0-2');
      } else if (ph >= 12.5) {
        setPHCategory('>=12.5');
      } else {
        setPHCategory('2.1-12.4');
      }
    }
  };

  const handleSubmit = () => {
    const data = {};
    
    if (missingData.includes('flashPoint')) {
      if (flashPointCategory === 'DNF') {
        data.flashPoint = null;
        data.flashPointCategory = 'DNF';
      } else if (flashPoint) {
        let tempF = parseFloat(flashPoint);
        if (flashPointUnit === 'C') {
          tempF = Math.round((tempF * 9/5) + 32);
        }
        data.flashPoint = tempF;
        data.flashPointCategory = flashPointCategory;
      } else if (flashPointCategory) {
        // Use category midpoint if no exact value
        switch(flashPointCategory) {
          case '<=140':
            data.flashPoint = 140;
            break;
          case '>140<200':
            data.flashPoint = 170;
            break;
          case '>=200':
            data.flashPoint = 200;
            break;
        }
        data.flashPointCategory = flashPointCategory;
      }
    }
    
    if (missingData.includes('pH')) {
      if (pH) {
        data.pH = parseFloat(pH);
        data.pHCategory = pHCategory;
      } else if (pHCategory) {
        // Use category midpoint if no exact value
        switch(pHCategory) {
          case '0-2':
            data.pH = 1;
            break;
          case '2.1-12.4':
            data.pH = 7;
            break;
          case '>=12.5':
            data.pH = 13;
            break;
        }
        data.pHCategory = pHCategory;
      }
    }
    
    onDataSubmit(data);
  };

  return (
    <div className="manual-input-overlay">
      <div className="manual-input-modal">
        <h2>Manual Data Entry Required</h2>
        <p className="product-name">Product: {productName}</p>
        <p className="help-text">
          The following data could not be automatically extracted. 
          Please enter the values manually or select the appropriate category.
        </p>
        
        {relevantSection && (
          <div className="sds-section">
            <h3>Relevant SDS Section(s)</h3>
            <pre>{relevantSection}</pre>
          </div>
        )}
        
        {missingData.includes('flashPoint') && (
          <div className="input-group">
            <h3>Flash Point</h3>
            <div className="input-row">
              <input
                type="text"
                placeholder="Enter value or 'DNF'"
                value={flashPoint}
                onChange={(e) => handleFlashPointChange(e.target.value)}
              />
              <select 
                value={flashPointUnit} 
                onChange={(e) => setFlashPointUnit(e.target.value)}
                disabled={flashPoint === 'DNF'}
              >
                <option value="F">°F</option>
                <option value="C">°C</option>
              </select>
            </div>
            
            <div className="category-buttons">
              <button 
                className={flashPointCategory === 'DNF' ? 'selected' : ''}
                onClick={() => {
                  setFlashPointCategory('DNF');
                  setFlashPoint('DNF');
                }}
              >
                Does Not Flash
              </button>
              <button 
                className={flashPointCategory === '<=140' ? 'selected' : ''}
                onClick={() => setFlashPointCategory('<=140')}
              >
                ≤ 140°F
              </button>
              <button 
                className={flashPointCategory === '>140<200' ? 'selected' : ''}
                onClick={() => setFlashPointCategory('>140<200')}
              >
                &gt;140°F &lt;200°F
              </button>
              <button 
                className={flashPointCategory === '>=200' ? 'selected' : ''}
                onClick={() => setFlashPointCategory('>=200')}
              >
                ≥ 200°F
              </button>
            </div>
          </div>
        )}
        
        {missingData.includes('pH') && (
          <div className="input-group">
            <h3>pH</h3>
            <div className="input-row">
              <input
                type="number"
                placeholder="Enter pH value (0-14)"
                value={pH}
                onChange={(e) => handlePHChange(e.target.value)}
                min="0"
                max="14"
                step="0.1"
              />
            </div>
            
            <div className="category-buttons">
              <button 
                className={pHCategory === '0-2' ? 'selected' : ''}
                onClick={() => setPHCategory('0-2')}
              >
                0 - 2.0 (Corrosive)
              </button>
              <button 
                className={pHCategory === '2.1-12.4' ? 'selected' : ''}
                onClick={() => setPHCategory('2.1-12.4')}
              >
                2.1 - 12.4 (Non-corrosive)
              </button>
              <button 
                className={pHCategory === '>=12.5' ? 'selected' : ''}
                onClick={() => setPHCategory('>=12.5')}
              >
                ≥ 12.5 (Corrosive)
              </button>
            </div>
          </div>
        )}
        
        <div className="button-group">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={
              (missingData.includes('flashPoint') && !flashPoint && !flashPointCategory) ||
              (missingData.includes('pH') && !pH && !pHCategory)
            }
          >
            Submit Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualDataInput;