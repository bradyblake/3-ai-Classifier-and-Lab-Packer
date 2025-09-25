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
import { useAuth } from "./hooks/useAuth";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [activeTool, setActiveTool] = useState("TileDock");
  const [rightTab, setRightTab] = useState("files");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { currentUser } = useAuth();

  const { validated, syncInfo } = useSecuritySync({
    syncData,
    masterSecret: import.meta.env.VITE_MASTER_SECRET,
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

  // Show login landing page if user is not authenticated
  if (!currentUser) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Revolutionary Classifier
              </h1>
              <p className="text-gray-600">
                Advanced Project Management & Waste Classification System
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-3">📊</span>
                <span>Kanban Project Management</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-3">📅</span>
                <span>Smart Calendar Integration</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-3">🗂️</span>
                <span>Document Classification</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-3">☁️</span>
                <span>Cloud Data Sync</span>
              </div>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign In to Continue
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Sign in to access your projects and sync data across devices
            </p>
          </div>

          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
          />
        </div>
      </ThemeProvider>
    );
  }

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