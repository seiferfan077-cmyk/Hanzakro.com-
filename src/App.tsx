import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AssistantPage from './pages/AssistantPage';
import CompetitionsPage from './pages/CompetitionsPage';
import HomePage from './pages/HomePage';
import LuayChatPage from './pages/LuayChatPage';
import NotFoundPage from './pages/NotFoundPage';
import StudyPage from './pages/StudyPage';
import VocabularyPage from './pages/VocabularyPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/chat" element={<LuayChatPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="competitions" element={<CompetitionsPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
