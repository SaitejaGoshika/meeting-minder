const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { tasks, meetings } = require('../models/storage');

// Get all tasks
router.get('/', (req, res) => {
  try {
    const taskList = Object.values(tasks);
    res.json(taskList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for a meeting
router.get('/meeting/:meetingId', (req, res) => {
  try {
    const meetingTasks = Object.values(tasks).filter(
      t => t.meetingId === req.params.meetingId
    );
    res.json(meetingTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task
router.get('/:id', (req, res) => {
  try {
    const task = tasks[req.params.id];
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new task
router.post('/', (req, res) => {
  try {
    const { meetingId, title, description, assignee, dueDate, priority } = req.body;
    const taskId = uuidv4();
    
    const newTask = {
      id: taskId,
      meetingId: meetingId || null,
      title: title || 'Untitled Task',
      description: description || '',
      assignee: assignee || 'Unassigned',
      dueDate: dueDate || null,
      priority: priority || 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tasks[taskId] = newTask;
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', (req, res) => {
  try {
    const task = tasks[req.params.id];
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const { title, description, assignee, dueDate, priority, status } = req.body;
    
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignee !== undefined) task.assignee = assignee;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    
    task.updatedAt = new Date().toISOString();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', (req, res) => {
  try {
    if (!tasks[req.params.id]) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    delete tasks[req.params.id];
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const task = tasks[req.params.id];
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    task.status = status;
    task.updatedAt = new Date().toISOString();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
