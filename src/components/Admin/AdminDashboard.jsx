import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";
import ProjectsView from "./ProjectsView";
import EmployeesView from "./EmployeesView";
import { CreateProjectModal, EditProjectModal } from "./ProjectModals";

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [userName, setUserName] = useState("");
  const [activeView, setActiveView] = useState("projects");
  const [showWelcome, setShowWelcome] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const menuRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const getUserName = async () => {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      }
    };
    getUserName();

    const projectsQuery = query(collection(db, "projects"));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectsData);
    });

    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
    );
    const unsubscribeEmployees = onSnapshot(employeesQuery, (snapshot) => {
      const employeesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmployees(employeesData);
    });

    const tasksQuery = query(
      collection(db, "tasks"),
      where("deleted", "!=", true),
    );
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

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  // Detect scroll on mobile swipe container
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        // Hide welcome section when scrolled more than 50px
        setShowWelcome(scrollLeft < 50);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const getEmployeeTaskSummary = (employeeId) => {
    const employeeTasks = allTasks.filter((task) =>
      task.assignedTo?.includes(employeeId),
    );

    return {
      total: employeeTasks.length,
      notStarted: employeeTasks.filter((t) => t.status === "not-started")
        .length,
      inProgress: employeeTasks.filter((t) => t.status === "in-progress")
        .length,
      completed: employeeTasks.filter(
        (t) => t.status === "complete" && t.approved,
      ).length,
      hold: employeeTasks.filter((t) => t.status === "hold").length,
      pending: employeeTasks.filter(
        (t) => t.status === "complete" && !t.approved,
      ).length,
    };
  };

  const getTasksWithStatusNotifications = () => {
    return allTasks
      .filter((task) => {
        // Check for unread status notifications (complete or hold)
        if (task.adminNotification && !task.adminNotification.read) {
          return (
            task.adminNotification.status === "complete" ||
            task.adminNotification.status === "hold"
          );
        }

        // Check for unread chat messages - FIXED: Changed from remarksChat to taskChat
        if (task.taskChat && task.taskChat.length > 0) {
          return task.taskChat.some(
            (msg) => msg.senderRole === "employee" && !msg.adminRead,
          );
        }

        return false;
      })
      .map((task) => {
        let notificationType = "message";
        let notificationMessage = "";
        let timestamp = null;

        // Prioritize status notifications over chat
        if (task.adminNotification && !task.adminNotification.read) {
          notificationType =
            task.adminNotification.status === "complete"
              ? "complete"
              : "hold";
          notificationMessage = task.adminNotification.message;
          timestamp = new Date(task.adminNotification.createdAt);
        } else if (task.taskChat && task.taskChat.length > 0) {
          // FIXED: Changed from remarksChat to taskChat
          const unreadMessages = task.taskChat.filter(
            (msg) => msg.senderRole === "employee" && !msg.adminRead,
          );

          if (unreadMessages.length > 0) {
            const latestMsg = unreadMessages.sort(
              (a, b) => new Date(b.sentAt) - new Date(a.sentAt),
            )[0];

            notificationMessage = latestMsg.text;
            timestamp = new Date(latestMsg.sentAt);
            notificationType = "chat"; // Add chat type
          }
        }

        return {
          ...task,
          notificationType,
          notificationMessage,
          notificationTimestamp: timestamp,
        };
      })
      .sort((a, b) => b.notificationTimestamp - a.notificationTimestamp);
  };

  // Update getTasksWithStatusNotifications function to include chat notifications
  const getTasksWithChatNotifications = () => {
    return allTasks.filter((task) => {
      if (task.taskChat && task.taskChat.length > 0) {
        return task.taskChat.some(
          (msg) => msg.senderRole === "employee" && !msg.adminRead,
        );
      }
      return false;
    });
  };

  const tasksWithChatNotifications = getTasksWithChatNotifications();
  const totalChatUnread = tasksWithChatNotifications.reduce((acc, task) => {
    const unreadCount = task.taskChat.filter(
      (msg) => msg.senderRole === "employee" && !msg.adminRead,
    ).length;
    return acc + unreadCount;
  }, 0);

  const getTotalUnreadCount = () => {
    let count = 0;

    allTasks.forEach((task) => {
      // Count status notifications
      if (task.adminNotification && !task.adminNotification.read) {
        count++;
      }

      // Count chat notifications - FIXED: Changed from remarksChat to taskChat
      if (task.taskChat) {
        const unreadMessages = task.taskChat.filter(
          (msg) => msg.senderRole === "employee" && !msg.adminRead,
        ).length;
        count += unreadMessages;
      }
    });

    return count; // FIXED: Removed double counting
  };

  const getEmployeeForTask = (task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) return null;
    const employeeId = task.assignedTo[0];
    return employees.find((emp) => emp.id === employeeId);
  };

  const handleNotificationClick = async (task) => {
    const employee = getEmployeeForTask(task);
    if (!employee) return;

    // Mark status notification as read if exists
    if (task.adminNotification && !task.adminNotification.read) {
      try {
        await updateDoc(doc(db, "tasks", task.id), {
          "adminNotification.read": true,
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Mark all unread chat messages as read - FIXED: Changed from remarksChat to taskChat
    if (task.taskChat && task.taskChat.length > 0) {
      const updatedChat = task.taskChat.map((msg) => ({
        ...msg,
        adminRead: msg.senderRole === "employee" ? true : msg.adminRead,
      }));

      try {
        await updateDoc(doc(db, "tasks", task.id), {
          taskChat: updatedChat,
        });
      } catch (error) {
        console.error("Error marking chat messages as read:", error);
      }
    }

    // Navigate to the specific task with task ID in URL parameter
    navigate(`/admin/project/${task.projectId}/employee/${employee.id}?task=${task.id}`);
    setShowNotifications(false);
  };

  const handleEmployeeClick = (employeeId) => {
    navigate(`/admin/employee/${employeeId}/tasks`);
  };

  const handleEditProject = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleDeleteProject = async (e, project) => {
    e.stopPropagation();
    // Add delete functionality here
  };

  const tasksWithUnread = getTasksWithStatusNotifications();
  const totalUnread = getTotalUnreadCount();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message with Notifications - Hidden on mobile when swiped */}
        <div
  className={`bg-white rounded-lg shadow-sm p-4 mb-6 transition-all duration-700 ease-in-out transform relative z-50 ${!showWelcome ? "md:block hidden opacity-0 scale-95 -translate-y-4" : "opacity-100 scale-100 translate-y-0"}`}
>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-dimo-blue">
                Welcome back
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Manage your projects and tasks
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* History Button - Mobile Only */}
              <button
                onClick={() => navigate("/admin/history")}
                className="md:hidden p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                title="View Task History"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Notification Bell */}
              <div className="relative z-[100]" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-700"
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
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown - FIXED VERSION */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[400px] sm:max-h-[500px] overflow-hidden flex flex-col z-[100]">
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
                          <p className="text-gray-500">No new notifications</p>
                        </div>
                      ) : (
                        tasksWithUnread.map((task) => {
                          const employee = getEmployeeForTask(task);
                          
                          // REPLACE THIS ENTIRE FUNCTION (around line 434)
                          const getNotificationStyle = () => {
                            switch (task.notificationType) {
                              case "complete":
                                return {
                                  bgColor: "bg-green-500",
                                  icon: (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ),
                                  label: "Task Completed"
                                };
                              case "hold":
                                return {
                                  bgColor: "bg-yellow-500",
                                  icon: (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ),
                                  label: "Task On Hold"
                                };
                              case "chat": // ADD THIS CASE
                                return {
                                  bgColor: "bg-purple-500",
                                  icon: (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                  ),
                                  label: "New Chat Message"
                                };
                              default:
                                return {
                                  bgColor: "bg-purple-500",
                                  icon: null,
                                  label: "New Message"
                                };
                            }
                          };

                          const style = getNotificationStyle();

                          return (
                            <div
                              key={task.id}
                              onClick={() => handleNotificationClick(task)}
                              className="p-4 border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition"
                            >
                              <div className="flex items-start space-x-3">
                                {/* Employee/Status Avatar */}
                                <div className={`w-10 h-10 ${style.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                                  {style.icon ? (
                                    <span className="text-white">{style.icon}</span>
                                  ) : (
                                    <span className="text-white font-semibold text-sm">
                                      {employee?.name?.charAt(0).toUpperCase() || "?"}
                                    </span>
                                  )}
                                </div>

                                {/* Notification Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {employee?.name || "Unknown Employee"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {style.label}
                                      </p>
                                    </div>
                                    {task.notificationType !== "message" && (
                                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        1
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    Task: {task.name}
                                  </p>
                                  <p className="text-sm text-gray-700 line-clamp-2">
                                    {task.notificationMessage}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {task.notificationTimestamp?.toLocaleString("en-US", {
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
          <button
            onClick={() => navigate("/admin/history")}
            className="px-6 py-3 rounded-lg font-medium transition duration-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            Task History
          </button>
        </div>

        {/* Mobile Swipe Indicator */}
        <div className="md:hidden mb-4 text-center">
          <p className="text-sm text-gray-500">
            Swipe left or right to switch views
          </p>
        </div>

        {/* Mobile Swipeable Container */}
        <div
          ref={scrollContainerRef}
          className="md:hidden overflow-x-auto snap-x snap-mandatory flex space-x-4 pb-4 scrollbar-hide"
        >
          <div className="snap-center shrink-0 w-full">
            <ProjectsView
              projects={projects}
              navigate={navigate}
              setShowCreateModal={setShowCreateModal}
              setShowEditModal={setShowEditModal}
              setEditingProject={setEditingProject}
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
              setShowCreateModal={setShowCreateModal}
              setShowEditModal={setShowEditModal}
              setEditingProject={setEditingProject}
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

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}

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

export default AdminDashboard;