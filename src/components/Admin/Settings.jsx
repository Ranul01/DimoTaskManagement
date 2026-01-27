// filepath: e:\Freelance\Web\DimoTaskManagement\src\components\Admin\Settings.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import emailjs from '@emailjs/browser';
import { initializeApp, deleteApp } from "firebase/app"; // Add deleteApp here
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const sendWelcomeEmail = async (email, name, password, adminName, role) => {
  try {
    const templateParams = {
      to_email: email,
      to_name: name,
      password: password,
      admin_name: adminName,
      role: role.charAt(0).toUpperCase() + role.slice(1),
      app_url: window.location.origin,
    };

    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

    const response = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    throw new Error('Failed to send welcome email: ' + error.text);
  }
};

const Settings = () => {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [adminName, setAdminName] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/");
    }
  }, [userRole, navigate]);

  // Fetch admin name
  useEffect(() => {
    const getAdminName = async () => {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setAdminName(userDoc.data().name);
      }
    };
    getAdminName();
  }, [currentUser.uid]);

  // Fetch all users
  useEffect(() => {
    const usersQuery = query(collection(db, "users"));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === currentUser.uid) {
      alert("You cannot delete your own account");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete user "${userName}"? This will delete their account and all associated data. This action cannot be undone.`
    );

    if (confirmDelete) {
      try {
        const auth = getAuth();
        const idToken = await auth.currentUser.getIdToken();

        // Use different URL for dev vs production
        const apiUrl = import.meta.env.DEV 
          ? 'http://localhost:3001/api/deleteUser'  // Local dev server
          : '/api/deleteUser';                       // Vercel production

        console.log('🔍 Calling API:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            adminUid: currentUser.uid,
            idToken: idToken,
          }),
        });

        console.log('📡 API Response status:', response.status);

        const data = await response.json();
        console.log('📦 API Response data:', data);

        if (response.ok && data.success) {
          alert(`User "${userName}" has been deleted successfully`);
        } else {
          throw new Error(data.error || 'Failed to delete user');
        }
      } catch (error) {
        console.error("❌ Error deleting user:", error);
        alert("Failed to delete user: " + error.message);
      }
    }
  };

  // Filter users based on search and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-2 sm:mb-3 text-xs sm:text-sm transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                User Management
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Manage users and their roles
              </p>
            </div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-3 py-2 sm:px-4 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark active:bg-dimo-dark transition-colors flex items-center space-x-1.5 sm:space-x-2 text-sm sm:text-base whitespace-nowrap shadow-sm hover:shadow-md flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Filters */}
<div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-3 sm:mb-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
    {/* Search */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Search
      </label>
      <input
        type="text"
        placeholder="Name or email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent transition-shadow"
      />
    </div>

    {/* Role Filter */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Role
      </label>
      <select
        value={filterRole}
        onChange={(e) => setFilterRole(e.target.value)}
        className="w-full px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent transition-shadow"
      >
        <option value="all">All Roles</option>
        <option value="admin">Admin</option>
        <option value="employee">Employee</option>
      </select>
    </div>
  </div>
</div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-dimo-blue flex items-center justify-center text-white text-sm font-medium">
                            {user.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {user.name}
                            </p>
                            {user.id === currentUser.uid && (
                              <span className="text-xs text-gray-500">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          disabled={user.id === currentUser.uid}
                          className={`text-sm px-3 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-dimo-blue ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          } ${user.id === currentUser.uid ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="employee">Employee</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={user.id === currentUser.uid}
                          className={`text-red-600 hover:text-red-800 font-medium ${
                            user.id === currentUser.uid
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow-sm p-3">
            <p className="text-xs text-gray-600">Total Users</p>
            <p className="text-xl font-bold text-gray-800">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3">
            <p className="text-xs text-gray-600">Admins</p>
            <p className="text-xl font-bold text-purple-600">
              {users.filter((u) => u.role === "admin").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3">
            <p className="text-xs text-gray-600">Employees</p>
            <p className="text-xl font-bold text-blue-600">
              {users.filter((u) => u.role === "employee").length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3">
            <p className="text-xs text-gray-600">Active</p>
            <p className="text-xl font-bold text-green-600">
              {filteredUsers.length}
            </p>
          </div>
        </div>

        {/* Register Modal */}
        {showRegisterModal && (
          <RegisterEmployeeModal
            onClose={() => setShowRegisterModal(false)}
            adminName={adminName}
          />
        )}
      </div>
    </div>
  );
};

// Register Employee Modal Component
const RegisterEmployeeModal = ({ onClose, adminName }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (name.trim().length > 50) return "Name is too long (max 50 characters)";
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      return "Name can only contain letters, spaces, hyphens, and apostrophes";
    }
    return "";
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (email.length > 254) return "Email is too long";
    return "";
  };

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&";
    let password = "";
    
    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "@$!%*?&"[Math.floor(Math.random() * 7)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (value) {
      let errorMsg = "";
      if (name === "name") errorMsg = validateName(value);
      if (name === "email") errorMsg = validateEmail(value);
      setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }));
    } else {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (!value) return;

    let errorMsg = "";
    if (name === "name") errorMsg = validateName(value);
    if (name === "email") errorMsg = validateEmail(value);
    setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  // REPLACE THE ENTIRE handleSubmit FUNCTION WITH THIS:
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);

    setFieldErrors({
      name: nameError,
      email: emailError,
    });

    if (nameError || emailError) {
      setError("Please fix all validation errors");
      return;
    }

    if (loading) return;

    let secondaryApp = null; // Declare outside try block

    try {
      setLoading(true);
      
      // Generate password
      const password = generatePassword();
      
      // Create a secondary Firebase app instance
      secondaryApp = initializeApp(
        {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        },
        "Secondary" // Name for the secondary app
      );

      const secondaryAuth = getAuth(secondaryApp);

      // Create user with secondary auth (won't affect current session)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email.toLowerCase().trim(),
        password
      );

      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        role: formData.role,
        createdAt: new Date().toISOString(),
        isFirstLogin: true,
        mustChangePassword: true,
      });

      // Sign out from secondary auth
      await secondaryAuth.signOut();

      // Send email notification
      await sendWelcomeEmail(
        formData.email,
        formData.name,
        password,
        adminName,
        formData.role
      );

      alert(`Employee registered successfully! Welcome email sent to ${formData.email}`);
      onClose();
    } catch (err) {
      console.error("Registration error:", err);
      
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered");
      } else {
        setError(err.message || "Failed to register employee");
      }
    } finally {
      // Delete the secondary app in finally block
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (deleteError) {
          console.error("Error deleting secondary app:", deleteError);
        }
      }
      setLoading(false);
    }
  };

  const hasErrors = Object.values(fieldErrors).some((error) => error !== "");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Register New Employee</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  fieldErrors.name
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-300 focus:ring-dimo-blue"
                }`}
                placeholder="Enter employee's full name"
                maxLength={50}
                required
              />
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  fieldErrors.email
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-300 focus:ring-dimo-blue"
                }`}
                placeholder="Enter employee's email"
                maxLength={254}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-600">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none transition"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> A secure password will be automatically generated and sent to the employee's email address.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || hasErrors}
              className="px-6 py-3 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;