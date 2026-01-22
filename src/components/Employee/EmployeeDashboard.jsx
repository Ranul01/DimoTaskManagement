import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
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

    // Listen to all tasks assigned to this employee - remove deleted filter from query
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assignedTo", "array-contains", currentUser.uid)
    );
    
    const unsubscribeTasks = onSnapshot(tasksQuery, (tasksSnapshot) => {
      const tasksData = tasksSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((task) => !task.deleted); // Filter deleted tasks in memory
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
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
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

  // Get tasks with unread admin messages
  const getTasksWithUnreadMessages = () => {
    return allTasks
      .filter((task) => {
        if (!task.remarksChat || task.remarksChat.length === 0) return false;

        // Check if there are any unread messages from admin
        return task.remarksChat.some(
          (msg) => msg.senderRole === "admin" && !msg.employeeRead
        );
      })
      .map((task) => {
        const unreadCount = task.remarksChat.filter(
          (msg) => msg.senderRole === "admin" && !msg.employeeRead
        ).length;

        const latestUnreadMsg = task.remarksChat
          .filter((msg) => msg.senderRole === "admin" && !msg.employeeRead)
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];

        return {
          ...task,
          unreadCount,
          latestUnreadMsg,
        };
      })
      .sort((a, b) => new Date(b.latestUnreadMsg.sentAt) - new Date(a.latestUnreadMsg.sentAt));
  };

  // Get total unread message count
  const getTotalUnreadCount = () => {
    return allTasks.reduce((total, task) => {
      if (!task.remarksChat) return total;

      const unreadInTask = task.remarksChat.filter(
        (msg) => msg.senderRole === "admin" && !msg.employeeRead
      ).length;

      return total + unreadInTask;
    }, 0);
  };

  // Get project name for a task
  const getProjectForTask = (task) => {
    return projects.find((proj) => proj.id === task.projectId);
  };

  // Handle notification click - navigate to task detail
  const handleNotificationClick = (task) => {
    navigate(`/employee/task/${task.id}`);
    setShowNotifications(false);
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
                Here are the projects you're working on
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* History Button */}
              <button
                onClick={() => navigate("/employee/history")}
                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                title="View Task History"
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

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
                          const project = getProjectForTask(task);
                          return (
                            <div
                              key={task.id}
                              onClick={() => handleNotificationClick(task)}
                              className="p-4 border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition"
                            >
                              <div className="flex items-start space-x-3">
                                {/* Admin Avatar */}
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-semibold text-sm">
                                    A
                                  </span>
                                </div>

                                {/* Message Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      Admin
                                    </p>
                                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                      {task.unreadCount}
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
                                    {task.latestUnreadMsg.text}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(task.latestUnreadMsg.sentAt).toLocaleString("en-US", {
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
                <div className="p-6">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{project.employees?.length || 0} Team Members</span>
                    <span className="text-dimo-blue text-sm font-medium">View Tasks →</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
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