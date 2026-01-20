import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";

const EmployeeProjectTasks = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [currentView, setCurrentView] = useState("user"); // Changed from "my-tasks" to "user"
  const menuRef = useRef(null);
  const [areas, setAreas] = useState([]);
  const [allEmployeesMap, setAllEmployeesMap] = useState({});

  useEffect(() => {
    // Fetch project details
    const fetchProject = async () => {
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      if (projectDoc.exists()) {
        const projectData = { id: projectDoc.id, ...projectDoc.data() };
        setProject(projectData);
        setAreas(projectData.areas || []);
      }
    };

    fetchProject();

    // Listen to tasks assigned to this employee in this project
    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId),
      where("assignedTo", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);

      // Fetch employees map
      const usersSnapshot = await getDocs(collection(db, "users"));
      const employeesMapTemp = {};
      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === "employee") {
          employeesMapTemp[doc.id] = userData;
        }
      });
      setAllEmployeesMap(employeesMapTemp);
    });

    return unsubscribe;
  }, [projectId, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setShowMenu(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "area":
        return "Area wise View";
      case "user":
        return "User wise View";
      default:
        return "User wise View";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button with Icon */}
        <button
          onClick={() => navigate("/employee")}
          className="mb-6 inline-flex items-center text-dimo-blue hover:text-dimo-dark transition-colors duration-200 group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 transform group-hover:-translate-x-1 transition-transform duration-200"
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
        </button>

        {/* Project Header with Three Dot Menu */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-dimo-blue">{project?.name}</h1>
              <p className="text-gray-600 mt-2">Employee Tasks</p>
            </div>

            {/* Three Dot Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleMenuToggle}
                className="bg-gray-100 text-gray-600 p-2 rounded-full hover:bg-gray-200 active:bg-gray-300 transition duration-200 touch-manipulation"
                title="Options"
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
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* My Tasks View - Commented Out */}
                  {/* <button
                    onClick={() => handleViewChange("my-tasks")}
                    className={`w-full text-left px-4 py-3 text-base flex items-center space-x-3 touch-manipulation ${
                      currentView === "my-tasks"
                        ? "bg-blue-50 text-dimo-blue"
                        : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <span>My Tasks</span>
                  </button> */}
                  <button
                    onClick={() => handleViewChange("area")}
                    className={`w-full text-left px-4 py-3 text-base flex items-center space-x-3 touch-manipulation ${
                      currentView === "area"
                        ? "bg-blue-50 text-dimo-blue"
                        : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    <span>Area wise</span>
                  </button>
                  <button
                    onClick={() => handleViewChange("user")}
                    className={`w-full text-left px-4 py-3 text-base flex items-center space-x-3 touch-manipulation ${
                      currentView === "user"
                        ? "bg-blue-50 text-dimo-blue"
                        : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <span>User wise</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{getViewTitle()}</h2>
        </div>

        {/* My Tasks View - Commented Out */}
        {/* {currentView === "my-tasks" && (
          <MyTasksView tasks={tasks} navigate={navigate} getStatusColor={getStatusColor} />
        )} */}

        {currentView === "area" && (
          <AreaWiseView
            projectId={projectId}
            tasks={tasks}
            areas={areas}
            allEmployeesMap={allEmployeesMap}
            navigate={navigate}
          />
        )}

        {currentView === "user" && (
          <UserWiseView
            tasks={tasks}
            areas={areas}
            currentUserId={currentUser.uid}
            navigate={navigate}
            allEmployeesMap={allEmployeesMap}
          />
        )}
      </div>
    </div>
  );
};

// My Tasks View Component - Commented Out
/*
const MyTasksView = ({ tasks, navigate, getStatusColor }) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-gray-500 text-lg">
          No tasks assigned to you in this project
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => navigate(`/employee/task/${task.id}`)}
          className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden"
        >
          <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-4">
            <h3 className="text-lg font-bold text-white truncate">
              {task.name}
            </h3>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Created:
              </span>
              <span className="text-sm text-gray-900">
                {new Date(task.createdAt).toLocaleDateString()}
              </span>
            </div>

            {task.details && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Details:
                </p>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {task.details}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Status:
              </span>
              <span
                className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status.replace("-", " ").toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Target Date:
              </span>
              <span className="text-sm text-gray-900">
                {new Date(task.targetDate).toLocaleDateString()}
              </span>
            </div>

            {task.approved && (
              <div className="pt-3 border-t border-gray-200">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  ✓ Approved
                </span>
              </div>
            )}

            {task.rejectionReason && (
              <div className="pt-3 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-800 mb-1">
                    Rejection Reason:
                  </p>
                  <p className="text-sm text-red-700">
                    {task.rejectionReason}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200">
              <span className="text-dimo-blue text-sm font-medium">
                View Details →
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
*/

// Area Wise View Component
const AreaWiseView = ({ projectId, tasks, areas, allEmployeesMap, navigate }) => {
  const scrollContainerRef = useRef(null);

  const getTasksForArea = (areaId) => {
    return tasks.filter((task) =>
      task.areaIds && Array.isArray(task.areaIds) && task.areaIds.includes(areaId)
    );
  };

  const getStatusInfo = (status, approved) => {
    if (approved) {
      return { color: "bg-green-500", label: "Approved" };
    }
    switch (status) {
      case "complete":
        return { color: "bg-blue-500", label: "Complete" };
      case "in-progress":
        return { color: "bg-yellow-500", label: "In Progress" };
      case "hold":
        return { color: "bg-orange-500", label: "On Hold" };
      case "not-started":
      default:
        return { color: "bg-gray-400", label: "Not Started" };
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (areas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-gray-500 text-lg mb-4">No areas in this project</p>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .tasks-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .tasks-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 5px;
        }
        .tasks-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 5px;
        }
        .tasks-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        .area-card {
          pointer-events: none;
        }
        .area-card > * {
          pointer-events: auto;
        }
      `}</style>

      <div className="md:hidden text-center mb-4">
        <p className="text-sm text-gray-500">← Swipe to view all areas →</p>
      </div>

      <div className="relative">
        {areas.length > 1 && (
          <>
            <button
              onClick={() => scroll("left")}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        <div
          ref={scrollContainerRef}
          className="overflow-x-auto custom-scrollbar flex gap-4 sm:gap-6 pb-4 snap-x snap-mandatory"
        >
          {areas.map((area) => (
            <div
              key={area.id}
              className="flex-shrink-0 w-[95%] sm:w-[75%] md:w-[calc(65%-12px)] lg:w-[calc(45%-16px)] snap-center area-card"
            >
              <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden min-h-[400px] md:min-h-[500px] flex flex-col">
                <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-4 relative flex-shrink-0">
                  <h3 className="text-lg font-bold text-white pr-10 truncate">
                    {area.name}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto tasks-scroll flex flex-col">
                  {getTasksForArea(area.id).length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 text-center">No tasks assigned</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {getTasksForArea(area.id).map((task) => {
                        const statusInfo = getStatusInfo(task.status, task.approved);

                        return (
                          <div
                            key={task.id}
                            onClick={() => navigate(`/employee/task/${task.id}`)}
                            className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <h4 className="text-sm font-semibold text-gray-800 flex-1 line-clamp-2">
                                {task.name}
                              </h4>
                              <div className={`${statusInfo.color} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0`}>
                                {statusInfo.label}
                              </div>
                            </div>

                            {/* Due Date - Commented Out */}
                            {/* {task.targetDate && (
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>Due: {new Date(task.targetDate).toLocaleDateString()}</span>
                              </div>
                            )} */}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {getTasksForArea(area.id).length > 0 && (
                  <div className="pt-3 px-4 pb-4 border-t border-gray-200 text-center flex-shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      {getTasksForArea(area.id).length} task(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Total Areas: <span className="font-semibold">{areas.length}</span>
        </p>
      </div>
    </div>
  );
};

// User Wise View Component
const UserWiseView = ({ tasks, areas, currentUserId, navigate, allEmployeesMap }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const userDoc = await getDoc(doc(db, "users", currentUserId));
      if (userDoc.exists()) {
        setCurrentUser({ id: userDoc.id, ...userDoc.data() });
      }
    };
    fetchCurrentUser();
  }, [currentUserId]);

  const getAreaName = (areaIds) => {
    if (!areaIds || areaIds.length === 0) return "Unassigned";
    const area = areas.find((a) => a.id === areaIds[0]);
    return area ? area.name : "Unassigned";
  };

  const getStatusInfo = (status, approved) => {
    if (approved) {
      return { color: "bg-green-500", label: "Approved" };
    }
    switch (status) {
      case "complete":
        return { color: "bg-blue-500", label: "Complete" };
      case "in-progress":
        return { color: "bg-yellow-500", label: "In Progress" };
      case "hold":
        return { color: "bg-orange-500", label: "On Hold" };
      case "not-started":
      default:
        return { color: "bg-gray-400", label: "Not Started" };
    }
  };

  const getInitials = (name) => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .tasks-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .tasks-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 5px;
        }
        .tasks-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 5px;
        }
        .tasks-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>

      {/* User Info Card - Made Smaller */}
      <div className="mb-6 p-4 bg-gradient-to-r from-dimo-blue to-dimo-dark rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-dimo-blue">
              {getInitials(currentUser.name)}
            </span>
          </div>
          <div className="text-white flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{currentUser.name}</h3>
            <p className="text-xs text-blue-100 truncate">{currentUser.email}</p>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-500 text-lg">No tasks assigned</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            My Tasks ({tasks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => {
              const statusInfo = getStatusInfo(task.status, task.approved);

              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/employee/task/${task.id}`)}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden hover:border-dimo-blue"
                >
                  <div className="p-4">
                    {/* Task Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">
                          {task.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Area: <span className="font-medium text-dimo-blue">{getAreaName(task.areaIds)}</span>
                        </p>
                      </div>
                      <div className={`${statusInfo.color} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0`}>
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          You have <span className="font-semibold">{tasks.length}</span> task(s) in this project
        </p>
      </div>
    </div>
  );
};

export default EmployeeProjectTasks;