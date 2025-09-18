import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  X,
  Plus,
  Trash2,
  MapPin,
  DollarSign,
  Calendar,
  Columns,
  Target,
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LOCATIONS, PERIOD_TYPES } from '../utils/trackingUtils';

const ProjectTrackerSetup = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    locations: { ...LOCATIONS },
    periodType: '13_PERIODS',
    columns: [
      { id: 'backlog', title: 'Backlog', color: '#f3f4f6', revenueStage: 'pipeline' },
      { id: 'planning', title: 'Planning', color: '#dbeafe', revenueStage: 'pipeline' },
      { id: 'quote-sent', title: 'Quote Sent', color: '#fed7aa', revenueStage: 'pipeline' },
      { id: 'quote-approved', title: 'Quote Approved', color: '#bbf7d0', revenueStage: 'projected' },
      { id: 'active', title: 'Active', color: '#fde68a', revenueStage: 'projected' },
      { id: 'completed', title: 'Completed', color: '#c7d2fe', revenueStage: 'billed' },
      { id: 'billed', title: 'Billed', color: '#d1fae5', revenueStage: 'billed' },
      { id: 'paid', title: 'Paid', color: '#dcfce7', revenueStage: 'collected' }
    ],
    revenueTracking: {
      trackPipeline: true,
      trackProjected: true,
      trackBilled: true,
      trackCollected: true,
      defaultRevenue: 5000,
      currency: 'USD'
    },
    trackingNumbers: {
      format: 'JULIAN', // JULIAN, PERIOD, QUARTER, MONTH
      autoGenerate: true,
      includeLocation: true
    },
    notifications: {
      statusReminders: true,
      reminderDays: 7,
      overdueAlerts: true
    }
  });

  const [activeTab, setActiveTab] = useState('columns');

  useEffect(() => {
    // Load existing settings from localStorage
    const savedSettings = localStorage.getItem('project_tracker_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('project_tracker_settings', JSON.stringify(settings));
    onSave(settings);
    onClose();
  };

  const addColumn = () => {
    const newColumn = {
      id: `col_${Date.now()}`,
      title: 'New Column',
      color: '#f3f4f6',
      revenueStage: 'pipeline'
    };
    setSettings(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));
  };

  const updateColumn = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const removeColumn = (index) => {
    if (settings.columns.length <= 2) {
      alert('Must have at least 2 columns');
      return;
    }
    setSettings(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  const addLocation = () => {
    const abbr = prompt('Enter location abbreviation (2-3 letters):');
    const name = prompt('Enter location name:');
    if (abbr && name) {
      setSettings(prev => ({
        ...prev,
        locations: {
          ...prev.locations,
          [abbr.toUpperCase()]: {
            name,
            abbreviation: abbr.toUpperCase(),
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
          }
        }
      }));
    }
  };

  const removeLocation = (key) => {
    if (Object.keys(settings.locations).length <= 1) {
      alert('Must have at least 1 location');
      return;
    }
    setSettings(prev => ({
      ...prev,
      locations: Object.fromEntries(
        Object.entries(prev.locations).filter(([k]) => k !== key)
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Settings className="mr-2" />
                Project Tracker Setup
              </h2>
              <p className="text-gray-600 mt-1">
                Configure columns, locations, revenue tracking, and system settings
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            {[
              { id: 'columns', label: 'Columns & Workflow', icon: <Columns size={16} /> },
              { id: 'locations', label: 'Locations', icon: <MapPin size={16} /> },
              { id: 'revenue', label: 'Revenue Tracking', icon: <DollarSign size={16} /> },
              { id: 'tracking', label: 'Tracking Numbers', icon: <Target size={16} /> },
              { id: 'periods', label: 'Periods', icon: <Calendar size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 flex items-center space-x-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {activeTab === 'columns' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Workflow Columns</h3>
                  <button
                    onClick={addColumn}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Column
                  </button>
                </div>
                
                <div className="space-y-3">
                  {settings.columns.map((column, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <input
                        type="color"
                        value={column.color}
                        onChange={(e) => updateColumn(index, 'color', e.target.value)}
                        className="w-8 h-8 rounded border"
                      />
                      <input
                        type="text"
                        value={column.title}
                        onChange={(e) => updateColumn(index, 'title', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded"
                        placeholder="Column title"
                      />
                      <select
                        value={column.revenueStage}
                        onChange={(e) => updateColumn(index, 'revenueStage', e.target.value)}
                        className="px-3 py-2 border rounded text-sm"
                      >
                        <option value="pipeline">Pipeline</option>
                        <option value="projected">Projected</option>
                        <option value="billed">Billed</option>
                        <option value="collected">Collected</option>
                      </select>
                      <button
                        onClick={() => removeColumn(index)}
                        className="text-red-600 hover:text-red-800"
                        disabled={settings.columns.length <= 2}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <AlertCircle size={14} className="inline mr-1" />
                    Revenue stages determine when revenue is counted toward each pipeline category.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'locations' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Business Locations</h3>
                  <button
                    onClick={addLocation}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Location
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.locations).map(([key, location]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: location.color }}
                      ></div>
                      <div className="flex-1">
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-gray-500">{location.abbreviation}</div>
                      </div>
                      <button
                        onClick={() => removeLocation(key)}
                        className="text-red-600 hover:text-red-800"
                        disabled={Object.keys(settings.locations).length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Revenue Tracking Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="font-medium">Track Pipeline Revenue</label>
                      <input
                        type="checkbox"
                        checked={settings.revenueTracking.trackPipeline}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          revenueTracking: { ...prev.revenueTracking, trackPipeline: e.target.checked }
                        }))}
                        className="scale-125"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="font-medium">Track Projected Revenue</label>
                      <input
                        type="checkbox"
                        checked={settings.revenueTracking.trackProjected}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          revenueTracking: { ...prev.revenueTracking, trackProjected: e.target.checked }
                        }))}
                        className="scale-125"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="font-medium">Default Project Revenue</label>
                      <input
                        type="number"
                        value={settings.revenueTracking.defaultRevenue}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          revenueTracking: { ...prev.revenueTracking, defaultRevenue: parseFloat(e.target.value) }
                        }))}
                        className="w-32 px-3 py-1 border rounded text-right"
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Tracking Number Format</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block font-medium mb-2">Format Type</label>
                      <select
                        value={settings.trackingNumbers.format}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          trackingNumbers: { ...prev.trackingNumbers, format: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="JULIAN">Location-Year-JulianDay-Sequence (HOU-2025-045-01)</option>
                        <option value="PERIOD">Location-Year-Period-Sequence (HOU-2025-P05-01)</option>
                        <option value="QUARTER">Location-Year-Quarter-Sequence (HOU-2025-Q1-01)</option>
                        <option value="MONTH">Location-Year-Month-Sequence (HOU-2025-02-01)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="font-medium">Auto-generate Tracking Numbers</label>
                      <input
                        type="checkbox"
                        checked={settings.trackingNumbers.autoGenerate}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          trackingNumbers: { ...prev.trackingNumbers, autoGenerate: e.target.checked }
                        }))}
                        className="scale-125"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'periods' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Period Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-2">Period Type</label>
                    <select
                      value={settings.periodType}
                      onChange={(e) => setSettings(prev => ({ ...prev, periodType: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                    >
                      {Object.entries(PERIOD_TYPES).map(([key, config]) => (
                        <option key={key} value={key}>{config.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Selected: <strong>{PERIOD_TYPES[settings.periodType].name}</strong>
                      <br />
                      {PERIOD_TYPES[settings.periodType].periods} periods of approximately {PERIOD_TYPES[settings.periodType].daysPerPeriod} days each
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Save size={16} className="mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTrackerSetup;