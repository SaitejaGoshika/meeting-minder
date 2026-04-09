const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// NLP Service for analyzing meeting transcripts
// Uses OpenAI API or mock analysis if no API key provided

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Mock analysis for development (when no API key)
const mockAnalysis = (transcript) => {
  // Simple mock processing
  const lines = transcript.split('\n').filter(l => l.trim());
  const keyPoints = lines.slice(0, Math.min(5, lines.length)).map(line => line.trim());
  
  // Extract decisions (words like "decided", "agreed", "approved", "will", "decided to")
  const decisions = lines
    .filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('decided') ||
      lower.includes('agreed') ||
      lower.includes('approved') ||
      lower.includes('concluded') ||
      lower.includes('determined') ||
      lower.includes('consensus');
    })
    .slice(0, 3)
    .map(line => line.trim().substring(0, 150));

  // Extract action items (words starting with "should", "need to", "task", "todo", "action")
  const tasks = lines
    .filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('task') ||
      lower.includes('should') ||
      lower.includes('need to') ||
      lower.includes('todo') ||
      lower.includes('action item') ||
      lower.includes('deadline') ||
      lower.includes('done by') ||
      lower.includes('responsibility') ||
      lower.includes('assign');
    })
    .slice(0, 5)
    .map((line, idx) => ({
      id: idx + 1,
      title: line.trim().substring(0, 100),
      assignee: 'TBD',
      priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low',
      status: 'pending'
    }));

  return {
    summary: `Meeting summary: ${keyPoints.length > 0 ? keyPoints[0] : 'Discussion recorded.'}`,
    keyPoints: keyPoints.length > 0 ? keyPoints : ['No key points extracted'],
    decisions: decisions.length > 0 ? decisions : ['No specific decisions recorded'],
    tasks: tasks.length > 0 ? tasks : [{
      id: 1,
      title: 'Review meeting notes and follow up',
      assignee: 'Team',
      priority: 'medium',
      status: 'pending'
    }]
  };
};

// Analyze using OpenAI
async function analyzeWithOpenAI(transcript) {
  try {
    const prompt = `Analyze this meeting transcript and provide:
1. A concise summary (2-3 sentences)
2. 3-5 key points discussed
3. 2-3 key decisions made
4. 3-5 action items/tasks with assignee recommendations

Transcript:
${transcript}

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": [...],
  "decisions": [...],
  "tasks": [{"title": "...", "assignee": "...", "priority": "..."}]
}`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const analysis = JSON.parse(content);
    
    return {
      summary: analysis.summary || '',
      keyPoints: analysis.keyPoints || [],
      decisions: analysis.decisions || [],
      tasks: (analysis.tasks || []).map(task => ({
        title: task.title,
        assignee: task.assignee || 'Unassigned',
        priority: task.priority || 'medium',
        status: 'pending'
      }))
    };
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    // Fallback to mock analysis
    return mockAnalysis(transcript);
  }
}

async function analyzeMeeting(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    return {
      summary: 'No transcript provided',
      keyPoints: [],
      tasks: []
    };
  }

  // Use OpenAI if API key is provided, otherwise use mock analysis
  if (OPENAI_API_KEY) {
    return await analyzeWithOpenAI(transcript);
  } else {
    console.log('No OpenAI API key found. Using mock analysis.');
    return mockAnalysis(transcript);
  }
}

// Extract task assignments from text
function extractAssignments(text) {
  const assignments = [];
  const assignmentPattern = /(?:assign|assign to|@)\s+(\w+)\s+(?:to|for)?\s*(.*?)(?:\.|$)/gi;
  
  let match;
  while ((match = assignmentPattern.exec(text)) !== null) {
    assignments.push({
      assignee: match[1],
      task: match[2]
    });
  }
  
  return assignments;
}

// Mock audio transcription (when no API key)
function mockTranscribeAudio(filePath) {
  const fileName = filePath.split('\\').pop() || filePath;
  
  const mockTranscripts = [
    `John: Good morning everyone, let's start the meeting. 
Sarah, can you handle the UI mockups for the new feature? 
Sarah: Sure, I'll have them ready by Friday.
Mike: We need to set up the backend API endpoints before that. 
John: Good point. Mike, can you start that by Wednesday? 
Sarah: I'll coordinate with the design team for assets.
All: Sounds good!`,
    
    `Team opening: Let's discuss the project roadmap.
Alex: First task is to finalize requirements by next week.
Jordan: Second task is to design the database schema.
Casey: We should also plan the testing strategy.
Alex: Good point, let's schedule a testing meeting for next week too.`,
    
    `Meeting notes: Q1 planning session
Action items:
- Complete documentation by end of month
- Schedule performance review with all team members
- Update project timeline
- Prepare budget proposal
- Review and approve new hires`
  ];
  
  // Return a random mock transcript
  const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  console.log('Using mock transcript for:', fileName);
  return randomTranscript;
}

// Transcribe audio using OpenAI Whisper API
async function transcribeAudio(audioFilePath) {
  // If no API key, use mock transcription
  if (!OPENAI_API_KEY) {
    console.warn('No OpenAI API key provided. Using mock audio transcription.');
    console.warn('To enable real transcription, set OPENAI_API_KEY in .env file');
    return mockTranscribeAudio(audioFilePath);
  }

  try {
    const audioFile = fs.createReadStream(audioFilePath);
    const form = new FormData();
    form.append('file', audioFile);
    form.append('model', 'whisper-1');
    form.append('language', 'en');

    const response = await axios.post(WHISPER_API_URL, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      timeout: 300000 // 5 minutes timeout for long audio files
    });

    console.log('Audio transcribed successfully');
    return response.data.text;
  } catch (error) {
    console.error('Whisper API error:', error.message);
    console.warn('Falling back to mock transcription...');
    return mockTranscribeAudio(audioFilePath);
  }
}

module.exports = {
  analyzeMeeting,
  extractAssignments,
  analyzeWithOpenAI,
  transcribeAudio
};
