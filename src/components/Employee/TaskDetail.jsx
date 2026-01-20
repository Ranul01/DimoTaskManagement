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
  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingHoldReason, setPendingHoldReason] = useState("");

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const taskDoc = await getDoc(doc(db, "tasks", taskId));
        if (taskDoc.exists()) {
          const taskData = { id: taskDoc.id, ...taskDoc.data() };
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
        }
      } catch (error) {
        console.error("Error fetching task:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

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

  const areaNames = getAreaNames();

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

            {/* Assigned Areas */}
            {areaNames.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Assigned Area(s)
                </label>
                <div className="flex flex-wrap gap-2">
                  {areaNames.map((areaName, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-dimo-blue"
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
                      <span className="text-sm font-medium text-dimo-blue">
                        {areaName}
                      </span>
                    </div>
                  ))}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;