import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import dimoLogo from '../../assets/wurkai-logo1.png'; 

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

  return (
    <nav className="bg-dimo-blue text-white shadow-lg">
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

          {/* User info and logout - responsive layout */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm">
              {userName} ({userRole})
            </span>

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
