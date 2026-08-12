import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Problems from './pages/Problems.jsx';
import ProblemForm from './pages/ProblemForm.jsx';
import MemoryCards from './pages/MemoryCards.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Analytics from './pages/Analytics.jsx';
import Design from './pages/Design.jsx';
import Cs from './pages/Cs.jsx';
import Sql from './pages/Sql.jsx';
import SqlForm from './pages/SqlForm.jsx';
import Tutor from './pages/Tutor.jsx';
import Quiz from './pages/Quiz.jsx';
import Resumes from './pages/Resumes.jsx';
import ResumeDetail from './pages/ResumeDetail.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function OnboardGate({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile && !profile.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/onboarding"
        element={
          <Protected>
            <Onboarding />
          </Protected>
        }
      />
      <Route
        element={
          <Protected>
            <OnboardGate>
              <Layout />
            </OnboardGate>
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/new" element={<ProblemForm />} />
        <Route path="/problems/:id" element={<ProblemForm />} />
        <Route path="/cards" element={<MemoryCards />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/design" element={<Design />} />
        <Route path="/cs" element={<Cs />} />
        <Route path="/sql" element={<Sql />} />
        <Route path="/sql/new" element={<SqlForm />} />
        <Route path="/sql/:id" element={<SqlForm />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/resumes" element={<Resumes />} />
        <Route path="/resumes/:id" element={<ResumeDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
