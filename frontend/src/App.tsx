import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SubjectView from "./pages/SubjectView";
import ChatView from "./pages/ChatView";
import TriviaView from "./pages/TriviaView";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subject/:id" element={<SubjectView />} />
        <Route path="/subject/:id/chat" element={<ChatView />} />
        <Route path="/subject/:id/trivia" element={<TriviaView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
