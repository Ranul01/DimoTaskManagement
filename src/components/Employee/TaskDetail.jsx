import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [task, setTask] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingHoldReason, setPendingHoldReason] = useState("");
  // const [message, setMessage] = useState("");
  // const [sending, setSending] = useState(false);
  // const [messages, setMessages] = useState([]);
  // const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const taskDoc = await getDoc(doc(db, "tasks", taskId));
        if (taskDoc.exists()) {
          const taskData = { id: taskDoc.id, ...taskDoc.data() };
          setTask(taskData);
          setPendingStatus(taskData.status);
          // setMessages(taskData.remarksChat || []);

          // Fetch employee details
          const employeePromises = taskData.assignedTo.map((empId) =>
            getDoc(doc(db, "users", empId))
          );
          const employeeDocs = await Promise.all(employeePromises);
          const employees = employeeDocs
            .filter((doc) => doc.exists())
            .map((doc) => ({ id: doc.id, ...doc.data() }));
          setAssignedEmployees(employees);
        }
      } catch (error) {
        console.error("Error fetching task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  // Mark admin messages as read when component mounts
  // useEffect(() => {
  //   const markAdminMessagesAsRead = async () => {
  //     if (!task || !task.remarksChat || task.remarksChat.length === 0) return;

  //     const hasUnreadAdminMessages = task.remarksChat.some(
  //       (msg) => msg.senderRole === "admin" && !msg.employeeRead
  //     );

  //     if (hasUnreadAdminMessages) {
  //       const updatedChat = task.remarksChat.map((msg) => ({
  //         ...msg,
  //         employeeRead:
  //           msg.senderRole === "admin" ? true : msg.employeeRead || false,
  //       }));

  //       try {
  //         await updateDoc(doc(db, "tasks", taskId), {
  //           remarksChat: updatedChat,
  //         });
  //       } catch (error) {
  //         console.error("Error marking messages as read:", error);
  //       }
  //     }
  //   };

  //   if (task) {
  //     markAdminMessagesAsRead();
  //   }
  // }, [task, taskId]);

  // Listen to real-time chat updates
  // useEffect(() => {
  //   const unsubscribe = onSnapshot(doc(db, "tasks", taskId), (doc) => {
  //     if (doc.exists()) {
  //       const taskData = doc.data();
  //       setMessages(taskData.remarksChat || []);
  //       setTask((prev) => ({ ...prev, ...taskData }));
  //     }
  //   });

  //   return unsubscribe;
  // }, [taskId]);

  // Auto-scroll to bottom when messages change
  // useEffect(() => {
  //   if (messagesEndRef.current) {
  //     messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [messages]);

  // Helper function to get rejection date from status history
  const getRejectionDate = () => {
    if (!task || !task.statusHistory) return null;

    const rejections = task.statusHistory.filter(
      (history) => history.status === "rejected"
    );

    if (rejections.length === 0) return null;

    const latestRejection = rejections[rejections.length - 1];
    return latestRejection.changedAt;
  };

  // Helper function to get approval date from status history
  const getApprovalDate = () => {
    if (!task || !task.statusHistory) return null;

    const approvals = task.statusHistory.filter(
      (history) => history.status === "approved"
    );

    if (approvals.length === 0) return null;

    const latestApproval = approvals[approvals.length - 1];
    return latestApproval.changedAt;
  };

  const handleStatusChange = (newStatus) => {
    if (task.approved) return;

    setPendingStatus(newStatus);
    setHasChanges(true);

    // Clear hold reason if not selecting hold
    if (newStatus !== "hold") {
      setPendingHoldReason("");
    }
  };

  // const handleSendMessage = async (e) => {
  //   e.preventDefault();

  //   if (!message.trim() || task.approved) return;

  //   setSending(true);

  //   try {
  //     // Get user's name from Firestore
  //     const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  //     const userName = userDoc.exists() ? userDoc.data().name : "Employee";

  //     const newMessage = {
  //       text: message.trim(),
  //       sentBy: userName, // Use actual name from Firestore
  //       sentById: currentUser.uid,
  //       senderRole: "employee",
  //       sentAt: new Date().toISOString(),
  //       employeeRead: true, // Employee's own messages are already "read"
  //     };

  //     await updateDoc(doc(db, "tasks", taskId), {
  //       remarksChat: arrayUnion(newMessage),
  //     });

  //     setMessage("");
  //   } catch (error) {
  //     console.error("Error sending message:", error);
  //     alert("Failed to send message");
  //   } finally {
  //     setSending(false);
  //   }
  // };

  const handleSave = async () => {
    if (!hasChanges || updating) return;

    // Validate hold reason if status is hold
    if (hasChanges && pendingStatus === "hold" && !pendingHoldReason.trim()) {
      alert("Please provide a reason for holding this task.");
      return;
    }

    setUpdating(true);

    try {
      const updateData = {};

      // Update status if changed
      if (hasChanges) {
        updateData.status = pendingStatus;
        updateData.statusHistory = arrayUnion({
          status: pendingStatus,
          changedBy: currentUser.uid,
          changedAt: new Date().toISOString(),
          note: pendingHoldReason || `Status changed to ${pendingStatus}`,
        });

        if (pendingStatus === "hold") {
          updateData.holdReason = pendingHoldReason;
        } else {
          updateData.holdReason = null;
        }

        if (pendingStatus !== "complete") {
          updateData.approved = false;
        }
      }

      await updateDoc(doc(db, "tasks", taskId), updateData);

      // Update local state
      setTask((prev) => ({
        ...prev,
        status: pendingStatus,
        holdReason: pendingHoldReason || null,
        statusHistory: [
          ...(prev.statusHistory || []),
          {
            status: pendingStatus,
            changedBy: currentUser.uid,
            changedAt: new Date().toISOString(),
            note: pendingHoldReason || `Status changed to ${pendingStatus}`,
          },
        ],
      }));

      setHasChanges(false);
      setPendingHoldReason("");
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task");
    } finally {
      setUpdating(false);
    }
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

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-gray-600">Task not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button with Icon */}
        <button
          onClick={() => navigate(-1)}
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

        {/* Task Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Task Details</h1>
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="bg-white text-dimo-blue px-6 py-2 rounded-lg hover:bg-gray-100 transition duration-200 font-semibold disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Task Name
              </label>
              <p className="text-xl font-semibold text-gray-900">{task.name}</p>
            </div>

            {/* Task Details */}
            {task.details && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Task Details
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {task.details}
                  </p>
                </div>
              </div>
            )}

            {/* Assigned Employees */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Assigned To
              </label>
              <div className="flex flex-wrap gap-2">
                {assignedEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full"
                  >
                    <div className="w-8 h-8 bg-dimo-blue rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {employee.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Creation Date
                </label>
                <p className="text-lg text-gray-900">
                  {new Date(task.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Target Date
                </label>
                <p className="text-lg text-gray-900">
                  {new Date(task.targetDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Status
              </label>
              <select
                value={pendingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating || task.approved}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none text-lg font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">Work in Progress</option>
                <option value="complete">Complete</option>
                <option value="hold">Hold</option>
              </select>
              {task.approved && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ This task has been approved and cannot be modified
                </p>
              )}
            </div>

            {/* Hold Reason Input - Only shows when status is Hold and has changes */}
            {pendingStatus === "hold" && hasChanges && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <label className="block text-sm font-medium text-yellow-800 mb-2">
                  Reason to Hold <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={pendingHoldReason}
                  onChange={(e) => setPendingHoldReason(e.target.value)}
                  placeholder="Please explain why this task is being put on hold..."
                  className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none"
                  rows="4"
                  disabled={task.approved}
                />
                {!pendingHoldReason.trim() && (
                  <p className="text-xs text-yellow-700 mt-2">
                    ⚠ You must provide a reason before saving
                  </p>
                )}
              </div>
            )}

            {/* Display Current Hold Reason - Only shows saved hold reason */}
            {task.holdReason && task.status === "hold" && !hasChanges && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-yellow-800 mb-1">
                  Current Reason for Hold
                </label>
                <p className="text-yellow-900">{task.holdReason}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {task.rejectionReason && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-red-800 mb-1">
                  Rejection Reason
                </label>
                <p className="text-red-900 mb-3">{task.rejectionReason}</p>
                {getRejectionDate() && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-red-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-red-600"
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
                    <p className="text-sm text-red-700">
                      Rejected on:{" "}
                      {new Date(getRejectionDate()).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Approval Status */}
            {task.approved && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-green-600"
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
                  <span className="text-lg font-semibold text-green-800">
                    Task Approved by Admin
                  </span>
                </div>
                {getApprovalDate() && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-green-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-green-600"
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
                    <p className="text-sm text-green-700">
                      Approved on:{" "}
                      {new Date(getApprovalDate()).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Section */}
            {/* <div className="border-2 border-gray-200 rounded-lg overflow-hidden"> */}
            {/* Chat Header */}
            {/* <div className="bg-gradient-to-r from-gray-500 to-gray-700 text-white p-4">
                <div className="flex items-center space-x-2">
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
                  <h3 className="text-lg font-semibold">Task Discussion</h3>
                  {messages.length > 0 && (
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded-full">
                      {messages.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-100 mt-1">
                  Communicate with admin about this task
                </p>
              </div> */}

            {/* Messages Area */}
            {/* <div className="bg-gray-50 p-4 h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mx-auto mb-3 text-gray-400"
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
                      <p className="font-medium">No messages yet</p>
                      <p className="text-sm mt-1">
                        Start a conversation about this task
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          msg.senderRole === "employee"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-4 ${
                            msg.senderRole === "employee"
                              ? "bg-blue-500 text-white"
                              : "bg-white border border-gray-200 text-gray-900"
                          }`}
                        >
                          <p className="text-xs font-semibold opacity-75 mb-2">
                            {msg.sentBy}
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                          <p
                            className={`text-xs mt-2 ${
                              msg.senderRole === "employee"
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {new Date(msg.sentAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div> */}

            {/* Input Area */}
            {/* <form
                onSubmit={handleSendMessage}
                className="border-t border-gray-200 p-4 bg-white"
              >
                <div className="flex items-center space-x-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      task.approved
                        ? "Chat is disabled for approved tasks"
                        : "Type your message..."
                    }
                    disabled={task.approved}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    rows="2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !message.trim() || task.approved}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <span>Send</span>
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </form>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
