import React, { useState, useEffect } from 'react';
import { taskService, meetingService } from '../services/api';
import './TasksList.css';

function TasksList() {
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks
      const tasksResponse = await taskService.getAllTasks();
      setTasks(tasksResponse.data);

      // Fetch meetings for reference
      const meetingsResponse = await meetingService.getAllMeetings();
      const meetingsMap = {};
      Object.values(meetingsResponse.data).forEach(m => {
        meetingsMap[m.id] = m.title;
      });
      setMeetings(meetingsMap);

      setError('');
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(t => t.id !== taskId));
      } catch (err) {
        console.error('Failed to delete task', err);
        setError('Failed to delete task');
      }
    }
  };

  // Filter tasks
  let filteredTasks = tasks;
  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }
  if (filterPriority !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  }

  // Sort by status and priority
  filteredTasks = filteredTasks.sort((a, b) => {
    const statusOrder = { pending: 0, 'in-progress': 1, completed: 2 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Tasks</h1>
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>✓ All Tasks</h1>
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Priority:</label>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          {tasks.length === 0 
            ? "No tasks yet. Add a meeting with a transcript to extract action items!"
            : "No tasks match the selected filters."
          }
        </div>
      ) : (
        <div className="tasks-container">
          {filteredTasks.map(task => (
            <div key={task.id} className={`task-card status-${task.status}`}>
              <div className="task-header">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleStatusChange(
                    task.id,
                    task.status === 'completed' ? 'pending' : 'completed'
                  )}
                  className="task-checkbox"
                />
                <h3>{task.title}</h3>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>

              {task.description && (
                <p className="task-description">{task.description}</p>
              )}

              <div className="task-details">
                <div className="detail-item">
                  <span className="label">Assignee:</span>
                  <span>{task.assignee}</span>
                </div>

                <div className="detail-item">
                  <span className="label">Priority:</span>
                  <span className={`badge badge-${task.priority}`}>
                    {task.priority}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="label">Status:</span>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {task.dueDate && (
                  <div className="detail-item">
                    <span className="label">Due:</span>
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}

                {task.meetingId && meetings[task.meetingId] && (
                  <div className="detail-item">
                    <span className="label">Meeting:</span>
                    <span className="meeting-name">{meetings[task.meetingId]}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TasksList;
