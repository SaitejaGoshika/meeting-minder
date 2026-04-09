import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { meetingService } from '../services/api';
import './MeetingsList.css';

function MeetingsList() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await meetingService.getAllMeetings();
      setMeetings(Object.values(response.data));
      setError('');
    } catch (err) {
      setError('Failed to fetch meetings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Meetings</h1>
        <div className="loading">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>📊 Meetings</h1>
        <Link to="/new" className="btn btn-primary">+ New Meeting</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {meetings.length === 0 ? (
        <div className="empty-state">
          <p>No meetings yet. Click "New Meeting" to get started!</p>
        </div>
      ) : (
        <div className="meetings-grid">
          {meetings.map(meeting => (
            <div key={meeting.id} className="meeting-card">
              <Link to={`/meeting/${meeting.id}`} className="meeting-link">
                <h3>{meeting.title}</h3>
                <p className="meeting-description">{meeting.description}</p>
                
                {meeting.summary && (
                  <div className="meeting-summary">
                    <strong>Summary:</strong>
                    <p>{meeting.summary.substring(0, 100)}...</p>
                  </div>
                )}

                <div className="meeting-meta">
                  <span className="meta-item">
                    👥 {meeting.attendees?.length || 0} attendees
                  </span>
                  <span className="meta-item">
                    ✓ {meeting.tasks?.length || 0} tasks
                  </span>
                </div>

                <div className="meeting-date">
                  {formatDate(meeting.createdAt)}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeetingsList;
