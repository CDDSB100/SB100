import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import LandingPage from './pages/Landing'; // Nova página de Landing
import HomePage from './pages/Home';
import SearchPage from './pages/Search';
import CurationPage from './pages/Curation';
import ManualInsertPage from './pages/ManualInsert';
import UserRegistrationPage from './pages/UserRegistration';
import UserManagementPage from './pages/UserManagement';
import ExtractMetadataPage from './pages/ExtractMetadata';
import BatchProcessDrivePage from './pages/BatchProcessDrive';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/App.css';

function App() {
  return (
    <Routes>
      {/* Rota pública inicial */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/curation" element={<CurationPage />} />
        <Route path="/manual-insert" element={<ManualInsertPage />} />
        <Route path="/register-user" element={<UserRegistrationPage />} />
        <Route path="/user-management" element={<UserManagementPage />} />
        <Route path="/extract-metadata" element={<ExtractMetadataPage />} />
        <Route path="/batch-process-drive" element={<BatchProcessDrivePage />} />
      </Route>
      
      {/* Redirecionamento padrão */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
