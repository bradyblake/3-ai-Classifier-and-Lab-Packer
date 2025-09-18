import EnhancedSDSAnalyzer from './enhancedSDSAnalyzer.js';
import { comprehensiveChemicalDatabase } from '../data/chemicals/simple_chemical_database.js';

class LabPackTool {
  constructor() {
    this.analyzer = new EnhancedSDSAnalyzer();
    this.chemicalDatabase = comprehensiveChemicalDatabase;
    
    this.containers = [];
    this.currentProject = null;
    
    this.segregationMatrix = {
      'Acid': ['Base', 'Reactive', 'Cyanide', 'Sulfide'],
      'Base': ['Acid', 'Metal'],
      'Oxidizer': ['Reducer', 'Organic', 'Flammable', 'Combustible'],
      'Reducer': ['Oxidizer', 'Acid'],
      'Organic': ['Oxidizer', 'Strong Acid'],
      'Flammable': ['Oxidizer'],
      'Water Reactive': ['Aqueous', 'Water', 'Alcohol'],
      'Cyanide': ['Acid'],
      'Sulfide': ['Acid'],
      'Peroxide': ['Metal', 'Reducer']
    };
    
    this.containerTypes = {
      'poly_drum_55': {
        name: '55 Gallon Poly Drum',
        volume: 55,
        units: 'gallons',
        maxFill: 44,
        material: 'HDPE',
        suitable: ['liquid', 'solid', 'semiSolid'],
        incompatible: []
      },
      'poly_drum_30': {
        name: '30 Gallon Poly Drum',
        volume: 30,
        units: 'gallons',
        maxFill: 24,
        material: 'HDPE',
        suitable: ['liquid', 'solid', 'semiSolid'],
        incompatible: []
      },
      'poly_drum_5': {
        name: '5 Gallon Poly Pail',
        volume: 5,
        units: 'gallons',
        maxFill: 4,
        material: 'HDPE',
        suitable: ['liquid', 'solid', 'semiSolid'],
        incompatible: []
      },
      'fiber_drum_55': {
        name: '55 Gallon Fiber Drum',
        volume: 55,
        units: 'gallons',
        maxFill: 44,
        material: 'Fiber with Poly Liner',
        suitable: ['solid'],
        incompatible: ['liquid']
      },
      'glass_4l': {
        name: '4L Glass Bottle',
        volume: 4,
        units: 'liters',
        maxFill: 3.2,
        material: 'Borosilicate Glass',
        suitable: ['liquid'],
        incompatible: ['HF', 'Strong Base']
      },
      'steel_drum_55': {
        name: '55 Gallon Steel Drum',
        volume: 55,
        units: 'gallons',
        maxFill: 44,
        material: 'Carbon Steel with Epoxy Lining',
        suitable: ['liquid', 'solid'],
        incompatible: ['Strong Acid', 'Strong Base']
      }
    };
  }

  async addMaterial(materialData) {
    const analysis = await this.analyzer.analyzeSDS(materialData);
    
    if (!analysis.success) {
      return {
        success: false,
        error: 'Failed to analyze material',
        details: analysis.error
      };
    }
    
    const material = {
      id: this.generateId(),
      name: materialData.productName || analysis.analysis.productName,
      quantity: materialData.quantity || 0,
      unit: materialData.unit || 'kg',
      containerSize: materialData.containerSize || null,
      analysis: analysis.analysis,
      segregationGroup: this.determineSegregationGroup(analysis.analysis),
      compatibilityGroups: analysis.analysis.segregationGroups || [],
      wasteCodes: analysis.analysis.wasteCodes,
      dotClassification: analysis.analysis.dotClassification,
      physicalState: analysis.analysis.physicalState,
      packingStatus: 'unpacked'
    };
    
    const packingResult = this.findCompatibleContainer(material);
    
    return {
      success: true,
      material,
      packingRecommendation: packingResult
    };
  }

