import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ForgotPassword from "./components/Auth/ForgotPassword";
import AdminDashboard from "./components/Admin/AdminDashboard";
import ProjectDetail from "./components/Admin/ProjectDetail";
import EmployeeTasks from "./components/Admin/EmployeeTasks";
import EmployeeDashboard from "./components/Employee/EmployeeDashboard";
import EmployeeProjectTasks from "./components/Employee/EmployeeProjectTasks";
import TaskDetail from "./components/Employee/TaskDetail";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import TaskHistory from "./components/Admin/TaskHistory";
import EmployeeTaskHistory from "./components/Employee/EmployeeTaskHistory";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

const AppRoutes = () => {
  const { currentUser, userRole } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !currentUser ? (
            <Login />
          ) : (
            <Navigate to={userRole === "admin" ? "/admin" : "/employee"} replace />
          )
        }
      />
      <Route
        path="/register"
        element={
          !currentUser ? (
            <Register />
          ) : (
            <Navigate to={userRole === "admin" ? "/admin" : "/employee"} replace />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/project/:projectId"
        element={
          <ProtectedRoute requiredRole="admin">
            <ProjectDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/project/:projectId/employee/:employeeId"
        element={
          <ProtectedRoute requiredRole="admin">
            <EmployeeTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/history"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <TaskHistory />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/project/:projectId"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeProjectTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/task/:taskId"
        element={
          <ProtectedRoute requiredRole="employee">
            <TaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/history"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <EmployeeTaskHistory />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route
        path="/"
        element={
          currentUser ? (
            <Navigate to={userRole === "admin" ? "/admin" : "/employee"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
