import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        {/* Student routes */}
        <Route path="/" element={<Dashboard />} />
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
