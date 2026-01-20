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

  const getInitials = (name) => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const fetchProject = async () => {
    try {
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      if (projectDoc.exists()) {
        const projectData = { id: projectDoc.id, ...projectDoc.data() };
        setProject(projectData);
        setAreas(projectData.areas || []);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesWithTasks = async () => {
    try {
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", projectId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);

      const employeeIds = new Set();
      const tasksData = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);

      tasksSnapshot.docs.forEach((doc) => {
        const task = doc.data();
        if (task.assignedTo && Array.isArray(task.assignedTo)) {
          task.assignedTo.forEach((empId) => employeeIds.add(empId));
        }
      });

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
    } catch (error) {
      console.error("Error fetching employees with tasks:", error);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchEmployeesWithTasks();
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/admin")}
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-dimo-blue">{project.name}</h1>
              <p className="text-gray-600 mt-2">
                Created on {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="relative" ref={projectMenuRef}>
              <button
                onClick={handleProjectMenuToggle}
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

              {showProjectMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Team Members View - Commented Out */}
                  {/* <button
                    onClick={() => handleViewChange("team")}
                    className={`w-full text-left px-4 py-3 text-base flex items-center space-x-3 touch-manipulation ${
                      currentView === "team"
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
                    <span>Team Members</span>
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
          {currentView === "area" && (
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="bg-dimo-blue text-white px-4 py-2 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
            >
              <span className="text-xl">+</span>
              <span>Add New Area</span>
            </button>
          )}
          {currentView !== "area" && (
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="bg-dimo-blue text-white px-4 py-2 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
            >
              <span className="text-xl">+</span>
              <span>Add New Task</span>
            </button>
          )}
        </div>

        {/* Team Members View - Commented Out */}
        {/* {currentView === "team" && (
          <TeamMembersView
            employees={employees}
            projectId={projectId}
            navigate={navigate}
          />
        )} */}

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
          onClose={() => {
            setShowCreateTaskModal(false);
            fetchEmployeesWithTasks();
          }}
        />
      )}

      {showCreateTaskModal && currentView === "area" && (
        <CreateAreaModal
          projectId={projectId}
          onClose={() => {
            setShowCreateTaskModal(false);
            fetchProject();
          }}
        />
      )}
    </div>
  );
};

// ... Rest of the code remains the same until UserWiseView component

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

  const getTasksForEmployee = (employeeId) => {
    return tasks.filter(
      (task) => task.assignedTo && task.assignedTo.includes(employeeId)
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

  const getAreaName = (areaIds) => {
    if (!areaIds || areaIds.length === 0) return "Unassigned";
    const area = areas.find((a) => a.id === areaIds[0]);
    return area ? area.name : "Unassigned";
  };

  const getEmployeeName = (employeeId) => {
    return allEmployeesMap[employeeId]?.name || "Unknown";
  };

  const handleTaskClick = (e, taskId, employeeId) => {
    e.stopPropagation();
    navigate(`/admin/project/${projectId}/employee/${employeeId}`);
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
        <p className="text-gray-500 text-lg mb-4">
          No employees assigned tasks in this project yet
        </p>
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
        <p className="text-sm text-gray-500">← Swipe to view all employees →</p>
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
            const employeeTasks = getTasksForEmployee(employee.id);

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
                  <div className="flex-1 overflow-y-auto flex flex-col p-4 tasks-scroll">
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
                        <p className="text-sm text-gray-400 text-center">No tasks assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {employeeTasks.map((task) => {
                          const statusInfo = getStatusInfo(task.status, task.approved);

                          return (
                            <div
                              key={task.id}
                              onClick={(e) => handleTaskClick(e, task.id, employee.id)}
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
                              <p className="text-xs text-gray-500">
                                Area: <span className="font-medium text-dimo-blue">{getAreaName(task.areaIds)}</span>
                              </p>
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
          Total Employees: <span className="font-semibold">{employees.length}</span>
        </p>
      </div>
    </div>
  );
};

export default ProjectDetail;