  determineSegregationGroup(analysis) {
    const groups = [];
    
    if (analysis.wasteCodes.includes('D002') || 
        (analysis.composition && analysis.composition.some(c => this.isAcid(c)))) {
      groups.push('Acid');
    }
    
    if (analysis.composition && analysis.composition.some(c => this.isBase(c))) {
      groups.push('Base');
    }
    
    if (analysis.wasteCodes.includes('D001')) {
      groups.push('Flammable');
    }
    
    if (analysis.wasteCodes.includes('D003')) {
      groups.push('Reactive');
    }
    
    if (analysis.composition && analysis.composition.some(c => this.isOxidizer(c))) {
      groups.push('Oxidizer');
    }
    
    if (analysis.composition && analysis.composition.some(c => this.isReducer(c))) {
      groups.push('Reducer');
    }
    
    if (analysis.composition && analysis.composition.some(c => c.name && /cyanide/i.test(c.name))) {
      groups.push('Cyanide');
    }
    
    if (analysis.composition && analysis.composition.some(c => c.name && /sulfide/i.test(c.name))) {
      groups.push('Sulfide');
    }
    
    if (groups.length === 0) {
      if (analysis.composition && analysis.composition.some(c => this.isOrganic(c))) {
        groups.push('Organic');
      } else {
        groups.push('Inorganic');
      }
    }
    
    return groups[0] || 'General';
  }

  isAcid(component) {
    return component.name && /acid|HCl|H2SO4|HNO3|acetic|sulfuric|nitric|hydrochloric/i.test(component.name);
  }

  isBase(component) {
    return component.name && /hydroxide|NaOH|KOH|ammonia|amine|basic/i.test(component.name);
  }

  isOxidizer(component) {
    return component.name && /peroxide|nitrate|chlorate|permanganate|dichromate|chromic/i.test(component.name);
  }

  isReducer(component) {
    return component.name && /sulfite|thiosulfate|hydrazine|formaldehyde/i.test(component.name);
  }

  isOrganic(component) {
    return component.name && /organic|methyl|ethyl|propyl|butyl|benzene|toluene|acetone/i.test(component.name);
  }

  findCompatibleContainer(material) {
    const existingContainers = this.containers.filter(c => 
      c.remainingCapacity >= material.quantity &&
      this.areCompatible(material, c.contents)
    );
    
    if (existingContainers.length > 0) {
      const bestContainer = existingContainers.sort((a, b) => 
        a.remainingCapacity - b.remainingCapacity
      )[0];
      
      return {
        action: 'add_to_existing',
        container: bestContainer,
        message: `Add to existing ${bestContainer.type} (Container #${bestContainer.id})`
      };
    }
    
    const recommendedContainer = this.recommendNewContainer(material);
    
    return {
      action: 'create_new',
      recommendation: recommendedContainer,
      message: `Create new ${recommendedContainer.name} for this material`
    };
  }

  areCompatible(material, containerContents) {
    const materialGroups = [material.segregationGroup, ...material.compatibilityGroups];
    
    for (const content of containerContents) {
      const contentGroups = [content.segregationGroup, ...content.compatibilityGroups];
      
      for (const mGroup of materialGroups) {
        for (const cGroup of contentGroups) {
          if (this.segregationMatrix[mGroup] && 
              this.segregationMatrix[mGroup].includes(cGroup)) {
            return false;
          }
          if (this.segregationMatrix[cGroup] && 
              this.segregationMatrix[cGroup].includes(mGroup)) {
            return false;
          }
        }
      }
      
      const mDOT = material.dotClassification?.hazardClass;
      const cDOT = content.dotClassification?.hazardClass;
      if (mDOT && cDOT && mDOT !== cDOT && 
          !this.areDOTCompatible(mDOT, cDOT)) {
        return false;
      }
    }
    
    return true;
  }

