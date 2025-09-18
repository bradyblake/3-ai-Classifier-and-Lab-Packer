import React, { useState, useEffect } from "react";
import toolMap from "./toolRegistry";
import CalendarPanel from "./components/CalendarPanel";
import AgentPanel from "./components/AgentPanel";
import NotesPanel from "./components/NotesPanel";
import HandsFreeOverlay from "./components/HandsFreeOverlay";
import "./styles/Dashboard.css";
import { saveSessionToLocal, loadSessionFromLocal } from "./utils/sessionStorage";
import { useSecuritySync } from "./hooks/useSecuritySync";
import syncData from "./data/sampleSyncData.json";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { WorkflowProvider } from "./context/WorkflowContext.jsx";
import WorkflowPanel from "./components/WorkflowPanel.jsx";

export default function App() {
  const [activeTool, setActiveTool] = useState("TileDock");
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [rightTab, setRightTab] = useState("notes");

  const { validated, syncInfo } = useSecuritySync({
    syncData,
    masterSecret: import.meta.env.VITE_UNBOXED_MASTER_SECRET,
  });

  useEffect(() => {
    if (!validated) {
      console.warn("❌ Security sync validation failed.");
    } else {
      console.log("✅ Security sync validated:", syncInfo);
    }
  }, [validated]);

  useEffect(() => {
    const saved = loadSessionFromLocal();
    if (saved?.calendarEvents) setCalendarEvents(saved.calendarEvents);
  }, []);

  useEffect(() => {
    saveSessionToLocal({ calendarEvents });
  }, [calendarEvents]);

  useEffect(() => {
    window.setActiveTool = setActiveTool;
  }, []);

  const openTool = (toolName) => {
    if (toolMap[toolName]) {
      setActiveTool(toolName);
    } else {
      console.error("Tool Not Found:", toolName);
    }
  };

  const addEvent = (event) => {
    setCalendarEvents((prev) => [...prev, event]);
  };

  const ToolComponent = toolMap[activeTool];

  return (
    <ThemeProvider>
      <WorkflowProvider>
        <div className="dashboard-container relative">
        {/* Left Pane: Main Tool */}
        <div className="left-pane">
          <ToolComponent openTool={openTool} />
        </div>

        {/* Right Pane: Calendar (Top) + Notes/Agent Tabs (Bottom) */}
        <div className="right-pane">
          {/* Top 75%: Calendar */}
          <div style={{ flex: "3", overflowY: "auto" }}>
            <CalendarPanel events={calendarEvents} addEventToCalendar={addEvent} />
          </div>

          {/* Bottom 25%: Notes/Agent Tabs */}
          <div style={{ flex: "1", display: "flex", flexDirection: "column" }}>
            {/* Tab Buttons */}
            <div className="flex justify-around mb-2">
              <button
                className={`tab-button ${rightTab === "notes" ? "active-tab" : ""}`}
                onClick={() => setRightTab("notes")}
              >
                📝 Notes
              </button>
              <button
                className={`tab-button ${rightTab === "agent" ? "active-tab" : ""}`}
                onClick={() => setRightTab("agent")}
              >
                🧠 Agent
              </button>
              <button
                className={`tab-button ${rightTab === "workflow" ? "active-tab" : ""}`}
                onClick={() => setRightTab("workflow")}
              >
                🔄 Workflows
              </button>
            </div>

            {/* Panel Content */}
            <div className="overflow-auto border rounded bg-white p-2" style={{ flex: 1 }}>
              {rightTab === "notes" && <NotesPanel />}
              {rightTab === "agent" && (
                <AgentPanel
                  calendarEvents={calendarEvents}
                  addEventToCalendar={addEvent}
                />
              )}
              {rightTab === "workflow" && (
                <WorkflowPanel
                  currentTool={activeTool}
                  onNavigateToTool={openTool}
                />
              )}
            </div>
          </div>
        </div>

        {/* Floating Voice Overlay (Driving Mode) */}
        <HandsFreeOverlay />
        </div>
      </WorkflowProvider>
    </ThemeProvider>
  );
}