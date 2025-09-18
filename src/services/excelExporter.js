import LabPackTool from './labPackTool.js';

class ExcelExporter {
  constructor() {
    this.workbook = null;
  }

  async exportLabPackToExcel(labPackTool, projectName = 'Lab_Pack_Project') {
    try {
      // Use SheetJS library if available, otherwise create CSV-style export
      if (typeof XLSX !== 'undefined') {
        return this.createExcelWorkbook(labPackTool, projectName);
      } else {
        return this.createCSVExport(labPackTool, projectName);
      }
    } catch (error) {
      console.error('Excel export error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createExcelWorkbook(labPackTool, projectName) {
    const workbook = {
      SheetNames: [],
      Sheets: {}
    };

    // Create Summary Sheet
    const summaryData = this.prepareSummaryData(labPackTool);
    workbook.Sheets['Summary'] = this.arrayToSheet(summaryData);
    workbook.SheetNames.push('Summary');

    // Create Containers Sheet
    const containersData = this.prepareContainersData(labPackTool);
    workbook.Sheets['Containers'] = this.arrayToSheet(containersData);
    workbook.SheetNames.push('Containers');

    // Create Materials Sheet
    const materialsData = this.prepareMaterialsData(labPackTool);
    workbook.Sheets['Materials'] = this.arrayToSheet(materialsData);
    workbook.SheetNames.push('Materials');

    // Create Waste Codes Sheet
    const wasteCodesData = this.prepareWasteCodesData(labPackTool);
    workbook.Sheets['Waste Codes'] = this.arrayToSheet(wasteCodesData);
    workbook.SheetNames.push('Waste Codes');

    // Create DOT Shipping Sheet
    const dotShippingData = this.prepareDOTShippingData(labPackTool);
    workbook.Sheets['DOT Shipping'] = this.arrayToSheet(dotShippingData);
    workbook.SheetNames.push('DOT Shipping');

    // Create Packing List Sheet
    const packingListData = this.preparePackingListData(labPackTool);
    workbook.Sheets['Packing List'] = this.arrayToSheet(packingListData);
    workbook.SheetNames.push('Packing List');

    if (typeof XLSX !== 'undefined') {
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return {
        success: true,
        blob: blob,
        filename: `${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`,
        downloadUrl: URL.createObjectURL(blob)
      };
    }

    return {
      success: true,
      workbook: workbook
    };
  }

  createCSVExport(labPackTool, projectName) {
    const csvFiles = {};

    // Generate CSV for each sheet
    csvFiles.summary = this.arrayToCSV(this.prepareSummaryData(labPackTool));
    csvFiles.containers = this.arrayToCSV(this.prepareContainersData(labPackTool));
    csvFiles.materials = this.arrayToCSV(this.prepareMaterialsData(labPackTool));
    csvFiles.wasteCodes = this.arrayToCSV(this.prepareWasteCodesData(labPackTool));
    csvFiles.dotShipping = this.arrayToCSV(this.prepareDOTShippingData(labPackTool));
    csvFiles.packingList = this.arrayToCSV(this.preparePackingListData(labPackTool));

    // Create ZIP file if JSZip is available
    if (typeof JSZip !== 'undefined') {
      const zip = new JSZip();
      
      Object.entries(csvFiles).forEach(([name, csv]) => {
        zip.file(`${name}.csv`, csv);
      });

      return zip.generateAsync({ type: 'blob' }).then(blob => ({
        success: true,
        blob: blob,
        filename: `${projectName}_${new Date().toISOString().split('T')[0]}.zip`,
        downloadUrl: URL.createObjectURL(blob)
      }));
    }

    // Fallback to single CSV file
    const combinedCSV = Object.entries(csvFiles)
      .map(([name, csv]) => `--- ${name.toUpperCase()} ---\n${csv}\n`)
      .join('\n');

    const blob = new Blob([combinedCSV], { type: 'text/csv' });
    
    return {
      success: true,
      blob: blob,
      filename: `${projectName}_${new Date().toISOString().split('T')[0]}.csv`,
      downloadUrl: URL.createObjectURL(blob)
    };
  }

  prepareSummaryData(labPackTool) {
    const metrics = labPackTool.getMetrics();
    const wasteCompilation = labPackTool.compileWasteCodes();
    
    return [
      ['Project Summary', ''],
      ['Project Name', labPackTool.currentProject?.name || 'Untitled Project'],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Generated Time', new Date().toLocaleTimeString()],
      ['', ''],
      ['Container Summary', ''],
      ['Total Containers', metrics.totalContainers],
      ['Total Volume (gal)', metrics.totalVolume.toFixed(2)],
      ['Total Vermiculite (gal)', metrics.totalVermiculite.toFixed(2)],
      ['Average Fill Percentage', `${metrics.averageFill.toFixed(1)}%`],
      ['', ''],
      ['Waste Classification', ''],
      ['Total Waste Codes', metrics.wasteCodes],
      ['DOT Hazard Classes', metrics.dotClasses],
      ['P-Listed Materials', wasteCompilation.codes.filter(c => c.startsWith('P')).length],
      ['U-Listed Materials', wasteCompilation.codes.filter(c => c.startsWith('U')).length],
      ['D-Code Characteristics', wasteCompilation.codes.filter(c => c.startsWith('D')).length],
      ['', ''],
      ['Regulatory Profile', ''],
      ...Object.entries(wasteCompilation.summary).map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        Array.isArray(value) ? value.join(', ') : value
      ])
    ];
  }

