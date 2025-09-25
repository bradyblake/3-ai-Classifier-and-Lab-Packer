// Revolutionary Project Management Platform - Streamlined Server
// Combines JARVIS AI with comprehensive project management features

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS configuration
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Enhanced Data Models with Default Admin User
let users = [
    {
        id: 'admin-001',
        username: 'admin',
        password_hash: bcrypt.hashSync('admin123', 10),
        email: 'admin@unboxed.com',
        role: 'admin',
        created_at: new Date().toISOString()
    }
];
let projects = [];
let tasks = [];
let calendarEvents = [];
let timeEntries = [];
let activityLog = [];
let personnel = [];
let vendors = [];

// NEW: Business Configuration
let workflowConfig = {
    kanbanColumns: [
        { id: 'backlog', name: 'Backlog', color: '#6b7280' },
        { id: 'todo', name: 'To Do', color: '#3b82f6' },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b' },
        { id: 'review', name: 'Review', color: '#8b5cf6' },
        { id: 'done', name: 'Done', color: '#10b981' },
        { id: 'on_hold', name: 'On Hold', color: '#ef4444' }
    ],
    projectStatuses: [
        'Planning', 'Active', 'On Hold', 'Review', 'Completed', 'Cancelled'
    ],
    priorities: [
        'Low', 'Medium', 'High', 'Urgent', 'Critical'
    ],
    projectTypes: [
        'Environmental Consulting', 'Lab Pack', 'Waste Management',
        'Compliance Audit', 'Site Assessment', 'Remediation', 'Other'
    ],
    locations: [
        'Dallas, TX', 'Houston, TX', 'Austin, TX', 'San Antonio, TX',
        'Fort Worth, TX', 'Remote', 'Client Site', 'Laboratory'
    ],
    positions: [
        'Project Manager', 'Environmental Scientist', 'Field Technician',
        'Laboratory Analyst', 'Compliance Specialist', 'Site Supervisor',
        'Safety Coordinator', 'QA/QC Manager', 'Consultant', 'Admin'
    ]
};

// File Upload Configuration
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateProjectNumber = () => {
    const year = new Date().getFullYear();
    const sequence = projects.length + 1;
    return `${year}-${sequence.toString().padStart(4, '0')}`;
};

// Smart Automation Functions
const detectProjectKeywords = (text, filename = '') => {
    const keywords = {
        'Environmental Consulting': ['environmental', 'pollution', 'contamination', 'soil', 'groundwater', 'air quality', 'remediation'],
        'Lab Pack': ['lab pack', 'chemical', 'hazardous', 'waste', 'disposal', 'msds', 'sds'],
        'Compliance Audit': ['audit', 'compliance', 'regulatory', 'inspection', 'permit', 'violation'],
        'Site Assessment': ['assessment', 'investigation', 'sampling', 'testing', 'analysis', 'report'],
        'Emergency Response': ['emergency', 'spill', 'incident', 'response', 'cleanup', 'containment']
    };

    const fullText = (text + ' ' + filename).toLowerCase();
    const scores = {};

    for (const [projectType, words] of Object.entries(keywords)) {
        scores[projectType] = words.filter(word => fullText.includes(word)).length;
    }

    const bestMatch = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b);
    return bestMatch[1] > 0 ? bestMatch[0] : 'General Project';
};

const generateSmartMilestones = (projectType, budgetAmount = 0) => {
    const milestoneTemplates = {
        'Environmental Consulting': [
            { name: 'Initial Site Assessment', daysFromStart: 7, percentage: 15 },
            { name: 'Data Collection Complete', daysFromStart: 21, percentage: 35 },
            { name: 'Analysis & Testing', daysFromStart: 35, percentage: 60 },
            { name: 'Report Draft', daysFromStart: 45, percentage: 85 },
            { name: 'Final Report Delivery', daysFromStart: 60, percentage: 100 }
        ],
        'Lab Pack': [
            { name: 'Inventory Assessment', daysFromStart: 3, percentage: 20 },
            { name: 'Classification Complete', daysFromStart: 7, percentage: 50 },
            { name: 'Packaging & Labeling', daysFromStart: 14, percentage: 80 },
            { name: 'Transportation & Disposal', daysFromStart: 21, percentage: 100 }
        ],
        'Compliance Audit': [
            { name: 'Document Review', daysFromStart: 5, percentage: 25 },
            { name: 'On-site Inspection', daysFromStart: 10, percentage: 50 },
            { name: 'Findings Analysis', daysFromStart: 20, percentage: 75 },
            { name: 'Audit Report Delivery', daysFromStart: 30, percentage: 100 }
        ],
        'Default': [
            { name: 'Project Kickoff', daysFromStart: 1, percentage: 10 },
            { name: 'Phase 1 Complete', daysFromStart: 15, percentage: 35 },
            { name: 'Phase 2 Complete', daysFromStart: 30, percentage: 70 },
            { name: 'Project Completion', daysFromStart: 45, percentage: 100 }
        ]
    };

    const template = milestoneTemplates[projectType] || milestoneTemplates['Default'];
    const startDate = new Date();

    return template.map(milestone => ({
        id: generateId(),
        name: milestone.name,
        due_date: new Date(startDate.getTime() + milestone.daysFromStart * 24 * 60 * 60 * 1000).toISOString(),
        budget_allocation: Math.round((budgetAmount * milestone.percentage) / 100),
        percentage: milestone.percentage,
        status: 'pending',
        auto_generated: true
    }));
};

