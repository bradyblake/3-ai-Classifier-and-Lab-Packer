// Incompatible Materials Database for Revolutionary Classifier
// Database of chemical incompatibilities for safety checking

export const incompatibleMaterials = {
  // Acids
  acids: {
    incompatible: ['bases', 'metals', 'cyanides', 'sulfides', 'carbides'],
    examples: ['hydrochloric acid', 'sulfuric acid', 'nitric acid', 'acetic acid']
  },
  
  // Bases  
  bases: {
    incompatible: ['acids', 'metals', 'aldehydes', 'organic_halides'],
    examples: ['sodium hydroxide', 'potassium hydroxide', 'ammonia']
  },
  
  // Oxidizers
  oxidizers: {
    incompatible: ['flammables', 'organic_materials', 'metals', 'reducing_agents'],
    examples: ['hydrogen peroxide', 'sodium hypochlorite', 'potassium permanganate']
  },
  
  // Flammables
  flammables: {
    incompatible: ['oxidizers', 'acids', 'bases'],
    examples: ['acetone', 'ethanol', 'toluene', 'xylene']
  },
  
  // Metals
  metals: {
    incompatible: ['acids', 'bases', 'oxidizers', 'water'],
    examples: ['sodium', 'potassium', 'lithium', 'aluminum powder']
  },
  
  // Water-reactive
  water_reactive: {
    incompatible: ['water', 'aqueous_solutions', 'acids', 'bases'],
    examples: ['sodium metal', 'calcium carbide', 'phosphorus pentoxide']
  }
};

export const getIncompatibleMaterials = (materialType) => {
  const material = incompatibleMaterials[materialType];
  return material ? material.incompatible : [];
};

export const checkCompatibility = (material1, material2) => {
  const incompatible1 = getIncompatibleMaterials(material1);
  const incompatible2 = getIncompatibleMaterials(material2);
  
  return !incompatible1.includes(material2) && !incompatible2.includes(material1);
};

export const getSafetyWarnings = (materials) => {
  const warnings = [];
  
  for (let i = 0; i < materials.length; i++) {
    for (let j = i + 1; j < materials.length; j++) {
      if (!checkCompatibility(materials[i], materials[j])) {
        warnings.push({
          material1: materials[i],
          material2: materials[j],
          severity: 'high',
          warning: `${materials[i]} and ${materials[j]} are incompatible and should not be mixed or stored together`
        });
      }
    }
  }
  
  return warnings;
};

export default {
  incompatibleMaterials,
  getIncompatibleMaterials,
  checkCompatibility,
  getSafetyWarnings
};