  areDOTCompatible(class1, class2) {
    const incompatiblePairs = [
      ['3', '5.1'],
      ['3', '5.2'],
      ['4.1', '5.1'],
      ['4.2', '5.1'],
      ['4.3', '3'],
      ['4.3', '8'],
      ['5.1', '8'],
      ['6.1', '3'],
      ['8', '5.1']
    ];
    
    for (const [a, b] of incompatiblePairs) {
      if ((class1 === a && class2 === b) || (class1 === b && class2 === a)) {
        return false;
      }
    }
    
    return true;
  }

  recommendNewContainer(material) {
    let recommendedType = null;
    const quantity = this.convertToGallons(material.quantity, material.unit);
    
    if (material.physicalState.isLiquid) {
      if (quantity <= 4) {
        recommendedType = this.containerTypes.poly_drum_5;
      } else if (quantity <= 24) {
        recommendedType = this.containerTypes.poly_drum_30;
      } else {
        recommendedType = this.containerTypes.poly_drum_55;
      }
      
      if (material.segregationGroup === 'Acid') {
        if (quantity <= 1) {
          recommendedType = this.containerTypes.glass_4l;
        }
      }
    } else if (material.physicalState.isSolid) {
      if (quantity <= 4) {
        recommendedType = this.containerTypes.poly_drum_5;
      } else if (quantity <= 24) {
        recommendedType = this.containerTypes.fiber_drum_55;
      } else {
        recommendedType = this.containerTypes.fiber_drum_55;
      }
    } else {
      recommendedType = this.containerTypes.poly_drum_55;
    }
    
    return recommendedType;
  }

  createContainer(type, materials = []) {
    const containerType = typeof type === 'string' ? 
                         this.containerTypes[type] : type;
    
    const container = {
      id: this.generateId(),
      type: containerType.name,
      specs: containerType,
      contents: [],
      totalVolume: 0,
      remainingCapacity: containerType.maxFill,
      vermiculiteVolume: 0,
      wasteCodes: new Set(),
      dotClasses: new Set(),
      created: new Date().toISOString()
    };
    
    for (const material of materials) {
      this.addToContainer(container, material);
    }
    
    this.containers.push(container);
    return container;
  }

  addToContainer(container, material) {
    const volumeToAdd = this.convertToContainerUnits(
      material.quantity,
      material.unit,
      container.specs.units
    );
    
    if (volumeToAdd > container.remainingCapacity) {
      return {
        success: false,
        error: 'Insufficient capacity',
        available: container.remainingCapacity,
        required: volumeToAdd
      };
    }
    
    if (!this.areCompatible(material, container.contents)) {
      return {
        success: false,
        error: 'Material incompatible with container contents'
      };
    }
    
    container.contents.push({
      ...material,
      volumeInContainer: volumeToAdd
    });
    
    container.totalVolume += volumeToAdd;
    container.remainingCapacity -= volumeToAdd;
    
    material.wasteCodes.forEach(code => container.wasteCodes.add(code));
    if (material.dotClassification?.hazardClass) {
      container.dotClasses.add(material.dotClassification.hazardClass);
    }
    
    material.packingStatus = 'packed';
    material.containerId = container.id;
    
    const vermiculiteNeeded = (container.specs.maxFill - container.totalVolume) * 0.2;
    container.vermiculiteVolume = vermiculiteNeeded;
    
    return {
      success: true,
      container,
      volumeAdded: volumeToAdd,
      vermiculiteAdded: vermiculiteNeeded
    };
  }

  convertToGallons(quantity, unit) {
    const conversions = {
      'gallons': 1,
      'gal': 1,
      'liters': 0.264172,
      'l': 0.264172,
      'kg': 0.264172,
      'pounds': 0.119826,
      'lbs': 0.119826,
      'ml': 0.000264172,
      'g': 0.000264172
    };
    
    const factor = conversions[unit.toLowerCase()] || 1;
    return quantity * factor;
  }

  convertToContainerUnits(quantity, fromUnit, toUnit) {
    const inGallons = this.convertToGallons(quantity, fromUnit);
    
    if (toUnit === 'gallons') {
      return inGallons;
    } else if (toUnit === 'liters') {
      return inGallons * 3.78541;
    }
    
    return inGallons;
  }

