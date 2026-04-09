import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import MeetingsList from './pages/MeetingsList';
import MeetingDetail from './pages/MeetingDetail';
import TasksList from './pages/TasksList';
import NewMeeting from './pages/NewMeeting';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              📋 Meeting Minder
            </Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-link">Meetings</Link>
              </li>
              <li className="nav-item">
                <Link to="/tasks" className="nav-link">Tasks</Link>
              </li>
              <li className="nav-item">
                <Link to="/new" className="nav-link btn-primary">+ New Meeting</Link>
              </li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<MeetingsList />} />
            <Route path="/meeting/:id" element={<MeetingDetail />} />
            <Route path="/tasks" element={<TasksList />} />
            <Route path="/new" element={<NewMeeting />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
