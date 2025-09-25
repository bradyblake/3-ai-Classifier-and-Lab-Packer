# Revolutionary Classifier

> Advanced Project Management & Waste Classification System

## 📋 Overview

Revolutionary Classifier is a comprehensive web application designed for hazardous waste management, environmental compliance, and project tracking. It integrates AI-powered SDS (Safety Data Sheet) analysis with project management capabilities to streamline waste classification and regulatory compliance workflows.

## ✨ Features

### 🧪 AI-Powered Classification
- **SDS Analysis**: Automated extraction and analysis of Safety Data Sheets
- **Chemical Classification**: AI-driven waste code assignment and hazard identification
- **Regulatory Compliance**: EPA, RCRA, and DOT classification support

### 📊 Project Management
- **Kanban Board**: Visual project tracking with customizable workflows
- **Smart Calendar**: Integrated scheduling with sales period annotations
- **Lab Pack Planning**: Waste containerization and compatibility analysis
- **Manifest Generation**: Automated regulatory document creation

### 🔐 Security & Authentication
- **Firebase Integration**: Secure user authentication and data storage
- **Real-time Sync**: Cross-device data synchronization
- **Session Management**: Persistent user sessions with secure storage

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Theme Support**: Light and dark mode options
- **File Upload**: Drag-and-drop PDF processing
- **Progress Tracking**: Workflow progress monitoring and resume functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Firebase account (optional, for authentication)

### Installation

1. **Clone or download the project**
   ```bash
   cd revolutionary-classifier
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update API keys and configuration

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000
   - Create an account or sign in

## 🛠️ Configuration

### API Keys Setup

The application supports multiple AI services:

- **Groq API**: Fast LLM inference (14,400 requests/day free)
- **Google Gemini**: Advanced language understanding (1,500 requests/day free)
- **OpenAI**: Optional ChatGPT integration (paid)

### Firebase Setup (Optional)

For authentication and data sync:
1. Create a Firebase project
2. Enable Authentication and Firestore
3. Update `.env` with your Firebase config

## 📚 Usage

### 1. SDS Analysis Workflow
1. Upload PDF files using drag-and-drop
2. AI automatically extracts chemical information
3. Review and validate classifications
4. Export results to lab packs or projects

### 2. Project Management
1. Create new projects in the Kanban board
2. Add materials and assign waste codes
3. Schedule activities using the calendar
4. Generate regulatory manifests

### 3. Lab Pack Planning
1. Load materials from SDS analysis
2. Plan compatible groupings
3. Generate waste profiles
4. Create shipping documentation

## 🏗️ Architecture

- **Frontend**: React with Vite build system
- **Backend**: Node.js/Express API server
- **Database**: Firebase Firestore + localStorage
- **AI Services**: Groq, Gemini, OpenAI APIs
- **Styling**: CSS modules with responsive design

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This software is provided for internal use. If you have suggestions or improvements:

1. Document the enhancement request
2. Test thoroughly in development environment
3. Ensure all existing functionality remains intact
4. Follow existing code style and patterns

## 📞 Support

For questions or issues:
- Check the application's built-in help documentation
- Review the console for debugging information
- Contact your system administrator

## ⚖️ Compliance Notice

This software is designed to assist with regulatory compliance but does not guarantee regulatory approval. Users are responsible for:
- Verifying all AI-generated classifications
- Ensuring compliance with local, state, and federal regulations
- Maintaining proper documentation and records
- Regular backup of critical data

## 🔒 Security

- All API keys should be kept confidential
- Regular security updates are recommended
- User authentication is handled through Firebase
- Local data is encrypted in browser storage

---

**Revolutionary Classifier** - Streamlining environmental compliance through intelligent automation.

*Licensed under MIT License - Copyright (c) 2025 Revolutionary Classifier Team*
