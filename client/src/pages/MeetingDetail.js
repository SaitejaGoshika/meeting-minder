import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { meetingService, taskService } from '../services/api';
import './MeetingDetail.css';

function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMeetingData();
  }, [id]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const meetingResponse = await meetingService.getMeeting(id);
      setMeeting(meetingResponse.data);
      setTranscriptText(meetingResponse.data.transcript || '');

      const tasksResponse = await taskService.getMeetingTasks(id);
      setTasks(tasksResponse.data);
      
      setError('');
    } catch (err) {
      setError('Failed to load meeting');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTranscript = async () => {
    try {
      setReprocessing(true);
      await meetingService.updateTranscript(id, transcriptText);
      
      // Refresh meeting data to get updated summary and tasks
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchMeetingData();
      
      setEditingTranscript(false);
      setReprocessing(false);
    } catch (err) {
      setError('Failed to update transcript');
      setReprocessing(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const response = await fetch(`http://localhost:5000/api/meetings/${id}/export-pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const filename = `${meeting.title.replace(/\s+/g, '_')}_minutes.pdf`;
      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export PDF: ' + err.message);
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="container"><div className="loading">Loading meeting...</div></div>;
  }

  if (!meeting) {
    return <div className="container"><div className="alert alert-error">Meeting not found</div></div>;
  }

  return (
    <div className="meeting-detail">
      <div className="detail-header">
        <div>
          <h1>{meeting.title}</h1>
          {meeting.description && <p className="description">{meeting.description}</p>}
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? '⏳ Exporting...' : '📥 Export PDF'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← Back
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Meeting Info */}
      <div className="card">
        <h3 className="section-title">📅 Meeting Details</h3>
        <div className="detail-grid">
          <div>
            <strong>Created:</strong>
            <p>{new Date(meeting.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <strong>Attendees:</strong>
            <p>{meeting.attendees?.length > 0 ? meeting.attendees.join(', ') : 'None specified'}</p>
          </div>
        </div>
      </div>

      {/* Summary & Key Points */}
      {meeting.summary && (
        <div className="card">
          <h3 className="section-title">📋 Summary</h3>
          <div className="summary-content">
            <p>{meeting.summary}</p>
            
            {meeting.keyPoints && meeting.keyPoints.length > 0 && (
              <div className="key-points">
                <h4>Key Points:</h4>
                <ul>
                  {meeting.keyPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decisions Section */}
      {meeting.decisions && meeting.decisions.length > 0 && (
        <div className="card">
          <h3 className="section-title">✔️ Key Decisions</h3>
          <div className="decisions-content">
            <ul className="decisions-list">
              {meeting.decisions.map((decision, idx) => (
                <li key={idx} className="decision-item">
                  <span className="decision-check">✓</span>
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Transcript Section */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">📝 Transcript</h3>
          {!editingTranscript && (
            <button 
              className="btn btn-secondary"
              onClick={() => setEditingTranscript(true)}
            >
              Edit
            </button>
          )}
        </div>

        {editingTranscript ? (
          <div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste your meeting transcript here..."
              rows="10"
              style={{ width: '100%', padding: '12px', borderRadius: '4px' }}
            />
            <div className="button-group">
              <button 
                className="btn btn-primary"
                onClick={handleUpdateTranscript}
                disabled={reprocessing}
              >
                {reprocessing ? 'Processing...' : 'Save & Reprocess'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setEditingTranscript(false)}
                disabled={reprocessing}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="transcript-content">
            {transcriptText ? (
              <p>{transcriptText}</p>
            ) : (
              <p style={{ color: '#999' }}>No transcript added yet. Click "Edit" to add one.</p>
            )}
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="card">
        <h3 className="section-title">✓ Tasks ({tasks.length})</h3>
        
        {tasks.length === 0 ? (
          <p style={{ color: '#999' }}>No tasks extracted yet. Add a transcript for AI to extract action items.</p>
        ) : (
          <div className="tasks-list">
            {tasks.map(task => (
              <div key={task.id} className={`task-item status-${task.status}`}>
                <div className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleTaskStatusChange(
                      task.id,
                      task.status === 'completed' ? 'pending' : 'completed'
                    )}
                  />
                </div>
                <div className="task-content">
                  <h4>{task.title}</h4>
                  {task.description && <p>{task.description}</p>}
                  <div className="task-meta">
                    <span className={`badge badge-${task.priority}`}>
                      {task.priority}
                    </span>
                    <span className="task-assignee">👤 {task.assignee}</span>
                    {task.dueDate && (
                      <span className="task-date">📅 {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingDetail;
