// MaterialVolumeInput.jsx - Component for specifying material container volumes and quantities

import React, { useState } from 'react';

const MaterialVolumeInput = ({ materials, onVolumeUpdate, onClose }) => {
  const [materialData, setMaterialData] = useState(() => 
    materials.map(material => ({
      id: material.id || Math.random(),
      productName: material.productName || 'Unknown Material',
      volume: material.originalVolume || material.volume || 500,
      units: material.units || 'ml',
      quantity: material.quantity || 1,
      physicalState: material.physicalState || 'unknown'
    }))
  );

  const handleVolumeChange = (index, value) => {
    const updated = [...materialData];
    updated[index].volume = Math.max(0, parseFloat(value) || 0);
    setMaterialData(updated);
  };

  const handleUnitsChange = (index, units) => {
    const updated = [...materialData];
    updated[index].units = units;
    setMaterialData(updated);
  };

  const handleQuantityChange = (index, value) => {
    const updated = [...materialData];
    updated[index].quantity = Math.max(1, parseInt(value) || 1);
    setMaterialData(updated);
  };

  const handleApplyDefaults = (volumeDefault, unitsDefault, quantityDefault = 1) => {
    const updated = materialData.map(material => ({
      ...material,
      volume: volumeDefault,
      units: unitsDefault,
      quantity: quantityDefault
    }));
    setMaterialData(updated);
  };

  const handleSubmit = () => {
    // Update materials with new volume, units, and quantity data
    const updatedMaterials = materials.map((material, index) => {
      const data = materialData[index];
      // Convert units for internal consistency
      let convertedAmount = data.volume;
      let measurementType = 'volume'; // or 'weight'
      
      // Determine if this is volume or weight measurement
      const weightUnits = ['lbs', 'kg', 'oz', 'g'];
      const isWeight = weightUnits.includes(data.units);
      
      if (isWeight) {
        measurementType = 'weight';
        // Convert to pounds for internal consistency
        switch(data.units) {
          case 'kg':
            convertedAmount = data.volume * 2.20462;
            break;
          case 'oz':
            convertedAmount = data.volume / 16;
            break;
          case 'g':
            convertedAmount = data.volume * 0.00220462;
            break;
          default: // lbs
            convertedAmount = data.volume;
        }
      } else {
        // Convert to milliliters for internal consistency  
        switch(data.units) {
          case 'L': case 'l': case 'liters':
            convertedAmount = data.volume * 1000;
            break;
          case 'gal': case 'gallons':
            convertedAmount = data.volume * 3785.41;
            break;
          case 'fl oz':
            convertedAmount = data.volume * 29.5735;
            break;
          default: // ml
            convertedAmount = data.volume;
        }
      }
      
      return {
        ...material,
        volume: isWeight ? (material.volume || 500) : convertedAmount, // Keep existing volume if weight, otherwise use converted
        weight: isWeight ? convertedAmount : (material.weight || 0), // Store weight if weight unit
        units: data.units,  // Keep original units for display
        quantity: data.quantity, // Number of containers
        originalVolume: data.volume, // Keep original entered value
        measurementType: measurementType // Track whether this is volume or weight
      };
    });
    
    onVolumeUpdate(updatedMaterials);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📦 Set Container Amounts & Quantities</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3">Quick Apply Defaults:</h3>
            <div className="mb-3">
              <h4 className="text-sm font-medium text-blue-700 mb-2">Liquids (Volume):</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <button
                  onClick={() => handleApplyDefaults(250, 'ml', 1)}
                  className="bg-green-100 text-green-800 px-3 py-2 rounded hover:bg-green-200 text-sm"
                >
                  Small Bottles<br />250ml × 1
                </button>
                <button
                  onClick={() => handleApplyDefaults(500, 'ml', 1)}
                  className="bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200 text-sm"
                >
                  Medium Bottles<br />500ml × 1
                </button>
                <button
                  onClick={() => handleApplyDefaults(1, 'L', 1)}
                  className="bg-purple-100 text-purple-800 px-3 py-2 rounded hover:bg-purple-200 text-sm"
                >
                  Liter Bottles<br />1L × 1
                </button>
                <button
                  onClick={() => handleApplyDefaults(1, 'gal', 1)}
                  className="bg-orange-100 text-orange-800 px-3 py-2 rounded hover:bg-orange-200 text-sm"
                >
                  Gallon Jugs<br />1 gal × 1
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-2">Solids (Weight):</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <button
                  onClick={() => handleApplyDefaults(1, 'lbs', 1)}
                  className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded hover:bg-yellow-200 text-sm"
                >
                  Small Containers<br />1 lb × 1
                </button>
                <button
                  onClick={() => handleApplyDefaults(5, 'lbs', 1)}
                  className="bg-red-100 text-red-800 px-3 py-2 rounded hover:bg-red-200 text-sm"
                >
                  Medium Containers<br />5 lbs × 1
                </button>
                <button
                  onClick={() => handleApplyDefaults(10, 'lbs', 1)}
                  className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded hover:bg-indigo-200 text-sm"
                >
                  Large Containers<br />10 lbs × 1
                </button>
                <button
                  onClick={() => handleApplyDefaults(1, 'kg', 1)}
                  className="bg-pink-100 text-pink-800 px-3 py-2 rounded hover:bg-pink-200 text-sm"
                >
                  Metric<br />1 kg × 1
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Individual Material Settings:</h3>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Material</th>
                    <th className="text-left p-3 font-medium text-gray-600">Physical State</th>
                    <th className="text-left p-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left p-3 font-medium text-gray-600">Units</th>
                    <th className="text-left p-3 font-medium text-gray-600">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {materialData.map((material, index) => (
                    <tr key={material.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-sm">{material.productName}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          material.physicalState === 'liquid' ? 'bg-blue-100 text-blue-800' :
                          material.physicalState === 'solid' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {material.physicalState}
                        </span>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={material.volume}
                          onChange={(e) => handleVolumeChange(index, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="50"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={material.units}
                          onChange={(e) => handleUnitsChange(index, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <optgroup label="Volume (Liquids)">
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="gal">gal</option>
                            <option value="fl oz">fl oz</option>
                          </optgroup>
                          <optgroup label="Weight (Solids)">
                            <option value="lbs">lbs</option>
                            <option value="kg">kg</option>
                            <option value="oz">oz</option>
                            <option value="g">g</option>
                          </optgroup>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="1"
                          step="1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Container Capacity Reference:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white p-2 rounded border">
                <strong>1 Gallon:</strong><br />
                3,785ml | 30lbs max
              </div>
              <div className="bg-white p-2 rounded border">
                <strong>5 Gallon:</strong><br />
                18,925ml | 150lbs max
              </div>
              <div className="bg-white p-2 rounded border">
                <strong>10 Gallon:</strong><br />
                37,850ml | 300lbs max
              </div>
              <div className="bg-white p-2 rounded border">
                <strong>30 Gallon:</strong><br />
                113,650ml | 600lbs max
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Apply Amount & Quantity Settings
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Total Containers: {materialData.reduce((sum, m) => sum + m.quantity, 0)} | 
            Total Volume: {materialData.reduce((sum, m) => {
              const weightUnits = ['lbs', 'kg', 'oz', 'g'];
              const isWeight = weightUnits.includes(m.units);
              
              if (isWeight) return sum; // Skip weight items for volume total
              
              let volumeInMl = m.volume * m.quantity;
              switch(m.units) {
                case 'L': case 'l': case 'liters':
                  volumeInMl = m.volume * 1000 * m.quantity;
                  break;
                case 'gal': case 'gallons':
                  volumeInMl = m.volume * 3785.41 * m.quantity;
                  break;
                case 'fl oz':
                  volumeInMl = m.volume * 29.5735 * m.quantity;
                  break;
                default:
                  volumeInMl = m.volume * m.quantity;
              }
              return sum + volumeInMl;
            }, 0).toLocaleString()}ml | 
            Total Weight: {materialData.reduce((sum, m) => {
              const weightUnits = ['lbs', 'kg', 'oz', 'g'];
              const isWeight = weightUnits.includes(m.units);
              
              if (!isWeight) return sum; // Skip volume items for weight total
              
              let weightInLbs = m.volume * m.quantity;
              switch(m.units) {
                case 'kg':
                  weightInLbs = m.volume * 2.20462 * m.quantity;
                  break;
                case 'oz':
                  weightInLbs = m.volume / 16 * m.quantity;
                  break;
                case 'g':
                  weightInLbs = m.volume * 0.00220462 * m.quantity;
                  break;
                default: // lbs
                  weightInLbs = m.volume * m.quantity;
              }
              return sum + weightInLbs;
            }, 0).toFixed(1)}lbs
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialVolumeInput;