import React, { useState, useEffect } from 'react';
import { ChemicalCompatibilityEngine } from '../engines/ChemicalCompatibilityEngine.js';
import { 
  Brain, 
  TrendingUp, 
  Database, 
  Users, 
  Target, 
  Download, 
  Upload, 
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function LearningEngineMonitor() {
  const [stats, setStats] = useState(null);
  const [compatibilityEngine] = useState(new ChemicalCompatibilityEngine());
  const [expandedSection, setExpandedSection] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  useEffect(() => {
    const updateStats = () => {
      setStats(compatibilityEngine.getLearningStatistics());
    };

    updateStats(); // Initial load
    const interval = setInterval(updateStats, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, compatibilityEngine]);

  const exportData = () => {
    const data = compatibilityEngine.exportLearningData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const success = compatibilityEngine.importLearningData(data);
          if (success) {
            alert('Learning data imported successfully!');
            setStats(compatibilityEngine.getLearningStatistics());
          } else {
            alert('Failed to import learning data. Invalid format.');
          }
        } catch (error) {
          alert('Failed to parse learning data file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all learning data? This cannot be undone.')) {
      compatibilityEngine.clearLearningData();
      setStats(compatibilityEngine.getLearningStatistics());
      alert('Learning data cleared.');
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10B981'; // Green
    if (confidence >= 0.6) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.7) return <CheckCircle className="w-4 h-4" style={{ color: getConfidenceColor(confidence) }} />;
    return <AlertCircle className="w-4 h-4" style={{ color: getConfidenceColor(confidence) }} />;
  };

  if (!stats) {
    return (
      <div className="learning-monitor-loading">
        <Brain className="w-8 h-8 animate-spin" />
        <p>Loading learning statistics...</p>
      </div>
    );
  }

  return (
    <div className="learning-engine-monitor">
      <div className="monitor-header">
        <div className="header-title">
          <Brain className="w-6 h-6" />
          <h2>Adaptive Learning Engine Monitor</h2>
          <div className="refresh-controls">
            <label>
              Refresh every:
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </label>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={exportData} className="action-btn export">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <label className="action-btn import">
            <Upload className="w-4 h-4" />
            Import Data
            <input 
              type="file" 
              accept=".json" 
              onChange={importData} 
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={clearData} className="action-btn clear">
            <RotateCcw className="w-4 h-4" />
            Clear Data
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Database className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <h3>Total Classifications</h3>
            <div className="stat-value">{stats.totalClassifications}</div>
            <div className="stat-subtitle">Historical decisions recorded</div>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">
            <Target className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <h3>Unique Materials</h3>
            <div className="stat-value">{stats.uniqueMaterials}</div>
            <div className="stat-subtitle">Different materials learned</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <h3>High Confidence</h3>
            <div className="stat-value">{stats.highConfidenceMaterials}</div>
            <div className="stat-subtitle">
              Materials above {(stats.confidenceThreshold * 100).toFixed(0)}% confidence
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-content">
            <h3>Last Updated</h3>
            <div className="stat-value">
              {new Date(stats.lastUpdated).toLocaleDateString()}
            </div>
            <div className="stat-subtitle">
              {new Date(stats.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="details-section">
        <div className="section-header">
          <h3>Classification Breakdown</h3>
          <button 
            onClick={() => setExpandedSection(expandedSection === 'classifications' ? null : 'classifications')}
            className="expand-btn"
          >
            <Eye className="w-4 h-4" />
            {expandedSection === 'classifications' ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {expandedSection === 'classifications' && (
          <div className="classification-breakdown">
            {Object.entries(stats.classificationTypes).map(([type, count]) => {
              const percentage = ((count / stats.totalClassifications) * 100).toFixed(1);
              return (
                <div key={type} className="classification-item">
                  <div className="classification-header">
                    <span className="classification-type">{type.replace(/_/g, ' ')}</span>
                    <span className="classification-count">{count} ({percentage}%)</span>
                  </div>
                  <div className="classification-bar">
                    <div 
                      className="classification-fill"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: getConfidenceColor(count / stats.totalClassifications)
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="learning-insights">
        <h3>Learning Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">
              {getConfidenceIcon(stats.highConfidenceMaterials / stats.uniqueMaterials)}
            </div>
            <div className="insight-content">
              <h4>Classification Accuracy</h4>
              <p>
                {stats.uniqueMaterials > 0 
                  ? `${((stats.highConfidenceMaterials / stats.uniqueMaterials) * 100).toFixed(1)}% of materials have high confidence predictions`
                  : 'No materials classified yet'
                }
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="insight-content">
              <h4>Learning Progress</h4>
              <p>
                {stats.totalClassifications > 10 
                  ? 'System is actively learning from user classifications'
                  : 'Need more classifications to improve predictions'
                }
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div className="insight-content">
              <h4>Data Quality</h4>
              <p>
                {stats.totalClassifications / Math.max(1, stats.uniqueMaterials) >= 2
                  ? 'Good data coverage - multiple examples per material type'
                  : 'More classifications needed for robust predictions'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .learning-engine-monitor {
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h2 {
          margin: 0;
          color: #1e293b;
          font-size: 1.5rem;
        }

        .refresh-controls select {
          margin-left: 8px;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .action-btn.export {
          background: #3b82f6;
          color: white;
        }

        .action-btn.export:hover {
          background: #2563eb;
        }

        .action-btn.import {
          background: #10b981;
          color: white;
        }

        .action-btn.import:hover {
          background: #059669;
        }

        .action-btn.clear {
          background: #ef4444;
          color: white;
        }

        .action-btn.clear:hover {
          background: #dc2626;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-card.primary .stat-icon { color: #3b82f6; }
        .stat-card.secondary .stat-icon { color: #8b5cf6; }
        .stat-card.success .stat-icon { color: #10b981; }
        .stat-card.info .stat-icon { color: #f59e0b; }

        .stat-content h3 {
          margin: 0 0 8px 0;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .stat-subtitle {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .details-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h3 {
          margin: 0;
          color: #1e293b;
        }

        .expand-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid #d1d5db;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          color: #6b7280;
        }

        .expand-btn:hover {
          background: #f9fafb;
        }

        .classification-breakdown {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .classification-item {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .classification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .classification-type {
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
        }

        .classification-count {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .classification-bar {
          width: 100%;
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }

        .classification-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .learning-insights {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .learning-insights h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .insight-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .insight-content h4 {
          margin: 0 0 8px 0;
          color: #374151;
          font-size: 1rem;
        }

        .insight-content p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .learning-monitor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 16px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .monitor-header {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .insights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}