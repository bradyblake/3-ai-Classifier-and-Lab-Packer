import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Save, Trash2, Settings, MapPin, TrendingUp, CheckCircle, GripVertical, ArrowUp, ArrowDown, Users, Building2, Target } from 'lucide-react';
import { getLanes, getStatuses, saveLanes, saveStatuses, getStatusRevenueCategory } from '../shared/utils/kanbanUtils.jsx';

const KanbanSetupPanel = ({ isOpen, onClose, onConfigUpdate }) => {
  const [activeTab, setActiveTab] = useState('locations');
  const [lanes, setLanes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [revenueCategories, setRevenueCategories] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [quotas, setQuotas] = useState([]);

  // Quota form states
  const [newQuotaPeriod, setNewQuotaPeriod] = useState('');
  const [newQuotaLocation, setNewQuotaLocation] = useState('');
  const [newQuotaTarget, setNewQuotaTarget] = useState('');
  const [newQuotaStartDate, setNewQuotaStartDate] = useState('');
  const [newQuotaEndDate, setNewQuotaEndDate] = useState('');
  const [editingQuota, setEditingQuota] = useState(null);

  // Form states
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAbbreviation, setNewLocationAbbreviation] = useState('');
  const [newLocationColor, setNewLocationColor] = useState('#4ade80');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#0ea5e9');
  const [newStatusRevenueCategory, setNewStatusRevenueCategory] = useState('Pipeline');
  const [newRevenueCategoryName, setNewRevenueCategoryName] = useState('');
  const [newRevenueCategoryColor, setNewRevenueCategoryColor] = useState('#f59e0b');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPosition, setNewPersonPosition] = useState('');
  const [newPersonLocation, setNewPersonLocation] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorType, setNewVendorType] = useState('Primary');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');

  // Edit states
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [editingRevenueCategory, setEditingRevenueCategory] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    const storedLanes = getLanes();
    const storedStatuses = getStatuses();

    // Initialize default data if empty
    if (storedLanes.length === 0) {
      const defaultLanes = [
        { id: 'corporate', name: 'Corporate', color: '#16a34a', abbreviation: 'CORP' },
        { id: 'field', name: 'Field Operations', color: '#0284c7', abbreviation: 'FIELD' },
        { id: 'warehouse', name: 'Warehouse', color: '#dc2626', abbreviation: 'WH' }
      ];
      setLanes(defaultLanes);
      saveLanes(defaultLanes);
    } else {
      setLanes(storedLanes);
    }

    if (storedStatuses.length === 0) {
      const defaultStatuses = [
        { id: 'lead', name: 'Lead', color: '#6b7280', revenueCategory: 'N/A' },
        { id: 'quoted', name: 'Quoted', color: '#f59e0b', revenueCategory: 'Pipeline' },
        { id: 'waiting_vendor', name: 'Waiting on Vendor', color: '#ef4444', revenueCategory: 'Pipeline' },
        { id: 'contracted', name: 'Contracted', color: '#0ea5e9', revenueCategory: 'Projected' },
        { id: 'active', name: 'Active', color: '#8b5cf6', revenueCategory: 'Projected' },
        { id: 'completed', name: 'Completed', color: '#22c55e', revenueCategory: 'Actual' }
      ];
      setStatuses(defaultStatuses);
      saveStatuses(defaultStatuses);
    } else {
      setStatuses(storedStatuses);
    }

    // Initialize revenue categories
    const defaultRevenueCategories = [
      { id: 'na', name: 'N/A', color: '#9ca3af', description: 'No revenue applicable (leads, cancelled projects)' },
      { id: 'pipeline', name: 'Pipeline', color: '#6b7280', description: 'Potential future revenue' },
      { id: 'projected', name: 'Projected', color: '#0ea5e9', description: 'Expected revenue from contracted work' },
      { id: 'actual', name: 'Actual', color: '#22c55e', description: 'Revenue from completed projects' }
    ];
    setRevenueCategories(defaultRevenueCategories);

    // Load personnel data
    const storedPersonnel = localStorage.getItem('kanban_personnel');
    if (storedPersonnel) {
      setPersonnel(JSON.parse(storedPersonnel));
    } else {
      // Initialize with empty personnel list - user will add their own
      setPersonnel([]);
    }

    // Load vendor data
    const storedVendors = localStorage.getItem('kanban_vendors');
    if (storedVendors) {
      setVendors(JSON.parse(storedVendors));
    } else {
      // Initialize with some default vendors
      const defaultVendors = [
        { id: 'bronco_env', name: 'Bronco Environmental', type: 'Primary', email: 'contact@broncoenv.com', phone: '555-0201', address: '123 Industrial Blvd, Houston, TX', active: true },
        { id: 'heritage_env', name: 'Heritage Environmental', type: 'Subcontractor', email: 'info@heritage.com', phone: '555-0202', address: '456 Service Rd, Austin, TX', active: true },
        { id: 'clean_harbors', name: 'Clean Harbors', type: 'Disposal', email: 'support@cleanharbors.com', phone: '555-0203', address: '789 Waste Dr, Dallas, TX', active: true }
      ];
      setVendors(defaultVendors);
      localStorage.setItem('kanban_vendors', JSON.stringify(defaultVendors));
    }

    // Load quota data
    const storedQuotas = localStorage.getItem('kanban_quotas');
    if (storedQuotas) {
      setQuotas(JSON.parse(storedQuotas));
    } else {
      // Initialize with empty quotas array
      setQuotas([]);
    }
  };

  const savePersonnel = (personnelData) => {
    localStorage.setItem('kanban_personnel', JSON.stringify(personnelData));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('personnelDataChanged'));
  };

  const saveVendors = (vendorsData) => {
    localStorage.setItem('kanban_vendors', JSON.stringify(vendorsData));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('vendorsDataChanged'));
  };

  const saveQuotas = (quotasData) => {
    localStorage.setItem('kanban_quotas', JSON.stringify(quotasData));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('quotasDataChanged'));
  };

  const handleSave = () => {
    saveLanes(lanes);
    saveStatuses(statuses);
    savePersonnel(personnel);
    saveVendors(vendors);
    saveQuotas(quotas);
    onConfigUpdate && onConfigUpdate();
    onClose();
  };

  // Location (Lane) Management
  const addLocation = () => {
    if (newLocationName.trim() && newLocationAbbreviation.trim()) {
      const newLane = {
        id: Date.now().toString(),
        name: newLocationName.trim(),
        abbreviation: newLocationAbbreviation.trim().toUpperCase(),
        color: newLocationColor,
        projectCounter: 0
      };
      const updatedLanes = [...lanes, newLane];
      setLanes(updatedLanes);
      setNewLocationName('');
      setNewLocationAbbreviation('');
      setNewLocationColor('#4ade80');
    }
  };

  const updateLocation = (id, updates) => {
    setLanes(lanes.map(lane =>
      lane.id === id ? { ...lane, ...updates } : lane
    ));
    setEditingLocation(null);
  };

  const moveLocation = (index, direction) => {
    const newLanes = [...lanes];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < lanes.length) {
      [newLanes[index], newLanes[newIndex]] = [newLanes[newIndex], newLanes[index]];
      setLanes(newLanes);
    }
  };

  const deleteLocation = (id) => {
    if (window.confirm('Are you sure? This will remove all cards in this location.')) {
      setLanes(lanes.filter(lane => lane.id !== id));
    }
  };

  // Status Management
  const addStatus = () => {
    if (newStatusName.trim()) {
      const newStatus = {
        id: Date.now().toString(),
        name: newStatusName.trim(),
        color: newStatusColor,
        revenueCategory: newStatusRevenueCategory
      };
      const updatedStatuses = [...statuses, newStatus];
      setStatuses(updatedStatuses);
      setNewStatusName('');
      setNewStatusColor('#0ea5e9');
    }
  };

  const updateStatus = (id, updates) => {
    setStatuses(statuses.map(status =>
      status.id === id ? { ...status, ...updates } : status
    ));
    setEditingStatus(null);
  };

  const moveStatus = (index, direction) => {
    const newStatuses = [...statuses];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < statuses.length) {
      [newStatuses[index], newStatuses[newIndex]] = [newStatuses[newIndex], newStatuses[index]];
      setStatuses(newStatuses);
    }
  };

  const deleteStatus = (id) => {
    if (window.confirm('Are you sure? This will remove all cards with this status.')) {
      setStatuses(statuses.filter(status => status.id !== id));
    }
  };

  // Revenue Category Management
  const addRevenueCategory = () => {
    if (newRevenueCategoryName.trim()) {
      const newCategory = {
        id: Date.now().toString(),
        name: newRevenueCategoryName.trim(),
        color: newRevenueCategoryColor,
        description: ''
      };
      const updatedCategories = [...revenueCategories, newCategory];
      setRevenueCategories(updatedCategories);
      setNewRevenueCategoryName('');
      setNewRevenueCategoryColor('#f59e0b');
    }
  };

  // Personnel Management
  const addPerson = () => {
    if (newPersonName.trim() && newPersonPosition.trim() && newPersonLocation.trim()) {
      const newPerson = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        position: newPersonPosition.trim(),
        location: newPersonLocation,
        email: newPersonEmail.trim(),
        phone: newPersonPhone.trim(),
        active: true,
        dateAdded: new Date().toISOString()
      };
      const updatedPersonnel = [...personnel, newPerson];
      setPersonnel(updatedPersonnel);
      savePersonnel(updatedPersonnel);
      setNewPersonName('');
      setNewPersonPosition('');
      setNewPersonLocation('');
      setNewPersonEmail('');
      setNewPersonPhone('');
    }
  };

  const updatePerson = (id, updates) => {
    const updatedPersonnel = personnel.map(person =>
      person.id === id ? { ...person, ...updates } : person
    );
    setPersonnel(updatedPersonnel);
    savePersonnel(updatedPersonnel);
    setEditingPerson(null);
  };

  const deletePerson = (id) => {
    if (window.confirm('Are you sure you want to remove this person from the personnel list?')) {
      const updatedPersonnel = personnel.filter(person => person.id !== id);
      setPersonnel(updatedPersonnel);
      savePersonnel(updatedPersonnel);
    }
  };

  const togglePersonActive = (id) => {
    const updatedPersonnel = personnel.map(person =>
      person.id === id ? { ...person, active: !person.active } : person
    );
    setPersonnel(updatedPersonnel);
    savePersonnel(updatedPersonnel);
  };

  // Vendor Management
  const addVendor = () => {
    if (newVendorName.trim() && newVendorType.trim()) {
      const newVendor = {
        id: Date.now().toString(),
        name: newVendorName.trim(),
        type: newVendorType,
        email: newVendorEmail.trim(),
        phone: newVendorPhone.trim(),
        address: newVendorAddress.trim(),
        active: true,
        dateAdded: new Date().toISOString()
      };
      const updatedVendors = [...vendors, newVendor];
      setVendors(updatedVendors);
      saveVendors(updatedVendors);
      setNewVendorName('');
      setNewVendorType('Primary');
      setNewVendorEmail('');
      setNewVendorPhone('');
      setNewVendorAddress('');
    }
  };

  const updateVendor = (id, updates) => {
    const updatedVendors = vendors.map(vendor =>
      vendor.id === id ? { ...vendor, ...updates } : vendor
    );
    setVendors(updatedVendors);
    saveVendors(updatedVendors);
    setEditingVendor(null);
  };

  const deleteVendor = (id) => {
    if (window.confirm('Are you sure you want to remove this vendor?')) {
      const updatedVendors = vendors.filter(vendor => vendor.id !== id);
      setVendors(updatedVendors);
      saveVendors(updatedVendors);
    }
  };

  const toggleVendorActive = (id) => {
    const updatedVendors = vendors.map(vendor =>
      vendor.id === id ? { ...vendor, active: !vendor.active } : vendor
    );
    setVendors(updatedVendors);
    saveVendors(updatedVendors);
  };

  // Quota Management Functions
  const addQuota = () => {
    if (newQuotaPeriod.trim() && newQuotaLocation && newQuotaTarget && newQuotaStartDate && newQuotaEndDate) {
      const newQuota = {
        id: Date.now().toString(),
        period: newQuotaPeriod.trim(),
        location: newQuotaLocation,
        target: parseFloat(newQuotaTarget),
        startDate: newQuotaStartDate,
        endDate: newQuotaEndDate,
        achieved: 0, // Start with 0 achieved
        active: true,
        created: new Date().toISOString()
      };

      const updatedQuotas = [...quotas, newQuota];
      setQuotas(updatedQuotas);
      saveQuotas(updatedQuotas);

      // Clear form
      setNewQuotaPeriod('');
      setNewQuotaLocation('');
      setNewQuotaTarget('');
      setNewQuotaStartDate('');
      setNewQuotaEndDate('');
    }
  };

  const deleteQuota = (id) => {
    const updatedQuotas = quotas.filter(quota => quota.id !== id);
    setQuotas(updatedQuotas);
    saveQuotas(updatedQuotas);
  };

  const toggleQuotaActive = (id) => {
    const updatedQuotas = quotas.map(quota =>
      quota.id === id ? { ...quota, active: !quota.active } : quota
    );
    setQuotas(updatedQuotas);
    saveQuotas(updatedQuotas);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800">Kanban Board Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('locations')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeTab === 'locations' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Locations</span>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {lanes.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('statuses')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeTab === 'statuses' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Project Statuses</span>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {statuses.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('revenue')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeTab === 'revenue' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Revenue Categories</span>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {revenueCategories.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('personnel')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeTab === 'personnel' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Personnel</span>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {personnel.filter(p => p.active).length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('vendors')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeTab === 'vendors' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Vendors</span>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {vendors.filter(v => v.active).length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('quotas')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  activeTab === 'quotas' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100'
                }`}
              >
                <Target className="w-5 h-5" />
                <span className="font-medium">Quotas</span>
                <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {quotas.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Location Management</h3>
                  <p className="text-sm text-gray-600">Locations appear as horizontal lanes on your board</p>
                </div>

                {/* Add New Location */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3">Add New Location</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Location name (e.g., Corporate, Field, Warehouse)"
                      className="px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={newLocationAbbreviation}
                      onChange={(e) => setNewLocationAbbreviation(e.target.value)}
                      placeholder="Abbreviation (e.g., CORP, FLD, WH)"
                      className="px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      maxLength="6"
                    />
                    <input
                      type="color"
                      value={newLocationColor}
                      onChange={(e) => setNewLocationColor(e.target.value)}
                      className="h-10 w-full rounded-lg border border-green-300 cursor-pointer"
                    />
                    <button
                      onClick={addLocation}
                      className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Location
                    </button>
                  </div>
                </div>

                {/* Existing Locations */}
                <div className="space-y-3">
                  {lanes.map((lane, index) => (
                    <div key={lane.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      {editingLocation === lane.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                          <input
                            type="text"
                            defaultValue={lane.name}
                            onChange={(e) => updateLocation(lane.id, { name: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            defaultValue={lane.abbreviation || ''}
                            onChange={(e) => updateLocation(lane.id, { abbreviation: e.target.value.toUpperCase() })}
                            placeholder="Abbreviation"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            maxLength="6"
                          />
                          <input
                            type="color"
                            defaultValue={lane.color}
                            onChange={(e) => updateLocation(lane.id, { color: e.target.value })}
                            className="h-10 w-full rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <button
                            onClick={() => setEditingLocation(null)}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: lane.color }}
                            />
                            <div>
                              <span className="font-medium text-gray-800">{lane.name}</span>
                              {lane.abbreviation && (
                                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                                  {lane.abbreviation}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveLocation(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveLocation(index, 'down')}
                                disabled={index === lanes.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <GripVertical className="w-4 h-4 text-gray-400" />
                            </div>
                            <button
                              onClick={() => setEditingLocation(lane.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteLocation(lane.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statuses Tab */}
            {activeTab === 'statuses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Project Status Management</h3>
                  <p className="text-sm text-gray-600">Statuses appear as vertical columns on your board</p>
                </div>

                {/* Add New Status */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-3">Add New Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      placeholder="Status name (e.g., In Progress, Review)"
                      className="px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="h-10 w-full rounded-lg border border-blue-300 cursor-pointer"
                    />
                    <select
                      value={newStatusRevenueCategory}
                      onChange={(e) => setNewStatusRevenueCategory(e.target.value)}
                      className="px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {revenueCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={addStatus}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Status
                    </button>
                  </div>
                </div>

                {/* Existing Statuses */}
                <div className="space-y-3">
                  {statuses.map((status, index) => (
                    <div key={status.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      {editingStatus === status.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                          <input
                            type="text"
                            defaultValue={status.name}
                            onChange={(e) => updateStatus(status.id, { name: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="color"
                            defaultValue={status.color}
                            onChange={(e) => updateStatus(status.id, { color: e.target.value })}
                            className="h-10 w-full rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <select
                            defaultValue={status.revenueCategory}
                            onChange={(e) => updateStatus(status.id, { revenueCategory: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {revenueCategories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditingStatus(null)}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: status.color }}
                            />
                            <div>
                              <span className="font-medium text-gray-800">{status.name}</span>
                              <span className="ml-3 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {status.revenueCategory}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveStatus(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move left"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveStatus(index, 'down')}
                                disabled={index === statuses.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move right"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <GripVertical className="w-4 h-4 text-gray-400" />
                            </div>
                            <button
                              onClick={() => setEditingStatus(status.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStatus(status.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue Categories Tab */}
            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Revenue Category Management</h3>
                  <p className="text-sm text-gray-600">Categories for tracking project revenue stages</p>
                </div>

                {/* Add New Revenue Category */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-3">Add New Revenue Category</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newRevenueCategoryName}
                      onChange={(e) => setNewRevenueCategoryName(e.target.value)}
                      placeholder="Category name (e.g., Forecasted, Delivered)"
                      className="px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="color"
                      value={newRevenueCategoryColor}
                      onChange={(e) => setNewRevenueCategoryColor(e.target.value)}
                      className="h-10 w-full rounded-lg border border-orange-300 cursor-pointer"
                    />
                    <button
                      onClick={addRevenueCategory}
                      className="flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Category
                    </button>
                  </div>
                </div>

                {/* Existing Revenue Categories */}
                <div className="space-y-3">
                  {revenueCategories.map((category) => (
                    <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <span className="font-medium text-gray-800">{category.name}</span>
                            {category.description && (
                              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {statuses.filter(s => s.revenueCategory === category.name).length} statuses
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personnel Tab */}
            {activeTab === 'personnel' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Personnel Management</h3>
                  <p className="text-sm text-gray-600">Manage team members assigned to locations</p>
                </div>

                {/* Add New Person */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-3">Add New Team Member</h4>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="Full Name"
                      className="px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      value={newPersonPosition}
                      onChange={(e) => setNewPersonPosition(e.target.value)}
                      placeholder="Position/Title"
                      className="px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                      value={newPersonLocation}
                      onChange={(e) => setNewPersonLocation(e.target.value)}
                      className="px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Location</option>
                      <option value="Regional">Regional (All Locations)</option>
                      {lanes.map(lane => (
                        <option key={lane.id} value={lane.name}>{lane.name}</option>
                      ))}
                    </select>
                    <input
                      type="email"
                      value={newPersonEmail}
                      onChange={(e) => setNewPersonEmail(e.target.value)}
                      placeholder="Email"
                      className="px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="tel"
                      value={newPersonPhone}
                      onChange={(e) => setNewPersonPhone(e.target.value)}
                      placeholder="Phone"
                      className="px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={addPerson}
                      className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Person
                    </button>
                  </div>
                </div>

                {/* Regional Personnel Section */}
                {(() => {
                  const regionalPersonnel = personnel.filter(person => person.location === 'Regional');
                  if (regionalPersonnel.length > 0) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                          <h4 className="text-lg font-semibold text-gray-800">
                            Regional (Available to All Locations)
                          </h4>
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 text-sm rounded-full">
                            {regionalPersonnel.filter(p => p.active).length} active
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {regionalPersonnel.map((person) => (
                            <div key={person.id} className={`border rounded-lg p-4 ${
                              person.active ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-300'
                            }`}>
                              {editingPerson === person.id ? (
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                                  <input
                                    type="text"
                                    defaultValue={person.name}
                                    onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <input
                                    type="text"
                                    defaultValue={person.position}
                                    onChange={(e) => updatePerson(person.id, { position: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <select
                                    defaultValue={person.location}
                                    onChange={(e) => updatePerson(person.id, { location: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="Regional">Regional (All Locations)</option>
                                    {lanes.map(lane => (
                                      <option key={lane.id} value={lane.name}>{lane.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="email"
                                    defaultValue={person.email}
                                    onChange={(e) => updatePerson(person.id, { email: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <input
                                    type="tel"
                                    defaultValue={person.phone}
                                    onChange={(e) => updatePerson(person.id, { phone: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <button
                                    onClick={() => setEditingPerson(null)}
                                    className="flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className={`w-3 h-3 rounded-full mt-2 ${
                                      person.active ? 'bg-purple-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-medium ${
                                          person.active ? 'text-gray-800' : 'text-gray-500'
                                        }`}>
                                          {person.name}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          person.active
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                          {person.active ? 'Regional' : 'Inactive'}
                                        </span>
                                      </div>
                                      <div className={`text-sm ${
                                        person.active ? 'text-gray-600' : 'text-gray-400'
                                      }`}>
                                        {person.position}
                                      </div>
                                      {(person.email || person.phone) && (
                                        <div className={`text-sm mt-1 ${
                                          person.active ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                          {person.email && <span>{person.email}</span>}
                                          {person.email && person.phone && <span className="mx-2">•</span>}
                                          {person.phone && <span>{person.phone}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => togglePersonActive(person.id)}
                                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                        person.active
                                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                                      }`}
                                    >
                                      {person.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      onClick={() => setEditingPerson(person.id)}
                                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePerson(person.id)}
                                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Personnel List by Location */}
                {lanes.map(lane => {
                  const locationPersonnel = personnel.filter(person => person.location === lane.name);
                  return (
                    <div key={lane.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: lane.color }}
                        />
                        <h4 className="text-lg font-semibold text-gray-800">
                          {lane.name} ({lane.abbreviation})
                        </h4>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                          {locationPersonnel.filter(p => p.active).length} active
                        </span>
                      </div>

                      {locationPersonnel.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {locationPersonnel.map((person) => (
                            <div key={person.id} className={`border rounded-lg p-4 ${
                              person.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                            }`}>
                              {editingPerson === person.id ? (
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                                  <input
                                    type="text"
                                    defaultValue={person.name}
                                    onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <input
                                    type="text"
                                    defaultValue={person.position}
                                    onChange={(e) => updatePerson(person.id, { position: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <select
                                    defaultValue={person.location}
                                    onChange={(e) => updatePerson(person.id, { location: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="Regional">Regional (All Locations)</option>
                                    {lanes.map(lane => (
                                      <option key={lane.id} value={lane.name}>{lane.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="email"
                                    defaultValue={person.email}
                                    onChange={(e) => updatePerson(person.id, { email: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <input
                                    type="tel"
                                    defaultValue={person.phone}
                                    onChange={(e) => updatePerson(person.id, { phone: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <button
                                    onClick={() => setEditingPerson(null)}
                                    className="flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-start gap-4 flex-1">
                                    <div className={`w-3 h-3 rounded-full mt-2 ${
                                      person.active ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-medium ${
                                          person.active ? 'text-gray-800' : 'text-gray-500'
                                        }`}>
                                          {person.name}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          person.active
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                          {person.active ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                      <div className={`text-sm ${
                                        person.active ? 'text-gray-600' : 'text-gray-400'
                                      }`}>
                                        {person.position}
                                      </div>
                                      {(person.email || person.phone) && (
                                        <div className={`text-sm mt-1 ${
                                          person.active ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                          {person.email && <span>{person.email}</span>}
                                          {person.email && person.phone && <span className="mx-2">•</span>}
                                          {person.phone && <span>{person.phone}</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => togglePersonActive(person.id)}
                                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                        person.active
                                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                                      }`}
                                    >
                                      {person.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      onClick={() => setEditingPerson(person.id)}
                                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePerson(person.id)}
                                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No personnel assigned to this location</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vendors Tab */}
            {activeTab === 'vendors' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Vendor Management</h3>
                  <p className="text-sm text-gray-600">Manage vendors and contractors</p>
                </div>

                {/* Add New Vendor */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <h4 className="font-medium text-indigo-800 mb-3">Add New Vendor</h4>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <input
                      type="text"
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      placeholder="Vendor Name"
                      className="px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={newVendorType}
                      onChange={(e) => setNewVendorType(e.target.value)}
                      className="px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Primary">Primary Contractor</option>
                      <option value="Subcontractor">Subcontractor</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Consultant">Consultant</option>
                      <option value="Transport">Transport</option>
                      <option value="Disposal">Disposal Facility</option>
                    </select>
                    <input
                      type="email"
                      value={newVendorEmail}
                      onChange={(e) => setNewVendorEmail(e.target.value)}
                      placeholder="Email"
                      className="px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="tel"
                      value={newVendorPhone}
                      onChange={(e) => setNewVendorPhone(e.target.value)}
                      placeholder="Phone"
                      className="px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={newVendorAddress}
                      onChange={(e) => setNewVendorAddress(e.target.value)}
                      placeholder="Address"
                      className="px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={addVendor}
                      className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Vendor
                    </button>
                  </div>
                </div>

                {/* Vendors List by Type */}
                {['Primary', 'Subcontractor', 'Supplier', 'Consultant', 'Transport', 'Disposal'].map(type => {
                  const typeVendors = vendors.filter(vendor => vendor.type === type);
                  if (typeVendors.length === 0) return null;

                  return (
                    <div key={type} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-lg font-semibold text-gray-800">{type}</h4>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-600 text-sm rounded-full">
                          {typeVendors.filter(v => v.active).length} active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {typeVendors.map((vendor) => (
                          <div key={vendor.id} className={`border rounded-lg p-4 ${
                            vendor.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                          }`}>
                            {editingVendor === vendor.id ? (
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                                <input
                                  type="text"
                                  defaultValue={vendor.name}
                                  onChange={(e) => updateVendor(vendor.id, { name: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <select
                                  defaultValue={vendor.type}
                                  onChange={(e) => updateVendor(vendor.id, { type: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="Primary">Primary Contractor</option>
                                  <option value="Subcontractor">Subcontractor</option>
                                  <option value="Supplier">Supplier</option>
                                  <option value="Consultant">Consultant</option>
                                  <option value="Transport">Transport</option>
                                  <option value="Disposal">Disposal Facility</option>
                                </select>
                                <input
                                  type="email"
                                  defaultValue={vendor.email}
                                  onChange={(e) => updateVendor(vendor.id, { email: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                  type="tel"
                                  defaultValue={vendor.phone}
                                  onChange={(e) => updateVendor(vendor.id, { phone: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                  type="text"
                                  defaultValue={vendor.address}
                                  onChange={(e) => updateVendor(vendor.id, { address: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={() => setEditingVendor(null)}
                                  className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700"
                                >
                                  <Save className="w-4 h-4" />
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className={`w-3 h-3 rounded-full mt-2 ${
                                    vendor.active ? 'bg-green-500' : 'bg-gray-400'
                                  }`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium ${
                                        vendor.active ? 'text-gray-800' : 'text-gray-500'
                                      }`}>
                                        {vendor.name}
                                      </span>
                                      <span className={`px-2 py-1 text-xs rounded-full ${
                                        vendor.active
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-200 text-gray-600'
                                      }`}>
                                        {vendor.active ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>
                                    <div className={`text-sm ${
                                      vendor.active ? 'text-gray-600' : 'text-gray-400'
                                    }`}>
                                      {vendor.type}
                                    </div>
                                    {(vendor.email || vendor.phone) && (
                                      <div className={`text-sm mt-1 ${
                                        vendor.active ? 'text-gray-500' : 'text-gray-400'
                                      }`}>
                                        {vendor.email && <span>{vendor.email}</span>}
                                        {vendor.email && vendor.phone && <span className="mx-2">•</span>}
                                        {vendor.phone && <span>{vendor.phone}</span>}
                                      </div>
                                    )}
                                    {vendor.address && (
                                      <div className={`text-sm mt-1 ${
                                        vendor.active ? 'text-gray-500' : 'text-gray-400'
                                      }`}>
                                        📍 {vendor.address}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleVendorActive(vendor.id)}
                                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                      vendor.active
                                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                  >
                                    {vendor.active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => setEditingVendor(vendor.id)}
                                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteVendor(vendor.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state if no vendors */}
                {vendors.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors yet</h3>
                    <p className="text-gray-600">Add your first vendor using the form above.</p>
                  </div>
                )}
              </div>
            )}

            {/* Quotas Tab */}
            {activeTab === 'quotas' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Quota Management</h3>
                  <p className="text-sm text-gray-600">Set sales targets and periods for locations</p>
                </div>

                {/* Add New Quota */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-3">Add New Quota Period</h4>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <input
                      type="text"
                      value={newQuotaPeriod}
                      onChange={(e) => setNewQuotaPeriod(e.target.value)}
                      placeholder="Period Name (e.g., Q1 2024)"
                      className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <select
                      value={newQuotaLocation}
                      onChange={(e) => setNewQuotaLocation(e.target.value)}
                      className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select Location</option>
                      {lanes.map(lane => (
                        <option key={lane.id} value={lane.name}>{lane.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={newQuotaTarget}
                      onChange={(e) => setNewQuotaTarget(e.target.value)}
                      placeholder="Target Amount ($)"
                      min="0"
                      step="1000"
                      className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="date"
                      value={newQuotaStartDate}
                      onChange={(e) => setNewQuotaStartDate(e.target.value)}
                      className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="date"
                      value={newQuotaEndDate}
                      onChange={(e) => setNewQuotaEndDate(e.target.value)}
                      className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={addQuota}
                      className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Quota
                    </button>
                  </div>
                </div>

                {/* Quotas List */}
                <div className="space-y-4">
                  {quotas.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h4 className="font-medium text-gray-800">Active Quota Periods</h4>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {quotas.map((quota) => {
                          const startDate = new Date(quota.startDate);
                          const endDate = new Date(quota.endDate);
                          const now = new Date();
                          const isActive = now >= startDate && now <= endDate;
                          const daysPassed = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
                          const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
                          const progressPercent = totalDays > 0 ? Math.min(100, (daysPassed / totalDays) * 100) : 0;

                          return (
                            <div key={quota.id} className={`p-6 ${isActive ? 'bg-green-50' : ''}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h5 className="text-lg font-semibold text-gray-800">{quota.period}</h5>
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                      isActive
                                        ? 'bg-green-100 text-green-700'
                                        : now > endDate
                                          ? 'bg-gray-100 text-gray-600'
                                          : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {isActive ? 'Active' : now > endDate ? 'Completed' : 'Upcoming'}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                      {quota.location}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                      <span className="text-sm text-gray-600">Target Amount</span>
                                      <p className="text-xl font-bold text-green-600">
                                        ${parseInt(quota.target).toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-600">Start Date</span>
                                      <p className="font-medium">{startDate.toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-600">End Date</span>
                                      <p className="font-medium">{endDate.toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-600">Time Progress</span>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPercent}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  {isActive && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                      <p className="text-sm text-yellow-800">
                                        <strong>Days remaining:</strong> {Math.max(0, totalDays - daysPassed)} days
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => toggleQuotaActive(quota.id)}
                                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                      quota.active
                                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}
                                  >
                                    {quota.active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => deleteQuota(quota.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No quotas set</h3>
                      <p className="text-gray-600">Add your first quota period using the form above.</p>
                    </div>
                  )}
                </div>

                {/* Quota Summary Statistics */}
                {quotas.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium text-gray-800 mb-4">Quota Overview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total Active Quotas</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {quotas.filter(q => {
                            const now = new Date();
                            const start = new Date(q.startDate);
                            const end = new Date(q.endDate);
                            return now >= start && now <= end && q.active;
                          }).length}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Total Target Amount</p>
                        <p className="text-2xl font-bold text-green-700">
                          ${quotas.filter(q => q.active).reduce((sum, q) => sum + parseInt(q.target || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Locations with Quotas</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {new Set(quotas.filter(q => q.active).map(q => q.location)).size}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Changes will be saved automatically when you close this panel
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanSetupPanel;