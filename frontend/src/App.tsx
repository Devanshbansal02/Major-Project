import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import SubjectView from "./pages/SubjectView";
import ChatView from "./pages/ChatView";
import TriviaView from "./pages/TriviaView";
import Settings from "./pages/Settings";
import FacultyLogin from "./pages/FacultyLogin";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultySubjectNotes from "./pages/FacultySubjectNotes";
import FacultyGuard from "./components/FacultyGuard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />

        {/* Student routes */}
        <Route path="/student" element={<Dashboard />} />
        <Route path="/subject/:id" element={<SubjectView />} />
        <Route path="/subject/:id/chat" element={<ChatView />} />
        <Route path="/subject/:id/trivia" element={<TriviaView />} />
        <Route path="/settings" element={<Settings />} />

        {/* Faculty routes */}
        <Route path="/faculty/login" element={<FacultyLogin />} />
        <Route path="/faculty" element={<FacultyGuard><FacultyDashboard /></FacultyGuard>} />
        <Route path="/faculty/subjects/:id" element={<FacultyGuard><FacultySubjectNotes /></FacultyGuard>} />
      </Routes>
    </BrowserRouter>
  );
}
