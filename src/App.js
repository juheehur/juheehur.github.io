import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import Blog from './pages/Blog';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Admin from './pages/Admin';
import AddProject from './pages/admin/AddProject';
import AddBlog from './pages/admin/AddBlog';
import { ProtectedRoute } from './components/ProtectedRoute';
import './styles/global.css';
import './styles/admin.css';
import './styles/auth.css';
import Profile from './pages/Profile';
import './styles/profile.css';
import EditProject from './pages/admin/EditProject';
import ProjectDetails from './pages/ProjectDetails';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/project/:id" element={<ProjectDetails />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/add-project" 
            element={
              <ProtectedRoute adminOnly>
                <AddProject />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/add-blog" 
            element={
              <ProtectedRoute adminOnly>
                <AddBlog />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/edit-project/:projectId" 
            element={
              <ProtectedRoute adminOnly>
                <EditProject />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
