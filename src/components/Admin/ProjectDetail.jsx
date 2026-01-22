import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [currentView, setCurrentView] = useState("user"); // "area", "user" (team members removed)
  const projectMenuRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [areas, setAreas] = useState([]);
  const [allEmployeesMap, setAllEmployeesMap] = useState({});

  // Helper function to get initials with first and last name letters
  const getInitials = (name) => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    // Listen to project details in real-time
    const unsubscribeProject = onSnapshot(
      doc(db, "projects", projectId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const projectData = { id: docSnapshot.id, ...docSnapshot.data() };
          setProject(projectData);
          setAreas(projectData.areas || []);
        }
        setLoading(false);
      }
    );

    // Listen to all tasks for this project - exclude deleted tasks
    const tasksQuery = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, async (snapshot) => {
      const tasksData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => !task.deleted); // Filter deleted tasks in memory
      
      setTasks(tasksData);

      // Extract unique employee IDs from non-deleted tasks
      const employeeIds = new Set();
      tasksData.forEach((task) => {
        if (task.assignedTo && Array.isArray(task.assignedTo)) {
          task.assignedTo.forEach((empId) => employeeIds.add(empId));
        }
      });

      // Fetch employee details
      if (employeeIds.size > 0) {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const employeesData = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((user) => employeeIds.has(user.id));

        setEmployees(employeesData);

        // Create employees map for all employees
        const employeesMapTemp = {};
        usersSnapshot.docs.forEach((doc) => {
          const userData = doc.data();
          if (userData.role === "employee") {
            employeesMapTemp[doc.id] = userData;
          }
        });
        setAllEmployeesMap(employeesMapTemp);
      } else {
        setEmployees([]);
      }
    });

    return () => {
      unsubscribeProject();
      unsubscribeTasks();
    };
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setShowProjectMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleProjectMenuToggle = (e) => {
    e.stopPropagation();
    setShowProjectMenu((prev) => !prev);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    setShowProjectMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-gray-600">Project not found</div>
        </div>
      </div>
    );
  }

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
      {/* Compact Header - Back Button and Project Name on Same Line */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 relative">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back Button + Project Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate("/admin")}
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
                {project.name}
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Right: Menu Button */}
          <div className="relative flex-shrink-0" ref={projectMenuRef}>
            <button
              onClick={handleProjectMenuToggle}
              className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition duration-200"
              title="Options"
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

            {showProjectMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleViewChange("area")}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                    currentView === "area"
                      ? "bg-blue-50 text-dimo-blue"
                      : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  }`}
                >
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
                      : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  }`}
                >
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

      {/* View Title and Add Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{getViewTitle()}</h2>
        {currentView === "area" && (
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="bg-dimo-blue text-white px-4 py-2 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
          >
            <span className="text-lg">+</span>
            <span className=" sm:inline">Add Area</span>
          </button>
        )}
        {currentView !== "area" && (
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="bg-dimo-blue text-white px-4 py-2 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
          >
            <span className="text-lg">+</span>
            <span className=" sm:inline">Add Task</span>
          </button>
        )}
      </div>

      {/* ...existing view components... */}
      {currentView === "area" && (
        <AreaWiseView
          projectId={projectId}
          areas={areas}
          setAreas={setAreas}
          tasks={tasks}
          setTasks={setTasks}
          allEmployeesMap={allEmployeesMap}
          navigate={navigate}
        />
      )}

      {currentView === "user" && (
        <UserWiseView
          employees={employees}
          projectId={projectId}
          tasks={tasks}
          areas={areas}
          navigate={navigate}
          allEmployeesMap={allEmployeesMap}
          getInitials={getInitials}
        />
      )}
    </div>

{showCreateTaskModal && currentView !== "area" && (
  <CreateTaskModal
    projectId={projectId}
    project={project}
    onClose={() => setShowCreateTaskModal(false)}
  />
)}

