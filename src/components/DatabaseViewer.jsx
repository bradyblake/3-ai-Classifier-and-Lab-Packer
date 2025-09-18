import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Upload, 
  BarChart3,
  FileText,
  Flame,
  Droplets,
  Zap,
  Beaker,
  Fuel,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Hash,
  Tag,
  Bug,
  Battery,
  Paintbrush,
  FlaskConical,
  Wind,
  Shield,
  Skull,
  Radiation
} from 'lucide-react';
import classificationDatabase from '../utils/classificationDatabase.js';
import BackButton from './BackButton';

export default function DatabaseViewer() {
  const [stats, setStats] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [materials, selectedType, searchTerm]);

  const loadData = () => {
    const dbStats = classificationDatabase.getStats();
    setStats(dbStats);
    
    // Get all materials
    const allMaterials = Object.values(classificationDatabase.database);
    setMaterials(allMaterials);
  };

  const filterMaterials = () => {
    let filtered = materials;
    
    // Filter by material type
    if (selectedType !== 'all') {
      filtered = filtered.filter(material => material.materialType === selectedType);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(material => 
        material.productName?.toLowerCase().includes(term) ||
        material.casNumber?.toLowerCase().includes(term) ||
        material.materialType?.toLowerCase().includes(term) ||
        material.materialSubtype?.toLowerCase().includes(term) ||
        material.chemicalFamily?.toLowerCase().includes(term)
      );
    }
    
    setFilteredMaterials(filtered);
  };

  const getMaterialTypeIcon = (type) => {
    switch (type) {
      case 'solvents': return <Droplets className="text-blue-500" />;
      case 'fuels': return <Fuel className="text-red-500" />;
      case 'oils': return <Gauge className="text-yellow-600" />;
      case 'acids': return <Zap className="text-red-600" />;
      case 'bases': return <Beaker className="text-purple-500" />;
      case 'pesticides': return <Bug className="text-green-600" />;
      case 'heavy_metals': return <Shield className="text-gray-600" />;
      case 'pharmaceuticals': return <FlaskConical className="text-cyan-500" />;
      case 'waste_oils': return <Droplets className="text-amber-600" />;
      case 'batteries': return <Battery className="text-indigo-500" />;
      case 'paints_and_coatings': return <Paintbrush className="text-pink-500" />;
      case 'laboratory_chemicals': return <FlaskConical className="text-emerald-500" />;
      case 'oxidizers': return <Flame className="text-orange-500" />;
      case 'compressed_gases': return <Wind className="text-sky-500" />;
      case 'asbestos_materials': return <AlertTriangle className="text-red-700" />;
      case 'pcbs': return <Zap className="text-purple-600" />;
      case 'explosives': return <Radiation className="text-red-800" />;
      case 'radioactive_materials': return <Radiation className="text-yellow-500" />;
      case 'medical_waste': return <Skull className="text-red-500" />;
      default: return <FileText className="text-gray-500" />;
    }
  };

  const exportDatabase = () => {
    const exportData = classificationDatabase.exportDatabase();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classification-database-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        classificationDatabase.importDatabase(importData);
        loadData();
        alert('Database imported successfully!');
      } catch (error) {
        alert('Failed to import database: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  if (!stats) {
    return <div className="p-6">Loading database statistics...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackButton />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-blue-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Classification Database</h1>
            <p className="text-gray-600">Smart material classification learning system</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-semibold">Total Materials</p>
                <p className="text-2xl font-bold text-blue-800">{stats.totalEntries}</p>
              </div>
              <Database className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-semibold">Hazardous</p>
                <p className="text-2xl font-bold text-red-800">{stats.hazardousCount}</p>
              </div>
              <AlertTriangle className="text-red-500" size={24} />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-semibold">Non-Hazardous</p>
                <p className="text-2xl font-bold text-green-800">{stats.nonHazardousCount}</p>
              </div>
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-semibold">Material Types</p>
                <p className="text-2xl font-bold text-purple-800">{Object.keys(stats.materialTypes).length}</p>
              </div>
              <BarChart3 className="text-purple-500" size={24} />
            </div>
          </div>
        </div>

        {/* Material Types Summary */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Material Types Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.materialTypes).map(([type, info]) => (
              <div key={type} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  {getMaterialTypeIcon(type)}
                  <div>
                    <h4 className="font-semibold capitalize">{type.replace('_', ' ')}</h4>
                    <p className="text-sm text-gray-600">{info.count} materials</p>
                  </div>
                </div>
                {info.subtypes.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Subtypes:</p>
                    <div className="flex flex-wrap gap-1">
                      {info.subtypes.map(subtype => (
                        <span key={subtype} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {subtype}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Examples:</p>
                  <p className="text-xs text-gray-700">{info.examples.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter by Type */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {Object.keys(stats.materialTypes).map(type => (
                  <option key={type} value={type} className="capitalize">
                    {type.replace('_', ' ')} ({stats.materialTypes[type].count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Import/Export */}
          <div className="flex gap-2">
            <label className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer flex items-center">
              <Upload className="mr-2" size={16} />
              Import Database
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Download className="mr-2" size={16} />
              Export Database
            </button>
          </div>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">
            Materials ({filteredMaterials.length})
            {selectedType !== 'all' && (
              <span className="text-sm text-gray-500 ml-2 capitalize">
                - {selectedType.replace('_', ' ')}
              </span>
            )}
          </h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredMaterials.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No materials found matching your search criteria.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMaterials.map((material, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getMaterialTypeIcon(material.materialType)}
                        <div>
                          <h4 className="font-semibold text-gray-800">{material.productName}</h4>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span className="capitalize">{material.materialType}</span>
                            {material.materialSubtype && (
                              <span className="capitalize">• {material.materialSubtype}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {material.casNumber && (
                          <div>
                            <span className="text-gray-500">CAS:</span>
                            <span className="ml-1 font-mono">{material.casNumber}</span>
                          </div>
                        )}
                        {material.unNumber && (
                          <div>
                            <span className="text-gray-500">UN:</span>
                            <span className="ml-1 font-mono">{material.unNumber}</span>
                          </div>
                        )}
                        {material.physicalState && (
                          <div>
                            <span className="text-gray-500">State:</span>
                            <span className="ml-1 capitalize">{material.physicalState}</span>
                          </div>
                        )}
                        {material.flashPoint !== undefined && (
                          <div>
                            <span className="text-gray-500">Flash Point:</span>
                            <span className="ml-1">{material.flashPoint}°F</span>
                          </div>
                        )}
                      </div>
                      
                      {material.commonUses && material.commonUses.length > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Uses:</span>
                          <span className="ml-1">{material.commonUses.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        material.hazardous 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {material.hazardous ? 'Hazardous' : 'Non-Hazardous'}
                      </div>
                      
                      {material.confidence && (
                        <div className="text-xs text-gray-500">
                          Confidence: {(material.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        {new Date(material.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Export Classification Database</h3>
            <p className="text-gray-600 mb-6">
              This will export all {stats.totalEntries} materials in your classification database 
              as a JSON file that can be imported into other systems.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={exportDatabase}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}