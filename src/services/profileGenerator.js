import LabPackTool from './labPackTool.js';
import { comprehensiveChemicalDatabase } from '../data/chemicals/simple_chemical_database.js';

class ProfileGenerator {
  constructor() {
    this.chemicalDatabase = comprehensiveChemicalDatabase;
    this.stateRegulations = this.loadStateRegulations();
    this.profiles = [];
  }

  async generateWasteProfile(labPackData, options = {}) {
    try {
      const packingList = labPackData.generatePackingList ? 
                         labPackData.generatePackingList() : 
                         labPackData;
      
      const profile = {
        id: this.generateId(),
        projectName: packingList.project?.name || 'Untitled Project',
        generated: new Date().toISOString(),
        generator: options.generator || {},
        containers: this.processContainers(packingList.containers),
        wasteProfile: this.generateComprehensiveWasteProfile(packingList),
        dotProfile: this.generateDOTProfile(packingList),
        stateProfile: this.generateStateProfile(packingList, options.state),
        manifestProfile: this.generateManifestProfile(packingList),
        landDisposalRestrictions: this.evaluateLDR(packingList),
        treatmentRequirements: this.evaluateTreatmentRequirements(packingList),
        disposalRecommendations: this.generateDisposalRecommendations(packingList),
        complianceChecklist: this.generateComplianceChecklist(packingList),
        estimatedCosts: this.estimateDisposalCosts(packingList),
        metadata: {
          totalContainers: packingList.totalContainers,
          totalVolume: packingList.totalVolume,
          totalWeight: this.estimateTotalWeight(packingList),
          hazardClasses: [...new Set(packingList.containers.flatMap(c => Array.from(c.dotClasses || [])))],
          wasteCodeCount: packingList.wasteCodes?.length || 0
        }
      };

      this.profiles.push(profile);
      return {
        success: true,
        profile
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  processContainers(containers) {
    return containers.map(container => ({
      id: container.id,
      type: container.type,
      volume: container.totalVolume,
      fillPercentage: container.fillPercentage,
      vermiculiteVolume: container.vermiculite,
      wasteCodes: container.wasteCodes,
      dotClasses: container.dotClasses,
      materials: container.contents.map(material => ({
        name: material.name,
        quantity: material.quantity,
        unit: material.unit,
        wasteCodes: material.wasteCodes,
        hazardClass: material.analysis?.hazardClass,
        physicalState: material.analysis?.physicalState?.state,
        flashPoint: material.analysis?.flashPoint,
        pH: material.analysis?.pH,
        treatmentCodes: this.determineTreatmentCodes(material.wasteCodes),
        ldRestricted: this.isLDRestricted(material.wasteCodes)
      })),
      packingGroup: this.determineContainerPackingGroup(container),
      shippingDescription: this.generateContainerShippingDescription(container)
    }));
  }

  generateComprehensiveWasteProfile(packingList) {
    const profile = {
      federalCodes: packingList.wasteProfile?.federalCodes || [],
      characteristics: packingList.wasteProfile?.characteristics || [],
      listed: packingList.wasteProfile?.listed || [],
      mixedWaste: this.evaluateMixedWaste(packingList),
      ignitability: this.evaluateIgnitability(packingList),
      corrosivity: this.evaluateCorrosivity(packingList),
      reactivity: this.evaluateReactivity(packingList),
      toxicity: this.evaluateToxicity(packingList),
      acuteHazard: this.evaluateAcuteHazard(packingList),
      environmentalHazard: this.evaluateEnvironmentalHazard(packingList)
    };

    profile.riskLevel = this.assessRiskLevel(profile);
    profile.priorityCodes = this.identifyPriorityCodes(profile.federalCodes);
    
    return profile;
  }

  generateDOTProfile(packingList) {
    const dotShipping = packingList.dotShipping || [];
    
    return {
      primaryHazardClass: this.determinePrimaryHazardClass(dotShipping),
      subsidiaryHazards: this.determineSubsidiaryHazards(dotShipping),
      packingGroups: this.consolidatePackingGroups(dotShipping),
      specialProvisions: this.determineSpecialProvisions(packingList),
      emergencyResponse: this.generateEmergencyResponse(dotShipping),
      transportRestrictions: this.identifyTransportRestrictions(dotShipping),
      labeling: this.generateLabelingRequirements(dotShipping),
      placarding: this.generatePlacardingRequirements(dotShipping)
    };
  }

  generateStateProfile(packingList, state = 'CA') {
    const stateRegs = this.stateRegulations[state] || {};
    
    return {
      state: state,
      stateCodes: this.generateStateCodes(packingList, state),
      additionalRequirements: stateRegs.additionalRequirements || [],
      notifications: this.generateStateNotifications(packingList, state),
      permits: this.identifyRequiredPermits(packingList, state),
      reportingRequirements: stateRegs.reportingRequirements || [],
      fees: this.calculateStateFees(packingList, state),
      restrictions: stateRegs.restrictions || []
    };
  }

  generateManifestProfile(packingList) {
    return {
      wasteDescription: this.generateWasteDescription(packingList),
      epaWasteNumbers: this.consolidateWasteNumbers(packingList),
      unitOfMeasure: 'G', // Gallons
      totalQuantity: packingList.totalVolume,
      density: this.estimateAverageDensity(packingList),
      physicalState: this.determineManifestPhysicalState(packingList),
      hazardousWaste: true,
      pcrId: this.generatePCRId(packingList),
      manifestTrackingNumber: this.generateManifestNumber(),
      generatorSite: 'To be completed by generator',
      transporterInfo: 'To be completed by transporter',
      tsdFacility: 'To be determined based on waste codes'
    };
  }

  evaluateLDR(packingList) {
    const ldrWastes = [];
    const treatmentStandards = {};
    
    packingList.containers.forEach(container => {
      container.contents?.forEach(material => {
        material.wasteCodes?.forEach(code => {
          if (this.isLDRestricted(code)) {
            ldrWastes.push({
              code,
              material: material.name,
              container: container.id,
              treatmentRequired: this.getTreatmentStandard(code)
            });
            
            treatmentStandards[code] = this.getTreatmentStandard(code);
          }
        });
      });
    });
    
    return {
      hasLDRWastes: ldrWastes.length > 0,
      ldrWastes,
      treatmentStandards,
      alternativeTreatmentStandards: this.getAlternativeTreatmentStandards(ldrWastes),
      dilutionProhibition: true,
      storageProhibition: this.evaluateStorageProhibition(ldrWastes),
      notificationRequired: ldrWastes.length > 0
    };
  }

  evaluateTreatmentRequirements(packingList) {
    const requirements = {
      required: false,
      methods: [],
      facilities: [],
      timeframe: null,
      costs: {}
    };

    const wasteCodes = packingList.wasteCodes || [];
    
    wasteCodes.forEach(code => {
      if (code.startsWith('P') || code.startsWith('U')) {
        requirements.required = true;
        requirements.methods.push('High Temperature Incineration');
        requirements.methods.push('Chemical Destruction');
      } else if (code === 'D001') {
        requirements.methods.push('Fuel Blending');
        requirements.methods.push('Incineration');
      } else if (code === 'D002') {
        requirements.methods.push('Neutralization');
        requirements.methods.push('Stabilization');
      }
    });

    requirements.methods = [...new Set(requirements.methods)];
    
    if (requirements.required) {
      requirements.facilities = this.identifyTreatmentFacilities(requirements.methods);
      requirements.timeframe = this.estimateTreatmentTimeframe(wasteCodes);
      requirements.costs = this.estimateTreatmentCosts(packingList, requirements.methods);
    }

    return requirements;
  }

  generateDisposalRecommendations(packingList) {
    const recommendations = {
      primaryOption: null,
      alternatives: [],
      costEffective: null,
      fastest: null,
      environmental: null,
      considerations: []
    };

    const wasteCodes = packingList.wasteCodes || [];
    const volume = packingList.totalVolume || 0;
    const hazardLevel = this.assessRiskLevel(packingList.wasteProfile);

    // Primary recommendation based on waste characteristics
    if (wasteCodes.some(code => code.startsWith('P'))) {
      recommendations.primaryOption = {
        method: 'High Temperature Incineration',
        facility: 'TSDF with P-code capability',
        estimatedCost: volume * 15, // $15/gallon for P-listed
        timeframe: '30-45 days',
        reasoning: 'P-listed wastes require high temperature incineration'
      };
    } else if (wasteCodes.includes('D001')) {
      recommendations.primaryOption = {
        method: 'Fuel Blending',
        facility: 'Cement Kiln or Energy Recovery',
        estimatedCost: volume * 3, // $3/gallon for fuel blending
        timeframe: '14-21 days',
        reasoning: 'Ignitable waste suitable for energy recovery'
      };
    } else {
      recommendations.primaryOption = {
        method: 'Stabilization/Landfill',
        facility: 'Secure Landfill',
        estimatedCost: volume * 8, // $8/gallon for landfill
        timeframe: '21-30 days',
        reasoning: 'Standard treatment and disposal'
      };
    }

    // Alternative options
    recommendations.alternatives = this.generateAlternativeOptions(packingList);
    
    // Best options for different criteria
    recommendations.costEffective = this.findCostEffectiveOption(recommendations.alternatives);
    recommendations.fastest = this.findFastestOption(recommendations.alternatives);
    recommendations.environmental = this.findEnvironmentalOption(recommendations.alternatives);

    return recommendations;
  }

  generateComplianceChecklist(packingList) {
    return {
      federal: {
        rcraGenerator: true,
        wasteClassification: true,
        manifestRequired: packingList.totalVolume > 0,
        ldrNotification: this.evaluateLDR(packingList).hasLDRWastes,
        biannualReporting: true,
        dotClassification: true,
        dotLabeling: true,
        dotPlacarding: packingList.totalVolume > 1000
      },
      state: {
        stateWasteClassification: true,
        additionalNotifications: false,
        statePermits: this.identifyRequiredPermits(packingList, 'CA').length > 0,
        stateFees: true
      },
      local: {
        localPermits: false,
        firePermit: packingList.wasteCodes?.includes('D001') || false,
        airPermit: false
      },
      transportation: {
        dotRegistration: true,
        driverTraining: true,
        vehicleInspection: true,
        emergencyResponse: true
      }
    };
  }

  estimateDisposalCosts(packingList) {
    const volume = packingList.totalVolume || 0;
    const wasteCodes = packingList.wasteCodes || [];
    
    let baseCost = 0;
    let multiplier = 1;

    // Base cost calculation
    if (wasteCodes.some(code => code.startsWith('P'))) {
      baseCost = volume * 15; // P-listed: $15/gallon
    } else if (wasteCodes.some(code => code.startsWith('U'))) {
      baseCost = volume * 12; // U-listed: $12/gallon
    } else if (wasteCodes.includes('D001')) {
      baseCost = volume * 5; // Ignitable: $5/gallon
    } else if (wasteCodes.includes('D002')) {
      baseCost = volume * 8; // Corrosive: $8/gallon
    } else {
      baseCost = volume * 6; // Other: $6/gallon
    }

    // Volume multipliers
    if (volume < 10) multiplier *= 1.5; // Small quantity surcharge
    else if (volume > 500) multiplier *= 0.8; // Volume discount

    // Complexity multipliers
    if (wasteCodes.length > 5) multiplier *= 1.2; // Multi-code complexity
    if (this.evaluateLDR(packingList).hasLDRWastes) multiplier *= 1.3; // LDR complexity

    return {
      disposal: Math.round(baseCost * multiplier),
      transportation: Math.round(volume * 2), // $2/gallon transport
      labTesting: Math.round(packingList.totalContainers * 500), // $500/container testing
      documentation: 500, // Fixed documentation fee
      total: Math.round((baseCost * multiplier) + (volume * 2) + (packingList.totalContainers * 500) + 500),
      breakdown: {
        baseCost: Math.round(baseCost),
        volumeMultiplier: multiplier.toFixed(2),
        complexityFactors: this.getComplexityFactors(packingList)
      }
    };
  }

  // Utility methods

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  loadStateRegulations() {
    return {
      'CA': {
        additionalRequirements: ['DTSC notification', 'Cal/EPA reporting'],
        reportingRequirements: ['Annual hazardous waste report'],
        restrictions: ['No landfill disposal of ignitable liquids'],
        baseFee: 500
      },
      'TX': {
        additionalRequirements: ['TCEQ notification'],
        reportingRequirements: ['Annual waste summary'],
        restrictions: ['Enhanced treatment requirements'],
        baseFee: 300
      },
      'NY': {
        additionalRequirements: ['DEC approval'],
        reportingRequirements: ['Quarterly reporting'],
        restrictions: ['Strict transport requirements'],
        baseFee: 800
      }
    };
  }

  isLDRestricted(wasteCode) {
    const ldrCodes = ['D001', 'D002', 'D003', 'D004', 'D005', 'D006', 'D007', 'D008', 'D009', 'D010', 'D011'];
    return ldrCodes.includes(wasteCode) || wasteCode.startsWith('F') || wasteCode.startsWith('K') || 
           wasteCode.startsWith('P') || wasteCode.startsWith('U');
  }

  getTreatmentStandard(wasteCode) {
    const standards = {
      'D001': 'Deactivation or fuel substitution',
      'D002': 'Neutralization',
      'D003': 'Deactivation',
      'D004': 'Stabilization',
      'D005': 'Stabilization',
      'D006': 'Stabilization',
      'D007': 'Stabilization',
      'D008': 'Stabilization',
      'D009': 'Amalgamation',
      'D010': 'Stabilization',
      'D011': 'Stabilization'
    };

    if (wasteCode.startsWith('P') || wasteCode.startsWith('U')) {
      return 'Incineration';
    }

    return standards[wasteCode] || 'Case-by-case determination';
  }

  assessRiskLevel(wasteProfile) {
    let score = 0;
    
    if (wasteProfile.federalCodes?.some(code => code.startsWith('P'))) score += 10;
    if (wasteProfile.federalCodes?.some(code => code.startsWith('U'))) score += 7;
    if (wasteProfile.characteristics?.includes('Ignitable')) score += 5;
    if (wasteProfile.characteristics?.includes('Corrosive')) score += 4;
    if (wasteProfile.characteristics?.includes('Reactive')) score += 6;
    if (wasteProfile.characteristics?.includes('Toxic')) score += 5;

    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  }

  estimateTotalWeight(packingList) {
    // Estimate weight based on volume and average density
    const averageDensity = 1.2; // kg/L average for mixed waste
    const volumeInLiters = packingList.totalVolume * 3.78541;
    return Math.round(volumeInLiters * averageDensity);
  }

  generateWasteDescription(packingList) {
    const characteristics = packingList.wasteProfile?.characteristics || [];
    const listed = packingList.wasteProfile?.listed || [];
    
    let description = 'Laboratory pack containing ';
    
    if (listed.length > 0) {
      description += listed.join(', ') + ' and ';
    }
    
    if (characteristics.length > 0) {
      description += characteristics.join(', ').toLowerCase() + ' ';
    }
    
    description += 'waste chemicals in compatible containers with vermiculite absorbent.';
    
    return description;
  }

  saveProfile(profile) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const profiles = JSON.parse(window.localStorage.getItem('waste_profiles') || '[]');
      profiles.push(profile);
      window.localStorage.setItem('waste_profiles', JSON.stringify(profiles));
    }
    
    return profile;
  }

  loadProfiles() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return JSON.parse(window.localStorage.getItem('waste_profiles') || '[]');
    }
    
    return [];
  }
}

export default ProfileGenerator;