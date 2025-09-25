// Report Generator for End of Period (EOP) Reports

export const generateEOPReport = async (reportData, cards, lanes, statuses) => {
  const report = {
    id: Date.now(),
    title: `End of Period Report - ${reportData.period}`,
    generatedDate: new Date().toISOString(),
    period: reportData.period,
    summary: {
      revenueRealized: reportData.revenueRealized,
      jobsCompleted: reportData.jobsCompleted,
      jobsQuoted: reportData.jobsQuoted,
      quoteValue: reportData.quoteValue,
      leadsAdded: reportData.leadsAdded,
      activeJobs: reportData.activeJobs,
      pipelineValue: reportData.pipelineValue,
      conversionRate: reportData.conversionRate,
      totalCards: reportData.totalCards
    },
    detailedBreakdown: generateDetailedBreakdown(reportData, cards, lanes, statuses),
    projections: generateNextPeriodProjections(reportData),
    completedJobs: reportData.completedCards.map(card => ({
      id: card.id,
      title: card.title,
      customerName: card.customerName,
      revenue: card.revenue,
      completedDate: card.updated,
      location: card.location,
      jobNumber: card.jobNumber
    })),
    recommendations: generateRecommendations(reportData)
  };

  return report;
};

const generateDetailedBreakdown = (reportData, cards, lanes, statuses) => {
  const breakdown = {
    byLocation: {},
    byStatus: {},
    byMonth: {},
    topPerformers: []
  };

  // Breakdown by location
  lanes.forEach(lane => {
    const laneCards = cards.filter(card => card.location === lane.name);
    const completedLaneCards = laneCards.filter(card =>
      card.status === 'Job Complete' || card.status === 'Billed' || card.status === 'Completed'
    );
    const laneRevenue = completedLaneCards.reduce((sum, card) => sum + parseFloat(card.revenue || 0), 0);

    breakdown.byLocation[lane.name] = {
      totalJobs: laneCards.length,
      completedJobs: completedLaneCards.length,
      revenue: laneRevenue,
      activeJobs: laneCards.filter(card =>
        card.status !== 'Job Complete' && card.status !== 'Billed' && card.status !== 'Completed'
      ).length
    };
  });

  // Breakdown by status
  statuses.forEach(status => {
    const statusCards = cards.filter(card => card.status === status.name);
    const statusRevenue = statusCards.reduce((sum, card) => sum + parseFloat(card.revenue || 0), 0);

    breakdown.byStatus[status.name] = {
      count: statusCards.length,
      revenue: statusRevenue,
      percentage: (statusCards.length / cards.length) * 100
    };
  });

  // Breakdown by month
  const currentYear = new Date().getFullYear();
  for (let month = 0; month < 12; month++) {
    const monthCards = cards.filter(card => {
      const cardDate = new Date(card.created);
      return cardDate.getFullYear() === currentYear && cardDate.getMonth() === month;
    });

    const monthName = new Date(currentYear, month, 1).toLocaleString('default', { month: 'long' });
    breakdown.byMonth[monthName] = {
      newJobs: monthCards.length,
      revenue: monthCards.reduce((sum, card) => sum + parseFloat(card.revenue || 0), 0)
    };
  }

  // Top performers (by revenue)
  breakdown.topPerformers = reportData.completedCards
    .sort((a, b) => parseFloat(b.revenue || 0) - parseFloat(a.revenue || 0))
    .slice(0, 10)
    .map(card => ({
      title: card.title,
      customerName: card.customerName,
      revenue: parseFloat(card.revenue || 0),
      location: card.location
    }));

  return breakdown;
};

const generateNextPeriodProjections = (reportData) => {
  const currentRevenue = reportData.revenueRealized;
  const pipelineValue = reportData.pipelineValue;
  const conversionRate = reportData.conversionRate / 100;

  // Simple projections based on current data
  const projectedRevenue = Math.round(pipelineValue * conversionRate);
  const projectedGrowth = currentRevenue > 0 ? ((projectedRevenue / currentRevenue) - 1) * 100 : 0;

  return {
    projectedRevenue,
    projectedGrowth,
    pipelineValue,
    estimatedConversionRate: reportData.conversionRate,
    recommendedTargets: {
      revenue: Math.round(currentRevenue * 1.1), // 10% growth target
      newLeads: Math.round(reportData.leadsAdded * 1.05), // 5% increase in leads
      conversionRate: Math.min(reportData.conversionRate + 2, 100) // 2% improvement in conversion
    }
  };
};