  prepareContainersData(labPackTool) {
    const headers = [
      'Container ID',
      'Container Type',
      'Material',
      'Volume (gal)',
      'Max Fill (gal)',
      'Fill %',
      'Vermiculite (gal)',
      'Contents Count',
      'Waste Codes',
      'DOT Classes',
      'Created Date'
    ];

    const data = [headers];

    labPackTool.containers.forEach(container => {
      data.push([
        container.id,
        container.type,
        container.specs.material,
        container.totalVolume.toFixed(2),
        container.specs.maxFill.toFixed(2),
        `${((container.totalVolume / container.specs.maxFill) * 100).toFixed(1)}%`,
        container.vermiculiteVolume.toFixed(2),
        container.contents.length,
        Array.from(container.wasteCodes).join(', '),
        Array.from(container.dotClasses).join(', '),
        new Date(container.created).toLocaleDateString()
      ]);
    });

    return data;
  }

  prepareMaterialsData(labPackTool) {
    const headers = [
      'Material Name',
      'Container ID',
      'Quantity',
      'Unit',
      'Volume in Container (gal)',
      'Physical State',
      'Segregation Group',
      'Waste Codes',
      'DOT Classification',
      'Hazard Class',
      'Packing Group',
      'Flash Point',
      'pH',
      'Status'
    ];

    const data = [headers];

    labPackTool.containers.forEach(container => {
      container.contents.forEach(material => {
        data.push([
          material.name,
          container.id,
          material.quantity,
          material.unit,
          material.volumeInContainer?.toFixed(2) || '',
          material.physicalState?.state || '',
          material.segregationGroup,
          material.wasteCodes.join(', '),
          material.dotClassification?.properShippingName || '',
          material.dotClassification?.hazardClass || '',
          material.dotClassification?.packingGroup || '',
          material.analysis?.flashPoint || '',
          material.analysis?.pH || '',
          material.packingStatus
        ]);
      });
    });

    return data;
  }

