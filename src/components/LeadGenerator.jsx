import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { 
  Search, 
  MapPin, 
  Building, 
  Phone, 
  Mail, 
  Download, 
  Filter,
  ChevronRight,
  Target,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Users,
  Briefcase,
  FileSpreadsheet,
  FileText,
  ExternalLink
} from 'lucide-react';
import BackButton from './BackButton';

const LeadGenerator = () => {
  const [searchZip, setSearchZip] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    wasteType: 'all',
    generatorSize: 'all',
    complianceStatus: 'all',
    minValue: 0
  });
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [dataSource, setDataSource] = useState('epa_live');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalValue: 0,
    averageValue: 0,
    topWasteTypes: [],
    conversionRate: 0,
    marketTrends: []
  });
  const [competitorData, setCompetitorData] = useState(null);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [generatorDocuments, setGeneratorDocuments] = useState({});
  const [loadingDocuments, setLoadingDocuments] = useState({});

  // Mock data for demo purposes when backend is not available
  const mockLeads = [
    {
      id: 'TX123456789',
      companyName: 'Advanced Materials Research Corp',
      handlerId: 'TX123456789',
      address: '1234 Research Blvd, Austin, TX 78701',
      phone: '(512) 555-0123',
      wasteTypes: ['Lab Chemicals', 'Chemical Waste'],
      generatorSize: 'Large',
      complianceStatus: 'Active',
      potentialValue: 25000,
      lastUpdate: '2025-09-01',
      source: 'EPA',
      manifestData: {
        lastShipped: '2025-08-15',
        lastReceived: '2025-08-16',
        destinationFacility: 'Clean Harbors Environmental',
        destinationId: 'TX987654321',
        annualTons: 12.5,
        recentManifests: 8
      },
      notes: 'Generator ID: TX123456789. Last shipment: 2025-08-15. High-value lead for lab pack services.'
    },
    {
      id: 'TX987654321',
      companyName: 'MedTech Solutions Inc',
      handlerId: 'TX987654321',
      address: '5678 Medical Center Dr, Houston, TX 77030',
      phone: '(713) 555-0456',
      wasteTypes: ['Medical Waste', 'Lab Chemicals'],
      generatorSize: 'Medium',
      complianceStatus: 'Recent',
      potentialValue: 15000,
      lastUpdate: '2025-08-20',
      source: 'EPA',
      manifestData: {
        lastShipped: '2025-07-30',
        lastReceived: '2025-07-31',
        destinationFacility: 'Stericycle',
        destinationId: 'TX555666777',
        annualTons: 6.2,
        recentManifests: 4
      },
      notes: 'Generator ID: TX987654321. Medical facility with regular waste generation.'
    },
    {
      id: 'TX111222333',
      companyName: 'Petrochemical Industries LLC',
      handlerId: 'TX111222333',
      address: '9012 Industrial Way, Beaumont, TX 77701',
      phone: '(409) 555-0789',
      wasteTypes: ['Industrial Waste', 'Chemical Waste'],
      generatorSize: 'Large',
      complianceStatus: 'Active',
      potentialValue: 45000,
      lastUpdate: '2025-09-05',
      source: 'EPA',
      manifestData: {
        lastShipped: '2025-09-01',
        lastReceived: '2025-09-02',
        destinationFacility: 'Heritage Environmental',
        destinationId: 'TX444555666',
        annualTons: 28.7,
        recentManifests: 12
      },
      notes: 'Generator ID: TX111222333. Large petrochemical facility with consistent waste streams.'
    },
    {
      id: 'TX444555666',
      companyName: 'University Research Labs',
      handlerId: 'TX444555666',
      address: '3456 Campus Drive, Dallas, TX 75201',
      phone: '(214) 555-0234',
      wasteTypes: ['Lab Chemicals', 'Reactive Waste', 'Solvents'],
      generatorSize: 'Medium',
      complianceStatus: 'Active',
      potentialValue: 18000,
      lastUpdate: '2025-09-08',
      source: 'EPA',
      manifestData: {
        lastShipped: '2025-08-25',
        lastReceived: '2025-08-26',
        destinationFacility: 'Veolia Environmental',
        destinationId: 'TX777888999',
        annualTons: 8.3,
        recentManifests: 6
      },
      notes: 'University lab with diverse chemical waste streams. Requires specialized handling.'
    },
    {
      id: 'TX777888999',
      companyName: 'Coastal Refineries Corp',
      handlerId: 'TX777888999',
      address: '7890 Port Road, Corpus Christi, TX 78401',
      phone: '(361) 555-0567',
      wasteTypes: ['Petroleum Waste', 'Industrial Sludge', 'Chemical Waste'],
      generatorSize: 'Large',
      complianceStatus: 'Active',
      potentialValue: 55000,
      lastUpdate: '2025-09-10',
      source: 'EPA',
      manifestData: {
        lastShipped: '2025-09-05',
        lastReceived: '2025-09-06',
        destinationFacility: 'US Ecology',
        destinationId: 'TX333444555',
        annualTons: 42.1,
        recentManifests: 15
      },
      notes: 'Major refinery with high-volume waste streams. Premium pricing opportunity.'
    },
    {
      id: 'TX222333444',
      companyName: 'BioPharm Manufacturing',
      handlerId: 'TX222333444',
      address: '4567 Pharma Parkway, San Antonio, TX 78201',
      phone: '(210) 555-0890',
      wasteTypes: ['Pharmaceutical Waste', 'Lab Chemicals', 'Solvents'],
      generatorSize: 'Large',
      complianceStatus: 'Active',
      potentialValue: 35000,
      lastUpdate: '2025-09-07',
      source: 'EPA',
      manifestData: {
        lastShipped: '2025-08-28',
        lastReceived: '2025-08-29',
        destinationFacility: 'Clean Harbors Environmental',
        destinationId: 'TX666777888',
        annualTons: 19.8,
        recentManifests: 10
      },
      notes: 'Pharmaceutical manufacturer with regulated waste. Requires DEA compliance.'
    }
  ];

  const mockStats = {
    filesAvailable: 3,
    dataPath: 'C:/Users/brady/Documents/EM_MANIFEST',
    cacheSize: 0,
    lastUpdate: new Date().toISOString(),
    sampleRecords: 15420,
    sampleFile: 'EM_MANIFEST_2025_Q3.csv'
  };

  useEffect(() => {
    fetchStats();
    calculateAnalytics();
    
    // Setup real-time updates if enabled
    if (realTimeMode) {
      const interval = setInterval(() => {
        fetchRealTimeUpdates();
      }, 30000); // Update every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [realTimeMode, leads]);

  // Real-time data fetching
  const fetchRealTimeUpdates = async () => {
    try {
      const response = await fetch('/api/epa/realtime-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSync, currentFilters: filters })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.updates && data.updates.length > 0) {
          setLeads(prevLeads => [...prevLeads, ...data.updates]);
          setLastSync(new Date().toISOString());
          console.log(`📡 Real-time update: ${data.updates.length} new leads`);
        }
      }
    } catch (error) {
      console.log('Real-time updates not available:', error.message);
    }
  };

  // Advanced analytics calculation
  const calculateAnalytics = () => {
    const totalValue = leads.reduce((sum, lead) => sum + lead.potentialValue, 0);
    const averageValue = leads.length > 0 ? totalValue / leads.length : 0;
    
    // Calculate waste type distribution
    const wasteTypeCounts = {};
    leads.forEach(lead => {
      lead.wasteTypes.forEach(type => {
        wasteTypeCounts[type] = (wasteTypeCounts[type] || 0) + 1;
      });
    });
    
    const topWasteTypes = Object.entries(wasteTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Market trend analysis (mock for now)
    const marketTrends = [
      { category: 'Lab Chemicals', trend: '+15%', color: 'green' },
      { category: 'Medical Waste', trend: '+8%', color: 'green' },
      { category: 'Industrial Waste', trend: '-3%', color: 'red' },
      { category: 'Chemical Waste', trend: '+12%', color: 'green' }
    ];

    setAnalytics({
      totalValue,
      averageValue,
      topWasteTypes,
      conversionRate: 0.23, // Mock conversion rate
      marketTrends
    });
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/epa/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.log('Using demo data (backend not available)');
      setStats(mockStats);
    }
  };

  const searchLeads = async () => {
    if (!searchZip.trim()) {
      setError('Please enter a ZIP code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If using demo data source, skip API call
      if (dataSource === 'demo') {
        throw new Error('Using demo data');
      }
      
      // Try backend API first
      const response = await fetch(`/api/epa/search/${searchZip}?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.generators);
        
        // Also fetch competitor intelligence
        try {
          const competitorResponse = await fetch(`/api/competitors/${searchZip}`);
          if (competitorResponse.ok) {
            const competitorInfo = await competitorResponse.json();
            setCompetitorData(competitorInfo);
          }
        } catch (error) {
          console.log('Competitor data not available:', error);
        }
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.log('Using demo data for ZIP search');
      // For demo mode, show all mock leads regardless of ZIP
      // In a real scenario, you'd filter by ZIP, but for demo we'll show all
      if (searchZip.length >= 5) {
        // Show all demo leads when a valid ZIP format is entered
        setLeads(mockLeads);
      } else {
        setError('Please enter a valid 5-digit ZIP code');
        setLeads([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (filters.wasteType !== 'all' && !lead.wasteTypes.some(type => 
      type.toLowerCase().includes(filters.wasteType.toLowerCase()))) {
      return false;
    }
    if (filters.generatorSize !== 'all' && lead.generatorSize !== filters.generatorSize) {
      return false;
    }
    if (filters.complianceStatus !== 'all' && lead.complianceStatus !== filters.complianceStatus) {
      return false;
    }
    if (lead.potentialValue < filters.minValue) {
      return false;
    }
    return true;
  });

  const toggleLeadSelection = (leadId) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const fetchGeneratorDocuments = async (leadId, epaId) => {
    if (generatorDocuments[leadId] || loadingDocuments[leadId]) return;
    
    setLoadingDocuments(prev => ({ ...prev, [leadId]: true }));
    
    try {
      const response = await fetch(`/api/generator-documents/${epaId}`);
      if (response.ok) {
        const data = await response.json();
        setGeneratorDocuments(prev => ({ ...prev, [leadId]: data.texasData }));
      }
    } catch (error) {
      console.log('Texas waste data not available for this generator:', error);
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const exportToPDF = () => {
    const selectedLeadData = filteredLeads.filter(lead => selectedLeads.has(lead.id));
    if (selectedLeadData.length === 0) {
      alert('Please select at least one lead to export');
      return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;
    
    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight) => {
      if (currentY + requiredHeight > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };
    
    // Helper function to add text with word wrap
    const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * (fontSize * 0.35);
    };

    // Title Page
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('EPA HAZARDOUS WASTE GENERATOR REPORT', pageWidth/2, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`ZIP Code: ${searchZip || 'All Areas'}`, pageWidth/2, 45, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth/2, 55, { align: 'center' });
    doc.text(`Total Leads: ${selectedLeadData.length}`, pageWidth/2, 65, { align: 'center' });
    
    // Summary Statistics
    currentY = 85;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE SUMMARY', 20, currentY);
    currentY += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const totalValue = selectedLeadData.reduce((sum, lead) => sum + (lead.potentialValue || 0), 0);
    const totalTons = selectedLeadData.reduce((sum, lead) => sum + (lead.manifestData?.annualTons || 0), 0);
    const largeGenerators = selectedLeadData.filter(lead => lead.generatorSize === 'Large').length;
    const mediumGenerators = selectedLeadData.filter(lead => lead.generatorSize === 'Medium').length;
    const smallGenerators = selectedLeadData.filter(lead => lead.generatorSize === 'Small').length;
    
    doc.text(`• Total Market Potential: $${totalValue.toLocaleString()}`, 25, currentY);
    currentY += 8;
    doc.text(`• Total Annual Waste: ${totalTons.toLocaleString()} tons`, 25, currentY);
    currentY += 8;
    doc.text(`• Large Generators: ${largeGenerators} | Medium: ${mediumGenerators} | Small: ${smallGenerators}`, 25, currentY);
    currentY += 8;
    doc.text(`• Active Facilities with Recent Manifests: ${selectedLeadData.filter(lead => lead.manifestData?.recentManifests > 0).length}`, 25, currentY);
    
    // Start generator details on new page
    doc.addPage();
    currentY = 20;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILED GENERATOR PROFILES', 20, currentY);
    currentY += 20;

    // Process each generator
    selectedLeadData.forEach((lead, index) => {
      // Check if we need a new page for this generator (approximately 60-80 units needed)
      checkPageBreak(80);
      
      // Generator Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${lead.companyName}`, 20, currentY);
      currentY += 8;
      
      // Basic Information Box
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.rect(20, currentY, pageWidth - 40, 25);
      
      doc.text(`EPA ID: ${lead.handlerId}`, 25, currentY + 6);
      doc.text(`Address: ${lead.address}`, 25, currentY + 12);
      doc.text(`Phone: ${lead.phone || 'Not Available'}`, 25, currentY + 18);
      
      doc.text(`Generator Size: ${lead.generatorSize}`, 105, currentY + 6);
      doc.text(`Potential Value: $${(lead.potentialValue || 0).toLocaleString()}`, 105, currentY + 12);
      doc.text(`Compliance Status: ${lead.complianceStatus}`, 105, currentY + 18);
      currentY += 30;
      
      // Waste Information
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Waste Types:', 25, currentY);
      currentY += 6;
      
      doc.setFont('helvetica', 'normal');
      const wasteTypesHeight = addWrappedText(
        lead.wasteTypes.join(', '), 
        25, currentY, pageWidth - 50, 9
      );
      currentY += wasteTypesHeight + 5;
      
      // Manifest Data
      if (lead.manifestData) {
        doc.setFont('helvetica', 'bold');
        doc.text('Manifest Data:', 25, currentY);
        currentY += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`• Annual Tonnage: ${lead.manifestData.annualTons || 0} tons`, 30, currentY);
        currentY += 5;
        doc.text(`• Recent Manifests: ${lead.manifestData.recentManifests || 0}`, 30, currentY);
        currentY += 5;
        doc.text(`• Last Shipment: ${lead.manifestData.lastShipped || 'Unknown'}`, 30, currentY);
        currentY += 5;
        doc.text(`• Primary Destination: ${lead.manifestData.destinationFacility || 'Unknown'}`, 30, currentY);
        currentY += 8;
      }
      
      // TCEQ Document Information
      const tceqDocs = generatorDocuments[lead.id];
      if (tceqDocs && (tceqDocs.wasteData?.length > 0 || tceqDocs.transporters?.length > 0)) {
        doc.setFont('helvetica', 'bold');
        doc.text('TCEQ Registration Data:', 25, currentY);
        currentY += 6;
        
        if (tceqDocs.wasteData?.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.text('• Texas Waste Codes: ' + tceqDocs.wasteData.map(w => w.wasteCode).join(', '), 30, currentY);
          currentY += 5;
        }
        
        if (tceqDocs.transporters?.length > 0) {
          doc.text('• Authorized Transporters: ' + tceqDocs.transporters.map(t => t.name).slice(0, 2).join(', '), 30, currentY);
          if (tceqDocs.transporters.length > 2) {
            doc.text(`  ... and ${tceqDocs.transporters.length - 2} more`, 30, currentY + 5);
            currentY += 5;
          }
          currentY += 8;
        }
      }
      
      // Notes Section
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES:', 25, currentY);
      currentY += 6;
      
      // Draw notes box
      const notesBoxHeight = 25;
      doc.rect(25, currentY, pageWidth - 50, notesBoxHeight);
      
      // Add existing notes if any
      if (lead.notes && lead.notes.trim()) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const notesHeight = addWrappedText(lead.notes, 30, currentY + 5, pageWidth - 60, 9);
      }
      
      // Add some default analysis notes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const defaultNotes = [
        `• Priority Level: ${lead.generatorSize === 'Large' ? 'HIGH' : lead.generatorSize === 'Medium' ? 'MEDIUM' : 'LOW'}`,
        `• Last Activity: ${lead.lastUpdate || 'Unknown'}`,
        `• Recommended Action: ${lead.manifestData?.recentManifests > 10 ? 'Immediate contact' : 'Monitor activity'}`
      ];
      
      let notesY = currentY + 18;
      defaultNotes.forEach(note => {
        if (notesY < currentY + notesBoxHeight - 3) {
          doc.text(note, 30, notesY);
          notesY += 4;
        }
      });
      
      currentY += notesBoxHeight + 15;
      
      // Add separator line
      if (index < selectedLeadData.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 10;
      }
    });
    
    // Add footer to each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
      doc.text('Confidential Business Information', 20, pageHeight - 10);
    }
    
    // Save the PDF
    const fileName = `EPA_Generator_Report_${searchZip || 'All'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BackButton />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <Target className="mr-3 text-blue-600" size={32} />
          🏛️ EPA Lead Generator
        </h1>
        <p className="text-gray-600">
          Discover waste generator leads from EPA e-Manifest data. Find potential clients based on location and waste generation patterns.
        </p>
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Data Source & Real-time Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">Data Source</h3>
              <div className="flex items-center mt-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${realTimeMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-blue-600">
                  {realTimeMode ? 'Live Data' : 'Static Data'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setRealTimeMode(!realTimeMode)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                realTimeMode 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {realTimeMode ? 'Disable Live' : 'Enable Live'}
            </button>
          </div>
          <div className="text-sm text-blue-600">
            {stats ? `${stats.sampleRecords?.toLocaleString()} records available` : 'Loading...'}
            {lastSync && (
              <div className="text-xs text-gray-500 mt-1">
                Last sync: {new Date(lastSync).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Market Value Analytics */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800">Market Value</h3>
              <div className="text-2xl font-bold text-green-600">
                ${analytics.totalValue.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">
                Avg: ${Math.round(analytics.averageValue).toLocaleString()}
              </div>
            </div>
            <div className="text-green-600">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* Conversion Analytics */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-800">Performance</h3>
              <div className="text-2xl font-bold text-purple-600">
                {(analytics.conversionRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-purple-600">
                Conversion Rate
              </div>
            </div>
            <div className="text-purple-600">
              <Target size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Market Trends & Top Waste Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Waste Types */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Briefcase className="mr-2" size={18} />
            Top Waste Categories
          </h3>
          <div className="space-y-3">
            {analytics.topWasteTypes.map((item, index) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3" style={{backgroundColor: `hsl(${index * 60}, 70%, 50%)`}}></div>
                  <span className="text-sm font-medium">{item.type}</span>
                </div>
                <span className="text-sm text-gray-600">{item.count} leads</span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Trends */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <CheckCircle className="mr-2" size={18} />
            Market Trends (YTD)
          </h3>
          <div className="space-y-3">
            {analytics.marketTrends.map((trend, index) => (
              <div key={trend.category} className="flex items-center justify-between">
                <span className="text-sm font-medium">{trend.category}</span>
                <div className="flex items-center">
                  <span className={`text-sm font-bold ${
                    trend.color === 'green' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend.trend}
                  </span>
                  <div className={`w-2 h-2 rounded-full ml-2 ${
                    trend.color === 'green' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor Intelligence Section */}
      {competitorData && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Users className="mr-2" size={20} />
              Competitor Intelligence - ZIP {competitorData.zipCode}
            </h2>
            <button
              onClick={() => setShowCompetitors(!showCompetitors)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {showCompetitors ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {competitorData.epaGenerators?.length || 0}
              </div>
              <div className="text-sm text-blue-800">EPA Generators</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {competitorData.tceqTransporters?.length || 0}
              </div>
              <div className="text-sm text-green-800">TCEQ Transporters</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {competitorData.marketShare?.length || 0}
              </div>
              <div className="text-sm text-purple-800">Market Players</div>
            </div>
          </div>

          {/* Detailed View */}
          {showCompetitors && (
            <div className="space-y-4">
              {/* Top Competitors */}
              {competitorData.marketShare && competitorData.marketShare.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Top Competitors by Market Share</h3>
                  <div className="space-y-2">
                    {competitorData.marketShare.slice(0, 5).map((competitor, index) => (
                      <div key={competitor.company} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="font-medium">{competitor.company}</span>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">{competitor.manifests} manifests</span>
                          <span className="text-sm font-bold text-blue-600">{competitor.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EPA Generators Summary */}
              {competitorData.epaGenerators && competitorData.epaGenerators.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Top EPA Generators</h3>
                  <div className="space-y-2">
                    {competitorData.epaGenerators.slice(0, 3).map((generator) => (
                      <div key={generator.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="font-medium">{generator.name}</span>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">{generator.totalTons?.toFixed(1)} tons</span>
                          <span className="text-sm text-blue-600">{generator.manifestCount} manifests</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Search className="mr-2" size={20} />
          Search for Leads
        </h2>
        
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code
            </label>
            <input
              type="text"
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value)}
              placeholder="Enter ZIP code (e.g., 78701, 77030)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && searchLeads()}
            />
          </div>
          <button
            onClick={searchLeads}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2" size={16} />
                Search
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm flex items-center">
            <AlertCircle className="mr-2" size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Filters */}
      {leads.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Filter className="mr-2" size={18} />
            Filter Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
              <select
                value={filters.wasteType}
                onChange={(e) => setFilters({...filters, wasteType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="medical">Medical Waste</option>
                <option value="chemical">Chemical Waste</option>
                <option value="lab">Lab Chemicals</option>
                <option value="industrial">Industrial Waste</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generator Size</label>
              <select
                value={filters.generatorSize}
                onChange={(e) => setFilters({...filters, generatorSize: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sizes</option>
                <option value="Large">Large</option>
                <option value="Medium">Medium</option>
                <option value="Small">Small</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Status</label>
              <select
                value={filters.complianceStatus}
                onChange={(e) => setFilters({...filters, complianceStatus: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Recent">Recent</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Value ($)</label>
              <input
                type="number"
                value={filters.minValue}
                onChange={(e) => setFilters({...filters, minValue: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {leads.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-600">
            Showing {filteredLeads.length} of {leads.length} leads
            {selectedLeads.size > 0 && ` • ${selectedLeads.size} selected`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)))}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedLeads(new Set())}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear Selection
            </button>
            <button
              onClick={exportToPDF}
              disabled={selectedLeads.size === 0}
              className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <FileText className="mr-1" size={14} />
              Export PDF Report
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedLeads.has(lead.id)}
                  onChange={() => toggleLeadSelection(lead.id)}
                  className="mt-2 mr-4"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                        <Building className="mr-2 text-blue-600" size={20} />
                        {lead.companyName}
                      </h3>
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin className="mr-1" size={14} />
                        {lead.address}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${lead.potentialValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Annual Potential</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Handler ID</div>
                      <div className="text-gray-600">{lead.handlerId}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Generator Size</div>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          lead.generatorSize === 'Large' ? 'bg-red-100 text-red-700' :
                          lead.generatorSize === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {lead.generatorSize}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Compliance Status</div>
                      <div className="flex items-center">
                        {lead.complianceStatus === 'Active' ? (
                          <CheckCircle className="mr-1 text-green-500" size={14} />
                        ) : (
                          <AlertCircle className="mr-1 text-yellow-500" size={14} />
                        )}
                        <span className={
                          lead.complianceStatus === 'Active' ? 'text-green-600' : 'text-yellow-600'
                        }>
                          {lead.complianceStatus}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Last Update</div>
                      <div className="text-gray-600">{new Date(lead.lastUpdate).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Waste Types</div>
                    <div className="flex flex-wrap gap-2">
                      {lead.wasteTypes.map((type, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {lead.manifestData && (
                    <div className="bg-gray-50 rounded p-4 mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">Manifest Activity</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Annual Tons</div>
                          <div className="font-medium">{lead.manifestData.annualTons}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Recent Manifests</div>
                          <div className="font-medium">{lead.manifestData.recentManifests}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Last Shipped</div>
                          <div className="font-medium">{new Date(lead.manifestData.lastShipped).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Destination</div>
                          <div className="font-medium">{lead.manifestData.destinationFacility}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <strong>Notes:</strong> {lead.notes}
                  </div>

                  {/* Texas Waste Data from Open Data Portal */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700 flex items-center">
                        <FileText className="mr-2" size={16} />
                        Texas Waste Data
                      </h4>
                      <button
                        onClick={() => fetchGeneratorDocuments(lead.id, lead.handlerId)}
                        disabled={loadingDocuments[lead.id]}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                      >
                        {loadingDocuments[lead.id] ? 'Loading...' : 'Get Texas Data'}
                      </button>
                    </div>
                    
                    {generatorDocuments[lead.id] && (
                      <div className="space-y-2">
                        {/* Download Links */}
                        {generatorDocuments[lead.id].downloadLinks?.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div>
                              <div className="font-medium text-sm">{doc.type}</div>
                              <div className="text-xs text-gray-600">{doc.description}</div>
                            </div>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink size={14} className="mr-1" />
                              Download
                            </a>
                          </div>
                        )) || (
                          <div className="text-sm text-gray-500 italic">
                            Contains: Texas waste codes • Tonnage data • Handling methods • Official Texas Open Data Portal links
                          </div>
                        )}
                        
                        {/* Waste Codes Preview */}
                        {generatorDocuments[lead.id].wasteData?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">Texas Waste Codes Found:</div>
                            <div className="flex flex-wrap gap-1">
                              {generatorDocuments[lead.id].wasteData.slice(0, 5).map((waste, index) => (
                                <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                                  {waste.wasteCode}
                                </span>
                              ))}
                              {generatorDocuments[lead.id].wasteData.length > 5 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{generatorDocuments[lead.id].wasteData.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Texas Tonnage Data */}
                        {(generatorDocuments[lead.id].totalTonnageGenerated > 0 || generatorDocuments[lead.id].totalTonnageHandled > 0) && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">Texas Waste Tonnage:</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-xs bg-blue-50 p-2 rounded">
                                <span className="font-medium">Generated:</span> {generatorDocuments[lead.id].totalTonnageGenerated?.toLocaleString() || 0} tons
                              </div>
                              <div className="text-xs bg-green-50 p-2 rounded">
                                <span className="font-medium">Handled:</span> {generatorDocuments[lead.id].totalTonnageHandled?.toLocaleString() || 0} tons
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Handling Methods */}
                        {generatorDocuments[lead.id].handlingMethods?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">Handling Methods:</div>
                            <div className="flex flex-wrap gap-1">
                              {generatorDocuments[lead.id].handlingMethods.map((method, index) => (
                                <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                  {method}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && leads.length === 0 && searchZip && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Leads Found</h3>
          <p className="text-gray-500">
            No waste generators found for ZIP code {searchZip}. Try a different location.
          </p>
        </div>
      )}

      {/* Demo Notice */}
      {leads.length > 0 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-yellow-600 mr-2 mt-0.5" size={16} />
            <div className="text-sm text-yellow-800">
              <strong>Demo Mode:</strong> This is demonstration data. In production, this would connect to live EPA e-Manifest databases 
              with thousands of waste generator records updated every 90 days.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadGenerator;