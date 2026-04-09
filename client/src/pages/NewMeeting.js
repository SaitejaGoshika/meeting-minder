import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingService } from '../services/api';
import './NewMeeting.css';

function NewMeeting() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attendees: '',
    transcript: ''
  });
  const [documentFile, setDocumentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState('text'); // 'text' or 'document'

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('Document file too large. Maximum size is 50MB');
        return;
      }
      // Check file type
      const supportedFormats = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!supportedFormats.includes(file.type)) {
        setError('Unsupported format. Supported formats: TXT, DOCX');
        return;
      }
      setDocumentFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Meeting title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Parse attendees
      const attendees = formData.attendees
        .split(',')
        .map(a => a.trim())
        .filter(a => a);

      // Create meeting
      const meetingResponse = await meetingService.createMeeting({
        title: formData.title,
        description: formData.description,
        attendees
      });

      const meetingId = meetingResponse.data.id;

      // Handle upload based on mode
      if (uploadMode === 'document' && documentFile) {
        // Upload document file
        await uploadDocument(meetingId, documentFile);
      } else if (uploadMode === 'text' && formData.transcript.trim()) {
        // Add transcript if provided
        await meetingService.updateTranscript(meetingId, formData.transcript);
      }

      // Redirect to meeting detail
      navigate(`/meeting/${meetingId}`);
    } catch (err) {
      setError('Failed to create meeting. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (meetingId, docFile) => {
    const formDataForUpload = new FormData();
    formDataForUpload.append('document', docFile);

    try {
      console.log('Uploading document:', docFile.name);
      const response = await fetch(`http://localhost:5000/api/meetings/${meetingId}/document`, {
        method: 'POST',
        body: formDataForUpload
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Document upload failed');
      }

      console.log('Document processed successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      setError('Document processing failed: ' + err.message);
      throw err;
    }
  };

  return (
    <div className="container">
      <h1>📝 New Meeting</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="meeting-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Meeting Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="e.g., Q1 Planning Session"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Add optional description..."
            rows="3"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="attendees">Attendees</label>
          <input
            type="text"
            id="attendees"
            name="attendees"
            placeholder="Comma-separated emails or names (optional)"
            value={formData.attendees}
            onChange={handleInputChange}
          />
        </div>

        {/* Tab selector for upload mode */}
        <div className="upload-mode-tabs">
          <button
            type="button"
            className={`tab-btn ${uploadMode === 'text' ? 'active' : ''}`}
            onClick={() => {
              setUploadMode('text');
              setError('');
            }}
          >
            📝 Paste Transcript
          </button>
          <button
            type="button"
            className={`tab-btn ${uploadMode === 'document' ? 'active' : ''}`}
            onClick={() => {
              setUploadMode('document');
              setError('');
            }}
          >
            📄 Upload Document
          </button>
        </div>

        {/* Text Mode */}
        {uploadMode === 'text' && (
          <div className="form-group">
            <label htmlFor="transcript">Meeting Transcript / Notes</label>
            <textarea
              id="transcript"
              name="transcript"
              placeholder="Paste your meeting transcript or meeting notes here..."
              rows="8"
              value={formData.transcript}
              onChange={handleInputChange}
            />
            <small>AI will analyze to generate summary, extract key decisions and action items.</small>
          </div>
        )}

        {/* Document Mode */}
        {uploadMode === 'document' && (
          <div className="form-group">
            <label htmlFor="documentFile">Upload Meeting Document</label>
            <div className="document-input-wrapper">
              <input
                type="file"
                id="documentFile"
                accept=".txt,.docx"
                onChange={handleDocumentFileChange}
                className="document-input"
              />
              <label htmlFor="documentFile" className="document-input-label">
                {documentFile ? (
                  <>
                    <span className="doc-icon">✓</span>
                    <span className="file-name">{documentFile.name}</span>
                    <span className="file-size">({(documentFile.size / (1024 * 1024)).toFixed(2)}MB)</span>
                  </>
                ) : (
                  <>
                    <span className="doc-icon">📄</span>
                    <span>Click to select file or drag & drop</span>
                  </>
                )}
              </label>
            </div>
            <small>
              Supported formats: TXT, DOCX (Max 50MB). System will parse and analyze automatically.
            </small>
          </div>
        )}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || (uploadMode === 'document' && !documentFile && !formData.title)}
          >
            {loading ? 
              (uploadMode === 'document' ? 'Processing document...' : 'Creating...') 
              : '✓ Create Meeting'
            }
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="info-box">
        <h3>💡 Features</h3>
        <ul>
          <li><strong>Multiple Input Methods:</strong> Paste text or upload TXT/DOCX files</li>
          <li><strong>Smart Analysis:</strong> Automatic extraction of summaries and key points</li>
          <li><strong>Action Extraction:</strong> AI identifies tasks and assigns priorities</li>
          <li><strong>Professional Export:</strong> Generate PDF meeting minutes with all details</li>
        </ul>
      </div>
    </div>
  );
}

export default NewMeeting;