  prepareWasteCodesData(labPackTool) {
    const wasteCompilation = labPackTool.compileWasteCodes();
    
    const headers = [
      'Waste Code',
      'Code Type',
      'Description',
      'Containers',
      'Total Volume (gal)',
      'Materials'
    ];

    const data = [headers];

    Object.entries(wasteCompilation.details).forEach(([code, details]) => {
      const codeType = code.startsWith('P') ? 'P-Listed (Acutely Hazardous)' :
                      code.startsWith('U') ? 'U-Listed (Toxic)' :
                      code.startsWith('D001') ? 'D001 (Ignitable)' :
                      code.startsWith('D002') ? 'D002 (Corrosive)' :
                      code.startsWith('D003') ? 'D003 (Reactive)' :
                      code.startsWith('D') ? 'D-Listed (Toxic Characteristic)' :
                      'Other';

      data.push([
        code,
        codeType,
        this.getWasteCodeDescription(code),
        details.containers.join(', '),
        details.totalVolume.toFixed(2),
        details.materials.join(', ')
      ]);
    });

    return data;
  }

  prepareDOTShippingData(labPackTool) {
    const dotShipping = labPackTool.generateDOTShipping();
    
    const headers = [
      'Hazard Class',
      'UN Number',
      'Proper Shipping Name',
      'Packing Group',
      'Containers',
      'Total Volume (gal)',
      'Technical Name'
    ];

    const data = [headers];

    dotShipping.forEach(shipping => {
      data.push([
        shipping.hazardClass,
        shipping.unNumber,
        shipping.properShippingName,
        shipping.packingGroup,
        shipping.containers.join(', '),
        shipping.totalVolume.toFixed(2),
        shipping.technicalName || 'Various Waste Chemicals'
      ]);
    });

    return data;
  }

  preparePackingListData(labPackTool) {
    const packingList = labPackTool.generatePackingList();
    
    const headers = [
      'Container ID',
      'Container Type',
      'Material Name',
      'Quantity',
      'Unit',
      'Waste Codes',
      'Packed (✓/✗)',
      'Notes'
    ];

    const data = [headers];

    packingList.containers.forEach(container => {
      container.contents.forEach(material => {
        data.push([
          container.id,
          container.type,
          material.name,
          material.quantity,
          material.unit,
          material.wasteCodes.join(', '),
          material.checked ? '✓' : '☐',
          ''
        ]);
      });
    });

    return data;
  }

  getWasteCodeDescription(code) {
    const descriptions = {
      'D001': 'Ignitable waste (flash point < 60°C)',
      'D002': 'Corrosive waste (pH ≤ 2 or ≥ 12.5)',
      'D003': 'Reactive waste',
      'D004': 'Toxic for arsenic (TCLP ≥ 5.0 mg/L)',
      'D005': 'Toxic for barium (TCLP ≥ 100.0 mg/L)',
      'D006': 'Toxic for cadmium (TCLP ≥ 1.0 mg/L)',
      'D007': 'Toxic for chromium (TCLP ≥ 5.0 mg/L)',
      'D008': 'Toxic for lead (TCLP ≥ 5.0 mg/L)',
      'D009': 'Toxic for mercury (TCLP ≥ 0.2 mg/L)',
      'D010': 'Toxic for selenium (TCLP ≥ 1.0 mg/L)',
      'D011': 'Toxic for silver (TCLP ≥ 5.0 mg/L)',
      'P001': 'Warfarin - Acute hazardous waste',
      'P012': 'Arsenic trioxide - Acute hazardous waste',
      'P065': 'Mercury(II) chloride - Acute hazardous waste',
      'P089': 'Parathion - Acute hazardous waste',
      'P098': 'Potassium cyanide - Acute hazardous waste',
      'P104': 'Silver cyanide - Acute hazardous waste',
      'U002': 'Acetone - Toxic waste',
      'U019': 'Benzene - Toxic waste',
      'U044': 'Chloroform - Toxic waste',
      'U122': 'Formaldehyde - Toxic waste',
      'U133': 'Hydrazine - Toxic waste',
      'U151': 'Mercury - Toxic waste',
      'U154': 'Methanol - Toxic waste',
      'U188': 'Phenol - Toxic waste',
      'U211': 'Carbon tetrachloride - Toxic waste',
      'U220': 'Toluene - Toxic waste',
      'U239': 'Xylene - Toxic waste'
    };

    return descriptions[code] || 'See 40 CFR 261 for details';
  }

