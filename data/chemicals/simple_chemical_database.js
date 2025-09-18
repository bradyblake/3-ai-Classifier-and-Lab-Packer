// Simple Chemical Database for Testing
// Contains essential chemicals with CAS numbers and properties

const comprehensiveChemicalDatabase = {
  // SOLVENTS - Common Industrial Solvents
  '67-64-1': { // Acetone
    name: 'Acetone',
    flashPoint: -17,
    pH: null,
    boilingPoint: 56.05,
    physicalState: 'liquid',
    ignitable: true,
    corrosive: false,
    unNumber: 'UN1090',
    properShippingName: 'Acetone',
    hazardClass: '3'
  },
  '64-17-5': { // Ethanol
    name: 'Ethanol',
    flashPoint: 13,
    pH: null,
    boilingPoint: 78.37,
    physicalState: 'liquid',
    ignitable: true,
    corrosive: false,
    unNumber: 'UN1170',
    properShippingName: 'Ethanol',
    hazardClass: '3'
  },
  '67-56-1': { // Methanol
    name: 'Methanol',
    flashPoint: 11,
    pH: null,
    boilingPoint: 64.7,
    physicalState: 'liquid',
    ignitable: true,
    corrosive: false,
    unNumber: 'UN1230',
    properShippingName: 'Methanol',
    hazardClass: '3'
  },
  '71-43-2': { // Benzene
    name: 'Benzene',
    flashPoint: -11,
    pH: null,
    boilingPoint: 80.1,
    physicalState: 'liquid',
    ignitable: true,
    corrosive: false,
    unNumber: 'UN1114',
    properShippingName: 'Benzene',
    hazardClass: '3'
  },
  '108-88-3': { // Toluene
    name: 'Toluene',
    flashPoint: 4,
    pH: null,
    boilingPoint: 110.6,
    physicalState: 'liquid',
    ignitable: true,
    corrosive: false,
    unNumber: 'UN1294',
    properShippingName: 'Toluene',
    hazardClass: '3'
  },
  '1330-20-7': { // Xylene
    name: 'Xylene',
    flashPoint: 25,
    pH: null,
    boilingPoint: 138.4,
    physicalState: 'liquid',
    ignitable: true,
    corrosive: false,
    unNumber: 'UN1307',
    properShippingName: 'Xylene',
    hazardClass: '3'
  },
  '75-09-2': { // Dichloromethane (Methylene chloride)
    name: 'Dichloromethane',
    flashPoint: null, // Not flammable
    pH: null,
    boilingPoint: 39.8,
    physicalState: 'liquid',
    ignitable: false,
    corrosive: false,
    unNumber: 'UN1593',
    properShippingName: 'Dichloromethane',
    hazardClass: '6.1'
  },
  '127-18-4': { // Tetrachloroethylene
    name: 'Tetrachloroethylene',
    flashPoint: null, // Not flammable
    pH: null,
    boilingPoint: 121.1,
    physicalState: 'liquid',
    ignitable: false,
    corrosive: false,
    unNumber: 'UN1897',
    properShippingName: 'Tetrachloroethylene',
    hazardClass: '6.1'
  },
  '79-01-6': { // Trichloroethylene
    name: 'Trichloroethylene',
    flashPoint: null, // Not flammable
    pH: null,
    boilingPoint: 87.2,
    physicalState: 'liquid',
    ignitable: false,
    corrosive: false,
    unNumber: 'UN1710',
    properShippingName: 'Trichloroethylene',
    hazardClass: '6.1'
  },
  '7681-52-9': { // Sodium Hypochlorite (Bleach)
    name: 'Sodium hypochlorite solution',
    flashPoint: null, // Not flammable - it's an oxidizer
    pH: 11.5, // Typical pH 11-13, varies with concentration
    boilingPoint: 101,
    physicalState: 'liquid',
    ignitable: false, // NOT flammable - it's an oxidizer
    corrosive: false, // pH < 12.5 so not D002 unless concentrated
    oxidizer: true, // Important: This is an oxidizing agent
    unNumber: 'UN1791',
    properShippingName: 'Hypochlorite solution',
    hazardClass: '8', // Primary hazard: corrosive
    subsidiaryHazard: '5.1' // Secondary hazard: oxidizer
  }
};

export { comprehensiveChemicalDatabase };