  compileWasteCodes() {
    const allCodes = new Set();
    const codeDetails = {};
    
    for (const container of this.containers) {
      for (const code of container.wasteCodes) {
        allCodes.add(code);
        
        if (!codeDetails[code]) {
          codeDetails[code] = {
            code,
            containers: [],
            totalVolume: 0,
            materials: []
          };
        }
        
        codeDetails[code].containers.push(container.id);
        codeDetails[code].totalVolume += container.totalVolume;
        
        for (const material of container.contents) {
          if (material.wasteCodes.includes(code)) {
            codeDetails[code].materials.push(material.name);
          }
        }
      }
    }
    
    return {
      codes: Array.from(allCodes).sort(),
      details: codeDetails,
      summary: this.generateWasteProfile(allCodes)
    };
  }

  generateWasteProfile(wasteCodes) {
    const profile = {
      federalCodes: [],
      characteristics: [],
      listed: [],
      stateSpecific: []
    };
    
    for (const code of wasteCodes) {
      if (code.startsWith('D001')) {
        profile.characteristics.push('Ignitable');
        profile.federalCodes.push(code);
      } else if (code.startsWith('D002')) {
        profile.characteristics.push('Corrosive');
        profile.federalCodes.push(code);
      } else if (code.startsWith('D003')) {
        profile.characteristics.push('Reactive');
        profile.federalCodes.push(code);
      } else if (code.match(/^D0[0-4]\d/)) {
        profile.characteristics.push('Toxic');
        profile.federalCodes.push(code);
      } else if (code.startsWith('P')) {
        profile.listed.push('P-Listed (Acutely Hazardous)');
        profile.federalCodes.push(code);
      } else if (code.startsWith('U')) {
        profile.listed.push('U-Listed (Toxic)');
        profile.federalCodes.push(code);
      } else if (code.startsWith('F') || code.startsWith('K')) {
        profile.listed.push(`${code[0]}-Listed`);
        profile.federalCodes.push(code);
      } else {
        profile.stateSpecific.push(code);
      }
    }
    
    return {
      ...profile,
      characteristics: [...new Set(profile.characteristics)],
      listed: [...new Set(profile.listed)]
    };
  }

  generateDOTShipping() {
    const shippingGroups = {};
    
    for (const container of this.containers) {
      const primaryClass = this.determinePrimaryHazardClass(container);
      
      if (!shippingGroups[primaryClass]) {
        shippingGroups[primaryClass] = {
          hazardClass: primaryClass,
          containers: [],
          totalVolume: 0,
          unNumber: this.getUNNumber(primaryClass, container),
          properShippingName: this.getProperShippingName(primaryClass, container),
          packingGroup: this.determinePackingGroup(container)
        };
      }
      
      shippingGroups[primaryClass].containers.push(container.id);
      shippingGroups[primaryClass].totalVolume += container.totalVolume;
    }
    
    return Object.values(shippingGroups);
  }

  determinePrimaryHazardClass(container) {
    const classes = Array.from(container.dotClasses);
    
    const priority = ['1', '2.3', '2.1', '2.2', '3', '4.1', '4.2', '4.3', 
                     '5.1', '5.2', '6.1', '8', '9'];
    
    for (const priorityClass of priority) {
      if (classes.includes(priorityClass)) {
        return priorityClass;
      }
    }
    
    return classes[0] || '9';
  }

  getUNNumber(hazardClass, container) {
    const unNumbers = {
      '3': 'UN1993',
      '4.1': 'UN1325',
      '4.2': 'UN2845',
      '4.3': 'UN3132',
      '5.1': 'UN1479',
      '5.2': 'UN3149',
      '6.1': 'UN2810',
      '8': 'UN1760',
      '9': 'UN3077'
    };
    
    return unNumbers[hazardClass] || 'UN3077';
  }

