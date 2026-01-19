import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [userName, setUserName] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeView, setActiveView] = useState("projects");
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    // Get user name
    const getUserName = async () => {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      }
    };
    getUserName();

    // Listen to projects
    const projectsQuery = query(collection(db, "projects"));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectsData);
    });

    // Listen to employees
    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee")
    );
    const unsubscribeEmployees = onSnapshot(employeesQuery, (snapshot) => {
      const employeesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmployees(employeesData);
    });

    // Listen to all tasks
    const tasksQuery = query(collection(db, "tasks"));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllTasks(tasksData);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeEmployees();
      unsubscribeTasks();
    };
  }, [currentUser]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate task summary for an employee
  const getEmployeeTaskSummary = (employeeId) => {
    const employeeTasks = allTasks.filter((task) =>
      task.assignedTo?.includes(employeeId)
    );

    return {
      total: employeeTasks.length,
      notStarted: employeeTasks.filter((t) => t.status === "not-started")
        .length,
      inProgress: employeeTasks.filter((t) => t.status === "in-progress")
        .length,
      completed: employeeTasks.filter(
        (t) => t.status === "complete" && t.approved
      ).length,
      hold: employeeTasks.filter((t) => t.status === "hold").length,
      pending: employeeTasks.filter(
        (t) => t.status === "complete" && !t.approved
      ).length,
    };
  };

  // Get tasks with unread messages
  const getTasksWithUnreadMessages = () => {
    return allTasks
      .filter((task) => {
        if (!task.remarksChat || task.remarksChat.length === 0) return false;

        // Check if there are any unread messages from employees
        return task.remarksChat.some(
          (msg) => msg.senderRole === "employee" && !msg.adminRead
        );
      })
      .map((task) => {
        const unreadCount = task.remarksChat.filter(
          (msg) => msg.senderRole === "employee" && !msg.adminRead
        ).length;

        const latestUnreadMsg = task.remarksChat
          .filter((msg) => msg.senderRole === "employee" && !msg.adminRead)
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];

        return {
          ...task,
          unreadCount,
          latestUnreadMsg,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestUnreadMsg.sentAt) -
          new Date(a.latestUnreadMsg.sentAt)
      );
  };

  // Get total unread message count
  const getTotalUnreadCount = () => {
    return allTasks.reduce((total, task) => {
      if (!task.remarksChat) return total;

      const unreadInTask = task.remarksChat.filter(
        (msg) => msg.senderRole === "employee" && !msg.adminRead
      ).length;

      return total + unreadInTask;
    }, 0);
  };

  // Get employee info for a task
  const getEmployeeForTask = (task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) return null;
    const employeeId = task.assignedTo[0];
    return employees.find((emp) => emp.id === employeeId);
  };

  // Handle notification click
  const handleNotificationClick = async (task) => {
    const employee = getEmployeeForTask(task);
    if (!employee) return;

    // Navigate to the employee tasks page where they can open the chat
    navigate(`/admin/project/${task.projectId}/employee/${employee.id}`);
    setShowNotifications(false);
  };

  const handleMenuToggle = (e, projectId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === projectId ? null : projectId);
  };

  const handleEditProject = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteProject = async (e, projectId, projectName) => {
    e.stopPropagation();
    setOpenMenuId(null);

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${projectName}"? This will also delete all tasks associated with this project. This action cannot be undone.`
    );

    if (confirmDelete) {
      try {
        // First, delete all tasks associated with this project
        const tasksQuery = query(
          collection(db, "tasks"),
          where("projectId", "==", projectId)
        );
        const tasksSnapshot = await getDocs(tasksQuery);

        // Delete all tasks in parallel
        const deleteTaskPromises = tasksSnapshot.docs.map((taskDoc) =>
          deleteDoc(doc(db, "tasks", taskDoc.id))
        );
        await Promise.all(deleteTaskPromises);

        // Then delete the project
        await deleteDoc(doc(db, "projects", projectId));
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("Failed to delete project and its tasks");
      }
    }
  };

  const handleEmployeeClick = (employeeId) => {
    navigate(`/admin/employee/${employeeId}/tasks`);
  };

  const tasksWithUnread = getTasksWithUnreadMessages();
  const totalUnread = getTotalUnreadCount();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message with Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dimo-blue">
                Welcome back, {userName}!
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your projects and tasks efficiently
              </p>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>

                {/* Notification Badge */}
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[400px] sm:max-h-[500px] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-700">
                    <h3 className="text-lg font-semibold text-white">
                      New Messages ({totalUnread})
                    </h3>
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto flex-1">
                    {tasksWithUnread.length === 0 ? (
                      <div className="p-8 text-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 mx-auto text-gray-400 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="text-gray-500">No new messages</p>
                      </div>
                    ) : (
                      tasksWithUnread.map((task) => {
                        const employee = getEmployeeForTask(task);
                        return (
                          <div
                            key={task.id}
                            onClick={() => handleNotificationClick(task)}
                            className="p-4 border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition"
                          >
                            <div className="flex items-start space-x-3">
                              {/* Employee Avatar */}
                              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-sm">
                                  {employee?.name?.charAt(0).toUpperCase() ||
                                    "?"}
                                </span>
                              </div>

                              {/* Message Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {employee?.name || "Unknown Employee"}
                                  </p>
                                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                    {task.unreadCount}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-1">
                                  Task: {task.name}
                                </p>
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {task.latestUnreadMsg.text}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(
                                    task.latestUnreadMsg.sentAt
                                  ).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop View Toggle Buttons */}
        <div className="hidden md:flex justify-center mb-6 space-x-4">
          <button
            onClick={() => setActiveView("projects")}
            className={`px-6 py-3 rounded-lg font-medium transition duration-200 ${
              activeView === "projects"
                ? "bg-dimo-blue text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveView("employees")}
            className={`px-6 py-3 rounded-lg font-medium transition duration-200 ${
              activeView === "employees"
                ? "bg-dimo-blue text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            User Summary
          </button>
        </div>

        {/* Mobile Swipe Indicator */}
        <div className="md:hidden mb-4 text-center">
          <p className="text-sm text-gray-500">
            Swipe left or right to switch views
          </p>
        </div>

        {/* Mobile Swipeable Container */}
        <div className="md:hidden overflow-x-auto snap-x snap-mandatory flex space-x-4 pb-4 scrollbar-hide">
          <div className="snap-center shrink-0 w-full">
            <ProjectsView
              projects={projects}
              navigate={navigate}
              handleMenuToggle={handleMenuToggle}
              handleEditProject={handleEditProject}
              handleDeleteProject={handleDeleteProject}
              openMenuId={openMenuId}
              menuRef={menuRef}
              setShowCreateModal={setShowCreateModal}
            />
          </div>
          <div className="snap-center shrink-0 w-full">
            <EmployeesView
              employees={employees}
              getEmployeeTaskSummary={getEmployeeTaskSummary}
              handleEmployeeClick={handleEmployeeClick}
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          {activeView === "projects" ? (
            <ProjectsView
              projects={projects}
              navigate={navigate}
              handleMenuToggle={handleMenuToggle}
              handleEditProject={handleEditProject}
              handleDeleteProject={handleDeleteProject}
              openMenuId={openMenuId}
              menuRef={menuRef}
              setShowCreateModal={setShowCreateModal}
            />
          ) : (
            <EmployeesView
              employees={employees}
              getEmployeeTaskSummary={getEmployeeTaskSummary}
              handleEmployeeClick={handleEmployeeClick}
            />
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setShowEditModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
};

// Projects View Component
const ProjectsView = ({
  projects,
  navigate,
  handleMenuToggle,
  handleEditProject,
  handleDeleteProject,
  openMenuId,
  menuRef,
  setShowCreateModal,
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">All Projects</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-dimo-blue text-white px-6 py-3 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
        >
          <span className="text-xl">+</span>
          <span>Create New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">
            No projects yet. Create your first project to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/admin/project/${project.id}`)}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden relative"
            >
              {/* Three Dot Menu */}
              <div
                className="absolute top-2 right-2 z-10"
                ref={openMenuId === project.id ? menuRef : null}
              >
                <button
                  onClick={(e) => handleMenuToggle(e, project.id)}
                  className="bg-white text-gray-600 p-2 rounded-full hover:bg-gray-100 transition duration-200 shadow-md"
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

                {/* Dropdown Menu */}
                {openMenuId === project.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                    <button
                      onClick={(e) => handleEditProject(e, project)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>Edit Project</span>
                    </button>
                    <button
                      onClick={(e) =>
                        handleDeleteProject(e, project.id, project.name)
                      }
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Delete Project</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-6">
                <h3 className="text-xl font-bold text-white pr-8">
                  {project.name}
                </h3>
              </div>
              {/* <div className="p-6">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{project.employees?.length || 0} Employees</span>
                  <span className="text-dimo-blue font-medium">
                    View Details →
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div> */}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// Employees View Component with Horizontal Scroll
const EmployeesView = ({
  employees,
  getEmployeeTaskSummary,
  handleEmployeeClick,
}) => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Summaries</h2>
        <p className="text-gray-600 mt-2">
          View task summaries for each employee
        </p>
      </div>

      {/* Employees Section */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No employees found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll Buttons - Hidden on mobile */}
          {employees.length > 3 && (
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

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide flex gap-6 pb-4 snap-x snap-mandatory"
          >
            {employees.map((employee) => {
              const summary = getEmployeeTaskSummary(employee.id);
              return (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  summary={summary}
                  handleEmployeeClick={handleEmployeeClick}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

// Employee Card Component with Pie Chart
const EmployeeCard = ({ employee, summary, handleEmployeeClick }) => {
  const COLORS = {
    notStarted: "#9CA3AF",
    inProgress: "#60A5FA",
    completed: "#34D399",
    pending: "#FB923C",
    hold: "#FBBF24",
  };

  const chartData = [
    {
      name: "Not Started",
      value: summary.notStarted,
      color: COLORS.notStarted,
    },
    {
      name: "In Progress",
      value: summary.inProgress,
      color: COLORS.inProgress,
    },
    { name: "Completed", value: summary.completed, color: COLORS.completed },
    { name: "Pending", value: summary.pending, color: COLORS.pending },
    { name: "On Hold", value: summary.hold, color: COLORS.hold },
  ].filter((item) => item.value > 0);

  return (
    <div
      onClick={() => handleEmployeeClick(employee.id)}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden flex-shrink-0 w-full md:w-[calc(33.333%-1rem)] snap-center"
    >
      {/* Card Header */}
      <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-dimo-blue">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-white truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-blue-100 truncate">{employee.email}</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        {/* Total Tasks */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-gray-700">
            Total Tasks:
          </span>
          <span className="text-2xl font-bold text-dimo-blue">
            {summary.total}
          </span>
        </div>

        {/* Pie Chart */}
        {summary.total > 0 ? (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mb-6 h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm">No tasks assigned</p>
          </div>
        )}

        {/* Task Summary Details */}
        <div className="space-y-3">
          {/* Not Started */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.notStarted }}
              ></div>
              <span className="text-sm text-gray-600">Not Started:</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {summary.notStarted}
            </span>
          </div>

          {/* In Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.inProgress }}
              ></div>
              <span className="text-sm text-gray-600">In Progress:</span>
            </div>
            <span className="text-sm font-semibold text-blue-700">
              {summary.inProgress}
            </span>
          </div>

          {/* Completed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.completed }}
              ></div>
              <span className="text-sm text-gray-600">Completed:</span>
            </div>
            <span className="text-sm font-semibold text-green-700">
              {summary.completed}
            </span>
          </div>

          {/* Pending Approval */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.pending }}
              ></div>
              <span className="text-sm text-gray-600">Pending Approval:</span>
            </div>
            <span className="text-sm font-semibold text-orange-700">
              {summary.pending}
            </span>
          </div>

          {/* On Hold */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.hold }}
              ></div>
              <span className="text-sm text-gray-600">On Hold:</span>
            </div>
            <span className="text-sm font-semibold text-yellow-700">
              {summary.hold}
            </span>
          </div>
        </div>

        {/* View Details Link */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <span className="text-dimo-blue text-sm font-medium">
            View All Tasks →
          </span>
        </div>
      </div>
    </div>
  );
};

const EditProjectModal = ({ project, onClose }) => {
  const [projectName, setProjectName] = useState(project.name);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateDoc(doc(db, "projects", project.id), {
        name: projectName,
      });
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Edit Project</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
              placeholder="Enter project name"
              required
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
              disabled={loading || !projectName}
              className="px-6 py-3 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateProjectModal = ({ onClose }) => {
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "projects"), {
        name: projectName,
        employees: [], // Start with empty employees array
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Create New Project</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
              placeholder="Enter project name"
              required
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
              disabled={loading || !projectName}
              className="px-6 py-3 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// const CreateProjectModal = ({ onClose }) => {
//   const [projectName, setProjectName] = useState("");
//   const [employees, setEmployees] = useState([]);
//   const [selectedEmployees, setSelectedEmployees] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const q = query(collection(db, "users"));
//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const employeesData = snapshot.docs
//         .map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }))
//         .filter((user) => user.role === "employee");
//       setEmployees(employeesData);
//     });

//     return unsubscribe;
//   }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       await addDoc(collection(db, "projects"), {
//         name: projectName,
//         employees: selectedEmployees,
//         createdAt: new Date().toISOString(),
//       });
//       onClose();
//     } catch (error) {
//       console.error("Error creating project:", error);
//       alert("Failed to create project");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggleEmployee = (employee) => {
//     setSelectedEmployees((prev) => {
//       const exists = prev.find((e) => e.id === employee.id);
//       if (exists) {
//         return prev.filter((e) => e.id !== employee.id);
//       } else {
//         return [
//           ...prev,
//           { id: employee.id, name: employee.name, email: employee.email },
//         ];
//       }
//     });
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//       <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//         <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
//           <h2 className="text-2xl font-bold">Create New Project</h2>
//         </div>

//         <form onSubmit={handleSubmit} className="p-6">
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Project Name
//             </label>
//             <input
//               type="text"
//               value={projectName}
//               onChange={(e) => setProjectName(e.target.value)}
//               className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
//               placeholder="Enter project name"
//               required
//             />
//           </div>

//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-3">
//               Select Employees ({selectedEmployees.length} selected)
//             </label>
//             <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
//               {employees.length === 0 ? (
//                 <p className="p-4 text-gray-500 text-center">
//                   No employees available
//                 </p>
//               ) : (
//                 employees.map((employee) => (
//                   <div
//                     key={employee.id}
//                     onClick={() => toggleEmployee(employee)}
//                     className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-b-0 transition ${
//                       selectedEmployees.find((e) => e.id === employee.id)
//                         ? "bg-blue-50"
//                         : ""
//                     }`}
//                   >
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <p className="font-medium text-gray-800">
//                           {employee.name}
//                         </p>
//                         <p className="text-sm text-gray-500">
//                           {employee.email}
//                         </p>
//                       </div>
//                       <div
//                         className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
//                           selectedEmployees.find((e) => e.id === employee.id)
//                             ? "bg-dimo-blue border-dimo-blue"
//                             : "border-gray-300"
//                         }`}
//                       >
//                         {selectedEmployees.find(
//                           (e) => e.id === employee.id
//                         ) && <span className="text-white text-xs">✓</span>}
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           <div className="flex justify-end space-x-4">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={
//                 loading || !projectName || selectedEmployees.length === 0
//               }
//               className="px-6 py-3 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50"
//             >
//               {loading ? "Creating..." : "Create Project"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

export default AdminDashboard;