const generateRecommendations = (reportData) => {
  const recommendations = [];

  // Revenue-based recommendations
  if (reportData.conversionRate < 20) {
    recommendations.push({
      type: 'conversion',
      priority: 'high',
      title: 'Improve Lead Conversion',
      description: `Current conversion rate of ${reportData.conversionRate.toFixed(1)}% is below industry average. Focus on lead qualification and follow-up processes.`
    });
  }

  // Pipeline recommendations
  if (reportData.pipelineValue < reportData.revenueRealized * 0.5) {
    recommendations.push({
      type: 'pipeline',
      priority: 'medium',
      title: 'Build Pipeline',
      description: 'Pipeline value is low compared to realized revenue. Increase prospecting and quote activity.'
    });
  }

  // Quote recommendations
  if (reportData.jobsQuoted > reportData.jobsCompleted * 3) {
    recommendations.push({
      type: 'quotes',
      priority: 'medium',
      title: 'Improve Quote-to-Close Ratio',
      description: 'High quote volume with lower completion rate. Review pricing strategy and quote quality.'
    });
  }

  // Growth recommendations
  if (reportData.revenueRealized > 0) {
    recommendations.push({
      type: 'growth',
      priority: 'low',
      title: 'Plan for Growth',
      description: `Consider setting next period target 10-15% above current revenue of $${reportData.revenueRealized.toLocaleString()}.`
    });
  }

  return recommendations;
};

export const exportToPDF = async (report, filename) => {
  // Create HTML content for PDF export
  const htmlContent = generateHTMLReport(report);

  // Create a blob with the HTML content
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.html`; // HTML for now, can be converted to PDF with jsPDF if needed
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);

  return true;
};

const generateHTMLReport = (report) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .recommendation { background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 10px 0; }
        .recommendation.medium { border-left-color: #ffc107; }
        .recommendation.high { border-left-color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>Generated on: ${new Date(report.generatedDate).toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">$${report.summary.revenueRealized.toLocaleString()}</div>
                <div class="metric-label">Revenue Realized</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.jobsCompleted}</div>
                <div class="metric-label">Jobs Completed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.jobsQuoted}</div>
                <div class="metric-label">Jobs Quoted</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.leadsAdded}</div>
                <div class="metric-label">Leads Added</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${report.summary.quoteValue.toLocaleString()}</div>
                <div class="metric-label">Quote Value</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${report.summary.pipelineValue.toLocaleString()}</div>
                <div class="metric-label">Pipeline Value</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.conversionRate.toFixed(1)}%</div>
                <div class="metric-label">Conversion Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.activeJobs}</div>
                <div class="metric-label">Active Jobs</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Performance by Location</h2>
        <table>
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Total Jobs</th>
                    <th>Completed Jobs</th>
                    <th>Revenue</th>
                    <th>Active Jobs</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.detailedBreakdown.byLocation).map(([location, data]) => `
                    <tr>
                        <td>${location}</td>
                        <td>${data.totalJobs}</td>
                        <td>${data.completedJobs}</td>
                        <td>$${data.revenue.toLocaleString()}</td>
                        <td>${data.activeJobs}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2 class="section-title">Top Performing Jobs</h2>
        <table>
            <thead>
                <tr>
                    <th>Project Title</th>
                    <th>Customer</th>
                    <th>Revenue</th>
                    <th>Location</th>
                </tr>
            </thead>
            <tbody>
                ${report.detailedBreakdown.topPerformers.map(job => `
                    <tr>
                        <td>${job.title}</td>
                        <td>${job.customerName}</td>
                        <td>$${job.revenue.toLocaleString()}</td>
                        <td>${job.location}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2 class="section-title">Next Period Projections</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">$${report.projections.projectedRevenue.toLocaleString()}</div>
                <div class="metric-label">Projected Revenue</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.projections.projectedGrowth.toFixed(1)}%</div>
                <div class="metric-label">Projected Growth</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${report.projections.recommendedTargets.revenue.toLocaleString()}</div>
                <div class="metric-label">Recommended Target</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2 class="section-title">Archived Jobs (${report.completedJobs.length})</h2>
        <table>
            <thead>
                <tr>
                    <th>Job Number</th>
                    <th>Project Title</th>
                    <th>Customer</th>
                    <th>Revenue</th>
                    <th>Location</th>
                </tr>
            </thead>
            <tbody>
                ${report.completedJobs.map(job => `
                    <tr>
                        <td>${job.jobNumber || 'N/A'}</td>
                        <td>${job.title}</td>
                        <td>${job.customerName}</td>
                        <td>$${parseFloat(job.revenue || 0).toLocaleString()}</td>
                        <td>${job.location}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
  `;
};

export default {
  generateEOPReport,
  exportToPDF
};