  arrayToSheet(data) {
    const sheet = {};
    const range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };

    for (let R = 0; R !== data.length; ++R) {
      for (let C = 0; C !== data[R].length; ++C) {
        if (range.s.r > R) range.s.r = R;
        if (range.s.c > C) range.s.c = C;
        if (range.e.r < R) range.e.r = R;
        if (range.e.c < C) range.e.c = C;
        
        const cell = { v: data[R][C] };
        if (cell.v == null) continue;
        
        const cell_ref = this.encodeCell({ c: C, r: R });
        
        if (typeof cell.v === 'number') cell.t = 'n';
        else if (typeof cell.v === 'boolean') cell.t = 'b';
        else if (cell.v instanceof Date) {
          cell.t = 'n';
          cell.z = 'M/D/YY';
          cell.v = this.dateToSerial(cell.v);
        } else cell.t = 's';
        
        sheet[cell_ref] = cell;
      }
    }

    if (range.s.c < 10000000) sheet['!ref'] = this.encodeRange(range);
    return sheet;
  }

  arrayToCSV(data) {
    return data.map(row => 
      row.map(cell => {
        if (cell == null) return '';
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell.toString();
      }).join(',')
    ).join('\n');
  }

  encodeCell(cell) {
    return this.encodeCol(cell.c) + this.encodeRow(cell.r);
  }

  encodeCol(col) {
    let s = '';
    for (++col; col; col = Math.floor((col - 1) / 26)) {
      s = String.fromCharCode(((col - 1) % 26) + 65) + s;
    }
    return s;
  }

  encodeRow(row) {
    return (row + 1).toString();
  }

  encodeRange(range) {
    return this.encodeCell(range.s) + ':' + this.encodeCell(range.e);
  }

  dateToSerial(date) {
    return (date.getTime() - new Date(1900, 0, 1).getTime()) / (24 * 60 * 60 * 1000) + 1;
  }

  async downloadExport(exportResult, filename) {
    if (!exportResult.success) {
      throw new Error(exportResult.error);
    }

    if (exportResult.downloadUrl) {
      const link = document.createElement('a');
      link.href = exportResult.downloadUrl;
      link.download = filename || exportResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL after download
      setTimeout(() => {
        URL.revokeObjectURL(exportResult.downloadUrl);
      }, 1000);
      
      return true;
    }

    return false;
  }

  createTemplateExcel() {
    const templateData = [
      ['Material Name', 'CAS Number', 'Quantity', 'Unit', 'Physical State', 'Flash Point', 'pH'],
      ['Example Material 1', '67-64-1', '5', 'kg', 'liquid', '-20', ''],
      ['Example Material 2', '7664-93-9', '2.5', 'L', 'liquid', '', '1.0'],
      ['', '', '', '', '', '', ''],
      ['Instructions:', '', '', '', '', '', ''],
      ['1. Fill in material information above', '', '', '', '', '', ''],
      ['2. CAS numbers are critical for accurate classification', '', '', '', '', '', ''],
      ['3. Physical state: liquid, solid, gas, or semi-solid', '', '', '', '', '', ''],
      ['4. Flash point in °C (if known)', '', '', '', '', '', ''],
      ['5. pH value (if known)', '', '', '', '', '', '']
    ];

    const workbook = {
      SheetNames: ['Template'],
      Sheets: {
        'Template': this.arrayToSheet(templateData)
      }
    };

    if (typeof XLSX !== 'undefined') {
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return {
        success: true,
        blob: blob,
        filename: 'lab_pack_template.xlsx',
        downloadUrl: URL.createObjectURL(blob)
      };
    }

    return this.createCSVExport({ containers: [] }, 'template');
  }
}

export default ExcelExporter;