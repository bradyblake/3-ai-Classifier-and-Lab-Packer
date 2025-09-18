// Lazy Loading Component Wrapper
// Optimizes bundle size by code-splitting heavy components

import React, { Suspense, lazy } from 'react';

// Loading fallback component
const LoadingFallback = ({ toolName }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold mb-2">Loading {toolName}...</h2>
      <p className="text-gray-600">Initializing advanced features</p>
    </div>
  </div>
);

// Error boundary for lazy-loaded components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LazyLoader Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Component Load Error</h2>
            <p className="text-red-600 mb-4">Failed to load {this.props.toolName}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load heavy components with optimized chunking
export const LazyRevolutionaryClassifier = lazy(() => 
  import('./RevolutionaryClassifier.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Revolutionary Classifier:', error);
      throw error;
    })
);

export const LazyKanbanBoard = lazy(() => 
  import('./KanbanBoard.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Kanban Board:', error);
      throw error;
    })
);

export const LazyUnifiedCalendar = lazy(() => 
  import('./UnifiedCalendar.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Unified Calendar:', error);
      throw error;
    })
);

export const LazyEnhancedAIAssistant = lazy(() => 
  import('./EnhancedAIAssistant.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load AI Assistant:', error);
      throw error;
    })
);

export const LazySDSAnalyzer = lazy(() => 
  import('./SDSAnalyzer.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load SDS Analyzer:', error);
      throw error;
    })
);

export const LazyAnalyticalReportAnalyzer = lazy(() => 
  import('./AnalyticalReportAnalyzer.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Analytical Report Analyzer:', error);
      throw error;
    })
);

export const LazyLabPackPlanner = lazy(() => 
  import('./LabPackPlanner.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Lab Pack Planner:', error);
      throw error;
    })
);

export const LazyQuoteGenerator = lazy(() => 
  import('./QuoteGenerator.jsx')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load Quote Generator:', error);
      throw error;
    })
);

// Higher-order component for lazy loading with consistent UX
export const withLazyLoading = (LazyComponent, toolName) => {
  const LazyWrapper = (props) => (
    <LazyErrorBoundary toolName={toolName}>
      <Suspense fallback={<LoadingFallback toolName={toolName} />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );
  
  LazyWrapper.displayName = `Lazy(${toolName})`;
  return LazyWrapper;
};

// Pre-built lazy components with error boundaries
export const RevolutionaryClassifierLazy = withLazyLoading(LazyRevolutionaryClassifier, 'Revolutionary Classifier');
export const KanbanBoardLazy = withLazyLoading(LazyKanbanBoard, 'Project Board');
export const UnifiedCalendarLazy = withLazyLoading(LazyUnifiedCalendar, 'Smart Calendar');
export const EnhancedAIAssistantLazy = withLazyLoading(LazyEnhancedAIAssistant, 'AI Assistant');
export const SDSAnalyzerLazy = withLazyLoading(LazySDSAnalyzer, 'SDS Analyzer');
export const AnalyticalReportAnalyzerLazy = withLazyLoading(LazyAnalyticalReportAnalyzer, 'Report Analyzer');
export const LabPackPlannerLazy = withLazyLoading(LazyLabPackPlanner, 'Lab Pack Planner');
export const QuoteGeneratorLazy = withLazyLoading(LazyQuoteGenerator, 'Quote Generator');

// Preloader utility for critical components
export const preloadCriticalComponents = async () => {
  try {
    console.log('🚀 Preloading critical components...');
    
    // Preload most commonly used tools
    await Promise.all([
      import('./RevolutionaryClassifier.jsx'),
      import('./SDSAnalyzer.jsx'),
      import('./KanbanBoard.jsx')
    ]);
    
    console.log('✅ Critical components preloaded successfully');
  } catch (error) {
    console.warn('⚠️ Some components failed to preload:', error.message);
  }
};

// Component preloader hook
export const useComponentPreloader = (componentNames = []) => {
  React.useEffect(() => {
    if (componentNames.length > 0) {
      // Preload specified components after initial render
      const timer = setTimeout(() => {
        componentNames.forEach(async (name) => {
          try {
            switch (name) {
              case 'revolutionary-classifier':
                await import('./RevolutionaryClassifier.jsx');
                break;
              case 'kanban-board':
                await import('./KanbanBoard.jsx');
                break;
              case 'smart-calendar':
                await import('./UnifiedCalendar.jsx');
                break;
              case 'ai-assistant':
                await import('./EnhancedAIAssistant.jsx');
                break;
              case 'sds-analyzer':
                await import('./SDSAnalyzer.jsx');
                break;
              default:
                console.log(`⚠️ Unknown component for preloading: ${name}`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to preload ${name}:`, error.message);
          }
        });
      }, 1000); // Delay to avoid blocking initial render

      return () => clearTimeout(timer);
    }
  }, [componentNames]);
};

export default {
  RevolutionaryClassifierLazy,
  KanbanBoardLazy,
  UnifiedCalendarLazy,
  EnhancedAIAssistantLazy,
  SDSAnalyzerLazy,
  AnalyticalReportAnalyzerLazy,
  LabPackPlannerLazy,
  QuoteGeneratorLazy,
  preloadCriticalComponents,
  useComponentPreloader
};