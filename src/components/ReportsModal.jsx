import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Filter, TrendingUp, Users, MapPin, Calendar, DollarSign, Clock, ArrowRight, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';

const ReportsModal = ({ isOpen, onClose, cards, lanes, statuses }) => {
  const [reportType, setReportType] = useState('vendor');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportData, setReportData] = useState(null);

  // Get unique vendors from cards
  const getUniqueVendors = () => {
    const vendors = new Set();
    cards.forEach(card => {
      if (card.vendor) vendors.add(card.vendor);
      if (card.vendors) {
        card.vendors.forEach(v => {
          if (v.name) vendors.add(v.name);
        });
      }
    });
    return Array.from(vendors).sort();
  };

  const uniqueVendors = getUniqueVendors();

  // Status abbreviation mapping
  const statusAbbreviations = {
    'BG': 'Bronco Environmental',
    'BC': 'Bronco Environmental',
    'BRONCO': 'Bronco Environmental',
    'HW': 'Heritage Environmental',
    'HERITAGE': 'Heritage Environmental',
    'WM': 'Waste Management',
    'CLEAN': 'Clean Harbors',
    'CH': 'Clean Harbors',
    'VEOLIA': 'Veolia',
    'STERICYCLE': 'Stericycle'
  };

  // Expand status text with known abbreviations
  const expandStatusText = (status) => {
    if (!status) return status;
    let expandedStatus = status;
    Object.entries(statusAbbreviations).forEach(([abbrev, fullName]) => {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      expandedStatus = expandedStatus.replace(regex, fullName);
    });
    return expandedStatus;
  };

  // Calculate days in current status
  const getDaysInCurrentStatus = (card) => {
    if (!card.statusHistory || card.statusHistory.length === 0) {
      return Math.floor((new Date() - new Date(card.created)) / (1000 * 60 * 60 * 24));
    }
    const lastStatusChange = card.statusHistory[card.statusHistory.length - 1];
    return Math.floor((new Date() - new Date(lastStatusChange.timestamp)) / (1000 * 60 * 60 * 24));
  };

  // Get days since created
  const getDaysSinceCreated = (card) => {
    return Math.floor((new Date() - new Date(card.created)) / (1000 * 60 * 60 * 24));
  };

  // Count status moves in date range
  const countStatusMoves = (card, startDate, endDate) => {
    if (!card.statusHistory) return 0;
    return card.statusHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    }).length;
  };

  // Generate enhanced vendor report categorized by location
  const generateVendorReport = () => {
    let filteredCards = [...cards];
    console.log('🔍 Starting vendor report generation with cards:', filteredCards.length);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;

    // Filter by vendor
    if (selectedVendor !== 'all') {
      filteredCards = filteredCards.filter(card => {
        const hasMainVendor = card.vendor === selectedVendor;
        const hasInVendors = card.vendors?.some(v => v.name === selectedVendor);
        const hasInStatus = card.status && expandStatusText(card.status).toLowerCase().includes(selectedVendor.toLowerCase());
        return hasMainVendor || hasInVendors || hasInStatus;
      });
    }

    // Group by location first, then by vendor within each location
    const locationGroups = {};

    filteredCards.forEach(card => {
      const location = card.location || 'Unknown Location';

      if (!locationGroups[location]) {
        locationGroups[location] = {
          name: location,
          vendors: {},
          totalPOAmount: 0,
          totalProjects: 0
        };
      }

      const vendors = [];
      if (card.vendor) vendors.push(card.vendor);
      if (card.vendors) {
        card.vendors.forEach(v => {
          if (v.name && !vendors.includes(v.name)) vendors.push(v.name);
        });
      }

      // Check if vendor is mentioned in status
      const expandedStatus = expandStatusText(card.status || '');
      Object.values(statusAbbreviations).forEach(vendorName => {
        if (expandedStatus.toLowerCase().includes(vendorName.toLowerCase()) && !vendors.includes(vendorName)) {
          vendors.push(vendorName);
        }
      });

      // If no vendors found, add "Unassigned"
      if (vendors.length === 0) {
        vendors.push('Unassigned');
      }

      vendors.forEach(vendorName => {
        if (!locationGroups[location].vendors[vendorName]) {
          locationGroups[location].vendors[vendorName] = {
            name: vendorName,
            projects: [],
            quotedJobs: [],
            assignedJobs: [],
            totalPOAmount: 0,
            estimatedPOAmount: 0,
            statusBreakdown: {},
            totalStatusMoves: 0,
            avgDaysInCurrentStatus: 0,
            avgDaysSinceCreated: 0
          };
        }

        const vendor = locationGroups[location].vendors[vendorName];
        const cardDaysSinceCreated = getDaysSinceCreated(card);
        const cardDaysInStatus = getDaysInCurrentStatus(card);
        const cardStatusMoves = startDate && endDate ? countStatusMoves(card, startDate, endDate) : 0;

        // Calculate PO amounts (what we pay the vendor)
        const cardPOAmount = parseFloat(card.estimatedPOAmount) || 0;

        // Categorize jobs
        const isQuotedJob = card.status && card.status.toLowerCase().includes('quote');
        const isAssignedJob = vendorName !== 'Unassigned' && (card.vendor === vendorName ||
          card.vendors?.some(v => v.name === vendorName));

        vendor.projects.push({
          ...card,
          daysSinceCreated: cardDaysSinceCreated,
          daysInCurrentStatus: cardDaysInStatus,
          statusMoves: cardStatusMoves,
          expandedStatus: expandedStatus,
          poAmount: cardPOAmount
        });

        if (isQuotedJob) {
          vendor.quotedJobs.push(card);
          vendor.estimatedPOAmount += cardPOAmount;
        }

        if (isAssignedJob) {
          vendor.assignedJobs.push(card);
          vendor.totalPOAmount += cardPOAmount;
        }

        // Accumulate metrics
        vendor.totalStatusMoves += cardStatusMoves;
        vendor.avgDaysInCurrentStatus += cardDaysInStatus;
        vendor.avgDaysSinceCreated += cardDaysSinceCreated;

        // Status breakdown
        const status = expandedStatus || 'Unknown';
        vendor.statusBreakdown[status] = (vendor.statusBreakdown[status] || 0) + 1;
      });

      locationGroups[location].totalProjects++;
      locationGroups[location].totalPOAmount += parseFloat(card.estimatedPOAmount) || 0;
    });

    // Calculate averages for each vendor
    Object.values(locationGroups).forEach(location => {
      Object.values(location.vendors).forEach(vendor => {
        if (vendor.projects.length > 0) {
          vendor.avgDaysInCurrentStatus = Math.round(vendor.avgDaysInCurrentStatus / vendor.projects.length);
          vendor.avgDaysSinceCreated = Math.round(vendor.avgDaysSinceCreated / vendor.projects.length);
        }
      });
    });

    const totalVendors = new Set();
    Object.values(locationGroups).forEach(location => {
      Object.keys(location.vendors).forEach(vendorName => {
        if (vendorName !== 'Unassigned') totalVendors.add(vendorName);
      });
    });

    const reportResult = {
      type: 'vendor',
      generated: new Date().toISOString(),
      filters: { vendor: selectedVendor, location: selectedLocation, dateRange },
      summary: {
        totalVendors: totalVendors.size,
        totalLocations: Object.keys(locationGroups).length,
        totalProjects: filteredCards.length,
        totalPOAmount: Object.values(locationGroups).reduce((sum, loc) => sum + (loc.totalPOAmount || 0), 0),
        totalEstimatedPO: Object.values(locationGroups).reduce((sum, loc) =>
          sum + Object.values(loc.vendors).reduce((vendorSum, vendor) => vendorSum + (vendor.estimatedPOAmount || 0), 0), 0
        )
      },
      data: locationGroups
    };

    console.log('📊 Generated location-based vendor report:', reportResult);
    console.log('📊 Location groups:', Object.keys(locationGroups));
    console.log('📊 Sample location data:', Object.values(locationGroups)[0]);

    setReportData(reportResult);
  };

  // Generate weekly projections report
  const generateWeeklyReport = () => {
    try {
      const today = new Date();

      // Use date range if provided, otherwise use next week
      let startDate, endDate;
      if (dateRange.start && dateRange.end) {
        startDate = new Date(dateRange.start);
        endDate = new Date(dateRange.end);
      } else {
        // Default to next week
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)

        startDate = new Date(thisWeekStart);
        startDate.setDate(thisWeekStart.getDate() + 7); // Next week start

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Next week end
      }

      let filteredCards = [...cards];

      // Filter by location if specified
      if (selectedLocation !== 'all') {
        filteredCards = filteredCards.filter(card => card.location === selectedLocation);
      }

      // Group by location - only include selected location(s)
      const locationProjections = {};
      lanes.forEach(lane => {
        // Only include this lane if it matches the selected location or if showing all
        if (selectedLocation === 'all' || lane.name === selectedLocation) {
          locationProjections[lane.name] = {
            name: lane.name,
            color: lane.color,
            abbreviation: lane.abbreviation,
            scheduledJobs: [],
            billingJobs: [],
            scheduledRevenue: 0,
            billingRevenue: 0,
            crewRequirements: new Set(),
            equipmentNeeded: []
          };
        }
      });

      filteredCards.forEach(card => {
        const location = card.location;
        if (!locationProjections[location]) return;

        // Jobs scheduled for the date range
        if (card.scheduledDate) {
          const scheduledDate = new Date(card.scheduledDate);
          if (scheduledDate >= startDate && scheduledDate <= endDate) {
            locationProjections[location].scheduledJobs.push({
              ...card,
              scheduledDate: scheduledDate.toLocaleDateString(),
              dayOfWeek: scheduledDate.toLocaleDateString('en-US', { weekday: 'long' })
            });
            locationProjections[location].scheduledRevenue += parseFloat(card.revenue) || 0;

            // Add crew requirements
            if (card.assignedCrew && Array.isArray(card.assignedCrew)) {
              card.assignedCrew.forEach(member =>
                locationProjections[location].crewRequirements.add(member)
              );
            }

            // Add equipment needs
            if (card.equipmentNeeded) {
              locationProjections[location].equipmentNeeded.push(card.equipmentNeeded);
            }
          }
        }

        // Jobs ready for billing
        const billingStatuses = ['Job Complete', 'Completed', 'Ready for Billing', 'Invoiced'];
        if (billingStatuses.includes(card.status) && !card.billed) {
          locationProjections[location].billingJobs.push(card);
          locationProjections[location].billingRevenue += parseFloat(card.revenue) || 0;
        }
      });

      // Convert crew requirements set to array
      Object.values(locationProjections).forEach(location => {
        location.crewRequirements = Array.from(location.crewRequirements);
      });

      const totalScheduledRevenue = Object.values(locationProjections)
        .reduce((sum, loc) => sum + (loc.scheduledRevenue || 0), 0);
      const totalBillingRevenue = Object.values(locationProjections)
        .reduce((sum, loc) => sum + (loc.billingRevenue || 0), 0);
      const totalScheduledJobs = Object.values(locationProjections)
        .reduce((sum, loc) => sum + (loc.scheduledJobs?.length || 0), 0);
      const totalBillingJobs = Object.values(locationProjections)
        .reduce((sum, loc) => sum + (loc.billingJobs?.length || 0), 0);

      setReportData({
        type: 'weekly',
        generated: new Date().toISOString(),
        weekRange: {
          start: startDate.toLocaleDateString(),
          end: endDate.toLocaleDateString()
        },
        filters: { location: selectedLocation },
        summary: {
          totalScheduledJobs,
          totalBillingJobs,
          totalScheduledRevenue,
          totalBillingRevenue,
          totalProjectedRevenue: totalScheduledRevenue + totalBillingRevenue
        },
        data: locationProjections
      });
    } catch (error) {
      console.error('Error generating weekly report:', error);
      alert('Error generating weekly report. Please check the console for details.');
    }
  };

  // Generate enhanced status report by location
  const generateStatusReport = () => {
    let allCards = [...cards];
    console.log('🔍 Starting status report generation with cards:', allCards.length);
    console.log('🔍 Sample card data:', allCards[0]);
    console.log('🔍 Available statuses:', statuses.map(s => s.name));
    console.log('🔍 Available lanes:', lanes.map(l => l.name));
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;

    // Filter cards that had activity in the date range
    let filteredCards = allCards;
    if (startDate || endDate) {
      filteredCards = allCards.filter(card => {
        // Include if created in range
        const createdInRange = (!startDate || new Date(card.created) >= startDate) &&
                              (!endDate || new Date(card.created) <= endDate);

        // Include if has status changes in range
        const hasStatusChangeInRange = card.statusHistory?.some(entry => {
          const entryDate = new Date(entry.timestamp);
          return (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);
        });

        return createdInRange || hasStatusChangeInRange;
      });
    }

    // Filter by location
    if (selectedLocation !== 'all') {
      filteredCards = filteredCards.filter(card => card.location === selectedLocation);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filteredCards = filteredCards.filter(card => card.status === selectedStatus);
    }

    // Group by location and status
    const locationGroups = {};
    lanes.forEach(lane => {
      locationGroups[lane.name] = {
        name: lane.name,
        color: lane.color,
        abbreviation: lane.abbreviation,
        statuses: {},
        totalProjects: 0,
        totalRevenue: 0,
        anticipatedRevenue: 0,
        totalStatusMoves: 0
      };

      statuses.forEach(status => {
        console.log('🔍 Adding status to location group:', status.name, 'for location:', lane.name);
        locationGroups[lane.name].statuses[status.name] = {
          projects: [],
          count: 0,
          revenue: 0,
          statusMoves: 0,
          avgDaysSinceCreated: 0,
          avgDaysInCurrentStatus: 0
        };
      });
    });

    let totalStatusMovesAllLocations = 0;
    let totalAnticipatedRevenue = 0;

    filteredCards.forEach(card => {
      const location = card.location;
      const status = card.status;
      const expandedStatus = expandStatusText(status);

      if (locationGroups[location] && locationGroups[location].statuses[status]) {
        const cardDaysSinceCreated = getDaysSinceCreated(card);
        const cardDaysInStatus = getDaysInCurrentStatus(card);
        const cardStatusMoves = startDate && endDate ? countStatusMoves(card, startDate, endDate) : 0;

        locationGroups[location].statuses[status].projects.push({
          ...card,
          daysSinceCreated: cardDaysSinceCreated,
          daysInCurrentStatus: cardDaysInStatus,
          statusMoves: cardStatusMoves,
          expandedStatus: expandedStatus
        });

        locationGroups[location].statuses[status].count++;
        locationGroups[location].statuses[status].revenue += parseFloat(card.revenue) || 0;
        locationGroups[location].statuses[status].statusMoves += cardStatusMoves;
        locationGroups[location].statuses[status].avgDaysSinceCreated += cardDaysSinceCreated;
        locationGroups[location].statuses[status].avgDaysInCurrentStatus += cardDaysInStatus;

        locationGroups[location].totalProjects++;
        locationGroups[location].totalRevenue += parseFloat(card.revenue) || 0;
        locationGroups[location].totalStatusMoves += cardStatusMoves;

        // Calculate anticipated revenue for non-completed jobs
        if (status !== 'Job Complete' && status !== 'Completed') {
          locationGroups[location].anticipatedRevenue += parseFloat(card.revenue) || 0;
          totalAnticipatedRevenue += parseFloat(card.revenue) || 0;
        }

        totalStatusMovesAllLocations += cardStatusMoves;
      }
    });

    // Calculate averages
    Object.values(locationGroups).forEach(location => {
      Object.values(location.statuses).forEach(statusData => {
        if (statusData.count > 0) {
          statusData.avgDaysSinceCreated = Math.round(statusData.avgDaysSinceCreated / statusData.count);
          statusData.avgDaysInCurrentStatus = Math.round(statusData.avgDaysInCurrentStatus / statusData.count);
        }
      });
    });

    const reportResult = {
      type: 'status',
      generated: new Date().toISOString(),
      dateRange: {
        start: startDate?.toLocaleDateString() || 'All time',
        end: endDate?.toLocaleDateString() || 'Present'
      },
      filters: { location: selectedLocation, status: selectedStatus, dateRange },
      summary: {
        totalLocations: selectedLocation === 'all' ? Object.keys(locationGroups).length : 1,
        totalProjects: filteredCards.length,
        totalRevenue: filteredCards.reduce((sum, card) => sum + (parseFloat(card.revenue) || 0), 0),
        anticipatedRevenue: totalAnticipatedRevenue,
        totalStatusMoves: totalStatusMovesAllLocations,
        uniqueStatuses: [...new Set(filteredCards.map(card => card.status))].length
      },
      data: locationGroups
    };

    console.log('📊 Generated status report:', reportResult);
    console.log('📊 Location groups:', Object.keys(locationGroups));
    console.log('📊 Sample location data:', Object.values(locationGroups)[0]);
    console.log('📊 Filtered cards:', filteredCards.length);

    setReportData(reportResult);
  };

  // Export report as CSV
  const exportCSV = () => {
    if (!reportData) return;

    let csv = '';

    if (reportData.type === 'vendor') {
      csv = 'Vendor,Total Projects,Total Revenue,Status Breakdown,Location Breakdown\n';
      Object.values(reportData.data).forEach(vendor => {
        const statusBreakdown = Object.entries(vendor.statusBreakdown)
          .map(([status, count]) => `${status}:${count}`).join('; ');
        const locationBreakdown = Object.entries(vendor.locationBreakdown)
          .map(([location, count]) => `${location}:${count}`).join('; ');
        csv += `"${vendor.name}",${vendor.projects.length},${vendor.totalRevenue},"${statusBreakdown}","${locationBreakdown}"\n`;
      });
    } else {
      csv = 'Location,Status,Project Count,Revenue,Average Age (days)\n';
      Object.values(reportData.data).forEach(location => {
        Object.entries(location.statuses).forEach(([statusName, statusData]) => {
          if (statusData.count > 0) {
            csv += `"${location.name}","${statusName}",${statusData.count},${statusData.revenue},${statusData.avgAge}\n`;
          }
        });
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export report as JSON
  const exportJSON = () => {
    if (!reportData) return;

    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.type}_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export report as PDF
  const exportPDF = () => {
    if (!reportData) {
      console.error('❌ No report data available for PDF export');
      alert('Please generate a report first before exporting to PDF.');
      return;
    }

    try {
      console.log('📄 Starting PDF export for report:', reportData.type);
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add text with proper spacing
    const addText = (text, x, y, fontSize = 12, style = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      doc.text(text, x, y);
      return y + fontSize * 0.5 + 2;
    };

    // Helper function to check if we need a new page
    const checkNewPage = (neededSpace = 30) => {
      if (yPosition + neededSpace > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Header with company info
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('WEEKLY OPERATIONAL REPORT', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reportData.type.toUpperCase()} ANALYSIS`, pageWidth / 2, 23, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date(reportData.generated).toLocaleDateString()} at ${new Date(reportData.generated).toLocaleTimeString()}`, pageWidth / 2, 30, { align: 'center' });

    yPosition = 45;
    doc.setTextColor(0, 0, 0);

    // Report Parameters Box
    if (reportData.filters) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 25, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORT PARAMETERS', margin + 5, yPosition + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      let filterText = [];
      Object.entries(reportData.filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          if (key === 'dateRange' && typeof value === 'object') {
            filterText.push(`Date Range: ${value.start || 'All time'} to ${value.end || 'Present'}`);
          } else if (key === 'location') {
            filterText.push(`Location: ${value}`);
          } else if (key === 'status') {
            filterText.push(`Status Filter: ${value}`);
          } else {
            filterText.push(`${key}: ${value}`);
          }
        }
      });

      if (filterText.length === 0) {
        filterText.push('All Locations • All Time Period • All Statuses');
      }

      doc.text(filterText.join(' • '), margin + 5, yPosition + 18);
      yPosition += 35;
    }

    // Executive Summary Box
    checkNewPage();
    doc.setFillColor(236, 248, 255);
    doc.rect(margin, yPosition, pageWidth - margin * 2, 45, 'F');
    doc.setDrawColor(41, 128, 185);
    doc.rect(margin, yPosition, pageWidth - margin * 2, 45, 'S');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE SUMMARY', margin + 5, yPosition + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    let summaryY = yPosition + 20;
    const leftCol = margin + 5;
    const rightCol = pageWidth / 2 + 10;

    // Left column metrics
    Object.entries(reportData.summary).slice(0, 3).forEach(([key, value]) => {
      const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const displayValue = typeof value === 'number' && key.toLowerCase().includes('revenue')
        ? `$${value.toLocaleString()}`
        : value.toLocaleString();
      doc.text(`${displayKey}: ${displayValue}`, leftCol, summaryY);
      summaryY += 8;
    });

    // Right column metrics
    summaryY = yPosition + 20;
    Object.entries(reportData.summary).slice(3, 6).forEach(([key, value]) => {
      const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const displayValue = typeof value === 'number' && key.toLowerCase().includes('revenue')
        ? `$${value.toLocaleString()}`
        : value.toLocaleString();
      doc.text(`${displayKey}: ${displayValue}`, rightCol, summaryY);
      summaryY += 8;
    });

    yPosition += 55;

    // Add Regional Projection Report for non-vendor reports
    if (reportData.type !== 'vendor') {
      checkNewPage(120);

      // Regional Projection Header
      doc.setFillColor(34, 197, 94);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('🌍 REGIONAL PROJECTION REPORT', margin + 5, yPosition + 8);
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      // Calculate revenue directly from cards
      let pipelineRevenue = 0;
      let projectedRevenue = 0;
      let actualRevenue = 0;

      cards.forEach(card => {
        const revenue = parseFloat(card.revenue) || 0;
        const status = statuses.find(s => s.name === card.status);
        const revenueCategory = status?.revenueCategory || 'Pipeline';

        if (revenueCategory === 'Pipeline') {
          pipelineRevenue += revenue;
        } else if (revenueCategory === 'Projected') {
          projectedRevenue += revenue;
        } else if (revenueCategory === 'Actual') {
          actualRevenue += revenue;
        }
      });

      const totalProjectedRevenue = pipelineRevenue + projectedRevenue + actualRevenue;

      // Revenue Summary Box
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 30, 'F');
      doc.setDrawColor(34, 197, 94);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 30, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('REGIONAL REVENUE PROJECTION', margin + 5, yPosition + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const col1 = margin + 5;
      const col2 = margin + 100;
      const col3 = margin + 200;
      const col4 = margin + 300;

      doc.text(`Pipeline: $${pipelineRevenue.toLocaleString()}`, col1, yPosition + 18);
      doc.text(`Projected: $${projectedRevenue.toLocaleString()}`, col2, yPosition + 18);
      doc.text(`Actual: $${actualRevenue.toLocaleString()}`, col3, yPosition + 18);

      doc.setFont('helvetica', 'bold');
      doc.text(`Total Estimate: $${totalProjectedRevenue.toLocaleString()}`, col4, yPosition + 18);

      yPosition += 40;

      // Location Breakdown
      const locationBreakdown = {};
      cards.forEach(card => {
        const location = card.location || 'Unknown';
        if (!locationBreakdown[location]) {
          locationBreakdown[location] = {
            pipeline: 0,
            projected: 0,
            actual: 0,
            total: 0,
            count: 0
          };
        }

        const revenue = parseFloat(card.revenue) || 0;
        const status = statuses.find(s => s.name === card.status);
        const revenueCategory = status?.revenueCategory || 'Pipeline';

        locationBreakdown[location].count++;
        locationBreakdown[location].total += revenue;

        if (revenueCategory === 'Pipeline') {
          locationBreakdown[location].pipeline += revenue;
        } else if (revenueCategory === 'Projected') {
          locationBreakdown[location].projected += revenue;
        } else if (revenueCategory === 'Actual') {
          locationBreakdown[location].actual += revenue;
        }
      });

      // Sort locations by total revenue
      const sortedLocations = Object.entries(locationBreakdown)
        .sort((a, b) => b[1].total - a[1].total);

      if (sortedLocations.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('REVENUE BY LOCATION', margin + 5, yPosition);
        yPosition += 12;

        sortedLocations.forEach(([locationName, data]) => {
          checkNewPage(20);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`${locationName} (${data.count} projects): $${data.total.toLocaleString()}`, margin + 5, yPosition);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`Pipeline: $${data.pipeline.toLocaleString()} | Projected: $${data.projected.toLocaleString()} | Actual: $${data.actual.toLocaleString()}`, margin + 15, yPosition + 8);

          yPosition += 16;
        });

        yPosition += 10;
      }
    }

    // Report-specific content
    if (reportData.type === 'vendor') {
      // Vendor Report Header
      checkNewPage();
      doc.setFillColor(155, 89, 182);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('VENDOR ANALYSIS BY LOCATION', margin + 5, yPosition + 8);
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      Object.values(reportData.data).forEach(location => {
        checkNewPage(150);

        // Location Header
        doc.setFillColor(66, 139, 202);
        doc.rect(margin, yPosition, pageWidth - margin * 2, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`📍 ${location.name}`, margin + 5, yPosition + 10);
        doc.text(`${location.totalProjects} projects | $${(location.totalPOAmount || 0).toLocaleString()} PO Amount`, pageWidth - margin - 5, yPosition + 10, { align: 'right' });
        yPosition += 20;

        doc.setTextColor(0, 0, 0);

        // Loop through vendors in this location
        Object.values(location.vendors).forEach(vendor => {
          checkNewPage(100);

          // Vendor Header
          doc.setFillColor(248, 249, 250);
          doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 15, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 15, 'S');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text(`🏢 ${vendor.name}`, margin + 8, yPosition + 10);

          if (vendor.name === 'Unassigned') {
            doc.setTextColor(220, 38, 38);
            doc.setFontSize(9);
            doc.text('(No vendor assigned)', margin + 8 + doc.getTextWidth(`🏢 ${vendor.name}`) + 5, yPosition + 10);
            doc.setTextColor(0, 0, 0);
          }

          // Vendor PO Amount
          doc.setTextColor(0, 128, 0);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${(vendor.totalPOAmount || 0).toLocaleString()}`, pageWidth - margin - 15, yPosition + 10, { align: 'right' });
          doc.setTextColor(0, 0, 0);

          yPosition += 20;

          // Vendor Summary Metrics
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const metrics = [
            `Active Projects: ${vendor.projects.length}`,
            `Quoted Jobs: ${vendor.quotedJobs.length}`,
            `Assigned Jobs: ${vendor.assignedJobs.length}`,
            `Estimated PO: $${(vendor.estimatedPOAmount || 0).toLocaleString()}`,
            `Avg Days in System: ${vendor.avgDaysSinceCreated}`
          ];
          doc.text(metrics.join(' • '), margin + 8, yPosition);
          yPosition += 10;

          // Status Breakdown
          if (Object.keys(vendor.statusBreakdown).length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Status Distribution:', margin + 8, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);

            let statusText = [];
            Object.entries(vendor.statusBreakdown).forEach(([status, count]) => {
              statusText.push(`${status}: ${count}`);
            });
            doc.text(statusText.join(' | '), margin + 8, yPosition + 8);
            yPosition += 16;
          }

          // Projects assigned to this vendor in this location
          if (vendor.projects.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`Projects (${vendor.projects.length}):`, margin + 8, yPosition);
            yPosition += 8;

            vendor.projects.slice(0, 3).forEach(project => {
              checkNewPage(25);

              // Project mini-card
              doc.setFillColor(252, 252, 252);
              doc.rect(margin + 15, yPosition, pageWidth - margin * 2 - 30, 20, 'F');
              doc.setDrawColor(220, 220, 220);
              doc.rect(margin + 15, yPosition, pageWidth - margin * 2 - 30, 20, 'S');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.text(`${project.jobNumber || 'N/A'} - ${project.title}`, margin + 18, yPosition + 5);

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.text(`Status: ${project.status}`, margin + 18, yPosition + 10);
              doc.text(`Days Active: ${project.daysSinceCreated}`, margin + 18, yPosition + 15);

              if (project.poAmount > 0) {
                doc.setTextColor(0, 128, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(`PO Amount: $${project.poAmount.toLocaleString()}`, pageWidth / 2 + 20, yPosition + 10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
              }

              if (project.customerName) {
                doc.text(`Customer: ${project.customerName}`, pageWidth / 2 + 20, yPosition + 5);
              }

              yPosition += 22;
            });

            if (vendor.projects.length > 3) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.text(`... and ${vendor.projects.length - 3} more projects`, margin + 18, yPosition);
              doc.setTextColor(0, 0, 0);
              yPosition += 8;
            }
          }

          yPosition += 15;
        });

        yPosition += 10;
      });

    } else if (reportData.type === 'status') {
      yPosition += 15;
      checkNewPage();
      yPosition = addText('STATUS REPORT BY LOCATION:', margin, yPosition, 12, 'bold');

      Object.values(reportData.data).forEach(location => {
        if (location.totalProjects === 0) return;

        checkNewPage(80);
        yPosition += 5;
        yPosition = addText(`${location.name} (${location.abbreviation})`, margin, yPosition, 14, 'bold');
        yPosition = addText(`Total Projects: ${location.totalProjects} | Total Revenue: $${(location.totalRevenue || 0).toLocaleString()}`, margin + 5, yPosition, 10);
        yPosition = addText(`Anticipated Revenue: $${(location.anticipatedRevenue || 0).toLocaleString()}`, margin + 5, yPosition, 10);

        yPosition += 5;
        // Status details table
        const statusData = [];
        Object.entries(location.statuses).forEach(([statusName, statusInfo]) => {
          if (statusInfo.count > 0) {
            statusData.push([
              statusName,
              statusInfo.count.toString(),
              `$${(statusInfo.revenue || 0).toLocaleString()}`,
              statusInfo.avgDaysSinceCreated.toString(),
              statusInfo.avgDaysInCurrentStatus.toString()
            ]);
          }
        });

        if (statusData.length > 0) {
          // Create table manually instead of using autoTable
          checkNewPage(10 + statusData.length * 8);

          // Table headers
          doc.setFillColor(66, 139, 202);
          doc.rect(margin, yPosition, pageWidth - margin * 2, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Status', margin + 2, yPosition + 6);
          doc.text('Count', margin + 62, yPosition + 6);
          doc.text('Revenue', margin + 82, yPosition + 6);
          doc.text('Days Created', margin + 117, yPosition + 6);
          doc.text('Days in Status', margin + 152, yPosition + 6);

          yPosition += 10;

          // Table rows
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          statusData.forEach(row => {
            if (yPosition > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(String(row[0] || ''), margin + 2, yPosition + 6);
            doc.text(String(row[1] || '0'), margin + 62, yPosition + 6);
            doc.text(String(row[2] || '$0'), margin + 82, yPosition + 6);
            doc.text(String(row[3] || '0'), margin + 117, yPosition + 6);
            doc.text(String(row[4] || '0'), margin + 152, yPosition + 6);

            // Draw row border
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition + 8, pageWidth - margin, yPosition + 8);
            yPosition += 8;
          });

          yPosition += 10;
        }

        // Add detailed job information section
        checkNewPage(40);
        yPosition += 15;

        // Detailed Jobs Header
        doc.setFillColor(52, 152, 219);
        doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAILED PROJECT INFORMATION', margin + 5, yPosition + 8);
        doc.setTextColor(0, 0, 0);
        yPosition += 20;

        // Get all jobs for this location
        const locationJobs = [];
        Object.values(location.statuses).forEach(statusInfo => {
          statusInfo.projects.forEach(job => {
            locationJobs.push(job);
          });
        });

        if (locationJobs.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.text('No projects found for this location.', margin + 5, yPosition);
          yPosition += 15;
        } else {
          locationJobs.forEach((job, index) => {
            checkNewPage(70);

            // Calculate days metrics
            const daysSinceCreated = job.created ?
              Math.floor((new Date() - new Date(job.created)) / (1000 * 60 * 60 * 24)) : 0;
            const daysSinceUpdated = job.updated ?
              Math.floor((new Date() - new Date(job.updated)) / (1000 * 60 * 60 * 24)) : 0;

            // Job Card with enhanced details
            doc.setFillColor(249, 249, 249);
            doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 65, 'F');
            doc.setDrawColor(150, 150, 150);
            doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 65, 'S');

            // Job Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`${job.jobNumber || 'N/A'} - ${job.title || 'Untitled Project'}`, margin + 8, yPosition + 8);

            // Status badge
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setFillColor(70, 130, 180);
            doc.rect(pageWidth - margin - 65, yPosition + 2, 60, 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(`STATUS: ${job.status || 'Unknown'}`, pageWidth - margin - 62, yPosition + 8);

            // Job Details
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            // Customer and Location Info
            doc.text(`Customer: ${job.customerName || 'Not specified'}`, margin + 8, yPosition + 18);
            doc.text(`Customer Location: ${job.customerLocation || 'Not specified'}`, margin + 8, yPosition + 26);

            // Project scope
            const scope = job.description || job.projectScope || 'No description provided';
            const maxScopeLength = 80;
            const truncatedScope = scope.length > maxScopeLength ? scope.substring(0, maxScopeLength) + '...' : scope;
            doc.text(`Project Scope: ${truncatedScope}`, margin + 8, yPosition + 34);

            // Vendor information
            doc.text(`Vendor: ${job.vendor || 'Not assigned'}`, margin + 8, yPosition + 42);

            // Revenue information
            if (job.revenue && parseFloat(job.revenue) > 0) {
              doc.setTextColor(0, 128, 0);
              doc.setFont('helvetica', 'bold');
              doc.text(`Revenue: $${(parseFloat(job.revenue) || 0).toLocaleString()}`, pageWidth / 2 + 20, yPosition + 18);
              doc.setTextColor(0, 0, 0);
              doc.setFont('helvetica', 'normal');
            }

            // Days metrics
            doc.text(`Days Since Created: ${daysSinceCreated}`, pageWidth / 2 + 20, yPosition + 26);
            doc.text(`Days Since Updated: ${daysSinceUpdated}`, pageWidth / 2 + 20, yPosition + 34);

            // Last comment/status
            if (job.lastComment || job.statusHistory?.length > 0) {
              const lastComment = job.lastComment ||
                (job.statusHistory && job.statusHistory.length > 0 ?
                  job.statusHistory[job.statusHistory.length - 1].comment || 'No comment' : 'No comment');
              const maxCommentLength = 70;
              const truncatedComment = lastComment.length > maxCommentLength ?
                lastComment.substring(0, maxCommentLength) + '...' : lastComment;
              doc.text(`Last Comment: ${truncatedComment}`, margin + 8, yPosition + 50);
            }

            // Crew assignment info
            if (job.assignedCrew && job.assignedCrew.length > 0) {
              const crewText = job.assignedCrew.slice(0, 2).join(', ') +
                (job.assignedCrew.length > 2 ? ` +${job.assignedCrew.length - 2} more` : '');
              doc.text(`Assigned Crew: ${crewText}`, pageWidth / 2 + 20, yPosition + 42);
            }

            // Scheduled date if available
            if (job.scheduledDate) {
              doc.text(`Scheduled: ${new Date(job.scheduledDate).toLocaleDateString()}`, pageWidth / 2 + 20, yPosition + 50);
            }

            yPosition += 70;
          });
        }

        // Add Scheduled Jobs Summary section
        checkNewPage(80); // Ensure more space for header and at least a few rows
        yPosition += 20;

        // Scheduled Jobs Header
        doc.setFillColor(46, 204, 113);
        doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SCHEDULED JOBS SUMMARY', margin + 5, yPosition + 8);
        doc.setTextColor(0, 0, 0);
        yPosition += 20;

        // Filter jobs that have scheduled dates or are in "Scheduled" or "Active" status
        const scheduledJobs = locationJobs.filter(job =>
          job.scheduledDate ||
          ['Scheduled', 'Active', 'Contracted'].includes(job.status) ||
          (job.assignedCrew && job.assignedCrew.length > 0)
        );

        if (scheduledJobs.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.text('No scheduled jobs found for this location.', margin + 5, yPosition);
          yPosition += 15;
        } else {
          // Check if we have enough space for table header + at least one row
          checkNewPage(30);

          // Table header
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);

          // Adjust column positions to fit better within page width
          const col1 = margin + 2;      // Job #
          const col2 = margin + 35;     // Title
          const col3 = margin + 85;     // Personnel
          const col4 = margin + 135;    // Vendor

          doc.text('Job #', col1, yPosition + 8);
          doc.text('Title', col2, yPosition + 8);
          doc.text('Personnel', col3, yPosition + 8);
          doc.text('Vendor', col4, yPosition + 8);
          yPosition += 12;

          scheduledJobs.forEach((job, index) => {
            // Check for page break with enough space for this row
            checkNewPage(20);

            // Alternating row colors
            if (index % 2 === 0) {
              doc.setFillColor(248, 248, 248);
              doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);

            // Job Number
            doc.text(job.jobNumber || 'N/A', col1, yPosition + 8);

            // Job Title (truncated)
            const title = job.title || 'Untitled';
            const maxTitleLength = 20;
            const truncatedTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title;
            doc.text(truncatedTitle, col2, yPosition + 8);

            // Assigned Personnel
            if (job.assignedCrew && job.assignedCrew.length > 0) {
              const crewText = job.assignedCrew.length <= 1 ?
                job.assignedCrew[0] :
                `${job.assignedCrew[0]}, +${job.assignedCrew.length - 1}`;
              const maxCrewLength = 20;
              const truncatedCrew = crewText.length > maxCrewLength ? crewText.substring(0, maxCrewLength) + '...' : crewText;
              doc.text(truncatedCrew, col3, yPosition + 8);
            } else {
              doc.setTextColor(150, 150, 150);
              doc.text('Not assigned', col3, yPosition + 8);
              doc.setTextColor(0, 0, 0);
            }

            // Vendor
            if (job.vendor) {
              const maxVendorLength = 18;
              const truncatedVendor = job.vendor.length > maxVendorLength ? job.vendor.substring(0, maxVendorLength) + '...' : job.vendor;
              doc.text(truncatedVendor, col4, yPosition + 8);
            } else {
              doc.setTextColor(150, 150, 150);
              doc.text('Not assigned', col4, yPosition + 8);
              doc.setTextColor(0, 0, 0);
            }

            // Row border
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, yPosition + 12, pageWidth - margin, yPosition + 12);

            yPosition += 12;
          });

          yPosition += 10;
        }
      });

    } else if (reportData.type === 'weekly') {
      // Weekly Operations Header
      checkNewPage();
      doc.setFillColor(46, 204, 113);
      doc.rect(margin, yPosition, pageWidth - margin * 2, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('WEEKLY OPERATIONS SCHEDULE', margin + 5, yPosition + 8);
      doc.setTextColor(0, 0, 0);
      yPosition += 20;

      if (reportData.weekRange) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Week of ${reportData.weekRange.start} through ${reportData.weekRange.end}`, margin, yPosition);
        yPosition += 10;
      }

      Object.values(reportData.data).forEach(location => {
        const hasData = location.scheduledJobs.length > 0 || location.billingJobs.length > 0;
        if (!hasData) return;

        checkNewPage(120);

        // Location Header
        doc.setFillColor(location.color || '#3498db');
        doc.rect(margin, yPosition, pageWidth - margin * 2, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${location.name} Operations (${location.abbreviation})`, margin + 5, yPosition + 10);
        yPosition += 20;

        // Location Summary Box
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPosition, pageWidth - margin * 2, 20, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const summaryText = [
          `Total Jobs: ${location.scheduledJobs.length + location.billingJobs.length}`,
          `Scheduled Revenue: $${(location.scheduledRevenue || 0).toLocaleString()}`,
          `Billing Revenue: $${(location.billingRevenue || 0).toLocaleString()}`,
          `Total Revenue: $${((location.scheduledRevenue || 0) + (location.billingRevenue || 0)).toLocaleString()}`
        ];

        doc.text(summaryText.join(' • '), margin + 5, yPosition + 8);

        if (location.crewRequirements.size > 0) {
          doc.text(`Personnel Required: ${Array.from(location.crewRequirements).join(', ')}`, margin + 5, yPosition + 15);
        }
        yPosition += 25;

        // Scheduled Jobs Section
        if (location.scheduledJobs.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`SCHEDULED SERVICES (${location.scheduledJobs.length})`, margin, yPosition);
          yPosition += 7;

          location.scheduledJobs.forEach(job => {
            checkNewPage(65);

            // Calculate days metrics
            const daysSinceCreated = job.created ?
              Math.floor((new Date() - new Date(job.created)) / (1000 * 60 * 60 * 24)) : 0;
            const daysSinceUpdated = job.updated ?
              Math.floor((new Date() - new Date(job.updated)) / (1000 * 60 * 60 * 24)) : 0;

            // Job Card with enhanced details
            doc.setFillColor(255, 255, 255);
            doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 55, 'F');
            doc.setDrawColor(150, 150, 150);
            doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 55, 'S');

            // Job Number and Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(0, 51, 102);
            doc.text(`${job.jobNumber || 'N/A'} - ${job.title}`, margin + 8, yPosition + 6);

            // Customer and Location Info
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`Customer: ${job.customerName || 'Not specified'}`, margin + 8, yPosition + 12);
            doc.text(`Location: ${job.customerLocation || job.location || 'Not specified'}`, margin + 8, yPosition + 18);

            // Project Scope
            if (job.description) {
              doc.setFontSize(8);
              const scopeLines = doc.splitTextToSize(`Scope: ${job.description}`, pageWidth - margin * 2 - 20);
              scopeLines.slice(0, 2).forEach((line, i) => {
                doc.text(line, margin + 8, yPosition + 24 + (i * 4));
              });
            }

            // Vendor and Revenue
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`Vendor: ${job.vendor || 'Not assigned'}`, margin + 8, yPosition + 34);

            if (job.revenue) {
              doc.setTextColor(0, 128, 0);
              doc.text(`Revenue: $${(parseFloat(job.revenue) || 0).toLocaleString()}`, pageWidth / 2 + 20, yPosition + 6);
            }

            // Schedule Info
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text(`Scheduled: ${job.scheduledDate} (${job.dayOfWeek})`, pageWidth / 2 + 20, yPosition + 12);

            // Status and Days Tracking
            doc.setFontSize(8);
            doc.text(`Current Status: ${job.status}`, pageWidth / 2 + 20, yPosition + 18);
            doc.text(`Days Since Created: ${daysSinceCreated}`, pageWidth / 2 + 20, yPosition + 24);
            doc.text(`Days in Current Status: ${daysSinceUpdated}`, pageWidth / 2 + 20, yPosition + 30);

            // Last Comment/Note
            if (job.notes || job.lastComment || job.statusHistory?.length > 0) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);

              let lastNote = job.notes || job.lastComment;
              if (!lastNote && job.statusHistory?.length > 0) {
                const lastStatus = job.statusHistory[job.statusHistory.length - 1];
                lastNote = `Last update: Changed to ${lastStatus.status} on ${new Date(lastStatus.timestamp).toLocaleDateString()}`;
              }

              if (lastNote) {
                const noteLines = doc.splitTextToSize(`Note: ${lastNote}`, pageWidth - margin * 2 - 20);
                doc.text(noteLines[0], margin + 8, yPosition + 40);
              }
            }

            // Crew Assignment
            if (job.assignedCrew && job.assignedCrew.length > 0) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(0, 0, 0);
              doc.text(`Assigned Crew: ${job.assignedCrew.join(', ')}`, margin + 8, yPosition + 46);
            }

            // Priority Indicator
            if (job.priority) {
              const priorityColors = {
                'Critical': [220, 38, 38],
                'High': [249, 115, 22],
                'Medium': [234, 179, 8],
                'Low': [34, 197, 94]
              };
              const color = priorityColors[job.priority] || [100, 100, 100];
              doc.setFillColor(...color);
              doc.rect(pageWidth - margin - 35, yPosition + 2, 30, 8, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(7);
              doc.setFont('helvetica', 'bold');
              doc.text(job.priority.toUpperCase(), pageWidth - margin - 20, yPosition + 7, { align: 'center' });
            }

            yPosition += 58;
          });
        }

        // Billing Jobs
        if (location.billingJobs.length > 0) {
          yPosition += 10;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`READY FOR BILLING (${location.billingJobs.length})`, margin, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 128, 0);
          doc.text(`Total Billable Revenue: $${(location.billingRevenue || 0).toLocaleString()}`, margin + 80, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 7;

          location.billingJobs.forEach(job => {
            checkNewPage(40);

            // Calculate days metrics
            const daysSinceCreated = job.created ?
              Math.floor((new Date() - new Date(job.created)) / (1000 * 60 * 60 * 24)) : 0;
            const daysSinceCompleted = job.updated ?
              Math.floor((new Date() - new Date(job.updated)) / (1000 * 60 * 60 * 24)) : 0;

            // Billing Job Card (more compact than scheduled)
            doc.setFillColor(252, 252, 252);
            doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 35, 'F');
            doc.setDrawColor(180, 180, 180);
            doc.rect(margin + 5, yPosition, pageWidth - margin * 2 - 10, 35, 'S');

            // Job Info
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`${job.jobNumber || 'N/A'} - ${job.title}`, margin + 8, yPosition + 5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Customer: ${job.customerName || 'Not specified'}`, margin + 8, yPosition + 10);
            doc.text(`Status: ${job.status}`, margin + 8, yPosition + 15);
            doc.text(`Vendor: ${job.vendor || 'Not assigned'}`, margin + 8, yPosition + 20);

            // Days and Revenue
            doc.text(`Completed ${daysSinceCompleted} days ago`, pageWidth / 2 + 20, yPosition + 10);
            doc.text(`Total Days in System: ${daysSinceCreated}`, pageWidth / 2 + 20, yPosition + 15);

            if (job.revenue) {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0, 128, 0);
              doc.text(`Amount: $${(parseFloat(job.revenue) || 0).toLocaleString()}`, pageWidth / 2 + 20, yPosition + 5);
            }

            // Completion Note
            if (job.completionNotes || job.lastComment) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              const note = job.completionNotes || job.lastComment || '';
              const noteLines = doc.splitTextToSize(`Completion Note: ${note}`, pageWidth - margin * 2 - 20);
              if (noteLines.length > 0) {
                doc.text(noteLines[0], margin + 8, yPosition + 28);
              }
            }

            doc.setTextColor(0, 0, 0);
            yPosition += 38;
          });
        }

        // Equipment Requirements
        if (location.equipmentNeeded && location.equipmentNeeded.length > 0) {
          yPosition += 5;
          yPosition = addText('Equipment Needed:', margin + 5, yPosition, 11, 'bold');
          const uniqueEquipment = [...new Set(location.equipmentNeeded.filter(eq => eq))];
          uniqueEquipment.forEach(equipment => {
            yPosition = addText(`• ${equipment}`, margin + 10, yPosition, 9);
          });
        }
      });
    }

    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer background
      doc.setFillColor(245, 245, 245);
      doc.rect(0, doc.internal.pageSize.getHeight() - 20, pageWidth, 20, 'F');

      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');

      // Page number
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

      // Confidential notice
      doc.text('CONFIDENTIAL - FOR INTERNAL USE ONLY', margin, doc.internal.pageSize.getHeight() - 10);

      // Report ID
      const reportId = `RPT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      doc.text(reportId, pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    // Save the PDF
    const fileName = `${reportData.type}_report_${reportData.filters?.location || 'all'}_${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('💾 Saving PDF as:', fileName);
    doc.save(fileName);
    console.log('✅ PDF export completed successfully');
    } catch (error) {
      console.error('❌ Error during PDF export:', error);
      alert('Failed to export PDF. Please try again or check the console for details.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Project Reports
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Type Selector */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex gap-4">
            <button
              onClick={() => setReportType('vendor')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'vendor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Vendor Report
            </button>
            <button
              onClick={() => setReportType('status')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'status'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Status Report by Location
            </button>
            <button
              onClick={() => setReportType('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Weekly Projections
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            {reportType === 'vendor' ? (
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">All Vendors</option>
                {uniqueVendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            ) : (
              <>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Locations</option>
                  {lanes.map(lane => (
                    <option key={lane.id} value={lane.name}>{lane.name}</option>
                  ))}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status.id} value={status.name}>{status.name}</option>
                  ))}
                </select>
              </>
            )}
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-2 border rounded-lg"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-2 border rounded-lg"
              placeholder="End Date"
            />
          </div>

          <button
            onClick={
              reportType === 'vendor' ? generateVendorReport :
              reportType === 'status' ? generateStatusReport :
              generateWeeklyReport
            }
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Generate Report
          </button>
        </div>

        {/* Report Display */}
        <div className="flex-1 overflow-auto p-6">
          {reportData ? (
            <div>
              {/* Summary */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-600 text-sm font-medium">
                    {reportData.type === 'vendor' ? 'Total Vendors' : 'Total Locations'}
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    {reportData.summary.totalVendors || reportData.summary.totalLocations}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 text-sm font-medium">Total Projects</div>
                  <div className="text-2xl font-bold text-green-800">
                    {reportData.summary.totalProjects}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-sm font-medium">
                    {reportData.type === 'vendor' ? 'Total PO Amount' : 'Total Revenue'}
                  </div>
                  <div className="text-2xl font-bold text-purple-800">
                    ${(reportData.summary.totalPOAmount || reportData.summary.totalRevenue || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Regional Projection Report */}
              {reportData.type !== 'vendor' && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🌍 Regional Projection Report</h3>
                  <div className="text-sm text-gray-600 mb-4">
                    Comprehensive revenue analysis including all jobs from every location
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(() => {
                      // Calculate revenue directly from ALL cards
                      let pipelineRevenue = 0;
                      let projectedRevenue = 0;
                      let actualRevenue = 0;
                      let totalProjectedRevenue = 0;

                      // Calculate from actual cards data
                      cards.forEach(card => {
                        const revenue = parseFloat(card.revenue) || 0;
                        const status = statuses.find(s => s.name === card.status);
                        const revenueCategory = status?.revenueCategory || 'Pipeline';

                        if (revenueCategory === 'Pipeline') {
                          pipelineRevenue += revenue;
                        } else if (revenueCategory === 'Projected') {
                          projectedRevenue += revenue;
                        } else if (revenueCategory === 'Actual') {
                          actualRevenue += revenue;
                        }
                      });

                      totalProjectedRevenue = pipelineRevenue + projectedRevenue + actualRevenue;

                      return (
                        <>
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <div className="text-red-600 text-sm font-medium">Pipeline Revenue</div>
                            <div className="text-xl font-bold text-red-800">
                              ${pipelineRevenue.toLocaleString()}
                            </div>
                            <div className="text-xs text-red-600 mt-1">
                              Potential future revenue
                            </div>
                          </div>

                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="text-orange-600 text-sm font-medium">Projected Revenue</div>
                            <div className="text-xl font-bold text-orange-800">
                              ${projectedRevenue.toLocaleString()}
                            </div>
                            <div className="text-xs text-orange-600 mt-1">
                              Contracted/scheduled work
                            </div>
                          </div>

                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-green-600 text-sm font-medium">Actual Revenue</div>
                            <div className="text-xl font-bold text-green-800">
                              ${actualRevenue.toLocaleString()}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Completed projects
                            </div>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-blue-600 text-sm font-medium">Total Period Estimate</div>
                            <div className="text-xl font-bold text-blue-800">
                              ${totalProjectedRevenue.toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Pipeline + Projected + Actual
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Revenue Breakdown Chart */}
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Regional Revenue Composition</div>
                    {(() => {
                      let pipelineRevenue = 0;
                      let projectedRevenue = 0;
                      let actualRevenue = 0;

                      // Calculate from actual cards data
                      cards.forEach(card => {
                        const revenue = parseFloat(card.revenue) || 0;
                        const status = statuses.find(s => s.name === card.status);
                        const revenueCategory = status?.revenueCategory || 'Pipeline';

                        if (revenueCategory === 'Pipeline') {
                          pipelineRevenue += revenue;
                        } else if (revenueCategory === 'Projected') {
                          projectedRevenue += revenue;
                        } else if (revenueCategory === 'Actual') {
                          actualRevenue += revenue;
                        }
                      });

                      const total = pipelineRevenue + projectedRevenue + actualRevenue;

                      if (total > 0) {
                        const pipelinePercent = (pipelineRevenue / total) * 100;
                        const projectedPercent = (projectedRevenue / total) * 100;
                        const actualPercent = (actualRevenue / total) * 100;

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center">
                                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                                Pipeline
                              </span>
                              <span className="font-medium">{pipelinePercent.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center">
                                <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                                Projected
                              </span>
                              <span className="font-medium">{projectedPercent.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center">
                                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                                Actual
                              </span>
                              <span className="font-medium">{actualPercent.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      }

                      return <div className="text-gray-500 text-sm">No revenue data available</div>;
                    })()}
                  </div>

                  {/* Location Breakdown Summary */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-700 mb-3">Revenue by Location</h4>
                    <div className="space-y-2">
                      {(() => {
                        const locationBreakdown = {};

                        // Calculate revenue by location
                        cards.forEach(card => {
                          const location = card.location || 'Unknown';
                          if (!locationBreakdown[location]) {
                            locationBreakdown[location] = {
                              pipeline: 0,
                              projected: 0,
                              actual: 0,
                              total: 0,
                              count: 0
                            };
                          }

                          const revenue = parseFloat(card.revenue) || 0;
                          const status = statuses.find(s => s.name === card.status);
                          const revenueCategory = status?.revenueCategory || 'Pipeline';

                          locationBreakdown[location].count++;
                          locationBreakdown[location].total += revenue;

                          if (revenueCategory === 'Pipeline') {
                            locationBreakdown[location].pipeline += revenue;
                          } else if (revenueCategory === 'Projected') {
                            locationBreakdown[location].projected += revenue;
                          } else if (revenueCategory === 'Actual') {
                            locationBreakdown[location].actual += revenue;
                          }
                        });

                        // Sort locations by total revenue
                        const sortedLocations = Object.entries(locationBreakdown)
                          .sort((a, b) => b[1].total - a[1].total);

                        if (sortedLocations.length === 0) {
                          return <div className="text-gray-500 text-sm">No location data available</div>;
                        }

                        return sortedLocations.map(([locationName, data]) => {
                          const lane = lanes.find(l => l.name === locationName);
                          const laneColor = lane?.color || '#6b7280';

                          return (
                            <div key={locationName} className="border rounded-lg p-3" style={{ borderColor: laneColor }}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: laneColor }}
                                  />
                                  <span className="font-medium text-gray-800">{locationName}</span>
                                  <span className="text-xs text-gray-500">({data.count} projects)</span>
                                </div>
                                <span className="font-bold text-gray-900">
                                  ${data.total.toLocaleString()}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-red-600">Pipeline:</span>
                                  <span className="font-medium">${data.pipeline.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-600">Projected:</span>
                                  <span className="font-medium">${data.projected.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-600">Actual:</span>
                                  <span className="font-medium">${data.actual.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Data */}
              {reportData.type === 'vendor' ? (
                <div className="space-y-6">
                  {Object.values(reportData.data).filter(location => !selectedLocation || location.name === selectedLocation).map(location => (
                    <div key={location.name} className="border rounded-lg overflow-hidden">
                      <div className="p-4 bg-blue-600 text-white font-semibold">
                        📍 {location.name}
                        <span className="float-right">
                          {location.totalProjects} projects | ${(location.totalPOAmount || 0).toLocaleString()} PO Amount
                        </span>
                      </div>
                      <div className="p-4 bg-white space-y-4">
                        {Object.values(location.vendors || {}).map(vendor => (
                          <div key={vendor.name} className="border-l-4 border-gray-300 pl-4 py-2">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-md font-semibold text-gray-800">
                                🏢 {vendor.name}
                                {vendor.name === 'Unassigned' && (
                                  <span className="text-sm text-red-500 ml-2">(No vendor assigned)</span>
                                )}
                              </h4>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                  ${(vendor.totalPOAmount || 0).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {vendor.projects.length} projects
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium text-gray-600 mb-1">Job Types</div>
                                <div className="space-y-1">
                                  {vendor.quotedJobs.length > 0 && (
                                    <div className="text-blue-600">
                                      📋 {vendor.quotedJobs.length} Quoted Jobs
                                    </div>
                                  )}
                                  {vendor.assignedJobs.length > 0 && (
                                    <div className="text-green-600">
                                      ✅ {vendor.assignedJobs.length} Assigned Jobs
                                    </div>
                                  )}
                                  {vendor.estimatedPOAmount > 0 && (
                                    <div className="text-purple-600">
                                      💰 ${vendor.estimatedPOAmount.toLocaleString()} Estimated PO
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="font-medium text-gray-600 mb-1">Status Summary</div>
                                <div className="space-y-1 max-h-20 overflow-y-auto">
                                  {Object.entries(vendor.statusBreakdown).map(([status, count]) => (
                                    <div key={status} className="flex justify-between">
                                      <span className="truncate">{status}:</span>
                                      <span className="font-medium">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {vendor.projects.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <details className="cursor-pointer">
                                  <summary className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                    View Project Details ({vendor.projects.length} projects)
                                  </summary>
                                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                                    {vendor.projects.map(project => (
                                      <div key={project.id} className="text-xs bg-gray-50 p-2 rounded border">
                                        <div className="font-medium">{project.jobNumber || 'N/A'} - {project.title}</div>
                                        <div className="text-gray-600">
                                          Status: {project.status} |
                                          {project.poAmount > 0 && ` PO: $${project.poAmount.toLocaleString()} |`}
                                          Age: {project.daysSinceCreated} days
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(reportData.data).filter(location => !selectedLocation || location.name === selectedLocation).map(location => (
                    <div key={location.name} className="border rounded-lg overflow-hidden">
                      <div
                        className="p-4 text-white font-semibold"
                        style={{ backgroundColor: location.color }}
                      >
                        {location.name} ({location.abbreviation})
                        <span className="float-right">
                          {location.totalProjects} projects | ${(location.totalRevenue || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-white">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-600">
                              <th className="pb-2">Status</th>
                              <th className="pb-2">Projects</th>
                              <th className="pb-2">Revenue</th>
                              <th className="pb-2">Avg Age (days)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(location.statuses || {}).map(([statusName, statusData]) => {
                              if (statusData.count === 0) return null;
                              return (
                                <tr key={statusName} className="border-t">
                                  <td className="py-2">{statusName}</td>
                                  <td className="py-2">{statusData.count}</td>
                                  <td className="py-2">${(statusData.revenue || 0).toLocaleString()}</td>
                                  <td className="py-2">{statusData.avgAge}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select filters and click "Generate Report" to view data</p>
            </div>
          )}
        </div>

        {/* Export Actions */}
        {reportData && (
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export JSON
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileDown className="w-4 h-4 inline mr-2" />
              Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsModal;