// In-memory storage for meetings and tasks
// Replace with a real database (MongoDB, PostgreSQL, etc.) for production

const meetings = {};
const tasks = {};

// Default meeting structure
const createMeetingTemplate = (overrides = {}) => ({
  id: '',
  title: 'Untitled Meeting',
  description: '',
  attendees: [],
  transcript: '',
  summary: '',
  keyPoints: [],
  decisions: [],  // New: Key decisions made
  actionItems: [], // New: High-level action items
  tasks: [],
  documentType: '', // txt, docx, or manual
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

module.exports = {
  meetings,
  tasks,
  createMeetingTemplate
};
