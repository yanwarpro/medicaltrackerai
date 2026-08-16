import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import PatientProfile from './pages/PatientProfile';
import Documents from './pages/Documents';
import LabResults from './pages/LabResults';
import LabTrends from './pages/LabTrends';
import Timeline from './pages/Timeline';
import Checklist from './pages/Checklist';
import HospitalizationTracker from './pages/Hospitalization';
import TransfusionTracker from './pages/Transfusion';
import Medications from './pages/Medications';
import AISummary from './pages/AISummary';
import DoctorReport from './pages/DoctorReport';
import GlobalSearch from './pages/Search';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patient" element={<PatientProfile />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/lab-results" element={<LabResults />} />
            <Route path="/trends" element={<LabTrends />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/hospitalization" element={<HospitalizationTracker />} />
            <Route path="/transfusion" element={<TransfusionTracker />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/summary" element={<AISummary />} />
            <Route path="/report" element={<DoctorReport />} />
            <Route path="/search" element={<GlobalSearch />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
