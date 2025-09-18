import LabPackTool from './labPackTool.js';

class PDFPackingListGenerator {
  constructor() {
    this.doc = null;
  }

  async generatePackingListPDF(labPackTool, options = {}) {
    try {
      // Use jsPDF if available, otherwise create HTML version
      if (typeof window !== 'undefined' && window.jsPDF) {
        return this.createJsPDFDocument(labPackTool, options);
      } else {
        return this.createHTMLVersion(labPackTool, options);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createJsPDFDocument(labPackTool, options) {
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const packingList = labPackTool.generatePackingList();
    const wasteCompilation = labPackTool.compileWasteCodes();
    const dotShipping = labPackTool.generateDOTShipping();

    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LABORATORY PACK PACKING LIST', 105, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${packingList.project?.name || 'Untitled Project'}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Containers: ${packingList.totalContainers}`, 20, yPosition);
    doc.text(`Total Volume: ${packingList.totalVolume.toFixed(2)} gallons`, 120, yPosition);
    yPosition += 15;

    // Summary Section
    doc.setFont('helvetica', 'bold');
    doc.text('WASTE PROFILE SUMMARY', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    if (packingList.wasteProfile.federalCodes.length > 0) {
      doc.text(`Federal Codes: ${packingList.wasteProfile.federalCodes.join(', ')}`, 20, yPosition);
      yPosition += 6;
    }

    if (packingList.wasteProfile.characteristics.length > 0) {
      doc.text(`Characteristics: ${packingList.wasteProfile.characteristics.join(', ')}`, 20, yPosition);
      yPosition += 6;
    }

    if (packingList.wasteProfile.listed.length > 0) {
      doc.text(`Listed Wastes: ${packingList.wasteProfile.listed.join(', ')}`, 20, yPosition);
      yPosition += 6;
    }

    yPosition += 10;

    // DOT Shipping Information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DOT SHIPPING CLASSIFICATION', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    dotShipping.forEach(shipping => {
      doc.text(`${shipping.unNumber} ${shipping.properShippingName}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Hazard Class: ${shipping.hazardClass}, Packing Group: ${shipping.packingGroup}`, 25, yPosition);
      yPosition += 8;
    });

    yPosition += 5;

    // Container Details
    packingList.containers.forEach((container, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`CONTAINER #${container.id}`, 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Type: ${container.type}`, 20, yPosition);
      doc.text(`Fill: ${container.fillPercentage.toFixed(1)}%`, 120, yPosition);
      yPosition += 6;
      doc.text(`Volume: ${container.totalVolume.toFixed(2)} gal`, 20, yPosition);
      doc.text(`Vermiculite: ${container.vermiculite.toFixed(2)} gal`, 120, yPosition);
      yPosition += 6;

      if (container.wasteCodes.length > 0) {
        doc.text(`Waste Codes: ${container.wasteCodes.join(', ')}`, 20, yPosition);
        yPosition += 6;
      }

      yPosition += 5;

      // Materials table header
      doc.setFont('helvetica', 'bold');
      doc.text('☐', 15, yPosition); // Checkbox column
      doc.text('Material Name', 25, yPosition);
      doc.text('Qty', 120, yPosition);
      doc.text('Unit', 140, yPosition);
      doc.text('Codes', 160, yPosition);
      yPosition += 3;

      // Draw line under header
      doc.line(15, yPosition, 190, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');

      // Materials
      container.contents.forEach(material => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        // Checkbox
        doc.rect(15, yPosition - 3, 3, 3);
        
        // Material details
        const materialName = material.name.length > 35 ? 
                            material.name.substring(0, 32) + '...' : 
                            material.name;
        doc.text(materialName, 25, yPosition);
        doc.text(material.quantity.toString(), 120, yPosition);
        doc.text(material.unit, 140, yPosition);
        
        const codes = material.wasteCodes.length > 0 ? 
                     material.wasteCodes.join(',') : 'None';
        doc.text(codes.length > 20 ? codes.substring(0, 17) + '...' : codes, 160, yPosition);
        
        yPosition += 6;
      });

      yPosition += 10;

      // Packer signature section
      doc.line(20, yPosition, 90, yPosition);
      doc.text('Packer Signature', 20, yPosition + 5);
      
      doc.line(110, yPosition, 180, yPosition);
      doc.text('Date', 110, yPosition + 5);
      
      yPosition += 20;
    });

    // Footer on last page
    doc.setFontSize(8);
    doc.text(`Generated by Revolutionary Classifier System - ${new Date().toISOString()}`, 105, 285, { align: 'center' });

    // Create blob and download URL
    const pdfBlob = doc.output('blob');
    const filename = `Packing_List_${packingList.project?.name || 'Project'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    return {
      success: true,
      blob: pdfBlob,
      filename: filename,
      downloadUrl: URL.createObjectURL(pdfBlob)
    };
  }

  createHTMLVersion(labPackTool, options) {
    const packingList = labPackTool.generatePackingList();
    const wasteCompilation = labPackTool.compileWasteCodes();
    const dotShipping = labPackTool.generateDOTShipping();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laboratory Pack Packing List</title>
    <style>
        @media print {
            .no-print { display: none; }
            body { -webkit-print-color-adjust: exact; }
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            margin: 20px;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0 0 10px 0;
        }
        
        .project-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .summary-section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .summary-section h2 {
            font-size: 16px;
            margin: 0 0 10px 0;
            color: #2c5aa0;
        }
        
        .container {
            border: 2px solid #000;
            margin: 20px 0;
            padding: 15px;
            page-break-inside: avoid;
        }
        
        .container-header {
            background: #2c5aa0;
            color: white;
            padding: 10px;
            margin: -15px -15px 15px -15px;
            font-weight: bold;
            font-size: 16px;
        }
        
        .container-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .materials-table th {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 8px;
            text-align: left;
            font-weight: bold;
        }
        
        .materials-table td {
            border: 1px solid #dee2e6;
            padding: 8px;
            vertical-align: top;
        }
        
        .checkbox {
            width: 15px;
            height: 15px;
            border: 2px solid #000;
            display: inline-block;
            margin-right: 5px;
        }
        
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #dee2e6;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            height: 20px;
            margin-bottom: 5px;
        }
        
        .footer {
            text-align: center;
            font-size: 10px;
            color: #6c757d;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #dee2e6;
        }
        
        .waste-codes {
            font-family: monospace;
            background: #f8f9fa;
            padding: 5px;
            border-radius: 3px;
        }
        
        .button-container {
            margin-bottom: 20px;
        }
        
        .print-button {
            background: #2c5aa0;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="button-container no-print">
        <button class="print-button" onclick="window.print()">🖨️ Print Packing List</button>
    </div>

    <div class="header">
        <h1>LABORATORY PACK PACKING LIST</h1>
        <div class="project-info">
            <div>
                <strong>Project:</strong> ${packingList.project?.name || 'Untitled Project'}<br>
                <strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
            <div>
                <strong>Total Containers:</strong> ${packingList.totalContainers}<br>
                <strong>Total Volume:</strong> ${packingList.totalVolume.toFixed(2)} gallons
            </div>
        </div>
    </div>

    <div class="summary-section">
        <h2>WASTE PROFILE SUMMARY</h2>
        ${packingList.wasteProfile.federalCodes.length > 0 ? `<p><strong>Federal Codes:</strong> <span class="waste-codes">${packingList.wasteProfile.federalCodes.join(', ')}</span></p>` : ''}
        ${packingList.wasteProfile.characteristics.length > 0 ? `<p><strong>Characteristics:</strong> ${packingList.wasteProfile.characteristics.join(', ')}</p>` : ''}
        ${packingList.wasteProfile.listed.length > 0 ? `<p><strong>Listed Wastes:</strong> ${packingList.wasteProfile.listed.join(', ')}</p>` : ''}
    </div>

    <div class="summary-section">
        <h2>DOT SHIPPING CLASSIFICATION</h2>
        ${dotShipping.map(shipping => `
            <p>
                <strong>${shipping.unNumber}</strong> ${shipping.properShippingName}<br>
                <em>Hazard Class: ${shipping.hazardClass}, Packing Group: ${shipping.packingGroup}</em>
            </p>
        `).join('')}
    </div>

    ${packingList.containers.map(container => `
        <div class="container">
            <div class="container-header">
                CONTAINER #${container.id}
            </div>
            
            <div class="container-info">
                <div>
                    <strong>Type:</strong> ${container.type}<br>
                    <strong>Volume:</strong> ${container.totalVolume.toFixed(2)} gal
                </div>
                <div>
                    <strong>Fill:</strong> ${container.fillPercentage.toFixed(1)}%<br>
                    <strong>Vermiculite:</strong> ${container.vermiculite.toFixed(2)} gal
                </div>
                <div>
                    <strong>Waste Codes:</strong><br>
                    <span class="waste-codes">${container.wasteCodes.join(', ') || 'None'}</span>
                </div>
            </div>

            <table class="materials-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">Packed</th>
                        <th>Material Name</th>
                        <th style="width: 80px;">Quantity</th>
                        <th style="width: 60px;">Unit</th>
                        <th style="width: 120px;">Waste Codes</th>
                    </tr>
                </thead>
                <tbody>
                    ${container.contents.map(material => `
                        <tr>
                            <td><span class="checkbox"></span></td>
                            <td>${material.name}</td>
                            <td>${material.quantity}</td>
                            <td>${material.unit}</td>
                            <td><span class="waste-codes">${material.wasteCodes.join(', ') || 'None'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="signature-section">
                <div>
                    <div class="signature-line"></div>
                    <strong>Packer Signature</strong>
                </div>
                <div>
                    <div class="signature-line"></div>
                    <strong>Date</strong>
                </div>
            </div>
        </div>
    `).join('')}

    <div class="footer">
        Generated by Revolutionary Classifier System - ${new Date().toISOString()}
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const filename = `Packing_List_${packingList.project?.name || 'Project'}_${new Date().toISOString().split('T')[0]}.html`;

    return {
      success: true,
      blob: blob,
      filename: filename,
      downloadUrl: URL.createObjectURL(blob),
      html: html
    };
  }

  async downloadPDF(pdfResult, filename) {
    if (!pdfResult.success) {
      throw new Error(pdfResult.error);
    }

    if (pdfResult.downloadUrl) {
      const link = document.createElement('a');
      link.href = pdfResult.downloadUrl;
      link.download = filename || pdfResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL after download
      setTimeout(() => {
        URL.revokeObjectURL(pdfResult.downloadUrl);
      }, 1000);
      
      return true;
    }

    return false;
  }

  async printPackingList(labPackTool, options = {}) {
    const htmlResult = this.createHTMLVersion(labPackTool, options);
    
    if (!htmlResult.success) {
      throw new Error(htmlResult.error);
    }

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlResult.html);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    return {
      success: true,
      message: 'Print dialog opened'
    };
  }

  createPackingListTemplate() {
    const templateHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Packing List Template</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { border: 2px solid #000; margin: 20px 0; padding: 15px; }
        .materials-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .materials-table th, .materials-table td { border: 1px solid #000; padding: 8px; }
        .checkbox { width: 15px; height: 15px; border: 2px solid #000; display: inline-block; }
    </style>
</head>
<body>
    <h1>LABORATORY PACK PACKING LIST TEMPLATE</h1>
    
    <div class="container">
        <h2>CONTAINER #001</h2>
        <p><strong>Type:</strong> _______________  <strong>Volume:</strong> _______________</p>
        
        <table class="materials-table">
            <thead>
                <tr>
                    <th>Packed</th>
                    <th>Material Name</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Waste Codes</th>
                </tr>
            </thead>
            <tbody>
                <tr><td><span class="checkbox"></span></td><td>_________________</td><td>_____</td><td>____</td><td>_________</td></tr>
                <tr><td><span class="checkbox"></span></td><td>_________________</td><td>_____</td><td>____</td><td>_________</td></tr>
                <tr><td><span class="checkbox"></span></td><td>_________________</td><td>_____</td><td>____</td><td>_________</td></tr>
                <tr><td><span class="checkbox"></span></td><td>_________________</td><td>_____</td><td>____</td><td>_________</td></tr>
                <tr><td><span class="checkbox"></span></td><td>_________________</td><td>_____</td><td>____</td><td>_________</td></tr>
            </tbody>
        </table>
        
        <p style="margin-top: 20px;">
            Packer Signature: _________________________ Date: _____________
        </p>
    </div>
</body>
</html>`;

    const blob = new Blob([templateHTML], { type: 'text/html' });
    
    return {
      success: true,
      blob: blob,
      filename: 'packing_list_template.html',
      downloadUrl: URL.createObjectURL(blob),
      html: templateHTML
    };
  }
}

export default PDFPackingListGenerator;