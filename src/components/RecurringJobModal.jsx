import React, { useState } from 'react';

const RecurringJobModal = ({
  isOpen,
  onClose,
  card = null,
  onSaveRecurring
}) => {
  const [recurringData, setRecurringData] = useState({
    isRecurring: card?.isRecurring || false,
    frequency: card?.recurringFrequency || 'monthly',
    interval: card?.recurringInterval || 1,
    startDate: card?.recurringStartDate || new Date().toISOString().split('T')[0],
    endDate: card?.recurringEndDate || '',
    nextDueDate: card?.nextDueDate || '',
    autoCreate: card?.autoCreateRecurring || true,
    notes: card?.recurringNotes || '',
    customPattern: card?.customPattern || ''
  });

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
    { value: 'custom', label: 'Custom Pattern' }
  ];

  const handleSave = () => {
    // Calculate next due date based on frequency
    const nextDue = calculateNextDueDate(recurringData);

    const updatedData = {
      ...recurringData,
      nextDueDate: nextDue
    };

    onSaveRecurring(card.id, updatedData);
    onClose();
  };

  const calculateNextDueDate = (data) => {
    const start = new Date(data.startDate);
    const now = new Date();
    let nextDate = new Date(start);

    // If start date is in the past, calculate next occurrence from now
    if (start < now) {
      nextDate = new Date(now);
    }

    switch (data.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + data.interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (data.interval * 7));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + data.interval);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + (data.interval * 3));
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + data.interval);
        break;
      default:
        // For custom patterns, use the start date
        break;
    }

    return nextDate.toISOString().split('T')[0];
  };

  const generatePreview = () => {
    if (!recurringData.isRecurring) return null;

    const preview = [];
    const start = new Date(recurringData.startDate);
    const end = recurringData.endDate ? new Date(recurringData.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

    let current = new Date(start);
    let count = 0;

    while (current <= end && count < 10) { // Show max 10 occurrences
      preview.push(new Date(current));

      switch (recurringData.frequency) {
        case 'daily':
          current.setDate(current.getDate() + recurringData.interval);
          break;
        case 'weekly':
          current.setDate(current.getDate() + (recurringData.interval * 7));
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + recurringData.interval);
          break;
        case 'quarterly':
          current.setMonth(current.getMonth() + (recurringData.interval * 3));
          break;
        case 'annually':
          current.setFullYear(current.getFullYear() + recurringData.interval);
          break;
        default:
          current = end; // Break for custom patterns
          break;
      }
      count++;
    }

    return preview;
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <h2 className="text-xl font-bold">Recurring Job Settings</h2>
          <p className="text-purple-100 mt-1">{card.title} - {card.customerName}</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">

          {/* Enable Recurring */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={recurringData.isRecurring}
              onChange={(e) => setRecurringData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
              Make this job recurring
            </label>
          </div>

          {recurringData.isRecurring && (
            <>
              {/* Frequency Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={recurringData.frequency}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {frequencyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interval (Every X {recurringData.frequency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={recurringData.interval}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Custom Pattern */}
              {recurringData.frequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Pattern Description
                  </label>
                  <input
                    type="text"
                    value={recurringData.customPattern}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, customPattern: e.target.value }))}
                    placeholder="e.g., 1st and 15th of each month, Every 3rd Tuesday"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Date Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={recurringData.startDate}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={recurringData.endDate}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Auto-create Settings */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="autoCreate"
                    checked={recurringData.autoCreate}
                    onChange={(e) => setRecurringData(prev => ({ ...prev, autoCreate: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoCreate" className="text-sm font-medium text-gray-700">
                    Automatically create new jobs
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  When enabled, new jobs will be automatically added to the "Scheduled" column based on the recurring schedule.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recurring Notes
                </label>
                <textarea
                  value={recurringData.notes}
                  onChange={(e) => setRecurringData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions for recurring jobs..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Preview Schedule</h4>
                {generatePreview() && (
                  <div className="space-y-1">
                    {generatePreview().map((date, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {index + 1}. {date.toLocaleDateString()} ({date.toLocaleDateString('en-US', { weekday: 'long' })})
                      </div>
                    ))}
                    {generatePreview().length >= 10 && (
                      <div className="text-xs text-gray-500">... and more</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium"
          >
            Save Recurring Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringJobModal;