import ProfileGenerator from './profileGenerator.js';

class WasteRoutingTool {
  constructor() {
    this.facilityDatabase = this.loadFacilityDatabase();
    this.pricingMatrix = this.loadPricingMatrix();
    this.profileGenerator = new ProfileGenerator();
    this.routingHistory = [];
  }

  async optimizeWasteRouting(wasteProfile, preferences = {}) {
    try {
      const profile = wasteProfile.profile || wasteProfile;
      
      const routingOptions = await this.generateRoutingOptions(profile, preferences);
      const optimizedRoute = this.selectOptimalRoute(routingOptions, preferences);
      const costAnalysis = this.generateCostAnalysis(optimizedRoute, profile);
      
      const routing = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        wasteProfile: profile,
        preferences,
        recommendedRoute: optimizedRoute,
        alternativeRoutes: routingOptions.slice(0, 5),
        costAnalysis,
        savings: this.calculateSavings(routingOptions),
        timeline: this.generateTimeline(optimizedRoute),
        complianceChecklist: this.generateComplianceChecklist(optimizedRoute),
        riskAssessment: this.assessRoutingRisk(optimizedRoute),
        optimizationFactors: this.getOptimizationFactors(preferences)
      };

      this.routingHistory.push(routing);
      return {
        success: true,
        routing
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateRoutingOptions(profile, preferences) {
    const options = [];
    
    const eligibleFacilities = this.findEligibleFacilities(profile);
    const wasteCodes = profile.wasteProfile?.federalCodes || [];
    const volume = profile.metadata?.totalVolume || 0;
    
    for (const facility of eligibleFacilities) {
      if (this.canAcceptWaste(facility, wasteCodes)) {
        const option = {
          facility,
          treatmentMethod: this.selectTreatmentMethod(facility, wasteCodes),
          estimatedCost: this.calculateFacilityCost(facility, profile),
          transportCost: this.calculateTransportCost(facility, preferences.origin),
          totalCost: 0,
          timeframe: this.estimateTimeframe(facility, volume),
          compliance: this.assessFacilityCompliance(facility),
          environmental: this.assessEnvironmentalImpact(facility),
          reliability: this.assessFacilityReliability(facility),
          score: 0
        };
        
        option.totalCost = option.estimatedCost + option.transportCost;
        option.score = this.calculateRouteScore(option, preferences);
        
        options.push(option);
      }
    }
    
    return options.sort((a, b) => b.score - a.score);
  }

  findEligibleFacilities(profile) {
    const wasteCodes = profile.wasteProfile?.federalCodes || [];
    const volume = profile.metadata?.totalVolume || 0;
    const hazardClasses = profile.metadata?.hazardClasses || [];
    
    return this.facilityDatabase.filter(facility => {
      // Check waste code compatibility
      const hasCompatibleCodes = wasteCodes.every(code => 
        facility.acceptedWasteCodes.includes(code) ||
        facility.acceptedWasteCodes.includes(code.substring(0, 4)) ||
        facility.acceptedWasteCodes.includes('ALL')
      );
      
      // Check volume capacity
      const hasCapacity = volume <= facility.maxVolume;
      
      // Check hazard class compatibility
      const hasHazardCapability = hazardClasses.every(hClass =>
        facility.hazardCapabilities.includes(hClass) ||
        facility.hazardCapabilities.includes('ALL')
      );
      
      // Check facility status
      const isOperational = facility.status === 'active';
      
      return hasCompatibleCodes && hasCapacity && hasHazardCapability && isOperational;
    });
  }

  canAcceptWaste(facility, wasteCodes) {
    if (facility.acceptedWasteCodes.includes('ALL')) return true;
    
    return wasteCodes.every(code => {
      return facility.acceptedWasteCodes.some(acceptedCode => {
        if (acceptedCode === code) return true;
        if (acceptedCode.endsWith('*') && code.startsWith(acceptedCode.slice(0, -1))) return true;
        return false;
      });
    });
  }

  selectTreatmentMethod(facility, wasteCodes) {
    const methods = facility.treatmentMethods;
    
    // Priority based on waste codes
    if (wasteCodes.some(code => code.startsWith('P'))) {
      if (methods.includes('incineration')) return 'incineration';
      if (methods.includes('chemical_destruction')) return 'chemical_destruction';
    }
    
    if (wasteCodes.includes('D001')) {
      if (methods.includes('fuel_blending')) return 'fuel_blending';
      if (methods.includes('incineration')) return 'incineration';
    }
    
    if (wasteCodes.includes('D002')) {
      if (methods.includes('neutralization')) return 'neutralization';
      if (methods.includes('stabilization')) return 'stabilization';
    }
    
    if (wasteCodes.some(code => code.startsWith('D') && code !== 'D001' && code !== 'D002' && code !== 'D003')) {
      if (methods.includes('stabilization')) return 'stabilization';
      if (methods.includes('secure_landfill')) return 'secure_landfill';
    }
    
    return methods[0] || 'stabilization';
  }

  calculateFacilityCost(facility, profile) {
    const volume = profile.metadata?.totalVolume || 0;
    const wasteCodes = profile.wasteProfile?.federalCodes || [];
    
    let baseCost = facility.basePricing?.perGallon || 10;
    let multiplier = 1;
    
    // Waste code multipliers
    if (wasteCodes.some(code => code.startsWith('P'))) {
      multiplier *= facility.pCodeMultiplier || 2.5;
    } else if (wasteCodes.some(code => code.startsWith('U'))) {
      multiplier *= facility.uCodeMultiplier || 2.0;
    }
    
    if (wasteCodes.includes('D001')) {
      multiplier *= facility.ignitableMultiplier || 1.5;
    }
    
    if (wasteCodes.includes('D002')) {
      multiplier *= facility.corrosiveMultiplier || 1.3;
    }
    
    // Volume discounts
    if (volume > 500) multiplier *= 0.85;
    else if (volume > 100) multiplier *= 0.9;
    else if (volume < 10) multiplier *= 1.2;
    
    // Facility premium/discount
    multiplier *= facility.qualityMultiplier || 1.0;
    
    const cost = volume * baseCost * multiplier;
    
    // Add fixed costs
    const fixedCosts = (facility.profileFee || 500) + (facility.manifestFee || 200);
    
    return Math.round(cost + fixedCosts);
  }

  calculateTransportCost(facility, origin) {
    if (!origin || !facility.location) return 1000; // Default transport cost
    
    const distance = this.calculateDistance(origin, facility.location);
    const baseCostPerMile = 3.50; // $3.50 per mile
    const minimumCost = 500; // $500 minimum
    
    const transportCost = Math.max(distance * baseCostPerMile, minimumCost);
    
    // Add fuel surcharge
    const fuelSurcharge = transportCost * 0.15;
    
    // Add hazmat surcharge
    const hazmatSurcharge = 200;
    
    return Math.round(transportCost + fuelSurcharge + hazmatSurcharge);
  }

  calculateDistance(origin, destination) {
    // Simplified distance calculation (use real geocoding API in production)
    const distances = {
      'CA-TX': 1200,
      'CA-NV': 300,
      'CA-AZ': 400,
      'TX-OK': 200,
      'TX-LA': 300,
      'NY-NJ': 100,
      'NY-PA': 200
    };
    
    const key = `${origin}-${destination}`;
    return distances[key] || distances[`${destination}-${origin}`] || 800; // Default 800 miles
  }

  estimateTimeframe(facility, volume) {
    let baseDays = facility.averageProcessingTime || 21;
    
    // Volume adjustments
    if (volume > 1000) baseDays += 7;
    else if (volume < 50) baseDays -= 3;
    
    // Facility load factor
    baseDays *= facility.currentLoadFactor || 1.0;
    
    return {
      processing: Math.max(baseDays, 7),
      transportation: 3,
      total: Math.max(baseDays + 3, 10)
    };
  }

  calculateRouteScore(option, preferences) {
    let score = 0;
    
    // Cost weight (0-40 points)
    const costWeight = preferences.costWeight || 0.4;
    const maxCost = 50000; // Normalize against $50k max
    const costScore = Math.max(0, 40 - (option.totalCost / maxCost) * 40);
    score += costScore * costWeight;
    
    // Speed weight (0-25 points)
    const speedWeight = preferences.speedWeight || 0.25;
    const maxDays = 60; // Normalize against 60 days max
    const speedScore = Math.max(0, 25 - (option.timeframe.total / maxDays) * 25);
    score += speedScore * speedWeight;
    
    // Compliance weight (0-20 points)
    const complianceWeight = preferences.complianceWeight || 0.2;
    score += option.compliance * 20 * complianceWeight;
    
    // Environmental weight (0-10 points)
    const environmentalWeight = preferences.environmentalWeight || 0.1;
    score += option.environmental * 10 * environmentalWeight;
    
    // Reliability weight (0-5 points)
    const reliabilityWeight = preferences.reliabilityWeight || 0.05;
    score += option.reliability * 5 * reliabilityWeight;
    
    return Math.round(score * 100) / 100;
  }

  selectOptimalRoute(routingOptions, preferences) {
    if (routingOptions.length === 0) {
      throw new Error('No eligible facilities found for this waste profile');
    }
    
    // Apply user preferences for optimization
    if (preferences.prioritize === 'cost') {
      return routingOptions.sort((a, b) => a.totalCost - b.totalCost)[0];
    } else if (preferences.prioritize === 'speed') {
      return routingOptions.sort((a, b) => a.timeframe.total - b.timeframe.total)[0];
    } else if (preferences.prioritize === 'environmental') {
      return routingOptions.sort((a, b) => b.environmental - a.environmental)[0];
    } else {
      // Return highest scoring option (balanced approach)
      return routingOptions[0];
    }
  }

  generateCostAnalysis(route, profile) {
    const breakdown = {
      disposal: route.estimatedCost,
      transportation: route.transportCost,
      total: route.totalCost
    };
    
    const volume = profile.metadata?.totalVolume || 1;
    
    return {
      breakdown,
      costPerGallon: Math.round(route.totalCost / volume * 100) / 100,
      costPerContainer: Math.round(route.totalCost / (profile.metadata?.totalContainers || 1)),
      savingsAnalysis: this.calculateSavingsBreakdown(route),
      paymentTerms: route.facility.paymentTerms || 'Net 30',
      additionalFees: this.identifyAdditionalFees(route)
    };
  }

  calculateSavings(routingOptions) {
    if (routingOptions.length < 2) return null;
    
    const best = routingOptions[0];
    const worst = routingOptions[routingOptions.length - 1];
    
    const costSavings = worst.totalCost - best.totalCost;
    const timeSavings = worst.timeframe.total - best.timeframe.total;
    
    return {
      costSavings,
      costSavingsPercent: Math.round((costSavings / worst.totalCost) * 100),
      timeSavings,
      timeSavingsPercent: Math.round((timeSavings / worst.timeframe.total) * 100),
      comparisonCount: routingOptions.length
    };
  }

  generateTimeline(route) {
    const today = new Date();
    const timeline = [];
    
    // Setup phase
    timeline.push({
      phase: 'Setup',
      description: 'Profile approval and documentation',
      startDate: today,
      duration: 3,
      endDate: this.addDays(today, 3)
    });
    
    // Transportation phase
    const transportStart = this.addDays(today, 3);
    timeline.push({
      phase: 'Transportation',
      description: 'Pickup and transport to facility',
      startDate: transportStart,
      duration: route.timeframe.transportation,
      endDate: this.addDays(transportStart, route.timeframe.transportation)
    });
    
    // Processing phase
    const processingStart = this.addDays(transportStart, route.timeframe.transportation);
    timeline.push({
      phase: 'Processing',
      description: `${route.treatmentMethod} treatment`,
      startDate: processingStart,
      duration: route.timeframe.processing,
      endDate: this.addDays(processingStart, route.timeframe.processing)
    });
    
    // Completion
    const completionDate = this.addDays(processingStart, route.timeframe.processing);
    timeline.push({
      phase: 'Completion',
      description: 'Certificates and final documentation',
      startDate: completionDate,
      duration: 2,
      endDate: this.addDays(completionDate, 2)
    });
    
    return timeline;
  }

  generateComplianceChecklist(route) {
    return {
      facilityPermits: route.facility.permits || [],
      requiredDocumentation: [
        'Waste profile',
        'Hazardous waste manifest',
        'Treatment certificate',
        'Certificate of destruction (if applicable)'
      ],
      regulatory: {
        epaPermit: route.facility.epaId ? 'Valid' : 'Required',
        statePermit: route.facility.statePermit ? 'Valid' : 'Required',
        dotClassification: 'Required',
        manifestTracking: 'Required'
      },
      timeline: {
        profileSubmission: '5 days before pickup',
        manifestPreparation: '3 days before pickup',
        transporterNotification: '24 hours before pickup'
      }
    };
  }

  assessRoutingRisk(route) {
    let riskScore = 0;
    const risks = [];
    
    // Facility risk factors
    if (route.facility.inspectionScore < 0.8) {
      riskScore += 20;
      risks.push('Facility compliance concerns');
    }
    
    if (route.facility.financialRating < 'B') {
      riskScore += 15;
      risks.push('Facility financial stability');
    }
    
    // Transportation risk
    const distance = this.calculateDistance(route.facility.location, 'CA'); // Assume CA origin
    if (distance > 1000) {
      riskScore += 10;
      risks.push('Long-distance transportation');
    }
    
    // Treatment method risk
    const highRiskMethods = ['incineration', 'chemical_destruction'];
    if (highRiskMethods.includes(route.treatmentMethod)) {
      riskScore += 5;
      risks.push('Complex treatment method');
    }
    
    // Cost risk
    if (route.totalCost > 30000) {
      riskScore += 5;
      risks.push('High cost exposure');
    }
    
    return {
      score: riskScore,
      level: riskScore > 30 ? 'High' : riskScore > 15 ? 'Medium' : 'Low',
      factors: risks,
      mitigation: this.generateRiskMitigation(risks)
    };
  }

  generateRiskMitigation(risks) {
    const mitigation = [];
    
    if (risks.includes('Facility compliance concerns')) {
      mitigation.push('Request recent inspection reports');
      mitigation.push('Consider facility site visit');
    }
    
    if (risks.includes('Facility financial stability')) {
      mitigation.push('Require payment terms adjustment');
      mitigation.push('Consider insurance requirements');
    }
    
    if (risks.includes('Long-distance transportation')) {
      mitigation.push('Use certified hazmat transporters');
      mitigation.push('Require GPS tracking');
    }
    
    return mitigation;
  }

  loadFacilityDatabase() {
    return [
      {
        id: 'WASTE_MGMT_001',
        name: 'WM Environmental Services',
        location: 'TX',
        status: 'active',
        epaId: 'TXD000838896',
        statePermit: 'TX-HW-001',
        acceptedWasteCodes: ['D001', 'D002', 'D003', 'D004', 'D005', 'D006', 'D007', 'D008', 'D009', 'D010', 'D011', 'U*', 'P*'],
        hazardCapabilities: ['3', '4.1', '4.2', '5.1', '6.1', '8', '9'],
        treatmentMethods: ['incineration', 'fuel_blending', 'stabilization'],
        maxVolume: 10000,
        basePricing: { perGallon: 12 },
        pCodeMultiplier: 2.5,
        uCodeMultiplier: 2.0,
        ignitableMultiplier: 1.5,
        corrosiveMultiplier: 1.3,
        qualityMultiplier: 1.1,
        profileFee: 750,
        manifestFee: 250,
        averageProcessingTime: 21,
        currentLoadFactor: 1.0,
        inspectionScore: 0.95,
        financialRating: 'A',
        paymentTerms: 'Net 30'
      },
      {
        id: 'CLEAN_HARBORS_001',
        name: 'Clean Harbors Environmental Services',
        location: 'CA',
        status: 'active',
        epaId: 'CAD000629972',
        statePermit: 'CA-HW-001',
        acceptedWasteCodes: ['ALL'],
        hazardCapabilities: ['ALL'],
        treatmentMethods: ['incineration', 'chemical_destruction', 'neutralization', 'stabilization', 'fuel_blending'],
        maxVolume: 25000,
        basePricing: { perGallon: 15 },
        pCodeMultiplier: 3.0,
        uCodeMultiplier: 2.2,
        ignitableMultiplier: 1.4,
        corrosiveMultiplier: 1.2,
        qualityMultiplier: 1.3,
        profileFee: 1000,
        manifestFee: 300,
        averageProcessingTime: 18,
        currentLoadFactor: 0.9,
        inspectionScore: 0.98,
        financialRating: 'A+',
        paymentTerms: 'Net 30'
      },
      {
        id: 'HERITAGE_001',
        name: 'Heritage Environmental Services',
        location: 'IN',
        status: 'active',
        epaId: 'IND000629898',
        statePermit: 'IN-HW-001',
        acceptedWasteCodes: ['D*', 'U*'],
        hazardCapabilities: ['3', '6.1', '8', '9'],
        treatmentMethods: ['stabilization', 'secure_landfill', 'neutralization'],
        maxVolume: 15000,
        basePricing: { perGallon: 8 },
        pCodeMultiplier: 0, // Doesn't accept P-codes
        uCodeMultiplier: 1.8,
        ignitableMultiplier: 1.6,
        corrosiveMultiplier: 1.1,
        qualityMultiplier: 0.9,
        profileFee: 500,
        manifestFee: 150,
        averageProcessingTime: 28,
        currentLoadFactor: 1.1,
        inspectionScore: 0.87,
        financialRating: 'B+',
        paymentTerms: 'Net 45'
      },
      {
        id: 'VEOLIA_001',
        name: 'Veolia Environmental Services',
        location: 'OH',
        status: 'active',
        epaId: 'OHD000629811',
        statePermit: 'OH-HW-001',
        acceptedWasteCodes: ['D001', 'D002', 'U*'],
        hazardCapabilities: ['3', '8'],
        treatmentMethods: ['fuel_blending', 'neutralization', 'recovery'],
        maxVolume: 8000,
        basePricing: { perGallon: 6 },
        pCodeMultiplier: 0, // Doesn't accept P-codes
        uCodeMultiplier: 1.5,
        ignitableMultiplier: 1.2,
        corrosiveMultiplier: 1.0,
        qualityMultiplier: 0.8,
        profileFee: 400,
        manifestFee: 100,
        averageProcessingTime: 35,
        currentLoadFactor: 0.8,
        inspectionScore: 0.92,
        financialRating: 'A-',
        paymentTerms: 'Net 30'
      }
    ];
  }

  loadPricingMatrix() {
    return {
      base: 10, // $10/gallon base
      wasteCodes: {
        P: 2.5, // P-codes: 2.5x multiplier
        U: 2.0, // U-codes: 2.0x multiplier
        D001: 1.5, // Ignitable: 1.5x
        D002: 1.3, // Corrosive: 1.3x
        D003: 1.8, // Reactive: 1.8x
        D004: 1.4, // Arsenic: 1.4x
        D005: 1.2, // Barium: 1.2x
        D006: 1.6, // Cadmium: 1.6x
        D007: 1.5, // Chromium: 1.5x
        D008: 1.7, // Lead: 1.7x
        D009: 2.2, // Mercury: 2.2x
        D010: 1.3, // Selenium: 1.3x
        D011: 1.4  // Silver: 1.4x
      },
      volume: {
        small: 1.2,    // <10 gallons: 20% surcharge
        medium: 1.0,   // 10-500 gallons: no adjustment
        large: 0.85,   // >500 gallons: 15% discount
        bulk: 0.7      // >2000 gallons: 30% discount
      },
      transport: {
        perMile: 3.50,
        minimum: 500,
        fuelSurcharge: 0.15,
        hazmatSurcharge: 200
      }
    };
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getOptimizationFactors(preferences) {
    return {
      costWeight: preferences.costWeight || 0.4,
      speedWeight: preferences.speedWeight || 0.25,
      complianceWeight: preferences.complianceWeight || 0.2,
      environmentalWeight: preferences.environmentalWeight || 0.1,
      reliabilityWeight: preferences.reliabilityWeight || 0.05,
      prioritization: preferences.prioritize || 'balanced'
    };
  }

  // Additional utility methods would go here...
  assessFacilityCompliance(facility) {
    return facility.inspectionScore || 0.85;
  }

  assessEnvironmentalImpact(facility) {
    // Environmental scoring based on treatment methods
    const scores = {
      recovery: 0.9,
      fuel_blending: 0.8,
      neutralization: 0.7,
      stabilization: 0.6,
      incineration: 0.5,
      secure_landfill: 0.4,
      chemical_destruction: 0.6
    };
    
    const methods = facility.treatmentMethods;
    const avgScore = methods.reduce((sum, method) => sum + (scores[method] || 0.5), 0) / methods.length;
    
    return Math.round(avgScore * 100) / 100;
  }

  assessFacilityReliability(facility) {
    let score = 0.5; // Base reliability
    
    if (facility.financialRating === 'A+') score += 0.3;
    else if (facility.financialRating === 'A') score += 0.25;
    else if (facility.financialRating === 'A-') score += 0.2;
    else if (facility.financialRating.startsWith('B')) score += 0.1;
    
    score += (facility.inspectionScore - 0.8) * 0.5;
    
    return Math.min(Math.max(score, 0), 1);
  }

  calculateSavingsBreakdown(route) {
    return {
      volumeDiscount: route.facility.basePricing.perGallon * 0.15,
      negotiatedRates: 0,
      efficiencyGains: route.facility.basePricing.perGallon * 0.05,
      total: route.facility.basePricing.perGallon * 0.20
    };
  }

  identifyAdditionalFees(route) {
    return [
      { name: 'Profile Review', amount: route.facility.profileFee },
      { name: 'Manifest Processing', amount: route.facility.manifestFee },
      { name: 'Lab Analysis', amount: 500, optional: true },
      { name: 'Rush Processing', amount: 1000, optional: true }
    ];
  }
}

export default WasteRoutingTool;