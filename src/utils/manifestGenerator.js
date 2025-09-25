// Manifest Generator
// Generates EPA manifests and shipping documents for environmental projects

class ManifestGenerator {
  constructor() {
    this.storageKey = 'generated_manifests';
  }

  // Generate manifest from project card
  generateFromProjectCard(card, generatorInfo) {
    const manifestNumber = this.generateManifestNumber();

    const manifest = {
      manifestNumber,
      generatedDate: new Date().toISOString(),

      // Customer information
      customer: {
        name: card.vendor || 'Unknown Customer',
        jobNumber: card.jobNumber,
        location: card.location,
        revenue: card.revenue
      },

      // Generator information
      generator: {
        name: generatorInfo.generatorName || 'Environmental Services',
        address: generatorInfo.generatorAddress || '',
        contactName: generatorInfo.generatorContact || '',
        phone: generatorInfo.generatorPhone || '',
        epaId: generatorInfo.generatorEpaId || ''
      },

      // Waste streams (basic example)
      wasteStreams: [
        {
          wasteDescription: `Mixed waste from ${card.title}`,
          properShippingName: 'Waste, environmentally hazardous substance, liquid, n.o.s.',
          unNumber: 'UN3082',
          hazardClass: '9',
          packingGroup: 'III',
          totalQuantity: '55',
          unitOfMeasure: 'GAL',
          wasteCodes: ['D001', 'D002'] // Example waste codes
        }
      ],

      // Designated facility (example)
      facility: {
        name: 'Authorized Treatment Facility',
        address: '123 Treatment Way, Houston, TX 77001',
        epaId: 'TXR000000001'
      },

      // Compliance information
      compliance: {
        dotCompliant: true,
        epaCompliant: true,
        rcraManifest: true,
        specialInstructions: [
          'Handle with care',
          'Maintain chain of custody',
          'Temperature sensitive materials'
        ]
      }
    };

    return manifest;
  }

  // Generate unique manifest number
  generateManifestNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);

    return `MAN-${year}${month}${day}-${timestamp}`;
  }

  // Save manifest to localStorage
  saveManifest(manifest) {
    try {
      const manifests = this.getManifests();
      manifests[manifest.manifestNumber] = manifest;
      localStorage.setItem(this.storageKey, JSON.stringify(manifests));
      console.log('Manifest saved:', manifest.manifestNumber);
    } catch (error) {
      console.error('Error saving manifest:', error);
      throw error;
    }
  }

  // Get all saved manifests
  getManifests() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    } catch (error) {
      console.error('Error loading manifests:', error);
      return {};
    }
  }

  // Export manifest in various formats
  exportManifest(manifest, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(manifest, null, 2);

      case 'csv':
        return this.generateCSV(manifest);

      case 'pdf':
      case 'shipping':
        return this.generatePDF(manifest, format);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Generate CSV export
  generateCSV(manifest) {
    const lines = [
      'Field,Value',
      `Manifest Number,${manifest.manifestNumber}`,
      `Generated Date,${new Date(manifest.generatedDate).toLocaleDateString()}`,
      `Customer,${manifest.customer.name}`,
      `Job Number,${manifest.customer.jobNumber}`,
      `Location,${manifest.customer.location}`,
      `Generator,${manifest.generator.name}`,
      `EPA ID,${manifest.generator.epaId}`,
      `Facility,${manifest.facility.name}`,
      '',
      'Waste Streams:'
    ];

    manifest.wasteStreams.forEach((stream, index) => {
      lines.push(`Stream ${index + 1} Description,${stream.wasteDescription}`);
      lines.push(`Stream ${index + 1} UN Number,${stream.unNumber}`);
      lines.push(`Stream ${index + 1} Quantity,${stream.totalQuantity} ${stream.unitOfMeasure}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  // Generate PDF (basic implementation - would use a PDF library in production)
  generatePDF(manifest, type) {
    // This is a mock implementation
    // In a real application, you would use a library like jsPDF or PDFKit

    const content = {
      type: type,
      manifestNumber: manifest.manifestNumber,
      date: new Date(manifest.generatedDate).toLocaleDateString(),
      customer: manifest.customer,
      generator: manifest.generator,
      facility: manifest.facility,
      wasteStreams: manifest.wasteStreams,
      compliance: manifest.compliance
    };

    // Mock PDF generation - return a blob
    const pdfContent = `EPA MANIFEST ${manifest.manifestNumber}\n\nGenerated: ${content.date}\n\nThis is a mock PDF implementation.`;

    return {
      output: (format) => {
        if (format === 'blob') {
          return new Blob([pdfContent], { type: 'application/pdf' });
        }
        return pdfContent;
      }
    };
  }

  // Get manifest by number
  getManifestByNumber(manifestNumber) {
    const manifests = this.getManifests();
    return manifests[manifestNumber] || null;
  }

  // Delete manifest
  deleteManifest(manifestNumber) {
    try {
      const manifests = this.getManifests();
      delete manifests[manifestNumber];
      localStorage.setItem(this.storageKey, JSON.stringify(manifests));
      console.log('Manifest deleted:', manifestNumber);
    } catch (error) {
      console.error('Error deleting manifest:', error);
      throw error;
    }
  }
}

// Export singleton instance
const manifestGenerator = new ManifestGenerator();
export default manifestGenerator;