/**
 * FormGenerationSystem.js
 * Generates printable forms and compliance documentation
 * based on waste classification results
 */

export class FormGenerationSystem {
  constructor() {
    this.formTemplates = this.initializeFormTemplates();
  }

  /**
   * Initialize form templates for different states and requirements
   */
  initializeFormTemplates() {
    return {
      texas: {
        wasteClassification: {
          title: 'Texas Waste Classification Documentation',
          required: true,
          sections: ['generator_info', 'waste_description', 'classification_determination', 'supporting_data']
        },
        steersReport: {
          title: 'STEERS Annual Waste Report',
          required: true,
          sections: ['facility_info', 'waste_summary', 'disposal_methods', 'certification']
        }
      },
      oklahoma: {
        sqgCertification: {
          title: 'Small Quantity Generator Self-Certification',
          required: true,
          sections: ['facility_info', 'waste_types', 'quantities', 'management_practices']
        },
        epaForm8700: {
          title: 'EPA Form 8700-12 (Site Identification)',
          required: true,
          sections: ['site_info', 'owner_operator', 'waste_activities', 'certification']
        }
      },
      federal: {
        manifest: {
          title: 'Uniform Hazardous Waste Manifest',
          required: true,
          sections: ['generator_info', 'transporter_info', 'facility_info', 'waste_description']
        }
      }
    };
  }

  /**
   * Generate forms based on classification results
   */
  async generateForms(classificationResults, generatorInfo, selectedState) {
    const forms = [];

    // Generate federal forms if hazardous
    if (classificationResults.classification === 'hazardous') {
      forms.push(await this.generateHazardousWasteManifest(classificationResults, generatorInfo));
    }

    // Generate state-specific forms
    switch (selectedState) {
      case 'TX':
        forms.push(...await this.generateTexasForms(classificationResults, generatorInfo));
        break;
      case 'OK':
        forms.push(...await this.generateOklahomaForms(classificationResults, generatorInfo));
        break;
    }

    // Generate general documentation
    forms.push(await this.generateClassificationSummary(classificationResults, generatorInfo, selectedState));

    return forms;
  }

  /**
   * Generate Texas-specific forms
   */
  async generateTexasForms(results, generatorInfo) {
    const forms = [];

    // Texas Waste Classification Documentation
    const classificationDoc = {
      id: `TX-WCD-${Date.now()}`,
      title: 'Texas Waste Classification Documentation',
      type: 'TCEQ',
      state: 'TX',
      required: true,
      printable: true,
      data: {
        generator: generatorInfo,
        classification: results,
        determination: this.generateTexasClassificationDetermination(results),
        wasteCode: results.stateWasteCodes?.[0]?.texasWasteCode || 'TBD'
      },
      htmlContent: this.generateTexasClassificationHTML(results, generatorInfo)
    };

    forms.push(classificationDoc);

    // STEERS Report if required
    if (results.classification === 'hazardous' ||
        results.stateWasteCodes?.some(code => code.classification === '1')) {
      const steersReport = {
        id: `TX-STEERS-${Date.now()}`,
        title: 'STEERS Annual Waste Report',
        type: 'TCEQ',
        state: 'TX',
        required: true,
        printable: true,
        dueDate: 'March 1 annually',
        data: {
          generator: generatorInfo,
          wasteTypes: results.stateWasteCodes || [],
          reportingYear: new Date().getFullYear()
        },
        htmlContent: this.generateSTEERSReportHTML(results, generatorInfo)
      };

      forms.push(steersReport);
    }

    return forms;
  }

