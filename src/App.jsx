import React, { useState, useEffect } from "react";
import toolMap from "./toolRegistry";
import FileDropPanel from "./components/FileDropPanel";
import HandsFreeOverlay from "./components/HandsFreeOverlay";
import "./styles/Dashboard.css";
import { saveSessionToLocal, loadSessionFromLocal } from "./utils/sessionStorage";
import { useSecuritySync } from "./hooks/useSecuritySync";
import syncData from "./data/sampleSyncData.json";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { WorkflowProvider } from "./context/WorkflowContext.jsx";
import { FileUploadProvider } from "./context/FileUploadContext.jsx";
import WorkflowPanel from "./components/WorkflowPanel.jsx";

export default function App() {
  const [activeTool, setActiveTool] = useState("TileDock");
  const [rightTab, setRightTab] = useState("files");

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
    window.setActiveTool = setActiveTool;
  }, []);

  const openTool = (toolName) => {
    if (toolMap[toolName]) {
      setActiveTool(toolName);
    } else {
      console.error("Tool Not Found:", toolName);
    }
  };


  const ToolComponent = toolMap[activeTool];

  return (
    <ThemeProvider>
      <WorkflowProvider>
        <FileUploadProvider>
          <div className="dashboard-container relative">
        {/* Left Pane: Main Tool */}
        <div className="left-pane">
          <ToolComponent openTool={openTool} />
        </div>

        {/* Right Pane: File Drop Zone (Top) + Agent/Workflow Tabs (Bottom) */}
        <div className="right-pane">
          {/* Top 75%: File Drop Zone */}
          <div style={{ flex: "3", overflowY: "auto" }}>
            <FileDropPanel />
          </div>

          {/* Bottom 25%: Agent/Workflow Tabs */}
          <div style={{ flex: "1", display: "flex", flexDirection: "column" }}>
            {/* Tab Buttons */}
            <div className="flex justify-around mb-2">
              <button
                className={`tab-button ${rightTab === "files" ? "active-tab" : ""}`}
                onClick={() => setRightTab("files")}
              >
                📁 Files
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
              {rightTab === "files" && (
                <FileDropPanel />
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
        </FileUploadProvider>
      </WorkflowProvider>
    </ThemeProvider>
  );
}