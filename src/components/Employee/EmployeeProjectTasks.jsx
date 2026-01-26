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
  const [currentView, setCurrentView] = useState("user");
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
      where("assignedTo", "array-contains", currentUser.uid),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tasksData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => !task.deleted);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate("/employee")}
                className="flex-shrink-0 p-2 text-dimo-blue hover:text-dimo-dark hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="Back to Dashboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-dimo-blue truncate">
                  {project?.name}
                </h1>
                <p className="text-gray-500 text-xs mt-0.5">
                  {getViewTitle()}
                </p>
              </div>
            </div>

            {/* Three Dot Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleMenuToggle}
                className="bg-gray-100 text-gray-600 p-2 rounded-full hover:bg-gray-200 transition duration-200"
                title="View Options"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-30">
                  <button
                    onClick={() => handleViewChange("area")}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                      currentView === "area"
                        ? "bg-blue-50 text-dimo-blue"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                      currentView === "user"
                        ? "bg-blue-50 text-dimo-blue"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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

        {/* View Components */}
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

// Area Wise View Component - Updated for 4 cards per row on web
const AreaWiseView = ({
  projectId,
  tasks,
  areas,
  allEmployeesMap,
  navigate,
}) => {
  const scrollContainerRef = useRef(null);

  const getTasksForArea = (areaId) => {
    return tasks.filter(
      (task) =>
        task.areaIds &&
        Array.isArray(task.areaIds) &&
        task.areaIds.includes(areaId),
    );
  };

  const getStatusInfo = (status, approved, rejectionReason) => {
    if (rejectionReason && !approved) {
      return { color: "bg-red-500", label: "Rejected" };
    }
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
          className="overflow-x-auto custom-scrollbar flex gap-4 sm:gap-6 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 lg:gap-6 md:overflow-x-visible md:snap-none"
        >
          {areas.map((area) => (
            <div
              key={area.id}
              className="flex-shrink-0 w-[95%] sm:w-[75%] md:w-full snap-center area-card md:snap-none"
            >
              <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden min-h-[350px] flex flex-col">
                <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-3 relative flex-shrink-0">
                  <h3 className="text-sm font-bold text-white pr-8 truncate">
                    {area.name}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto tasks-scroll flex flex-col">
                  {getTasksForArea(area.id).length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-400"
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
                      <p className="text-xs text-gray-500 text-center">
                        No tasks assigned
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {getTasksForArea(area.id).map((task) => {
                        const statusInfo = getStatusInfo(
                          task.status,
                          task.approved,
                          task.rejectionReason,
                        );

                        return (
                          <div
                            key={task.id}
                            onClick={() =>
                              navigate(`/employee/task/${task.id}`)
                            }
                            className={`bg-gradient-to-r rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                              task.rejectionReason && !task.approved
                                ? "from-red-50 to-red-100 border-2 border-red-300 hover:from-red-100 hover:to-red-200"
                                : "from-gray-50 to-gray-100 border border-gray-200 hover:from-blue-50 hover:to-blue-100"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1.5 gap-2">
                              <h4 className="text-xs font-semibold text-gray-800 flex-1 line-clamp-2">
                                {task.name}
                              </h4>
                              <div
                                className={`${statusInfo.color} text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0`}
                              >
                                {statusInfo.label}
                              </div>
                            </div>

                            {task.rejectionReason && !task.approved && (
                              <div className="flex items-center space-x-1 mt-1.5">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 text-red-600 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <p className="text-[10px] text-red-700 font-medium line-clamp-1">
                                  Click to view rejection reason
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {getTasksForArea(area.id).length > 0 && (
                  <div className="pt-2 px-3 pb-3 border-t border-gray-200 text-center flex-shrink-0">
                    <p className="text-[10px] text-gray-500 font-medium">
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

// User Wise View Component - Made cards smaller
const UserWiseView = ({
  tasks,
  areas,
  currentUserId,
  navigate,
  allEmployeesMap,
}) => {
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

  const getStatusInfo = (status, approved, rejectionReason) => {
    if (rejectionReason && !approved) {
      return { color: "bg-red-500", label: "Rejected" };
    }
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
      return (
        nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
      ).toUpperCase();
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
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-dimo-blue">
              {getInitials(currentUser.name)}
            </span>
          </div>
          <div className="text-white flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate">
              {currentUser.name}
            </h3>
            <p className="text-xs text-blue-100 truncate">
              {currentUser.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tasks List - Made cards smaller */}
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
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            My Tasks ({tasks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tasks.map((task) => {
              const statusInfo = getStatusInfo(
                task.status,
                task.approved,
                task.rejectionReason,
              );

              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/employee/task/${task.id}`)}
                  className={`rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${
                    task.rejectionReason && !task.approved
                      ? "bg-red-50 border-2 border-red-300 hover:border-red-400"
                      : "bg-white border border-gray-200 hover:border-dimo-blue"
                  }`}
                >
                  <div className="p-3">
                    {/* Task Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-gray-800 mb-1.5 line-clamp-2">
                          {task.name}
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          Area:{" "}
                          <span className="font-medium text-dimo-blue">
                            {getAreaName(task.areaIds)}
                          </span>
                        </p>
                      </div>
                      <div
                        className={`${statusInfo.color} text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0`}
                      >
                        {statusInfo.label}
                      </div>
                    </div>

                    {/* Show rejection indicator */}
                    {task.rejectionReason && !task.approved && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <div className="flex items-center space-x-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-red-600 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <p className="text-[10px] text-red-700 font-medium line-clamp-1">
                            Task rejected by admin
                          </p>
                        </div>
                        <p className="text-[10px] text-red-600 mt-0.5 italic">
                          Click to view reason
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          You have <span className="font-semibold">{tasks.length}</span> task(s)
          in this project
        </p>
      </div>
    </div>
  );
};

export default EmployeeProjectTasks;