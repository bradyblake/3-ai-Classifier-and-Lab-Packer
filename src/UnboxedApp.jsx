// unboXed Dashboard Main Application
// Complete dashboard with 3-pane layout

import React, { useState, useEffect } from "react";
import toolMap from "./toolRegistry";
import CalendarPanel from "./components/CalendarPanel";
import AgentPanel from "./components/AgentPanel";
import NotesPanel from "./components/NotesPanel";
import "./styles/Dashboard.css";
import { ThemeProvider } from "./context/ThemeContext.jsx";

export default function UnboxedApp() {
  const [activeTool, setActiveTool] = useState("TileDock");
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [rightTab, setRightTab] = useState("notes");

  useEffect(() => {
    // Load saved calendar events from localStorage
    const savedEvents = localStorage.getItem('unboxed-calendar-events');
    if (savedEvents) {
      try {
        setCalendarEvents(JSON.parse(savedEvents));
      } catch (error) {
        console.warn('Failed to load saved calendar events:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save calendar events to localStorage
    localStorage.setItem('unboxed-calendar-events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    // Expose global tool setter
    window.setActiveTool = setActiveTool;
    window.unboxedAPI = {
      setActiveTool,
      getActiveTool: () => activeTool,
      addCalendarEvent: (event) => addEvent(event),
      getCalendarEvents: () => calendarEvents,
      openTool: (toolName) => openTool(toolName)
    };
  }, [activeTool, calendarEvents]);

  const openTool = (toolName) => {
    if (toolMap[toolName]) {
      setActiveTool(toolName);
      console.log(`📱 Opened tool: ${toolName}`);
    } else {
      console.error("❌ Tool Not Found:", toolName);
    }
  };

  const addEvent = (event) => {
    setCalendarEvents((prev) => [...prev, event]);
    console.log('📅 Event added to calendar:', event);
  };

  const ToolComponent = toolMap[activeTool];

  return (
    <ThemeProvider>
      <div className="dashboard-container relative">
        {/* Left Pane: Main Tool Area (75% width) */}
        <div className="left-pane">
          {ToolComponent ? (
            <ToolComponent openTool={openTool} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Tool Not Found</h2>
                <p className="text-gray-600">The tool "{activeTool}" is not available.</p>
                <button 
                  onClick={() => setActiveTool("TileDock")}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Calendar + Notes/Agent (25% width) */}
        <div className="right-pane">
          {/* Top 75%: Calendar */}
          <div style={{ flex: "3", overflowY: "auto", borderBottom: "1px solid #e5e7eb" }}>
            <CalendarPanel 
              events={calendarEvents} 
              addEventToCalendar={addEvent} 
            />
          </div>

          {/* Bottom 25%: Notes/Agent Tabs */}
          <div style={{ flex: "1", display: "flex", flexDirection: "column" }}>
            {/* Tab Buttons */}
            <div className="flex justify-around mb-2 border-b">
              <button
                className={`tab-button flex-1 py-2 ${rightTab === "notes" ? "active-tab border-b-2 border-blue-500 font-semibold" : ""}`}
                onClick={() => setRightTab("notes")}
              >
                📝 Notes
              </button>
              <button
                className={`tab-button flex-1 py-2 ${rightTab === "agent" ? "active-tab border-b-2 border-blue-500 font-semibold" : ""}`}
                onClick={() => setRightTab("agent")}
              >
                🤖 Agent
              </button>
            </div>

            {/* Panel Content */}
            <div className="overflow-auto border rounded bg-white p-2" style={{ flex: 1 }}>
              {rightTab === "notes" && <NotesPanel />}
              {rightTab === "agent" && (
                <AgentPanel
                  calendarEvents={calendarEvents}
                  addEventToCalendar={addEvent}
                  activeTool={activeTool}
                  openTool={openTool}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}