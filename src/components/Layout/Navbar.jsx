import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import dimoLogo from "../../assets/wurkai-logo1.png";

const Navbar = () => {
  const { logout, currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Get user name from Firestore
    const getUserName = async () => {
      if (currentUser?.uid) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        }
      }
    };
    getUserName();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSettingsClick = () => {
    navigate("/admin/settings");
  };

  return (
    <nav className="bg-dimo-blue text-white shadow-lg ios-safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - responsive sizing */}
          <div className="flex items-center">
            {/* <img 
              src={dimoLogo} 
              alt="DIMO Logo" 
              className="h-5 sm:h-4 md:h-4 "
            /> */}
          </div>

          {/* User info, settings, and logout - responsive layout */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm">
              {userName} ({userRole})
            </span>

            {/* Settings Icon - Only for Admin */}
            {userRole === "admin" && (
              <button
                onClick={handleSettingsClick}
                className="p-2 hover:bg-white/10 rounded-lg transition duration-200"
                title="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-white text-dimo-blue px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-100 transition duration-200 text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;