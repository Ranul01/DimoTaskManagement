import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingHoldReason, setPendingHoldReason] = useState("");

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        setLoading(true);

        // Get task details
        const taskDoc = await getDoc(doc(db, "tasks", taskId));
        if (!taskDoc.exists()) {
          console.error("Task not found");
          navigate("/employee");
          return;
        }

        const taskData = { id: taskDoc.id, ...taskDoc.data() };

        // Check if task is deleted
        if (taskData.deleted) {
          alert("This task has been deleted and is no longer available.");
          navigate("/employee");
          return;
        }

        setTask(taskData);
        setPendingStatus(taskData.status);

        // Fetch project details to get areas
        if (taskData.projectId) {
          const projectDoc = await getDoc(doc(db, "projects", taskData.projectId));
          if (projectDoc.exists()) {
            setProject({ id: projectDoc.id, ...projectDoc.data() });
          }
        }

        // Fetch employee details
        const employeePromises = taskData.assignedTo.map((empId) =>
          getDoc(doc(db, "users", empId))
        );
        const employeeDocs = await Promise.all(employeePromises);
        const employees = employeeDocs
          .filter((doc) => doc.exists())
          .map((doc) => ({ id: doc.id, ...doc.data() }));
        setAssignedEmployees(employees);
      } catch (error) {
        console.error("Error fetching task data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();

    // Listen to task updates in real-time
    const unsubscribe = onSnapshot(doc(db, "tasks", taskId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const updatedTask = { id: docSnapshot.id, ...docSnapshot.data() };
        
        // Check if task was deleted
        if (updatedTask.deleted) {
          alert("This task has been deleted.");
          navigate("/employee");
          return;
        }
        
        setTask(updatedTask);
      } else {
        navigate("/employee");
      }
    });

    return () => unsubscribe();
  }, [taskId, navigate]);

  // Helper function to get area names
  const getAreaNames = () => {
    if (!task?.areaIds || !Array.isArray(task.areaIds) || task.areaIds.length === 0 || !project?.areas) return [];
    return task.areaIds
      .map(areaId => {
        const area = project.areas.find(a => a.id === areaId);
        return area?.name;
      })
      .filter(name => name); // Remove undefined values
  };

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
      const currentTimestamp = new Date().toISOString();

      // Update status if changed
      if (hasChanges) {
        updateData.status = pendingStatus;
        updateData.statusHistory = arrayUnion({
          status: pendingStatus,
          changedBy: currentUser.uid,
          changedAt: currentTimestamp,
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

        // Add notification for complete or hold status
        if (pendingStatus === "complete" || pendingStatus === "hold") {
          updateData.adminNotification = {
            status: pendingStatus,
            employeeId: currentUser.uid,
            createdAt: currentTimestamp,
            read: false,
            message: pendingStatus === "complete" 
              ? "Task marked as complete" 
              : `Task put on hold: ${pendingHoldReason}`,
          };
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
            changedAt: currentTimestamp,
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

  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   if (selectedEmployees.length === 0) {
  //     alert("Please select at least one employee");
  //     return;
  //   }

  //   if (selectedAreas.length === 0) {
  //     alert("Please select at least one area");
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     const createdAtISO = new Date(taskData.createdDate).toISOString();

  //     await addDoc(collection(db, "tasks"), {
  //       name: taskData.name,
  //       details: taskData.details,
  //       projectId,
  //       assignedTo: selectedEmployees,
  //       areaIds: selectedAreas,
  //       createdAt: createdAtISO,
  //       targetDate: taskData.targetDate,
  //       status: "not-started",
  //       approved: false,
  //       deleted: false,
  //       rejectionReason: null,
  //       holdReason: null,
  //       remarksChat: [],
  //       // ADD THIS - Notification for task creation
  //       employeeNotification: {
  //         status: "created",
  //         message: `New task "${taskData.name}" has been assigned to you`,
  //         createdAt: new Date().toISOString(),
  //         read: false
  //       },
  //       statusHistory: [
  //         {
  //           status: "not-started",
  //           changedBy: "admin",
  //           changedAt: createdAtISO,
  //           note: "Task created",
  //         },
  //       ],
  //     });
  //     onClose();
  //   } catch (error) {
  //     console.error("Error creating task:", error);
  //     alert("Failed to create task");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

  const areaNames = getAreaNames();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="flex-shrink-0 p-2 text-dimo-blue hover:text-dimo-dark hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="Go Back"
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
                  Task Details
                </h1>
                <p className="text-gray-500 text-xs mt-0.5">
                  View and update task
                </p>
              </div>
            </div>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={updating}
                className="px-4 py-2 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50 text-sm font-medium"
              >
                {updating ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Task Details Card - Keep existing structure but remove the redundant header */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Task Name
              </label>
              <p className="text-base font-semibold text-gray-900">{task.name}</p>
            </div>

            {/* Task Details */}
            {task.details && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Details
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {task.details}
                  </p>
                </div>
              </div>
            )}

            {/* Assigned Areas */}
            {areaNames.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Area(s)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {areaNames.map((areaName, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-dimo-blue"
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
                        {areaName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Employees */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Assigned To
              </label>
              <div className="flex flex-wrap gap-1.5">
                {assignedEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center space-x-1.5 bg-gray-100 px-2.5 py-1 rounded-full"
                  >
                    <div className="w-6 h-6 bg-dimo-blue rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {employee.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(task.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Target
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(task.targetDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Status
              </label>
              <select
                value={pendingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating || task.approved}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">Work in Progress</option>
                <option value="complete">Complete</option>
                <option value="hold">Hold</option>
              </select>
              {task.approved && (
                <p className="text-xs text-green-600 mt-1.5 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approved - cannot be modified
                </p>
              )}
            </div>

            {/* Hold Reason Input */}
            {pendingStatus === "hold" && hasChanges && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3">
                <label className="block text-xs font-medium text-yellow-800 mb-1.5">
                  Reason to Hold <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={pendingHoldReason}
                  onChange={(e) => setPendingHoldReason(e.target.value)}
                  placeholder="Explain why this task is on hold..."
                  className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none text-sm"
                  rows="3"
                  disabled={task.approved}
                />
                {!pendingHoldReason.trim() && (
                  <p className="text-xs text-yellow-700 mt-1.5 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 mr-1"
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
                    Reason required before saving
                  </p>
                )}
              </div>
            )}

            {/* Display Current Hold Reason */}
            {task.holdReason && task.status === "hold" && !hasChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <label className="block text-xs font-medium text-yellow-800 mb-1">
                  Reason for Hold
                </label>
                <p className="text-sm text-yellow-900">{task.holdReason}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {task.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <label className="block text-xs font-medium text-red-800 mb-1">
                  Rejection Reason
                </label>
                <p className="text-sm text-red-900 mb-2">{task.rejectionReason}</p>
                {getRejectionDate() && (
                  <div className="flex items-center space-x-1.5 pt-2 border-t border-red-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 text-red-600"
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
                    <p className="text-xs text-red-700">
                      Rejected on{" "}
                      {new Date(getRejectionDate()).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
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
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-center space-x-1.5 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
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
                  <span className="text-sm font-semibold text-green-800">
                    Approved by Admin
                  </span>
                </div>
                {getApprovalDate() && (
                  <div className="flex items-center space-x-1.5 pt-2 border-t border-green-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 text-green-600"
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
                    <p className="text-xs text-green-700">
                      Approved on{" "}
                      {new Date(getApprovalDate()).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;