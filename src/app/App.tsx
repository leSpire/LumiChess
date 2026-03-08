import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AppStoreProvider } from '../store/appStore';
import { AuthPage } from '../pages/AuthPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LearnPage } from '../pages/LearnPage';
import { BoardPage } from '../pages/BoardPage';
import { ProfilePage } from '../pages/ProfilePage';

export function App() {
  return (
    <AppStoreProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppStoreProvider>
  );
}
