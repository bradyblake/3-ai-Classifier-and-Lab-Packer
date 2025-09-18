import TileDock from "./components/TileDock.jsx";
import SDSAnalyzer from "./components/SDSAnalyzer.jsx";
import LabPackPlanner from "./components/LabPackPlanner.jsx";
import LeadGenerator from "./components/LeadGenerator.jsx";
import ProjectKanban from "./components/EnhancedProjectTracker.jsx";
import LabPackCompatibilityTest from "./components/LabPackCompatibilityTest.jsx";
import LearningEngineMonitor from "./components/LearningEngineMonitor.jsx";
import DatabaseViewer from "./components/DatabaseViewer.jsx";
import LabReportAnalyzer from "./components/LabReportAnalyzer.jsx";
import WasteRouting from "./components/WasteRouting.jsx";
import QuoteGenerator from "./components/QuoteGenerator.jsx";
import SmartCalendar from "./components/SmartCalendar.jsx";

// ProjectKanban replaces the placeholder KanbanBoard

const toolMap = {
  TileDock,
  SDSAnalyzer,
  LabPackPlanner,
  LeadGenerator,
  ProjectKanban,
  WasteRouting, 
  QuoteGenerator,
  LabPackCompatibilityTest,
  LabReportAnalyzer,
  LearningEngineMonitor,
  DatabaseViewer,
  SmartCalendar,
};

export default toolMap;