const generateSmartCalendarEvents = (project, milestones = []) => {
    const events = [];
    const startDate = new Date();

    // Project kickoff meeting
    events.push({
        id: generateId(),
        title: `${project.name} - Kickoff Meeting`,
        description: `Project initialization and team alignment for ${project.name}`,
        event_type: 'meeting',
        start_time: new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_time: new Date(startDate.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour
        project_id: project.id,
        auto_generated: true
    });

    // Milestone review meetings
    milestones.forEach((milestone, index) => {
        if (index < milestones.length - 1) { // Don't create a meeting for the final milestone
            const reviewDate = new Date(milestone.due_date);
            reviewDate.setDate(reviewDate.getDate() - 2); // 2 days before milestone

            events.push({
                id: generateId(),
                title: `${project.name} - ${milestone.name} Review`,
                description: `Review progress for milestone: ${milestone.name}`,
                event_type: 'review',
                start_time: reviewDate.toISOString(),
                end_time: new Date(reviewDate.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes
                project_id: project.id,
                milestone_id: milestone.id,
                auto_generated: true
            });
        }
    });

    return events;
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// AUTHENTICATION ROUTES
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);

        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;

        if (users.find(u => u.username === username || u.email === email)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = {
            id: generateId(),
            username,
            email,
            password_hash: passwordHash,
            full_name: fullName,
            role: 'user',
            created_at: new Date().toISOString(),
            is_active: true,
            profile_settings: {}
        };

        users.push(user);
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// WORKFLOW CONFIGURATION ROUTES
app.get('/config/workflow', authenticateToken, (req, res) => {
    res.json(workflowConfig);
});

app.put('/config/workflow', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    workflowConfig = { ...workflowConfig, ...req.body };
    res.json(workflowConfig);
});

// ENHANCED PROJECT MANAGEMENT ROUTES
app.get('/projects', authenticateToken, (req, res) => {
    const userProjects = projects.filter(p =>
        p.owner_id === req.user.id ||
        p.team_members?.some(m => m.user_id === req.user.id)
    );
    res.json(userProjects);
});

app.post('/projects', authenticateToken, (req, res) => {
    const project = {
        id: generateId(),
        project_number: generateProjectNumber(),
        name: req.body.name,
        description: req.body.description,
        owner_id: req.user.id,
        client_name: req.body.client_name,
        client_contact: req.body.client_contact,
        client_email: req.body.client_email,
        client_phone: req.body.client_phone,
        project_type: req.body.project_type || 'Environmental Consulting',
        status: req.body.status || 'Planning',
        priority: req.body.priority || 'Medium',
        location: req.body.location,
        start_date: req.body.start_date,
        due_date: req.body.due_date,
        estimated_hours: req.body.estimated_hours || 0,
        actual_hours: 0,
        budget: parseFloat(req.body.budget) || 0,
        actual_cost: 0,
        revenue: parseFloat(req.body.revenue) || 0,
        profit_margin: 0,
        billing_rate: parseFloat(req.body.billing_rate) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        project_settings: req.body.project_settings || {},
        tags: req.body.tags || [],
        team_members: [],
        milestones: req.body.milestones || [],
        documents: [],
        notes: req.body.notes || ''
    };

    // Calculate profit margin
    if (project.revenue && project.budget) {
        project.profit_margin = ((project.revenue - project.budget) / project.revenue * 100).toFixed(2);
    }

    projects.push(project);

    // Log activity
    activityLog.push({
        id: generateId(),
        user_id: req.user.id,
        project_id: project.id,
        activity_type: 'created',
        description: `Project "${project.name}" (${project.project_number}) created`,
        created_at: new Date().toISOString()
    });

    res.json(project);
});

app.get('/projects/:id', authenticateToken, (req, res) => {
    const project = projects.find(p => p.id === req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    if (project.owner_id !== req.user.id &&
        !project.team_members?.some(m => m.user_id === req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
});

app.put('/projects/:id', authenticateToken, (req, res) => {
    const project = projects.find(p => p.id === req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    // Update project fields
    const updatedProject = {
        ...project,
        ...req.body,
        id: project.id, // Don't allow ID changes
        project_number: project.project_number, // Don't allow project number changes
        updated_at: new Date().toISOString()
    };

    // Recalculate profit margin
    if (updatedProject.revenue && updatedProject.budget) {
        updatedProject.profit_margin = ((updatedProject.revenue - updatedProject.budget) / updatedProject.revenue * 100).toFixed(2);
    }

    const index = projects.findIndex(p => p.id === req.params.id);
    projects[index] = updatedProject;

    // Log activity
    activityLog.push({
        id: generateId(),
        user_id: req.user.id,
        project_id: project.id,
        activity_type: 'updated',
        description: `Project "${updatedProject.name}" updated`,
        created_at: new Date().toISOString()
    });

    res.json(updatedProject);
});

// ENHANCED TASK MANAGEMENT
app.get('/projects/:id/tasks', authenticateToken, (req, res) => {
    const projectTasks = tasks.filter(t => t.project_id === req.params.id);
    res.json(projectTasks);
});

app.post('/projects/:id/tasks', authenticateToken, (req, res) => {
    const task = {
        id: generateId(),
        project_id: req.params.id,
        title: req.body.title,
        description: req.body.description,
        assigned_to: req.body.assigned_to,
        created_by: req.user.id,
        status: req.body.status || 'todo',
        priority: req.body.priority || 'Medium',
        task_type: req.body.task_type,
        estimated_hours: parseFloat(req.body.estimated_hours) || 0,
        actual_hours: 0,
        due_date: req.body.due_date,
        location: req.body.location,
        billing_rate: parseFloat(req.body.billing_rate) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: req.body.position || 0,
        labels: req.body.labels || [],
        custom_fields: req.body.custom_fields || {},
        attachments: [],
        comments: [],
        checklist: req.body.checklist || []
    };

    tasks.push(task);

    // Log activity
    activityLog.push({
        id: generateId(),
        user_id: req.user.id,
        project_id: req.params.id,
        task_id: task.id,
        activity_type: 'created',
        description: `Task "${task.title}" created`,
        created_at: new Date().toISOString()
    });

    res.json(task);
});

app.put('/tasks/:id', authenticateToken, (req, res) => {
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const oldStatus = task.status;
    const updatedTask = {
        ...task,
        ...req.body,
        id: task.id,
        updated_at: new Date().toISOString()
    };

    if (req.body.status === 'done' && oldStatus !== 'done') {
        updatedTask.completed_date = new Date().toISOString();
    }

    const index = tasks.findIndex(t => t.id === req.params.id);
    tasks[index] = updatedTask;

    // Log activity
    if (oldStatus !== updatedTask.status) {
        activityLog.push({
            id: generateId(),
            user_id: req.user.id,
            project_id: task.project_id,
            task_id: task.id,
            activity_type: 'updated',
            description: `Task "${task.title}" moved from ${oldStatus} to ${updatedTask.status}`,
            created_at: new Date().toISOString()
        });
    }

    res.json(updatedTask);
});

// CALENDAR EVENTS
app.get('/calendar/events', authenticateToken, (req, res) => {
    const userEvents = calendarEvents.filter(e =>
        e.user_id === req.user.id ||
        e.attendees?.includes(req.user.email)
    );
    res.json(userEvents);
});

app.post('/calendar/events', authenticateToken, (req, res) => {
    const event = {
        id: generateId(),
        user_id: req.user.id,
        project_id: req.body.project_id,
        task_id: req.body.task_id,
        title: req.body.title,
        description: req.body.description,
        event_type: req.body.event_type || 'meeting',
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        all_day: req.body.all_day || false,
        location: req.body.location,
        attendees: req.body.attendees || [],
        reminder_minutes: req.body.reminder_minutes || [15],
        color: req.body.color || '#3b82f6',
        is_private: req.body.is_private || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    calendarEvents.push(event);
    res.json(event);
});

// TIME TRACKING WITH REVENUE CALCULATION
app.post('/time/start', authenticateToken, (req, res) => {
    const entry = {
        id: generateId(),
        user_id: req.user.id,
        project_id: req.body.project_id,
        task_id: req.body.task_id,
        description: req.body.description,
        start_time: new Date().toISOString(),
        billable: req.body.billable !== false,
        hourly_rate: parseFloat(req.body.hourly_rate) || 0,
        created_at: new Date().toISOString()
    };

    timeEntries.push(entry);
    res.json(entry);
});

app.put('/time/stop', authenticateToken, (req, res) => {
    const entry = timeEntries.find(t => t.id === req.body.entry_id && t.user_id === req.user.id);
    if (!entry) {
        return res.status(404).json({ error: 'Time entry not found' });
    }

    entry.end_time = new Date().toISOString();
    entry.duration_minutes = Math.round((new Date(entry.end_time) - new Date(entry.start_time)) / 60000);
    entry.billable_amount = entry.billable ? (entry.duration_minutes / 60) * entry.hourly_rate : 0;

    // Update project actual hours and costs
    if (entry.project_id) {
        const project = projects.find(p => p.id === entry.project_id);
        if (project) {
            project.actual_hours = (project.actual_hours || 0) + (entry.duration_minutes / 60);
            project.actual_cost = (project.actual_cost || 0) + entry.billable_amount;

            // Recalculate profit margin
            if (project.revenue && project.actual_cost) {
                project.profit_margin = ((project.revenue - project.actual_cost) / project.revenue * 100).toFixed(2);
            }
        }
    }

    res.json(entry);
});

// ============ SMART AUTOMATION ROUTES ============

// Smart File Upload with Automatic Project Association
app.post('/api/smart-upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { originalname, filename, path: filePath } = req.file;
        const fileContent = req.body.notes || originalname;

        // Detect project type from filename and content
        const detectedType = detectProjectKeywords(fileContent, originalname);

        // Find existing project or suggest new project creation
        const matchingProjects = projects.filter(p =>
            p.type === detectedType &&
            (p.owner_id === req.user.id || p.team_members?.some(m => m.user_id === req.user.id))
        );

        const result = {
            file: {
                id: generateId(),
                original_name: originalname,
                stored_name: filename,
                path: filePath,
                uploaded_at: new Date().toISOString(),
                uploaded_by: req.user.id
            },
            detected_type: detectedType,
            matching_projects: matchingProjects.map(p => ({
                id: p.id,
                name: p.name,
                project_number: p.project_number,
                status: p.status
            })),
            suggestions: {
                create_new_project: matchingProjects.length === 0,
                suggested_project_name: `${detectedType} - ${new Date().toLocaleDateString()}`,
                auto_generate_milestones: true
            }
        };

        res.json(result);
    } catch (error) {
        console.error('Smart upload error:', error);
        res.status(500).json({ error: 'Upload processing failed' });
    }
});

// Smart Project Creation with Auto-Generated Milestones and Calendar Events
app.post('/api/projects/smart-create', authenticateToken, async (req, res) => {
    try {
        const { name, description, budgetAmount, location, type, auto_generate = true } = req.body;

        // Create the project
        const project = {
            id: generateId(),
            project_number: generateProjectNumber(),
            name,
            description,
            budget_amount: budgetAmount,
            location,
            type: type || 'General Project',
            status: 'Planning',
            owner_id: req.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            auto_generated: auto_generate
        };

        projects.push(project);

        let milestones = [];
        let calendarEvents = [];

        if (auto_generate) {
            // Generate smart milestones based on project type
            milestones = generateSmartMilestones(project.type, budgetAmount);

            // Generate calendar events
            calendarEvents = generateSmartCalendarEvents(project, milestones);

            // Add milestones to the project
            project.milestones = milestones;

            // Add calendar events to the global calendar
            calendarEvents.forEach(event => {
                event.user_id = req.user.id;
                calendarEvents.push(event);
            });
        }

        res.status(201).json({
            project,
            milestones,
            calendar_events: calendarEvents,
            automation: {
                milestones_generated: milestones.length,
                calendar_events_generated: calendarEvents.length,
                next_milestone: milestones[0]?.name,
                next_meeting: calendarEvents[0]?.title
            }
        });
    } catch (error) {
        console.error('Smart project creation error:', error);
        res.status(500).json({ error: 'Smart project creation failed' });
    }
});

// Associate File with Project
app.post('/api/projects/:projectId/files', authenticateToken, async (req, res) => {
    try {
        const { fileId, notes } = req.body;
        const projectId = req.params.projectId;

        const project = projects.find(p =>
            p.id === projectId &&
            (p.owner_id === req.user.id || p.team_members?.some(m => m.user_id === req.user.id))
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const fileAssociation = {
            id: generateId(),
            file_id: fileId,
            project_id: projectId,
            notes: notes || '',
            associated_at: new Date().toISOString(),
            associated_by: req.user.id
        };

        // Add to project files
        project.files = project.files || [];
        project.files.push(fileAssociation);

        // Auto-generate relevant tasks based on file type
        const autoTasks = [];
        if (notes?.toLowerCase().includes('contract') || notes?.toLowerCase().includes('agreement')) {
            autoTasks.push({
                id: generateId(),
                title: 'Review Contract Documents',
                description: `Review uploaded contract: ${notes}`,
                project_id: projectId,
                status: 'todo',
                priority: 'high',
                assigned_to: req.user.id,
                created_at: new Date().toISOString(),
                auto_generated: true
            });
        }

        if (notes?.toLowerCase().includes('report') || notes?.toLowerCase().includes('analysis')) {
            autoTasks.push({
                id: generateId(),
                title: 'Analyze Report Data',
                description: `Analyze data from: ${notes}`,
                project_id: projectId,
                status: 'todo',
                priority: 'medium',
                assigned_to: req.user.id,
                created_at: new Date().toISOString(),
                auto_generated: true
            });
        }

        // Add auto-tasks to global tasks
        autoTasks.forEach(task => tasks.push(task));

        res.json({
            file_association: fileAssociation,
            auto_generated_tasks: autoTasks,
            message: `File associated with project. Generated ${autoTasks.length} automatic tasks.`
        });

    } catch (error) {
        console.error('File association error:', error);
        res.status(500).json({ error: 'File association failed' });
    }
});

// Smart Calendar - Auto-generate events based on project milestones
app.post('/api/calendar/auto-generate/:projectId', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = projects.find(p =>
            p.id === projectId &&
            (p.owner_id === req.user.id || p.team_members?.some(m => m.user_id === req.user.id))
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const milestones = project.milestones || [];
        const generatedEvents = generateSmartCalendarEvents(project, milestones);

        // Add events to calendar
        generatedEvents.forEach(event => {
            event.user_id = req.user.id;
            calendarEvents.push(event);
        });

        res.json({
            project_name: project.name,
            events_generated: generatedEvents.length,
            events: generatedEvents,
            message: `Generated ${generatedEvents.length} calendar events for ${project.name}`
        });

    } catch (error) {
        console.error('Auto calendar generation error:', error);
        res.status(500).json({ error: 'Calendar auto-generation failed' });
    }
});

// Get automation insights for project
app.get('/api/projects/:projectId/insights', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = projects.find(p =>
            p.id === projectId &&
            (p.owner_id === req.user.id || p.team_members?.some(m => m.user_id === req.user.id))
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const projectTasks = tasks.filter(t => t.project_id === projectId);
        const projectEvents = calendarEvents.filter(e => e.project_id === projectId);
        const completedTasks = projectTasks.filter(t => t.status === 'done');
        const upcomingEvents = projectEvents.filter(e => new Date(e.start_time) > new Date());

        const insights = {
            project: {
                name: project.name,
                type: project.type,
                progress_percentage: project.milestones ?
                    Math.round((project.milestones.filter(m => m.status === 'completed').length / project.milestones.length) * 100) : 0
            },
            automation_stats: {
                auto_generated_milestones: project.milestones?.filter(m => m.auto_generated).length || 0,
                auto_generated_events: projectEvents.filter(e => e.auto_generated).length,
                auto_generated_tasks: projectTasks.filter(t => t.auto_generated).length
            },
            current_status: {
                total_tasks: projectTasks.length,
                completed_tasks: completedTasks.length,
                upcoming_events: upcomingEvents.length,
                next_milestone: project.milestones?.find(m => m.status === 'pending'),
                next_event: upcomingEvents[0]
            },
            suggestions: {
                create_status_meeting: upcomingEvents.length === 0 && projectTasks.length > 3,
                review_milestones: project.milestones?.filter(m => new Date(m.due_date) < new Date() && m.status === 'pending').length > 0,
                update_budget: project.budget_amount && projectTasks.length > 5 && !project.actual_costs
            }
        };

        res.json(insights);

    } catch (error) {
        console.error('Project insights error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

// ENHANCED REPORTS
app.get('/reports/dashboard', authenticateToken, (req, res) => {
    const userProjects = projects.filter(p =>
        p.owner_id === req.user.id ||
        p.team_members?.some(m => m.user_id === req.user.id)
    );
    const userTasks = tasks.filter(t => t.assigned_to === req.user.id);
    const userTimeEntries = timeEntries.filter(t => t.user_id === req.user.id);

    const totalRevenue = userProjects.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const totalCosts = userProjects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
    const totalBudget = userProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

    const dashboard = {
        projects: {
            total: userProjects.length,
            active: userProjects.filter(p => p.status === 'Active').length,
            planning: userProjects.filter(p => p.status === 'Planning').length,
            completed: userProjects.filter(p => p.status === 'Completed').length,
            on_hold: userProjects.filter(p => p.status === 'On Hold').length
        },
        tasks: {
            total: userTasks.length,
            completed: userTasks.filter(t => t.status === 'done').length,
            pending: userTasks.filter(t => t.status !== 'done').length,
            in_progress: userTasks.filter(t => t.status === 'in_progress').length,
            overdue: userTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
        },
        financial: {
            total_revenue: totalRevenue,
            total_costs: totalCosts,
            total_budget: totalBudget,
            profit: totalRevenue - totalCosts,
            profit_margin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100).toFixed(2) : 0
        },
        time: {
            total_logged: userTimeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0),
            billable_hours: userTimeEntries.filter(e => e.billable).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0),
            this_week: userTimeEntries.filter(e => {
                const entryDate = new Date(e.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return entryDate > weekAgo;
            }).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
        },
        recent_activity: activityLog
            .filter(a => a.user_id === req.user.id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10)
    };

    res.json(dashboard);
});

app.get('/reports/projects', authenticateToken, (req, res) => {
    const userProjects = projects.filter(p =>
        p.owner_id === req.user.id ||
        p.team_members?.some(m => m.user_id === req.user.id)
    );

    const report = userProjects.map(project => {
        const projectTasks = tasks.filter(t => t.project_id === project.id);
        const projectTime = timeEntries.filter(t => t.project_id === project.id);

        return {
            ...project,
            task_count: projectTasks.length,
            completed_tasks: projectTasks.filter(t => t.status === 'done').length,
            total_time_logged: projectTime.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0),
            completion_percentage: projectTasks.length > 0 ?
                ((projectTasks.filter(t => t.status === 'done').length / projectTasks.length) * 100).toFixed(1) : 0
        };
    });

    res.json(report);
});

// PERSONNEL MANAGEMENT ROUTES
app.get('/personnel', authenticateToken, (req, res) => {
    res.json(personnel);
});

app.post('/personnel', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const person = {
        id: generateId(),
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        position: req.body.position,
        location: req.body.location,
        hourlyRate: parseFloat(req.body.hourlyRate) || 0,
        skills: req.body.skills || [],
        availability: req.body.availability || 'Available',
        created_at: new Date().toISOString(),
        created_by: req.user.id
    };

    personnel.push(person);
    res.status(201).json(person);
});

app.put('/personnel/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const personIndex = personnel.findIndex(p => p.id === req.params.id);
    if (personIndex === -1) {
        return res.status(404).json({ error: 'Person not found' });
    }

    personnel[personIndex] = { ...personnel[personIndex], ...req.body };
    res.json(personnel[personIndex]);
});

app.delete('/personnel/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const personIndex = personnel.findIndex(p => p.id === req.params.id);
    if (personIndex === -1) {
        return res.status(404).json({ error: 'Person not found' });
    }

    personnel.splice(personIndex, 1);
    res.json({ message: 'Person deleted successfully' });
});

// VENDOR MANAGEMENT ROUTES
app.get('/vendors', authenticateToken, (req, res) => {
    res.json(vendors);
});

app.post('/vendors', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const vendor = {
        id: generateId(),
        name: req.body.name,
        contactName: req.body.contactName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        services: req.body.services || [],
        certifications: req.body.certifications || [],
        rating: parseFloat(req.body.rating) || 0,
        status: req.body.status || 'Active',
        notes: req.body.notes || '',
        created_at: new Date().toISOString(),
        created_by: req.user.id
    };

    vendors.push(vendor);
    res.status(201).json(vendor);
});

app.put('/vendors/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const vendorIndex = vendors.findIndex(v => v.id === req.params.id);
    if (vendorIndex === -1) {
        return res.status(404).json({ error: 'Vendor not found' });
    }

    vendors[vendorIndex] = { ...vendors[vendorIndex], ...req.body };
    res.json(vendors[vendorIndex]);
});

app.delete('/vendors/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const vendorIndex = vendors.findIndex(v => v.id === req.params.id);
    if (vendorIndex === -1) {
        return res.status(404).json({ error: 'Vendor not found' });
    }

    vendors.splice(vendorIndex, 1);
    res.json({ message: 'Vendor deleted successfully' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Enhanced Project Management Platform',
        features: ['Calendar', 'Projects', 'Kanban', 'Time Tracking', 'Financial Reporting', 'Personnel Management', 'Vendor Management']
    });
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Enhanced Project Management Platform running on port ${PORT}`);
    console.log(`📅 Full Business Features: Calendar, Kanban, Revenue Tracking`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);

    // Create default admin user and sample data
    const initializeData = async () => {
        if (users.length === 0) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            users.push({
                id: generateId(),
                username: 'admin',
                email: 'admin@example.com',
                password_hash: passwordHash,
                full_name: 'System Administrator',
                role: 'admin',
                created_at: new Date().toISOString(),
                is_active: true,
                profile_settings: {}
            });
            console.log('📝 Default admin user created: admin/admin123');
        }
    };
    initializeData();
});

export default app;