  /**
   * Generate Oklahoma-specific forms
   */
  async generateOklahomaForms(results, generatorInfo) {
    const forms = [];

    if (results.classification === 'hazardous') {
      // EPA Form 8700-12
      const epaForm = {
        id: `OK-EPA8700-${Date.now()}`,
        title: 'EPA Form 8700-12 (Site Identification)',
        type: 'EPA/Oklahoma DEQ',
        state: 'OK',
        required: true,
        printable: true,
        data: {
          generator: generatorInfo,
          activities: ['Generator'],
          wasteTypes: results.rcraWasteCodes || []
        },
        htmlContent: this.generateEPAForm8700HTML(results, generatorInfo)
      };

      forms.push(epaForm);

      // SQG Self-Certification (if applicable)
      if (this.isSQG(generatorInfo)) {
        const sqgCert = {
          id: `OK-SQG-${Date.now()}`,
          title: 'Small Quantity Generator Self-Certification',
          type: 'Oklahoma DEQ',
          state: 'OK',
          required: true,
          printable: true,
          data: {
            generator: generatorInfo,
            wasteTypes: results.rcraWasteCodes || [],
            quantities: generatorInfo.monthlyGeneration || {}
          },
          htmlContent: this.generateSQGCertificationHTML(results, generatorInfo)
        };

        forms.push(sqgCert);
      }
    }

    return forms;
  }

  /**
   * Generate Hazardous Waste Manifest template
   */
  async generateHazardousWasteManifest(results, generatorInfo) {
    return {
      id: `MANIFEST-${Date.now()}`,
      title: 'Uniform Hazardous Waste Manifest',
      type: 'Federal',
      state: 'All',
      required: true,
      printable: true,
      data: {
        generator: generatorInfo,
        wasteDescriptions: this.formatWasteDescriptions(results),
        rcraWasteCodes: results.rcraWasteCodes || [],
        stateWasteCodes: results.stateWasteCodes || []
      },
      htmlContent: this.generateManifestHTML(results, generatorInfo)
    };
  }

  /**
   * Generate classification summary document
   */
  async generateClassificationSummary(results, generatorInfo, selectedState) {
    return {
      id: `SUMMARY-${Date.now()}`,
      title: 'Waste Classification Summary Report',
      type: 'Documentation',
      state: selectedState,
      required: false,
      printable: true,
      data: {
        generator: generatorInfo,
        classification: results,
        state: selectedState,
        timestamp: new Date().toISOString(),
        reasoning: results.reasoning || []
      },
      htmlContent: this.generateSummaryHTML(results, generatorInfo, selectedState)
    };
  }

