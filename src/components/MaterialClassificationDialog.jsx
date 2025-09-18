import React, { useState } from 'react';
import { 
  HelpCircle, 
  Package, 
  Droplets, 
  AlertTriangle,
  CheckCircle,
  X,
  Info
} from 'lucide-react';

export default function MaterialClassificationDialog({ 
  material, 
  ambiguousTypes, 
  onClassify, 
  onCancel 
}) {
  const [selectedType, setSelectedType] = useState(null);
  const [userNotes, setUserNotes] = useState('');

  const getClassificationOptions = (types) => {
    const options = [];
    
    if (types.includes('gas_or_aerosol')) {
      options.push({
        id: 'pressurized_cylinder',
        title: 'Pressurized Gas Cylinder',
        icon: <Package />,
        description: 'Large metal cylinders (propane, welding gases, CO2, etc.)',
        examples: ['Propane tank', 'Welding gas cylinder', 'CO2 cylinder', 'Compressed air tank'],
        packingRules: [
          'Requires upright storage',
          'Cannot be lab packed with other materials',
          'Needs separate transportation',
          'Valve protection required'
        ],
        dotClass: '2.2 (Non-flammable gas) or 2.1 (Flammable gas)',
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.1)'
      });
      
      options.push({
        id: 'aerosol',
        title: 'Aerosol Can',
        icon: <Droplets />,
        description: 'Small pressurized cans with spray nozzles',
        examples: ['WD-40', 'Brake cleaner', 'Contact cleaner', 'Compressed air duster'],
        packingRules: [
          'Can be lab packed with other aerosols',
          'Must be segregated from non-aerosols',
          'Cushioning required',
          'Temperature sensitive'
        ],
        dotClass: 'UN1950 (Aerosols)',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)'
      });
    }
    
    // Add other ambiguous type options as needed
    if (types.includes('flammable_or_combustible')) {
      options.push({
        id: 'flammable_liquid',
        title: 'Flammable Liquid (Flash Point < 100°F)',
        icon: <AlertTriangle />,
        description: 'Highly flammable - ignites easily at room temperature',
        examples: ['Acetone', 'Methanol', 'Gasoline', 'Paint thinner'],
        packingRules: ['DOT Class 3', 'Keep away from heat sources', 'Can group with other flammables'],
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)'
      });
      
      options.push({
        id: 'combustible_liquid',
        title: 'Combustible Liquid (Flash Point 100-200°F)',
        icon: <Info />,
        description: 'Less hazardous - requires higher temperature to ignite',
        examples: ['Diesel fuel', 'Motor oil', 'Some solvents'],
        packingRules: ['Not DOT regulated', 'Can group with similar materials', 'Less restrictive handling'],
        color: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.1)'
      });
    }
    
    return options;
  };

  const classificationOptions = getClassificationOptions(ambiguousTypes);

  const handleClassify = () => {
    if (!selectedType) return;
    
    const selectedOption = classificationOptions.find(opt => opt.id === selectedType);
    onClassify({
      materialId: material.id,
      classification: selectedType,
      userNotes: userNotes,
      classificationDetails: selectedOption
    });
  };

  return (
    <div className="classification-dialog-overlay">
      <div className="classification-dialog">
        <div className="dialog-header">
          <div className="header-content">
            <HelpCircle className="header-icon" />
            <div>
              <h3>Material Classification Required</h3>
              <p>"{material.productName}" has ambiguous properties that need clarification</p>
            </div>
          </div>
          <button className="close-button" onClick={onCancel}>
            <X />
          </button>
        </div>

        <div className="dialog-content">
          <div className="material-info">
            <h4>Material Details:</h4>
            <ul>
              <li><strong>Product Name:</strong> {material.productName}</li>
              <li><strong>Physical State:</strong> {material.physicalState || 'Unknown'}</li>
              <li><strong>Packaging:</strong> {material.packaging || 'Not specified'}</li>
              {material.unNumber && (
                <li><strong>UN Number:</strong> {material.unNumber}</li>
              )}
            </ul>
          </div>

          <div className="classification-options">
            <h4>Please select the most appropriate classification:</h4>
            
            {classificationOptions.map(option => (
              <div 
                key={option.id}
                className={`classification-option ${selectedType === option.id ? 'selected' : ''}`}
                onClick={() => setSelectedType(option.id)}
                style={{ 
                  '--option-color': option.color,
                  '--option-bg': option.bgColor 
                }}
              >
                <div className="option-header">
                  <div className="option-icon">
                    {option.icon}
                  </div>
                  <div className="option-title">
                    <h5>{option.title}</h5>
                    <p>{option.description}</p>
                  </div>
                  <div className="option-radio">
                    {selectedType === option.id ? <CheckCircle /> : <div className="radio-empty" />}
                  </div>
                </div>
                
                <div className="option-details">
                  <div className="examples">
                    <strong>Examples:</strong>
                    <div className="example-tags">
                      {option.examples.map((example, idx) => (
                        <span key={idx} className="example-tag">{example}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="packing-rules">
                    <strong>Packing Rules:</strong>
                    <ul>
                      {option.packingRules.map((rule, idx) => (
                        <li key={idx}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {option.dotClass && (
                    <div className="dot-class">
                      <strong>DOT Classification:</strong> {option.dotClass}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="user-notes">
            <label>
              <strong>Additional Notes (Optional):</strong>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Add any additional details about this material that might help with classification..."
                rows={3}
              />
            </label>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className={`classify-button ${selectedType ? 'enabled' : 'disabled'}`}
            onClick={handleClassify}
            disabled={!selectedType}
          >
            Apply Classification
          </button>
        </div>
      </div>

      <style jsx>{`
        .classification-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 20px;
        }

        .classification-dialog {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #E5E7EB;
          background: #F9FAFB;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 24px;
          height: 24px;
          color: #F59E0B;
        }

        .header-content h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .header-content p {
          margin: 0;
          font-size: 0.875rem;
          color: #6B7280;
        }

        .close-button {
          background: none;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #F3F4F6;
          color: #111827;
        }

        .dialog-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .material-info {
          background: #F0F9FF;
          border: 1px solid #BAE6FD;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .material-info h4 {
          margin: 0 0 8px 0;
          color: #0C4A6E;
        }

        .material-info ul {
          margin: 0;
          padding-left: 20px;
        }

        .material-info li {
          margin: 4px 0;
          font-size: 0.875rem;
          color: #075985;
        }

        .classification-options h4 {
          margin: 0 0 16px 0;
          color: #111827;
        }

        .classification-option {
          border: 2px solid #E5E7EB;
          border-radius: 10px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
        }

        .classification-option:hover {
          border-color: #9CA3AF;
        }

        .classification-option.selected {
          border-color: var(--option-color);
          background: var(--option-bg);
        }

        .option-header {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 12px;
        }

        .option-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: var(--option-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--option-color);
          flex-shrink: 0;
        }

        .option-title {
          flex: 1;
        }

        .option-title h5 {
          margin: 0;
          font-weight: 600;
          color: #111827;
        }

        .option-title p {
          margin: 4px 0 0 0;
          font-size: 0.875rem;
          color: #6B7280;
        }

        .option-radio {
          width: 24px;
          height: 24px;
          color: var(--option-color);
        }

        .radio-empty {
          width: 20px;
          height: 20px;
          border: 2px solid #D1D5DB;
          border-radius: 50%;
        }

        .option-details {
          padding: 0 16px 16px 16px;
          border-top: 1px solid #F3F4F6;
          margin-top: 12px;
          padding-top: 12px;
        }

        .examples, .packing-rules, .dot-class {
          margin-bottom: 12px;
        }

        .example-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .example-tag {
          background: #F3F4F6;
          color: #374151;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .packing-rules ul {
          margin: 4px 0;
          padding-left: 16px;
        }

        .packing-rules li {
          font-size: 0.875rem;
          color: #374151;
          margin: 2px 0;
        }

        .user-notes {
          margin-top: 20px;
        }

        .user-notes label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }

        .user-notes textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-family: inherit;
          resize: vertical;
        }

        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #E5E7EB;
          background: #F9FAFB;
        }

        .cancel-button, .classify-button {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button {
          background: white;
          border: 1px solid #D1D5DB;
          color: #374151;
        }

        .cancel-button:hover {
          background: #F9FAFB;
        }

        .classify-button.enabled {
          background: #3B82F6;
          border: 1px solid #3B82F6;
          color: white;
        }

        .classify-button.enabled:hover {
          background: #2563EB;
        }

        .classify-button.disabled {
          background: #F3F4F6;
          border: 1px solid #D1D5DB;
          color: #9CA3AF;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .classification-dialog {
            margin: 10px;
            max-width: none;
          }
          
          .option-header {
            flex-direction: column;
            text-align: center;
            gap: 8px;
          }
          
          .example-tags {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}