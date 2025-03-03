import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import Blog from './pages/Blog';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Admin from './pages/Admin';
import AddProject from './pages/admin/AddProject';
import AddBlog from './pages/admin/AddBlog';
import AddQuestion from './pages/admin/AddQuestion';
import Question from './pages/Question';
import { ProtectedRoute } from './components/ProtectedRoute';
import './styles/global.css';
import './styles/admin.css';
import './styles/auth.css';
import Profile from './pages/Profile';
import './styles/profile.css';
import EditProject from './pages/admin/EditProject';
import ProjectDetails from './pages/ProjectDetails';
import Duplicate from './pages/Duplicate';
import BlogDetails from './pages/BlogDetails';
import EditBlog from './pages/admin/EditBlog';
import PortfolioSummary from './pages/admin/PortfolioSummary';
import AddTodo from './pages/admin/AddTodo';
import TodoManagement from './pages/admin/TodoManagement';
import AddGoal from './pages/admin/AddGoal';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import TechInterview from './pages/admin/TechInterview';
import InterviewPractice from './pages/admin/InterviewPractice';
import StudentProgressPage from './pages/StudentProgressPage';
import ContentsManagement from './pages/ContentsManagement';
import MakeContents from './pages/MakeContents';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from './context/LanguageContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ReelsIdeaSpace from './pages/ReelsIdeaSpace';

// Check if we're in the GitHub Pages environment
const isGithubPages = process.env.REACT_APP_DEPLOY_TARGET === 'github';

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <HelmetProvider>
        <LanguageProvider>
          <AuthProvider>
            <Router>
              <div className="App">
                <Header />
                <Routes>
                  <Route path="/" element={
                    <ConditionalHomeRoute />
                  } />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/project/:id" element={<ProjectDetails />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:id" element={<BlogDetails />} />
                  
                  {/* Only show these routes in non-GitHub Pages environment */}
                  {!isGithubPages && (
                    <>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                      <Route path="/admin/add-project" element={<ProtectedRoute adminOnly><AddProject /></ProtectedRoute>} />
                      <Route path="/admin/add-blog" element={<ProtectedRoute adminOnly><AddBlog /></ProtectedRoute>} />
                      <Route path="/admin/add-question" element={<ProtectedRoute adminOnly><AddQuestion /></ProtectedRoute>} />
                      <Route path="/admin/add-goal" element={<ProtectedRoute adminOnly><AddGoal /></ProtectedRoute>} />
                      <Route path="/admin/portfolio-summary" element={<ProtectedRoute adminOnly><PortfolioSummary /></ProtectedRoute>} />
                      <Route path="/admin/edit-project/:projectId" element={<ProtectedRoute adminOnly><EditProject /></ProtectedRoute>} />
                      <Route path="/admin/edit-blog/:postId" element={<ProtectedRoute adminOnly><EditBlog /></ProtectedRoute>} />
                      <Route path="/admin/add-todo" element={<ProtectedRoute adminOnly><AddTodo /></ProtectedRoute>} />
                      <Route path="/admin/todo-management" element={<ProtectedRoute adminOnly><TodoManagement /></ProtectedRoute>} />
                      <Route path="/admin/todos" element={<Navigate to="/admin/add-todo" replace />} />
                      <Route path="/admin/contents" element={<ProtectedRoute adminOnly><ContentsManagement /></ProtectedRoute>} />
                      <Route path="/admin/makecontents" element={<ProtectedRoute adminOnly><MakeContents /></ProtectedRoute>} />
                      <Route path="/admin/reels-idea-space" element={<ProtectedRoute adminOnly><ReelsIdeaSpace /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/duplicate" element={<Duplicate />} />
                      <Route path="/admin/tech-interview" element={
                        <ProtectedRoute>
                          <TechInterview />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/interview-practice" element={
                        <ProtectedRoute>
                          <InterviewPractice />
                        </ProtectedRoute>
                      } />
                    </>
                  )}
                  
                  <Route path="/question/:id" element={<Question />} />
                  <Route path="/student-progress/:studentId" element={<StudentProgressPage />} />
                </Routes>
              </div>
            </Router>
          </AuthProvider>
        </LanguageProvider>
      </HelmetProvider>
    </GoogleOAuthProvider>
  );
}

// Add this new component for conditional routing
function ConditionalHomeRoute() {
  const { currentUser, isAdmin } = useAuth();
  
  if (currentUser && isAdmin) {
    return <AddTodo />;
  }
  
  return <Home />;
}

export default App;
