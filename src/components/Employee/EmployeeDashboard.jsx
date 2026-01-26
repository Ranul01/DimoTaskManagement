import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";

const EmployeeDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [userName, setUserName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
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

    // Listen to all projects
    const projectsQuery = query(collection(db, "projects"));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectsData);
    });

    // Listen to all tasks assigned to this employee
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assignedTo", "array-contains", currentUser.uid),
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (tasksSnapshot) => {
      const tasksData = tasksSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => !task.deleted);
      setAllTasks(tasksData);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
    };
  }, [currentUser]);

  // Close notification dropdown when clicking outside
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

  // Filter projects that have tasks assigned to the current user
  const userProjects = projects.filter((project) => {
    return allTasks.some((task) => task.projectId === project.id);
  });

  const getTasksWithStatusNotifications = () => {
    const filtered = allTasks.filter((task) => {
      // Check for unread status notifications
      if (task.employeeNotification && !task.employeeNotification.read) {
        return (
          task.employeeNotification.status === "approved" ||
          task.employeeNotification.status === "rejected" ||
          task.employeeNotification.status === "created" ||
          task.employeeNotification.status === "updated"
        );
      }

      // Check for unread chat messages - FIXED: Changed from remarksChat to taskChat
      if (task.taskChat && task.taskChat.length > 0) {
        return task.taskChat.some(
          (msg) => msg.senderRole === "admin" && !msg.employeeRead,
        );
      }

      return false;
    });

    return filtered
      .map((task) => {
        let notificationType = "message";
        let notificationMessage = "";
        let timestamp = null;

        // Prioritize status notifications over chat
        if (task.employeeNotification && !task.employeeNotification.read) {
          notificationType = task.employeeNotification.status;
          notificationMessage = task.employeeNotification.message;
          timestamp = new Date(task.employeeNotification.createdAt);
        } else if (task.taskChat && task.taskChat.length > 0) {
          // FIXED: Changed from remarksChat to taskChat
          const unreadMessages = task.taskChat.filter(
            (msg) => msg.senderRole === "admin" && !msg.employeeRead,
          );

          if (unreadMessages.length > 0) {
            const latestMsg = unreadMessages.sort(
              (a, b) => new Date(b.sentAt) - new Date(a.sentAt),
            )[0];

            notificationMessage = latestMsg.text;
            timestamp = new Date(latestMsg.sentAt);
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

  // Get total unread message count
  const getTotalUnreadCount = () => {
    let count = 0;

    allTasks.forEach((task) => {
      // Count status notifications
      if (task.employeeNotification && !task.employeeNotification.read) {
        count++;
      }

      // Count chat notifications - FIXED: Changed from remarksChat to taskChat
      if (task.taskChat) {
        const unreadMessages = task.taskChat.filter(
          (msg) => msg.senderRole === "admin" && !msg.employeeRead,
        ).length;
        count += unreadMessages;
      }
    });

    return count;
  };

  // Get project name for a task
  const getProjectForTask = (task) => {
    return projects.find((proj) => proj.id === task.projectId);
  };

  // Handle notification click - navigate to task detail
  const handleNotificationClick = async (task) => {
    // Mark status notification as read if exists
    if (task.employeeNotification && !task.employeeNotification.read) {
      try {
        await updateDoc(doc(db, "tasks", task.id), {
          "employeeNotification.read": true,
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Mark chat messages as read - FIXED: Changed from remarksChat to taskChat
    if (task.taskChat && task.taskChat.length > 0) {
      const updatedChat = task.taskChat.map((msg) => ({
        ...msg,
        employeeRead: msg.senderRole === "admin" ? true : msg.employeeRead,
      }));

      try {
        await updateDoc(doc(db, "tasks", task.id), {
          taskChat: updatedChat,
        });
      } catch (error) {
        console.error("Error marking chat messages as read:", error);
      }
    }

    navigate(`/employee/task/${task.id}`);
    setShowNotifications(false);
  };

  const tasksWithStatusNotifications = getTasksWithStatusNotifications();
  const totalUnread = getTotalUnreadCount();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-dimo-blue truncate">
                Welcome back,
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Your active projects
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* History Button */}
              <button
                onClick={() => navigate("/employee/history")}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
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
              <div className="relative" ref={notificationRef}>
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

                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
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
                      {tasksWithStatusNotifications.length === 0 ? (
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
                        tasksWithStatusNotifications.map((task) => {
                          const project = getProjectForTask(task);

                          const getNotificationStyle = () => {
                            switch (task.notificationType) {
                              case "approved":
                                return {
                                  bgColor: "bg-green-500",
                                  icon: (
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
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  ),
                                  label: "Task Approved",
                                };
                              case "rejected":
                                return {
                                  bgColor: "bg-red-500",
                                  icon: (
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
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  ),
                                  label: "Task Rejected",
                                };
                              case "created":
                                return {
                                  bgColor: "bg-blue-500",
                                  icon: (
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
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                  ),
                                  label: "New Task Assigned",
                                };
                              case "updated":
                                return {
                                  bgColor: "bg-orange-500",
                                  icon: (
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
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  ),
                                  label: "Task Updated",
                                };
                              case "message":
                                return {
                                  bgColor: "bg-purple-500",
                                  icon: (
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
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                      />
                                    </svg>
                                  ),
                                  label: "New Chat Message",
                                };
                              default:
                                return {
                                  bgColor: "bg-purple-500",
                                  icon: null,
                                  label: "New Message",
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
                                <div
                                  className={`w-10 h-10 ${style.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
                                >
                                  {style.icon ? (
                                    <span className="text-white">
                                      {style.icon}
                                    </span>
                                  ) : (
                                    <span className="text-white font-semibold text-sm">
                                      A
                                    </span>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        Admin
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {style.label}
                                      </p>
                                    </div>
                                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                      1
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-1">
                                    Task: {task.name}
                                  </p>
                                  {project && (
                                    <p className="text-xs text-gray-400 mb-1">
                                      Project: {project.name}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-700 line-clamp-2">
                                    {task.notificationMessage}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {task.notificationTimestamp?.toLocaleString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
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

        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">My Projects</h2>

        {/* Projects Grid */}
        {userProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">
              You are not assigned to any projects yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/employee/project/${project.id}`)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden"
              >
                <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-6">
                  <h3 className="text-xl font-bold text-white">
                    {project.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
