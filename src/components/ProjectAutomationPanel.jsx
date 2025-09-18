import React, { useState } from 'react';
import { Settings, Play, Pause, RotateCcw, Clock } from 'lucide-react';

const ProjectAutomationPanel = ({ 
  onAutomationToggle, 
  automationEnabled = false,
  onScheduleUpdate,
  currentSchedule = null 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [automationRules, setAutomationRules] = useState({
    autoProgressTasks: true,
    sendNotifications: true,
    updateTimelines: false,
    syncWithCalendar: true
  });

  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: 'daily',
    time: '09:00',
    daysOfWeek: ['monday', 'wednesday', 'friday']
  });

  const handleRuleChange = (rule, value) => {
    setAutomationRules(prev => ({
      ...prev,
      [rule]: value
    }));
  };

  const handleScheduleChange = (key, value) => {
    const newSchedule = {
      ...schedule,
      [key]: value
    };
    setSchedule(newSchedule);
    onScheduleUpdate && onScheduleUpdate(newSchedule);
  };

  const toggleDayOfWeek = (day) => {
    const currentDays = schedule.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    handleScheduleChange('daysOfWeek', newDays);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Project Automation</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAutomationToggle && onAutomationToggle(!automationEnabled)}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              automationEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {automationEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                Enabled
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Disabled
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Automation Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          {/* Automation Rules */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Automation Rules</h4>
            <div className="space-y-2">
              {Object.entries(automationRules).map(([rule, enabled]) => (
                <label key={rule} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleRuleChange(rule, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {rule === 'autoProgressTasks' && 'Auto-progress completed tasks'}
                    {rule === 'sendNotifications' && 'Send progress notifications'}
                    {rule === 'updateTimelines' && 'Update project timelines'}
                    {rule === 'syncWithCalendar' && 'Sync with calendar'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Automation Schedule
            </h4>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => handleScheduleChange('enabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable scheduled automation</span>
              </label>

              {schedule.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={schedule.frequency}
                        onChange={(e) => handleScheduleChange('frequency', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={schedule.time}
                        onChange={(e) => handleScheduleChange('time', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {schedule.frequency === 'weekly' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                          <button
                            key={day}
                            onClick={() => toggleDayOfWeek(day)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              schedule.daysOfWeek.includes(day)
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Display */}
      {automationEnabled && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">
              Automation Active
            </span>
          </div>
          <div className="text-xs text-green-600 mt-1">
            {schedule.enabled 
              ? `Next run: ${schedule.frequency} at ${schedule.time}`
              : 'Running continuously'
            }
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Trigger manual automation run
              console.log('Manual automation triggered');
            }}
            disabled={!automationEnabled}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-3 h-3" />
            Run Now
          </button>
          
          <button
            onClick={() => {
              // Reset automation settings
              setAutomationRules({
                autoProgressTasks: true,
                sendNotifications: true,
                updateTimelines: false,
                syncWithCalendar: true
              });
              setSchedule({
                enabled: false,
                frequency: 'daily',
                time: '09:00',
                daysOfWeek: ['monday', 'wednesday', 'friday']
              });
            }}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectAutomationPanel;