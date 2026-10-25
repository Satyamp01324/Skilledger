import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import IssueCredential from './pages/IssueCredential';
import VerifyCredential from './pages/VerifyCredential';
import ChainVisualization from './pages/ChainVisualization';
import TamperDemo from './pages/TamperDemo';
import AuditExplorer from './pages/AuditExplorer';
import SkillValidator from './pages/SkillValidator';
import TrustRegistryPage from './pages/TrustRegistryPage';
import MockCertificate from './pages/MockCertificate';
import './App.css';

let toastId = 0;

export default function App() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current && current.id === id ? null : current));
    }, 3800);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <Dashboard showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/institutions"
          element={
            <AppShell>
              <TrustRegistryPage showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/issue"
          element={
            <AppShell>
              <IssueCredential showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/verify"
          element={
            <AppShell>
              <VerifyCredential showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/verify/:id"
          element={
            <AppShell>
              <VerifyCredential showToast={showToast} />
            </AppShell>
          }
        />
        <Route path="/certificate/:id" element={<MockCertificate />} />
        <Route path="/cert/:id" element={<MockCertificate />} />
        <Route path="/mock-certificate" element={<MockCertificate />} />
        <Route
          path="/chain"
          element={
            <AppShell>
              <ChainVisualization showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/tamper"
          element={
            <AppShell>
              <TamperDemo showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/skill-validator"
          element={
            <AppShell>
              <SkillValidator showToast={showToast} />
            </AppShell>
          }
        />
        <Route
          path="/audit"
          element={
            <AppShell>
              <AuditExplorer showToast={showToast} />
            </AppShell>
          }
        />
      </Routes>
      <Toast toast={toast} />
    </>
  );
}

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">{children}</main>
    </div>
  );
}