import React, { useState, useEffect } from 'react';
import { generateEOPReport, exportToPDF } from '../utils/reportGenerator';

const EndOfPeriodModal = ({
  isOpen,
  onClose,
  cards = [],
  lanes = [],
  statuses = [],
  onArchiveComplete,
  currentPeriod = new Date().getFullYear()
}) => {
  const [step, setStep] = useState(1); // 1: Confirmation, 2: Generating Report, 3: Next Period Setup
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nextPeriodData, setNextPeriodData] = useState({
    year: new Date().getFullYear() + 1,
    targetRevenue: '',
    goals: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && step === 1) {
      // Pre-calculate report data for preview
      const data = calculateReportMetrics();
      setReportData(data);
    }
  }, [isOpen, cards, step]);

  const calculateReportMetrics = () => {
    const currentYear = new Date().getFullYear();
    const currentYearCards = cards.filter(card => {
      const cardYear = new Date(card.created).getFullYear();
      return cardYear === currentYear;
    });

    // Revenue realized (from completed/billed jobs)
    const completedCards = currentYearCards.filter(card =>
      card.status === 'Job Complete' ||
      card.status === 'Billed' ||
      card.status === 'Completed'
    );
    const revenueRealized = completedCards.reduce((sum, card) => {
      const revenue = parseFloat(card.revenue || 0);
      return sum + revenue;
    }, 0);

    // Jobs completed
    const jobsCompleted = completedCards.length;

    // Jobs quoted (estimates/proposals submitted)
    const quotedCards = currentYearCards.filter(card =>
      card.status === 'Quote Submitted' ||
      card.status === 'Proposal Sent' ||
      card.status === 'Estimate Provided'
    );
    const jobsQuoted = quotedCards.length;
    const quoteValue = quotedCards.reduce((sum, card) => {
      const revenue = parseFloat(card.revenue || 0);
      return sum + revenue;
    }, 0);

    // Leads added
    const leadsAdded = currentYearCards.filter(card =>
      card.status === 'Lead' ||
      card.status === 'New Lead' ||
      card.status === 'Initial Contact'
    ).length;

    // Active jobs (continuing to next period)
    const activeCards = cards.filter(card =>
      card.status !== 'Job Complete' &&
      card.status !== 'Billed' &&
      card.status !== 'Completed' &&
      card.status !== 'Cancelled'
    );

    // Pipeline value (active jobs value)
    const pipelineValue = activeCards.reduce((sum, card) => {
      const revenue = parseFloat(card.revenue || 0);
      return sum + revenue;
    }, 0);

    // Conversion rate
    const totalLeads = currentYearCards.filter(card =>
      card.status === 'Lead' ||
      card.status === 'New Lead' ||
      card.status === 'Initial Contact' ||
      completedCards.includes(card) ||
      quotedCards.includes(card)
    ).length;
    const conversionRate = totalLeads > 0 ? (jobsCompleted / totalLeads) * 100 : 0;

    return {
      period: currentYear,
      revenueRealized,
      jobsCompleted,
      jobsQuoted,
      quoteValue,
      leadsAdded,
      activeJobs: activeCards.length,
      pipelineValue,
      conversionRate,
      completedCards,
      activeCards,
      totalCards: currentYearCards.length
    };
  };

  const handleConfirmArchive = async () => {
    setStep(2);
    setIsGenerating(true);

    try {
      // Generate and save the EOP report
      const report = await generateEOPReport(reportData, cards, lanes, statuses);

      // Export to PDF
      await exportToPDF(report, `EOP_Report_${reportData.period}`);

      // Archive completed jobs
      const archivedJobs = reportData.completedCards.map(card => ({
        ...card,
        archived: true,
        archivedDate: new Date().toISOString(),
        archivedPeriod: reportData.period
      }));

      // Save to EOP Reports folder (localStorage for now)
      const eopReports = JSON.parse(localStorage.getItem('eopReports') || '[]');
      eopReports.push({
        id: Date.now(),
        period: reportData.period,
        generatedDate: new Date().toISOString(),
        reportData: reportData,
        archivedJobs: archivedJobs
      });
      localStorage.setItem('eopReports', JSON.stringify(eopReports));

      setIsGenerating(false);
      setStep(3);
    } catch (error) {
      console.error('Error generating EOP report:', error);
      alert('Error generating report. Please try again.');
      setIsGenerating(false);
      setStep(1);
    }
  };

  const handleNextPeriodSetup = () => {
    // Remove completed jobs from active cards
    const remainingCards = cards.filter(card =>
      card.status !== 'Job Complete' &&
      card.status !== 'Billed' &&
      card.status !== 'Completed'
    );

    onArchiveComplete(remainingCards, nextPeriodData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

        {/* Step 1: Confirmation and Preview */}
        {step === 1 && (
          <>
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
              <h2 className="text-2xl font-bold">Close Sales Period {currentPeriod}</h2>
              <p className="text-orange-100 mt-1">Review period performance and archive completed jobs</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {reportData && (
                <div className="space-y-6">
                  {/* Performance Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-800">
                        ${reportData.revenueRealized.toLocaleString()}
                      </div>
                      <div className="text-sm text-green-600">Revenue Realized</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-800">
                        {reportData.jobsCompleted}
                      </div>
                      <div className="text-sm text-blue-600">Jobs Completed</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-800">
                        {reportData.jobsQuoted}
                      </div>
                      <div className="text-sm text-purple-600">Jobs Quoted</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-800">
                        {reportData.leadsAdded}
                      </div>
                      <div className="text-sm text-yellow-600">Leads Added</div>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-lg font-semibold text-gray-800">
                        ${reportData.quoteValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Quote Value</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-lg font-semibold text-gray-800">
                        ${reportData.pipelineValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Pipeline Value</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-lg font-semibold text-gray-800">
                        {reportData.conversionRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Conversion Rate</div>
                    </div>
                  </div>

                  {/* Archive Preview */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-orange-800 mb-2">
                      📦 Jobs to be Archived ({reportData.completedCards.length})
                    </h3>
                    <div className="text-sm text-orange-700">
                      Completed jobs will be moved to archive and included in the EOP report.
                      Active jobs ({reportData.activeJobs}) will continue to next period.
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-800 mb-2">⚠️ Important</h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• This action will generate an EOP report and archive completed jobs</li>
                      <li>• A PDF report will be downloaded automatically</li>
                      <li>• Archived jobs will be moved to the EOP Reports section</li>
                      <li>• Active jobs will remain on the board for next period</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium"
              >
                Confirm & Close Period
              </button>
            </div>
          </>
        )}

        {/* Step 2: Generating Report */}
        {step === 2 && (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <h2 className="text-2xl font-bold">Processing End of Period</h2>
              <p className="text-blue-100 mt-1">Generating reports and archiving data...</p>
            </div>

            <div className="p-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-lg font-medium text-gray-700">
                  {isGenerating ? 'Generating EOP Report...' : 'Processing Complete!'}
                </div>
                <div className="text-sm text-gray-500 max-w-md">
                  Creating comprehensive end-of-period report, archiving completed jobs,
                  and preparing data for next sales period.
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Next Period Setup */}
        {step === 3 && (
          <>
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <h2 className="text-2xl font-bold">Setup Next Sales Period</h2>
              <p className="text-green-100 mt-1">Configure goals and targets for {nextPeriodData.year}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Period Year
                </label>
                <input
                  type="number"
                  value={nextPeriodData.year}
                  onChange={(e) => setNextPeriodData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Revenue ($)
                </label>
                <input
                  type="number"
                  value={nextPeriodData.targetRevenue}
                  onChange={(e) => setNextPeriodData(prev => ({ ...prev, targetRevenue: e.target.value }))}
                  placeholder="Enter target revenue for next period"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goals & Objectives
                </label>
                <textarea
                  value={nextPeriodData.goals}
                  onChange={(e) => setNextPeriodData(prev => ({ ...prev, goals: e.target.value }))}
                  placeholder="Enter goals and objectives for next period"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={nextPeriodData.notes}
                  onChange={(e) => setNextPeriodData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes or considerations"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Active jobs will continue to next period. Locations remain unchanged.
              </div>
              <button
                onClick={handleNextPeriodSetup}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium"
              >
                Start Next Period
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EndOfPeriodModal;