{showCreateTaskModal && currentView === "area" && (
  <CreateAreaModal
    projectId={projectId}
    onClose={() => setShowCreateTaskModal(false)}
  />
)}
    </div>
  );
};

// Area Wise View Component
const AreaWiseView = ({
  projectId,
  areas,
  setAreas,
  tasks,
  setTasks,
  allEmployeesMap,
  navigate,
}) => {
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [editingArea, setEditingArea] = useState(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const scrollContainerRef = useRef(null);
  const menuRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId !== null) {
        const menuContainer = menuRefs.current[openMenuId];
        if (menuContainer && !menuContainer.contains(event.target)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openMenuId]);

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

  const getEmployeeName = (employeeId) => {
    return allEmployeesMap[employeeId]?.name || "Unknown";
  };

  const handleTaskClick = (e, taskId, employeeId) => {
    e.stopPropagation();
    navigate(`/admin/project/${projectId}/employee/${employeeId}`);
  };

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;

    setLoading(true);
    try {
      const updatedAreas = [...areas, { id: Date.now().toString(), name: newAreaName }];
      await updateDoc(doc(db, "projects", projectId), {
        areas: updatedAreas,
      });
      setAreas(updatedAreas);
      setNewAreaName("");
      setShowAddArea(false);
    } catch (error) {
      console.error("Error adding area:", error);
      alert("Failed to add area");
    } finally {
      setLoading(false);
    }
  };

  const handleEditArea = async (areaId) => {
    if (!editAreaName.trim()) return;

    setLoading(true);
    try {
      const updatedAreas = areas.map((area) =>
        area.id === areaId ? { ...area, name: editAreaName } : area
      );
      await updateDoc(doc(db, "projects", projectId), {
        areas: updatedAreas,
      });
      setAreas(updatedAreas);
      setEditingArea(null);
      setEditAreaName("");
    } catch (error) {
      console.error("Error editing area:", error);
      alert("Failed to edit area");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArea = async (areaId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this area?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const updatedAreas = areas.filter((area) => area.id !== areaId);
      await updateDoc(doc(db, "projects", projectId), {
        areas: updatedAreas,
      });
      setAreas(updatedAreas);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error deleting area:", error);
      alert("Failed to delete area");
    } finally {
      setLoading(false);
    }
  };

  const handleMenuToggle = (e, areaId) => {
    e.stopPropagation();
    setOpenMenuId((prevId) => (prevId === areaId ? null : areaId));
  };

  const handleEditClick = (e, area) => {
    e.stopPropagation();
    setEditingArea(area.id);
    setEditAreaName(area.name);
    setOpenMenuId(null);
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
        <p className="text-gray-500 text-lg mb-4">No areas added yet</p>
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
              {editingArea === area.id ? (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-dimo-blue min-h-[400px] md:min-h-[500px] flex flex-col p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-dimo-blue mb-4">Edit Area</h3>
                    <input
                      type="text"
                      value={editAreaName}
                      onChange={(e) => setEditAreaName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none mb-4"
                      placeholder="Enter area name"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditArea(area.id)}
                        disabled={loading || !editAreaName.trim()}
                        className="flex-1 px-4 py-2 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingArea(null);
                          setEditAreaName("");
                        }}
                        className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden min-h-[400px] md:min-h-[500px] flex flex-col">
                  <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-4 relative flex-shrink-0">
                    <h3 className="text-lg font-bold text-white pr-10 truncate">
                      {area.name}
                    </h3>

                    <div
                      className="absolute top-3 right-3"
                      ref={(el) => (menuRefs.current[area.id] = el)}
                    >
                      <button
                        onClick={(e) => handleMenuToggle(e, area.id)}
                        className="bg-white bg-opacity-20 text-white p-2 rounded-full hover:bg-opacity-30 active:bg-opacity-40 transition duration-200 touch-manipulation"
                        title="Options"
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

                      {openMenuId === area.id && (
                        <div
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleEditClick(e, area)}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 flex items-center space-x-3 touch-manipulation"
                          >
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            <span>Edit Area</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteArea(area.id);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center space-x-3 touch-manipulation"
                          >
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span>Delete Area</span>
                          </button>
                        </div>
                      )}
                    </div>
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
                          const firstEmployeeId = task.assignedTo?.[0];
                          const assignees = (task.assignedTo || [])
                            .map((id) => getEmployeeName(id))
                            .join(", ");

                          return (
                            <div
                              key={task.id}
                              onClick={(e) => handleTaskClick(e, task.id, firstEmployeeId)}
                              className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100"
                            >
                              <div className="flex items-start justify-between mb-2 gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">
                                    {task.name}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Assigned to: <span className="font-medium text-dimo-blue">{assignees || "Unassigned"}</span>
                                  </p>
                                </div>
                                <div className={`${statusInfo.color} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0`}>
                                  {statusInfo.label}
                                </div>
                              </div>
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
              )}
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
const UserWiseView = ({
  employees,
  projectId,
  tasks,
  areas,
  navigate,
  allEmployeesMap,
  getInitials,
}) => {
  const scrollContainerRef = useRef(null);

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

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (employees.length === 0) {
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
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <p className="text-gray-500 text-lg">No employees assigned yet</p>
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
        .user-card {
          pointer-events: none;
        }
        .user-card > * {
          pointer-events: auto;
        }
      `}</style>

      <div className="md:hidden text-center mb-4">
        <p className="text-sm text-gray-500">← Swipe to view all users →</p>
      </div>

      <div className="relative">
        {employees.length > 1 && (
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
          {employees.map((employee) => {
            const employeeTasks = tasks.filter(
              (task) => task.assignedTo && task.assignedTo.includes(employee.id)
            );

            return (
              <div
                key={employee.id}
                className="flex-shrink-0 w-[95%] sm:w-[75%] md:w-[calc(65%-12px)] lg:w-[calc(45%-16px)] snap-center user-card"
              >
                <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden min-h-[400px] md:min-h-[500px] flex flex-col">
                  {/* Employee Header */}
                  <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark text-white p-4 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-dimo-blue">
                          {getInitials(employee.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate text-white">
                          {employee.name}
                        </h4>
                        <p className="text-sm text-blue-100 truncate">{employee.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white border-opacity-30">
                      <span className="text-xs font-semibold text-blue-100 bg-white bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        {employeeTasks.length} task(s)
                      </span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 overflow-y-auto flex flex-col p-4">
                    {employeeTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-gray-300 mb-3"
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
                        <p className="text-sm text-gray-500 text-center">No tasks assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {employeeTasks.map((task) => {
                          const statusInfo = getStatusInfo(task.status, task.approved);

                          return (
  <div
    key={task.id}
    onClick={(e) => {
      e.stopPropagation();
      navigate(
        `/admin/project/${projectId}/employee/${employee.id}`
      );
    }}
    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-dimo-blue"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-semibold text-gray-800 mb-2">
          {task.name}
        </h5>
        
        {/* Display all areas */}
        {task.areaIds && task.areaIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.areaIds.map((areaId) => {
              const area = areas.find((a) => a.id === areaId);
              if (!area) return null;
              
              return (
                <div
                  key={areaId}
                  className="flex items-center space-x-1 bg-blue-50 rounded-full px-2 py-0.5 border border-blue-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 text-dimo-blue flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-xs font-medium text-dimo-blue">
                    {area.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className={`${statusInfo.color} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0`}>
        {statusInfo.label}
      </div>
    </div>
  </div>
);
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Total Users: <span className="font-semibold">{employees.length}</span>
        </p>
      </div>
    </div>
  );
};

// Create Area Modal
const CreateAreaModal = ({ projectId, onClose }) => {
  const [areaName, setAreaName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    setLoading(true);
    try {
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const currentAreas = projectDoc.data().areas || [];
      const newAreas = [...currentAreas, { id: Date.now().toString(), name: areaName }];

      await updateDoc(doc(db, "projects", projectId), {
        areas: newAreas,
      });
      onClose();
    } catch (error) {
      console.error("Error adding area:", error);
      alert("Failed to add area");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Add New Area</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area Name
            </label>
            <input
              type="text"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
              placeholder="Enter area name"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !areaName.trim()}
              className="px-6 py-3 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Area"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Task Modal
const CreateTaskModal = ({ projectId, project, onClose }) => {
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [taskData, setTaskData] = useState({
    name: "",
    details: "",
    createdDate: getTodayDate(),
    targetDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedAreas, setSelectedAreas] = useState([]);

  useEffect(() => {
    const fetchAllEmployees = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const employeesData = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((user) => user.role === "employee");

      setAllEmployees(employeesData);
    };
    fetchAllEmployees();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee");
      return;
    }

    if (selectedAreas.length === 0) {
      alert("Please select at least one area");
      return;
    }

    setLoading(true);

    try {
      const createdAtISO = new Date(taskData.createdDate).toISOString();

      await addDoc(collection(db, "tasks"), {
        name: taskData.name,
        details: taskData.details,
        projectId,
        assignedTo: selectedEmployees,
        areaIds: selectedAreas,
        createdAt: createdAtISO,
        targetDate: taskData.targetDate,
        status: "not-started",
        approved: false,
        deleted: false, // Add deleted field
        rejectionReason: null,
        holdReason: null,
        remarksChat: [],
        statusHistory: [
          {
            status: "not-started",
            changedBy: "admin",
            changedAt: createdAtISO,
            note: "Task created",
          },
        ],
      });
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (empId) => {
    setSelectedEmployees((prev) => {
      if (prev.includes(empId)) {
        return prev.filter((id) => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  const toggleArea = (areaId) => {
    setSelectedAreas((prev) => {
      if (prev.includes(areaId)) {
        return prev.filter((id) => id !== areaId);
      } else {
        return [...prev, areaId];
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg sticky top-0 z-10">
          <h2 className="text-2xl font-bold">Create New Task</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={taskData.name}
              onChange={(e) =>
                setTaskData({ ...taskData, name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
              placeholder="Enter task name"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Details
            </label>
            <textarea
              value={taskData.details}
              onChange={(e) =>
                setTaskData({ ...taskData, details: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none resize-none"
              placeholder="Enter task details or description..."
              rows="4"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Provide additional information about this task
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area(s) <span className="text-red-600">*</span>
            </label>
            {project?.areas && project.areas.length > 0 ? (
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                {project.areas.map((area) => (
                  <div
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                      selectedAreas.includes(area.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-dimo-blue"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-sm font-medium">{area.name}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedAreas.includes(area.id)
                            ? "bg-dimo-blue border-dimo-blue"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedAreas.includes(area.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
                <p className="text-sm text-gray-600">
                  No areas available for this project.
                </p>
              </div>
            )}
            <div className="mt-2">
              {selectedAreas.length === 0 && (
                <p className="text-xs text-red-600">Please select at least one area</p>
              )}
              {project?.areas && project.areas.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedAreas.length} area(s) selected
                </p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Employees <span className="text-red-600">*</span>
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {allEmployees.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No employees available
                </div>
              ) : (
                allEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                      selectedEmployees.includes(emp.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{emp.name}</span>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedEmployees.includes(emp.id)
                            ? "bg-dimo-blue border-dimo-blue"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedEmployees.includes(emp.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creation Date
              </label>
              <input
                type="date"
                value={taskData.createdDate}
                onChange={(e) =>
                  setTaskData({ ...taskData, createdDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={taskData.targetDate}
                onChange={(e) =>
                  setTaskData({ ...taskData, targetDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedEmployees.length === 0 || selectedAreas.length === 0}
              className="px-6 py-3 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectDetail;