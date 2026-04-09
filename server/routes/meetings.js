const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const nlpService = require('../utils/nlpService');
const documentService = require('../utils/documentService');
const pdfService = require('../utils/pdfService');
const { meetings, createMeetingTemplate } = require('../models/storage');
const fs = require('fs');
const path = require('path');

// Get all meetings
router.get('/', (req, res) => {
  try {
    const meetingList = Object.values(meetings);
    res.json(meetingList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single meeting
router.get('/:id', (req, res) => {
  try {
    const meeting = meetings[req.params.id];
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new meeting
router.post('/', (req, res) => {
  try {
    const { title, description, attendees } = req.body;
    const meetingId = uuidv4();
    
    const newMeeting = createMeetingTemplate({
      id: meetingId,
      title: title || 'Untitled Meeting',
      description: description || '',
      attendees: attendees || []
    });
    
    meetings[meetingId] = newMeeting;
    res.status(201).json(newMeeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update meeting with transcript
router.put('/:id/transcript', (req, res) => {
  try {
    const { transcript } = req.body;
    const meeting = meetings[req.params.id];
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    meeting.transcript = transcript;
    meeting.updatedAt = new Date().toISOString();
    
    // Trigger NLP processing
    processTranscript(req.params.id, transcript);
    
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and transcribe audio file
router.post('/:id/audio', async (req, res) => {
  try {
    const meeting = meetings[req.params.id];
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Use the upload middleware from server index.js
    const uploader = req.app.locals.upload.single('audio');
    uploader(req, res, async (err) => {
      if (err) {
        console.error('Upload middleware error:', err);
        return res.status(400).json({ error: 'File upload failed: ' + err.message });
      }

      if (!req.file) {
        console.warn('No file provided in audio upload');
        return res.status(400).json({ error: 'No audio file provided' });
      }

      console.log('Audio file received:', req.file.originalname, 'Size:', req.file.size);

      // Check file size (max 25MB for Whisper API)
      if (req.file.size > 25 * 1024 * 1024) {
        try { require('fs').unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ error: 'Audio file too large. Maximum size is 25MB' });
      }

      try {
        // Transcribe audio
        console.log('Starting transcription for:', req.file.originalname);
        const transcript = await nlpService.transcribeAudio(req.file.path);

        if (!transcript || transcript.trim().length === 0) {
          throw new Error('Transcription returned empty result');
        }

        console.log('Transcription successful. Length:', transcript.length);

        // Update meeting with transcript
        meeting.transcript = transcript;
        meeting.updatedAt = new Date().toISOString();

        // Process transcript for summary and tasks
        await processTranscript(req.params.id, transcript);

        // Clean up uploaded file
        try { require('fs').unlinkSync(req.file.path); } catch (e) {}

        res.json({
          message: 'Audio transcribed successfully',
          meeting: meeting,
          transcript: transcript
        });
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        // Clean up uploaded file
        try { 
          if (require('fs').existsSync(req.file.path)) {
            require('fs').unlinkSync(req.file.path);
          }
        } catch (e) {}
        
        res.status(500).json({ 
          error: 'Audio transcription failed',
          details: transcriptionError.message 
        });
      }
    });
  } catch (error) {
    console.error('Audio endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get meeting summary
router.get('/:id/summary', (req, res) => {
  try {
    const meeting = meetings[req.params.id];
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      id: meeting.id,
      title: meeting.title,
      summary: meeting.summary,
      keyPoints: meeting.keyPoints,
      decisions: meeting.decisions,
      tasks: meeting.tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and parse document (TXT or DOCX)
router.post('/:id/document', async (req, res) => {
  try {
    const meeting = meetings[req.params.id];
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const uploader = req.app.locals.upload.single('document');
    uploader(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ error: 'File upload failed: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No document provided' });
      }

      const supportedTypes = {
        'text/plain': 'txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
      };

      if (!supportedTypes[req.file.mimetype]) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ 
          error: 'Unsupported file type. Supported: TXT, DOCX' 
        });
      }

      try {
        console.log('Parsing document:', req.file.originalname, 'Type:', req.file.mimetype);
        const transcript = await documentService.parseDocument(req.file.path, req.file.mimetype);

        meeting.transcript = transcript;
        meeting.documentType = supportedTypes[req.file.mimetype];
        meeting.updatedAt = new Date().toISOString();

        // Process transcript for analysis
        await processTranscript(req.params.id, transcript);

        // Clean up
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        res.json({
          message: 'Document processed successfully',
          meeting: meeting,
          docType: meeting.documentType
        });
      } catch (parseError) {
        console.error('Parse error:', parseError);
        try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
        
        res.status(500).json({ 
          error: 'Document parsing failed',
          details: parseError.message 
        });
      }
    });
  } catch (error) {
    console.error('Document endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export meeting as PDF
router.get('/:id/export-pdf', async (req, res) => {
  try {
    const meeting = meetings[req.params.id];
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const fileName = `meeting-${meeting.id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    try {
      await pdfService.generateMeetingPDF(meeting, filePath);

      res.download(filePath, `${meeting.title}.pdf`, (err) => {
        if (err) console.error('Download error:', err);
        // Clean up file after download
        try { fs.unlinkSync(filePath); } catch (e) {}
      });
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      res.status(500).json({ 
        error: 'PDF generation failed',
        details: pdfError.message 
      });
    }
  } catch (error) {
    console.error('Export endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process transcript asynchronously
async function processTranscript(meetingId, transcript) {
  try {
    const meeting = meetings[meetingId];
    
    // Call NLP service for analysis
    const analysis = await nlpService.analyzeMeeting(transcript);
    
    meeting.summary = analysis.summary;
    meeting.keyPoints = analysis.keyPoints;
    meeting.decisions = analysis.decisions || [];
    meeting.tasks = analysis.tasks;
    meeting.updatedAt = new Date().toISOString();
  } catch (error) {
    console.error('Error processing transcript:', error);
  }
}

module.exports = router;
