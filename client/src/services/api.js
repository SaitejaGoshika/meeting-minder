import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Meeting API calls
export const meetingService = {
  getAllMeetings: () => api.get('/meetings'),
  getMeeting: (id) => api.get(`/meetings/${id}`),
  createMeeting: (meeting) => api.post('/meetings', meeting),
  updateTranscript: (id, transcript) => api.put(`/meetings/${id}/transcript`, { transcript }),
  getSummary: (id) => api.get(`/meetings/${id}/summary`)
};

// Task API calls
export const taskService = {
  getAllTasks: () => api.get('/tasks'),
  getMeetingTasks: (meetingId) => api.get(`/tasks/meeting/${meetingId}`),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (task) => api.post('/tasks', task),
  updateTask: (id, task) => api.put(`/tasks/${id}`, task),
  updateTaskStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  deleteTask: (id) => api.delete(`/tasks/${id}`)
};

export default api;