  /**
   * Generate Texas Classification Determination HTML
   */
  generateTexasClassificationHTML(results, generatorInfo) {
    const wasteCode = results.stateWasteCodes?.[0] || {};

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Texas Waste Classification Documentation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; }
            .section h3 { margin-top: 0; background-color: #f0f0f0; padding: 10px; margin: -15px -15px 15px -15px; }
            .classification-box { background-color: #e7f3ff; padding: 15px; border-left: 5px solid #0066cc; }
            .waste-code { font-size: 18px; font-weight: bold; color: #0066cc; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .signature-line { margin-top: 30px; border-bottom: 1px solid #000; width: 300px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Texas Waste Classification Documentation</h1>
            <h2>Texas Commission on Environmental Quality (TCEQ)</h2>
            <p>Per 30 TAC Chapter 335, Subchapter R</p>
        </div>

        <div class="section">
            <h3>Generator Information</h3>
            <table>
                <tr><td><strong>Generator Name:</strong></td><td>${generatorInfo.companyName || 'Not Provided'}</td></tr>
                <tr><td><strong>EPA ID Number:</strong></td><td>${generatorInfo.epaId || 'Not Assigned'}</td></tr>
                <tr><td><strong>Address:</strong></td><td>${generatorInfo.address || 'Not Provided'}</td></tr>
                <tr><td><strong>Contact:</strong></td><td>${generatorInfo.contact || 'Not Provided'}</td></tr>
                <tr><td><strong>Phone:</strong></td><td>${generatorInfo.phone || 'Not Provided'}</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>Waste Description</h3>
            <table>
                <tr><td><strong>Waste Stream Name:</strong></td><td>${results.wasteStreamName || 'Not Provided'}</td></tr>
                <tr><td><strong>Physical State:</strong></td><td>${results.materialState || 'Unknown'}</td></tr>
                <tr><td><strong>Source Process:</strong></td><td>${generatorInfo.process || 'Not Provided'}</td></tr>
                <tr><td><strong>Chemical Composition:</strong></td><td>${this.formatComposition(results)}</td></tr>
            </table>
        </div>

        <div class="classification-box">
            <h3>Texas Classification Determination</h3>
            <p class="waste-code">Texas Waste Code: ${wasteCode.texasWasteCode || 'TBD'}</p>
            <p><strong>Classification:</strong> ${wasteCode.classification || 'TBD'} - ${wasteCode.description || 'To Be Determined'}</p>
            <p><strong>Form Code:</strong> ${wasteCode.formCode || 'TBD'} - ${wasteCode.formDescription || 'To Be Determined'}</p>
        </div>

        <div class="section">
            <h3>Classification Reasoning</h3>
            <ul>
                ${(results.reasoning || ['No reasoning provided']).map(reason => `<li>${reason}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h3>RCRA Waste Codes (if applicable)</h3>
            ${results.rcraWasteCodes && results.rcraWasteCodes.length > 0 ?
              `<table>
                <tr><th>Code</th><th>Description</th><th>Reason</th></tr>
                ${results.rcraWasteCodes.map(code =>
                  `<tr><td>${code.code}</td><td>${code.description}</td><td>${code.reason}</td></tr>`
                ).join('')}
              </table>` :
              '<p>No RCRA hazardous waste codes apply.</p>'
            }
        </div>

        <div class="section">
            <h3>Compliance Requirements</h3>
            <ul>
                ${(results.complianceRequirements || ['Standard waste management practices']).map(req => `<li>${req}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h3>Certification</h3>
            <p>I certify under penalty of law that this information was prepared under my direction or supervision and that the submitted information is, to the best of my knowledge and belief, true, accurate, and complete.</p>

            <div style="margin-top: 30px;">
                <div class="signature-line"></div>
                <p style="margin-top: 5px;"><strong>Authorized Representative Signature</strong></p>
            </div>

            <div style="margin-top: 20px;">
                <div class="signature-line"></div>
                <p style="margin-top: 5px;"><strong>Date</strong></p>
            </div>
        </div>

        <div class="footer" style="margin-top: 30px; font-size: 10px; color: #666;">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>This form was generated by the AI Waste Classification System</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate STEERS Report HTML
   */
  generateSTEERSReportHTML(results, generatorInfo) {
    const currentYear = new Date().getFullYear();

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>STEERS Annual Waste Report - ${currentYear}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; }
            .section h3 { margin-top: 0; background-color: #f0f0f0; padding: 10px; margin: -15px -15px 15px -15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .important { background-color: #fff3cd; padding: 10px; border-left: 5px solid #ffc107; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>State of Texas Environmental Electronic Reporting System (STEERS)</h1>
            <h2>Annual Waste Report - ${currentYear}</h2>
            <p>Due: March 1, ${currentYear + 1}</p>
        </div>

        <div class="important">
            <p><strong>Important:</strong> This is a template report. Actual submission must be completed through the STEERS online system at: <a href="https://www5.tceq.texas.gov/steers/">https://www5.tceq.texas.gov/steers/</a></p>
        </div>

        <div class="section">
            <h3>Facility Information</h3>
            <table>
                <tr><td><strong>Facility Name:</strong></td><td>${generatorInfo.companyName || 'Not Provided'}</td></tr>
                <tr><td><strong>EPA ID:</strong></td><td>${generatorInfo.epaId || 'Not Assigned'}</td></tr>
                <tr><td><strong>TCEQ ID:</strong></td><td>${generatorInfo.tceqId || 'Not Assigned'}</td></tr>
                <tr><td><strong>Reporting Year:</strong></td><td>${currentYear}</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>Waste Types Generated</h3>
            <table>
                <tr><th>Texas Waste Code</th><th>Classification</th><th>Description</th><th>Estimated Annual Quantity (tons)</th></tr>
                ${(results.stateWasteCodes || []).map(code =>
                  `<tr>
                    <td>${code.texasWasteCode || 'TBD'}</td>
                    <td>${code.classification || 'TBD'}</td>
                    <td>${code.description || 'TBD'}</td>
                    <td>[To be filled in]</td>
                  </tr>`
                ).join('')}
                ${results.stateWasteCodes?.length === 0 ? '<tr><td colspan="4">No waste codes identified</td></tr>' : ''}
            </table>
        </div>

        <div class="section">
            <h3>Disposal Methods</h3>
            <table>
                <tr><th>Waste Code</th><th>Disposal Method</th><th>Facility Name</th><th>Permit Number</th></tr>
                <tr><td colspan="4">[To be completed by generator]</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>Instructions for Completion</h3>
            <ol>
                <li>Log into the STEERS system at <a href="https://www5.tceq.texas.gov/steers/">https://www5.tceq.texas.gov/steers/</a></li>
                <li>Enter the waste quantities generated during ${currentYear}</li>
                <li>Provide disposal facility information for each waste stream</li>
                <li>Submit the report by March 1, ${currentYear + 1}</li>
                <li>Pay any required fees</li>
            </ol>
        </div>

        <div class="footer" style="margin-top: 30px; font-size: 10px; color: #666;">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>For questions, contact TCEQ Waste Permits Division at (512) 239-2334</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate Oklahoma SQG Certification HTML
   */
  generateSQGCertificationHTML(results, generatorInfo) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Oklahoma Small Quantity Generator Self-Certification</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; }
            .section h3 { margin-top: 0; background-color: #f0f0f0; padding: 10px; margin: -15px -15px 15px -15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .checkbox { margin-right: 10px; }
            .signature-line { margin-top: 30px; border-bottom: 1px solid #000; width: 300px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Oklahoma Department of Environmental Quality</h1>
            <h2>Small Quantity Generator Self-Certification</h2>
        </div>

        <div class="section">
            <h3>Generator Information</h3>
            <table>
                <tr><td><strong>Generator Name:</strong></td><td>${generatorInfo.companyName || 'Not Provided'}</td></tr>
                <tr><td><strong>EPA ID Number:</strong></td><td>${generatorInfo.epaId || 'Not Assigned'}</td></tr>
                <tr><td><strong>Address:</strong></td><td>${generatorInfo.address || 'Not Provided'}</td></tr>
                <tr><td><strong>Contact Person:</strong></td><td>${generatorInfo.contact || 'Not Provided'}</td></tr>
                <tr><td><strong>Phone:</strong></td><td>${generatorInfo.phone || 'Not Provided'}</td></tr>
                <tr><td><strong>Email:</strong></td><td>${generatorInfo.email || 'Not Provided'}</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>Small Quantity Generator Certification</h3>
            <p>I certify that this facility is a Small Quantity Generator (SQG) that:</p>
            <p>☐ Generates greater than 220 pounds (100 kg) but less than 2,200 pounds (1,000 kg) of hazardous waste per calendar month</p>
            <p>☐ Never accumulates more than 13,200 pounds (6,000 kg) of hazardous waste at any time</p>
            <p>☐ Ships hazardous waste offsite within 180 days (270 days if shipping >200 miles)</p>
        </div>

        <div class="section">
            <h3>Waste Types</h3>
            <table>
                <tr><th>EPA Waste Code</th><th>Description</th><th>Estimated Monthly Generation (lbs)</th></tr>
                ${(results.rcraWasteCodes || []).map(code =>
                  `<tr>
                    <td>${code.code}</td>
                    <td>${code.description}</td>
                    <td>[To be filled in]</td>
                  </tr>`
                ).join('')}
                ${results.rcraWasteCodes?.length === 0 ? '<tr><td colspan="3">No RCRA waste codes identified</td></tr>' : ''}
            </table>
        </div>

        <div class="section">
            <h3>Management Practices</h3>
            <p>I certify that this facility:</p>
            <p>☐ Has obtained an EPA ID number</p>
            <p>☐ Properly identifies and characterizes hazardous waste</p>
            <p>☐ Uses appropriate containers and labeling</p>
            <p>☐ Uses licensed hazardous waste transporters</p>
            <p>☐ Ships waste to permitted disposal facilities</p>
            <p>☐ Uses proper manifests for all shipments</p>
            <p>☐ Maintains records as required by regulations</p>
        </div>

        <div class="section">
            <h3>Certification Statement</h3>
            <p>I certify under penalty of law that I have personally examined and am familiar with the information submitted in this certification and all attached documents, and that based on my inquiry of those individuals immediately responsible for obtaining the information, I believe that the submitted information is true, accurate, and complete.</p>

            <div style="margin-top: 30px;">
                <div class="signature-line"></div>
                <p style="margin-top: 5px;"><strong>Authorized Representative Signature</strong></p>
            </div>

            <div style="margin-top: 20px;">
                <div class="signature-line"></div>
                <p style="margin-top: 5px;"><strong>Print Name and Title</strong></p>
            </div>

            <div style="margin-top: 20px;">
                <div class="signature-line"></div>
                <p style="margin-top: 5px;"><strong>Date</strong></p>
            </div>
        </div>

        <div class="footer" style="margin-top: 30px; font-size: 10px; color: #666;">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Submit to: Oklahoma DEQ, Land Protection Division</p>
            <p>For questions, contact: (405) 702-5100</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate EPA Form 8700-12 HTML
   */
  generateEPAForm8700HTML(results, generatorInfo) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>EPA Form 8700-12 - Site Identification</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .form-section { margin-bottom: 20px; padding: 15px; border: 2px solid #000; }
            .form-section h3 { margin-top: 0; background-color: #000; color: white; padding: 10px; margin: -15px -15px 15px -15px; }
            .form-row { display: flex; margin-bottom: 10px; }
            .form-field { flex: 1; margin-right: 20px; }
            .form-field label { display: block; font-weight: bold; }
            .form-field input { width: 100%; padding: 5px; border: 1px solid #ccc; }
            .checkbox-group { display: flex; flex-wrap: wrap; }
            .checkbox-item { margin-right: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 5px; text-align: left; }
            th { background-color: #f0f0f0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>EPA Form 8700-12</h1>
            <h2>Notification of Regulated Waste Activity</h2>
            <p>Resource Conservation and Recovery Act (RCRA)</p>
        </div>

        <div class="form-section">
            <h3>Section I: Installation Information</h3>
            <div class="form-row">
                <div class="form-field">
                    <label>1. Installation EPA ID No.:</label>
                    <input type="text" value="${generatorInfo.epaId || ''}" />
                </div>
                <div class="form-field">
                    <label>2. Installation Name:</label>
                    <input type="text" value="${generatorInfo.companyName || ''}" />
                </div>
            </div>

            <div class="form-row">
                <div class="form-field">
                    <label>3. Installation Mailing Address:</label>
                    <input type="text" value="${generatorInfo.address || ''}" />
                </div>
            </div>

            <div class="form-row">
                <div class="form-field">
                    <label>4. Installation Physical Address:</label>
                    <input type="text" value="${generatorInfo.physicalAddress || generatorInfo.address || ''}" />
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3>Section II: Owner and Operator Information</h3>
            <div class="form-row">
                <div class="form-field">
                    <label>5A. Legal Owner Name:</label>
                    <input type="text" value="${generatorInfo.ownerName || generatorInfo.companyName || ''}" />
                </div>
            </div>

            <div class="form-row">
                <div class="form-field">
                    <label>5B. Operator Name:</label>
                    <input type="text" value="${generatorInfo.operatorName || generatorInfo.companyName || ''}" />
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3>Section III: Type of Regulated Waste Activity</h3>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="generator" checked />
                    <label for="generator">Generator</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="transporter" />
                    <label for="transporter">Transporter</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="treatment" />
                    <label for="treatment">Treatment, Storage, or Disposal Facility</label>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3>Section IV: Waste Codes</h3>
            <table>
                <tr><th>Federal Waste Codes</th><th>State Waste Codes</th></tr>
                <tr>
                    <td>
                        ${(results.rcraWasteCodes || []).map(code => code.code).join(', ') || 'None identified'}
                    </td>
                    <td>
                        ${(results.stateWasteCodes || []).map(code => code.code || code.texasWasteCode).join(', ') || 'None identified'}
                    </td>
                </tr>
            </table>
        </div>

        <div class="form-section">
            <h3>Section V: Certification</h3>
            <p>I certify under penalty of law that this document and all attachments were prepared under my direction or supervision in accordance with a system designed to assure that qualified personnel properly gather and evaluate the information submitted. The information submitted is, to the best of my knowledge and belief, true, accurate, and complete.</p>

            <div style="margin-top: 30px;">
                <div style="border-bottom: 1px solid #000; width: 300px; margin-bottom: 5px;"></div>
                <p><strong>Signature of Certifying Official</strong></p>
            </div>

            <div style="margin-top: 20px;">
                <div style="border-bottom: 1px solid #000; width: 200px; margin-bottom: 5px;"></div>
                <p><strong>Date Signed</strong></p>
            </div>
        </div>

        <div class="footer" style="margin-top: 30px; font-size: 10px;">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Submit to appropriate EPA Regional Office and state agency</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate comprehensive summary report
   */
  generateSummaryHTML(results, generatorInfo, selectedState) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Waste Classification Summary Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; }
            .section h3 { margin-top: 0; background-color: #f0f0f0; padding: 10px; margin: -15px -15px 15px -15px; }
            .classification-result { background-color: ${results.classification === 'hazardous' ? '#ffe6e6' : '#e6ffe6'}; padding: 15px; border-left: 5px solid ${results.classification === 'hazardous' ? '#cc0000' : '#00cc00'}; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .reasoning { background-color: #f9f9f9; padding: 10px; border-left: 3px solid #0066cc; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Waste Classification Summary Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>State: ${selectedState}</p>
        </div>

        <div class="classification-result">
            <h2>Final Classification: ${results.classification.toUpperCase()}</h2>
            <p><strong>Material State:</strong> ${results.materialState}</p>
            <p><strong>Confidence Level:</strong> ${Math.round((results.confidence || 0) * 100)}%</p>
        </div>

        <div class="section">
            <h3>Generator Information</h3>
            <table>
                <tr><td><strong>Company:</strong></td><td>${generatorInfo.companyName || 'Not Provided'}</td></tr>
                <tr><td><strong>EPA ID:</strong></td><td>${generatorInfo.epaId || 'Not Assigned'}</td></tr>
                <tr><td><strong>State:</strong></td><td>${selectedState}</td></tr>
                <tr><td><strong>Contact:</strong></td><td>${generatorInfo.contact || 'Not Provided'}</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>RCRA Waste Codes</h3>
            ${results.rcraWasteCodes && results.rcraWasteCodes.length > 0 ?
              `<table>
                <tr><th>Code</th><th>Description</th><th>Reason</th></tr>
                ${results.rcraWasteCodes.map(code =>
                  `<tr><td>${code.code}</td><td>${code.description}</td><td>${code.reason}</td></tr>`
                ).join('')}
              </table>` :
              '<p>No RCRA hazardous waste codes apply.</p>'
            }
        </div>

        <div class="section">
            <h3>State Waste Codes</h3>
            ${results.stateWasteCodes && results.stateWasteCodes.length > 0 ?
              `<table>
                <tr><th>Code</th><th>Classification</th><th>Description</th></tr>
                ${results.stateWasteCodes.map(code =>
                  `<tr><td>${code.texasWasteCode || code.code}</td><td>${code.classification}</td><td>${code.description}</td></tr>`
                ).join('')}
              </table>` :
              '<p>No state-specific waste codes apply.</p>'
            }
        </div>

        <div class="section">
            <h3>Compliance Requirements</h3>
            <ul>
                ${(results.complianceRequirements || ['Standard waste management practices']).map(req => `<li>${req}</li>`).join('')}
            </ul>
        </div>

        <div class="reasoning">
            <h3>Classification Reasoning</h3>
            <ol>
                ${(results.reasoning || ['No specific reasoning provided']).map(reason => `<li>${reason}</li>`).join('')}
            </ol>
        </div>

        <div class="footer" style="margin-top: 30px; font-size: 10px; color: #666;">
            <p>This report was generated by the AI Waste Classification System</p>
            <p>Classification decisions should be reviewed by qualified environmental professionals</p>
        </div>
    </body>
    </html>
    `;
  }

  // Utility methods

  generateTexasClassificationDetermination(results) {
    return {
      isHazardous: results.classification === 'hazardous',
      texasClass: results.stateWasteCodes?.[0]?.classification || 'TBD',
      reasoning: results.reasoning || []
    };
  }

  formatWasteDescriptions(results) {
    const descriptions = [];

    if (results.rcraWasteCodes) {
      descriptions.push(...results.rcraWasteCodes.map(code => `${code.code}: ${code.description}`));
    }

    if (results.stateWasteCodes) {
      descriptions.push(...results.stateWasteCodes.map(code => `${code.code || code.texasWasteCode}: ${code.description}`));
    }

    return descriptions;
  }

  formatComposition(results) {
    // This would format the chemical composition from SDS data
    return 'See attached SDS for detailed composition';
  }

  isSQG(generatorInfo) {
    // Determine if generator is Small Quantity Generator
    // This would be based on monthly generation amounts
    const monthlyGeneration = generatorInfo.monthlyGeneration?.hazardous || 0;
    return monthlyGeneration >= 220 && monthlyGeneration < 2200; // pounds per month
  }

  generateManifestHTML(results, generatorInfo) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Uniform Hazardous Waste Manifest Template</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .manifest-form { border: 2px solid #000; padding: 20px; }
            .manifest-header { text-align: center; font-weight: bold; margin-bottom: 20px; }
            .manifest-section { margin-bottom: 15px; border: 1px solid #000; padding: 10px; }
            .manifest-section h4 { margin-top: 0; background-color: #f0f0f0; padding: 5px; margin: -10px -10px 10px -10px; }
            .manifest-field { margin-bottom: 5px; }
            .manifest-field label { font-weight: bold; margin-right: 10px; }
        </style>
    </head>
    <body>
        <div class="manifest-form">
            <div class="manifest-header">
                <h2>UNIFORM HAZARDOUS WASTE MANIFEST</h2>
                <p>Continuation Sheet for U.S. EPA Form 8700-22</p>
            </div>

            <div class="manifest-section">
                <h4>Generator Information</h4>
                <div class="manifest-field">
                    <label>Generator Name:</label> ${generatorInfo.companyName || 'TBD'}
                </div>
                <div class="manifest-field">
                    <label>EPA ID No.:</label> ${generatorInfo.epaId || 'TBD'}
                </div>
                <div class="manifest-field">
                    <label>Address:</label> ${generatorInfo.address || 'TBD'}
                </div>
            </div>

            <div class="manifest-section">
                <h4>Waste Description</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <th style="border: 1px solid #000; padding: 5px;">EPA Waste Codes</th>
                        <th style="border: 1px solid #000; padding: 5px;">State Waste Codes</th>
                        <th style="border: 1px solid #000; padding: 5px;">Description</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000; padding: 5px;">
                            ${(results.rcraWasteCodes || []).map(code => code.code).join(', ') || 'None'}
                        </td>
                        <td style="border: 1px solid #000; padding: 5px;">
                            ${(results.stateWasteCodes || []).map(code => code.texasWasteCode || code.code).join(', ') || 'None'}
                        </td>
                        <td style="border: 1px solid #000; padding: 5px;">
                            ${results.wasteStreamName || 'TBD'}
                        </td>
                    </tr>
                </table>
            </div>

            <div class="manifest-section">
                <h4>Instructions</h4>
                <p>This is a template. Complete the actual manifest using:</p>
                <ul>
                    <li>EPA Form 8700-22 (Uniform Hazardous Waste Manifest)</li>
                    <li>EPA Form 8700-22A (Continuation Sheet) if needed</li>
                    <li>Ensure all parties sign the manifest</li>
                    <li>Retain copies as required by regulations</li>
                </ul>
            </div>
        </div>

        <div class="footer" style="margin-top: 20px; font-size: 10px;">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>This is a template only - use official EPA forms for actual shipments</p>
        </div>
    </body>
    </html>
    `;
  }
}

export default FormGenerationSystem;