import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
// import dimoLogo from "../../assets/wurkai-logo1.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    if (email.length > 254) {
      return "Email is too long";
    }
    return "";
  };

  // Password validation
  const validatePassword = (password) => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password.length > 128) {
      return "Password is too long";
    }
    // Check for common passwords
    const commonPasswords = ["123456", "password", "123456789", "12345678"];
    if (commonPasswords.includes(password.toLowerCase())) {
      return "Please use a stronger password";
    }
    return "";
  };

  // Handle email change with validation
  const handleEmailChange = (e) => {
    const value = e.target.value.trim();
    setEmail(value);
    if (value) {
      setEmailError(validateEmail(value));
    } else {
      setEmailError("");
    }
  };

  // Handle password change with validation
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      setPasswordError(validatePassword(value));
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate before submission
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);

    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);

    if (emailValidationError || passwordValidationError) {
      return;
    }

    // Prevent multiple submissions
    if (loading) return;

    setLoading(true);

    try {
      await login(email.toLowerCase(), password);
      // Navigation will be handled by App.jsx based on role
    } catch (err) {
      // More specific error messages
      if (err.response) {
        switch (err.response.status) {
          case 401:
            setError("Invalid email or password");
            break;
          case 403:
            setError("Account is locked. Please contact support");
            break;
          case 429:
            setError("Too many login attempts. Please try again later");
            break;
          default:
            setError("Failed to login. Please try again");
        }
      } else if (err.request) {
        setError("Network error. Please check your connection");
      } else {
        setError("Failed to login. Please check your credentials");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dimo-dark via-dimo-blue to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background parallelograms in wave pattern */}
      {/* <div className="absolute inset-0"> */}
        {/* Parallelogram 1 - Upper-middle */}
        {/* <div
          className="absolute w-80 overflow-hidden shadow-2xl"
          style={{
            top: "10%",
            left: "2%",
            height: "600px",
            transform: "skewX(-15deg)",
          }}
        >
          <img
            src="/images/dimo1.webp"
            alt="Task 1"
            className="w-full h-full object-cover"
            style={{ transform: "skewX(15deg) scale(1.4)" }}
          />
          <div className="absolute inset-0 bg-dimo-blue/30"></div>
        </div> */}

        {/* Parallelogram 2 - Lower-middle */}
        {/* <div
          className="absolute w-80 overflow-hidden shadow-2xl"
          style={{
            top: "25%",
            left: "20%",
            height: "600px",
            transform: "skewX(-15deg)",
          }}
        >
          <img
            src="/images/dimo2.webp"
            alt="Task 2"
            className="w-full h-full object-cover"
            style={{ transform: "skewX(15deg) scale(1.4)" }}
          />
          <div className="absolute inset-0 bg-dimo-dark/30"></div>
        </div> */}

        {/* Parallelogram 3 - Upper-middle (same as #1) */}
        {/* <div
          className="absolute w-80  overflow-hidden shadow-2xl"
          style={{
            top: "10%",
            left: "40%",
            height: "600px",
            transform: "skewX(-15deg)",
          }}
        >
          <img
            src="/images/dimo3.jpg"
            alt="Task 3"
            className="w-full h-full object-cover"
            style={{ transform: "skewX(15deg) scale(1.4)" }}
          />
          <div className="absolute inset-0 bg-dimo-blue/30"></div>
        </div> */}

        {/* Parallelogram 4 - Lower-middle (same as #2) */}
        {/* <div
          className="absolute w-80  overflow-hidden shadow-2xl"
          style={{
            top: "25%",
            left: "54%",
            height: "600px",
            transform: "skewX(-15deg)",
          }}
        >
          <img
            src="/images/dimo4.jpg"
            alt="Task 4"
            className="w-full h-full object-cover"
            style={{ transform: "skewX(15deg) scale(1.4)" }}
          />
          <div className="absolute inset-0 bg-dimo-dark/30"></div>
        </div> */}

        {/* Parallelogram 5 - Upper-middle (same as #1) */}
        {/* <div
          className="absolute w-80  overflow-hidden shadow-2xl"
          style={{
            top: "10%",
            left: "76%",
            height: "600px",
            transform: "skewX(-15deg)",
          }}
        >
          <img
            src="/images/dimo5.jpg"
            alt="Task 5"
            className="w-full h-full object-cover"
            style={{ transform: "skewX(15deg) scale(1.4)" }}
          />
          <div className="absolute inset-0 bg-dimo-blue/30"></div>
        </div> */}

        {/* Dark overlay for better form visibility */}
        {/* <div className="absolute inset-0 bg-black/40"></div>
      </div> */}

      {/* Login Form Card - Centered on top */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            {/* <img
              src={dimoLogo}
              alt="DIMO Logo"
              className="h-14 w-auto mx-auto mb-6"
            /> */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-sm">
              Sign in to access your tasks
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => email && setEmailError(validateEmail(email))}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition bg-white ${
                  emailError
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-300 focus:ring-dimo-blue"
                }`}
                placeholder="Enter your email"
                autoComplete="email"
                maxLength={254}
                required
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() =>
                    password && setPasswordError(validatePassword(password))
                  }
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition bg-white ${
                    passwordError
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-300 focus:ring-dimo-blue"
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-dimo-blue hover:text-dimo-dark transition font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !!emailError || !!passwordError}
              className="w-full bg-gradient-to-r from-dimo-blue to-dimo-dark text-white py-3.5 rounded-xl hover:shadow-xl transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-dimo-blue font-semibold hover:text-dimo-dark transition"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        {/* <p className="text-center text-white/90 text-xs mt-6">
          © 2026. All rights reserved.
        </p> */}
      </div>
    </div>
  );
};

export default Login;

// import { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import { useAuth } from "../../context/AuthContext";
// import dimoLogo from '../../assets/wurkai-logo1.png'

// const Login = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       await login(email, password);
//       // Navigation will be handled by App.jsx based on role
//     } catch (err) {
//       setError("Failed to login. Please check your credentials.");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-dimo-blue to-dimo-dark flex items-center justify-center px-4">
//       <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
//         <div className="text-center mb-8">
//           <h2 className="text-3xl font-bold text-dimo-blue"><img src={dimoLogo} alt="DIMO Logo" className="h-6 w-auto mx-auto" /></h2>
//           <p className="text-gray-600 mt-2">Task Manager Login</p>
//         </div>

//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Email Address
//             </label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none transition"
//               placeholder="Enter your email"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Password
//             </label>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none transition"
//               placeholder="Enter your password"
//               required
//             />
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-dimo-blue text-white py-3 rounded-lg hover:bg-dimo-dark transition duration-200 font-medium disabled:opacity-50"
//           >
//             {loading ? "Logging in..." : "Login"}
//           </button>
//         </form>

//         <div className="mt-6 text-center">
//           <p className="text-gray-600">
//             Don't have an account?{" "}
//             <Link
//               to="/register"
//               className="text-dimo-blue font-medium hover:underline"
//             >
//               Register here
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;