  getProperShippingName(hazardClass, container) {
    const names = {
      '3': 'FLAMMABLE LIQUID, N.O.S.',
      '4.1': 'FLAMMABLE SOLID, N.O.S.',
      '4.2': 'SPONTANEOUSLY COMBUSTIBLE LIQUID, N.O.S.',
      '4.3': 'WATER-REACTIVE SOLID, N.O.S.',
      '5.1': 'OXIDIZING SOLID, N.O.S.',
      '5.2': 'ORGANIC PEROXIDE TYPE F, LIQUID',
      '6.1': 'TOXIC LIQUID, ORGANIC, N.O.S.',
      '8': 'CORROSIVE LIQUID, N.O.S.',
      '9': 'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, SOLID, N.O.S.'
    };
    
    return names[hazardClass] || 'HAZARDOUS WASTE, N.O.S.';
  }

  determinePackingGroup(container) {
    if (container.wasteCodes.has('P')) {
      return 'I';
    }
    
    const hasHighHazard = Array.from(container.wasteCodes).some(code => 
      code.startsWith('P') || 
      (code === 'D001' && container.contents.some(m => 
        m.analysis?.flashPoint && parseFloat(m.analysis.flashPoint) < 23))
    );
    
    if (hasHighHazard) return 'I';
    
    const hasMediumHazard = container.wasteCodes.has('D001') || 
                            container.wasteCodes.has('D002') ||
                            container.wasteCodes.has('D003');
    
    if (hasMediumHazard) return 'II';
    
    return 'III';
  }

  generatePackingList() {
    const packingList = {
      project: this.currentProject,
      generated: new Date().toISOString(),
      containers: [],
      totalContainers: this.containers.length,
      totalVolume: 0,
      wasteCodes: [],
      dotShipping: this.generateDOTShipping()
    };
    
    for (const container of this.containers) {
      const containerInfo = {
        id: container.id,
        type: container.type,
        contents: container.contents.map(m => ({
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          wasteCodes: m.wasteCodes,
          checked: false
        })),
        totalVolume: container.totalVolume,
        vermiculite: container.vermiculiteVolume,
        fillPercentage: (container.totalVolume / container.specs.maxFill) * 100,
        wasteCodes: Array.from(container.wasteCodes),
        dotClasses: Array.from(container.dotClasses)
      };
      
      packingList.containers.push(containerInfo);
      packingList.totalVolume += container.totalVolume;
    }
    
    const wasteCompilation = this.compileWasteCodes();
    packingList.wasteCodes = wasteCompilation.codes;
    packingList.wasteProfile = wasteCompilation.summary;
    
    return packingList;
  }

  saveProject(projectName) {
    this.currentProject = {
      name: projectName,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      containers: this.containers,
      packingList: this.generatePackingList(),
      wasteCodes: this.compileWasteCodes(),
      dotShipping: this.generateDOTShipping()
    };
    
    const projectData = JSON.stringify(this.currentProject, null, 2);
    
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`labpack_project_${projectName}`, projectData);
    }
    
    return {
      success: true,
      project: this.currentProject,
      data: projectData
    };
  }

  loadProject(projectData) {
    try {
      const project = typeof projectData === 'string' ? 
                     JSON.parse(projectData) : projectData;
      
      this.currentProject = project;
      this.containers = project.containers || [];
      
      return {
        success: true,
        project: this.currentProject
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  reset() {
    this.containers = [];
    this.currentProject = null;
  }

  getMetrics() {
    return {
      totalContainers: this.containers.length,
      totalVolume: this.containers.reduce((sum, c) => sum + c.totalVolume, 0),
      totalVermiculite: this.containers.reduce((sum, c) => sum + c.vermiculiteVolume, 0),
      averageFill: this.containers.length > 0 ?
        this.containers.reduce((sum, c) => 
          sum + (c.totalVolume / c.specs.maxFill * 100), 0) / this.containers.length : 0,
      wasteCodes: this.compileWasteCodes().codes.length,
      dotClasses: [...new Set(this.containers.flatMap(c => Array.from(c.dotClasses)))].length
    };
  }
}

export default LabPackTool;