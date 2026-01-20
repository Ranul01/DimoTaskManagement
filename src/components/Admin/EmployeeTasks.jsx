import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Layout/Navbar";

const EmployeeTasks = () => {
  const { projectId, employeeId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [rejectingTaskId, setRejectingTaskId] = useState(null);

  useEffect(() => {
    // Listen to project details in real-time
    const unsubscribeProject = onSnapshot(doc(db, "projects", projectId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const projectData = { id: docSnapshot.id, ...docSnapshot.data() };
        setProject(projectData);
        console.log("Project data loaded:", projectData);
        console.log("Project areas:", projectData.areas);
      }
    });

    // Fetch employee details
    const fetchEmployee = async () => {
      const employeeDoc = await getDoc(doc(db, "users", employeeId));
      if (employeeDoc.exists()) {
        setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
      }
    };

    fetchEmployee();

    // Listen to tasks for this employee in this project
    const q = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId),
      where("assignedTo", "array-contains", employeeId)
    );

    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
    });

    return () => {
      unsubscribeProject();
      unsubscribeTasks();
    };
  }, [projectId, employeeId]);

  // Helper function to get rejection date from status history
  const getRejectionDate = (task) => {
    if (!task.statusHistory) return null;

    const rejections = task.statusHistory.filter(
      (history) => history.status === "rejected"
    );

    if (rejections.length === 0) return null;

    const latestRejection = rejections[rejections.length - 1];
    return latestRejection.changedAt;
  };

  // Helper function to get approval date from status history
  const getApprovalDate = (task) => {
    if (!task.statusHistory) return null;

    const approvals = task.statusHistory.filter(
      (history) => history.status === "approved"
    );

    if (approvals.length === 0) return null;

    const latestApproval = approvals[approvals.length - 1];
    return latestApproval.changedAt;
  };

  // Helper function to get area names
  const getAreaNames = (areaIds) => {
    if (!areaIds || !Array.isArray(areaIds) || areaIds.length === 0 || !project?.areas) return [];
    return areaIds
      .map(areaId => {
        const area = project.areas.find(a => a.id === areaId);
        return area?.name;
      })
      .filter(name => name); // Remove undefined values
  };

  const handleApprove = async (taskId) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        approved: true,
        rejectionReason: null,
        statusHistory: arrayUnion({
          status: "approved",
          changedBy: "admin",
          changedAt: new Date().toISOString(),
          note: "Task approved by admin",
        }),
      });
    } catch (error) {
      console.error("Error approving task:", error);
    }
  };

  const handleRejectClick = (taskId) => {
    setRejectingTaskId(taskId);
    setShowRejectModal(true);
  };

  const handleDeleteTask = async (taskId, taskName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the task "${taskName}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
      } catch (error) {
        console.error("Error deleting task:", error);
        alert("Failed to delete task");
      }
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/admin/project/${projectId}`)}
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

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-dimo-blue">{project?.name}</h1>
          <p className="text-lg text-gray-700 mt-2">
            Tasks for: <span className="font-semibold">{employee?.name}</span>
          </p>
        </div>

        {/* Create Task Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-dimo-blue text-white px-6 py-3 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
          >
            <span className="text-xl">+</span>
            <span>Add New Task</span>
          </button>
        </div>

        {/* Tasks Cards */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">No tasks assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => {
              const areaNames = getAreaNames(task.areaIds);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-4">
                    <h3 className="text-lg font-bold text-white truncate">
                      {task.name}
                    </h3>
                    {areaNames.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {areaNames.map((areaName, index) => (
                          <div key={index} className="flex items-center space-x-1 bg-white bg-opacity-20 rounded-full px-3 py-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3 text-blue-100"
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
                            <span className="text-xs text-white font-medium">{areaName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Created Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        Created:
                      </span>
                      <span className="text-sm text-gray-900">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Task Details */}
                    {task.details && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Task Details:
                        </p>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {task.details}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        Status:
                      </span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${
                              task.status === "complete"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                            ${
                              task.status === "in-progress"
                                ? "bg-blue-100 text-blue-800"
                                : ""
                            }
                            ${
                              task.status === "not-started"
                                ? "bg-gray-100 text-gray-800"
                                : ""
                            }
                            ${
                              task.status === "hold"
                                ? "bg-yellow-100 text-yellow-800"
                                : ""
                            }
                          `}
                        >
                          {task.status.replace("-", " ").toUpperCase()}
                        </span>
                        {task.approved && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Approval Info */}
                    {task.approved && getApprovalDate(task) && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
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
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-xs font-medium text-green-800">
                            Approved
                          </p>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          {new Date(getApprovalDate(task)).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Hold Reason */}
                    {task.status === "hold" && task.holdReason && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-yellow-800 mb-1">
                          Reason for Hold:
                        </p>
                        <p className="text-sm text-yellow-700 italic">
                          {task.holdReason}
                        </p>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {task.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-red-800 mb-1">
                          Rejection Reason:
                        </p>
                        <p className="text-sm text-red-700 mb-2">
                          {task.rejectionReason}
                        </p>
                        {getRejectionDate(task) && (
                          <p className="text-xs text-red-600">
                            Rejected on:{" "}
                            {new Date(getRejectionDate(task)).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Target Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        Target Date:
                      </span>
                      <span className="text-sm text-gray-900">
                        {new Date(task.targetDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 pt-3">
                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditTask(task)}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded hover:bg-blue-50 transition text-sm"
                          title="Edit task"
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
                          <span>Edit</span>
                        </button>

                        {/* Approve/Reject buttons */}
                        {task.status === "complete" && !task.approved && (
                          <>
                            <button
                              onClick={() => handleApprove(task.id)}
                              className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(task.id)}
                              className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Delete button */}
                        {task.approved && (
                          <button
                            onClick={() => handleDeleteTask(task.id, task.name)}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-800 px-3 py-1.5 rounded hover:bg-red-50 transition text-sm"
                            title="Delete task"
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
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          employeeId={employeeId}
          employeeName={employee?.name}
          projectAreas={project?.areas || []}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && editingTask && (
        <EditTaskModal
          task={editingTask}
          projectId={projectId}
          projectAreas={project?.areas || []}
          onClose={() => {
            setShowEditModal(false);
            setEditingTask(null);
          }}
        />
      )}

      {showRejectModal && rejectingTaskId && (
        <RejectTaskModal
          taskId={rejectingTaskId}
          onClose={() => {
            setShowRejectModal(false);
            setRejectingTaskId(null);
          }}
        />
      )}
    </div>
  );
};

const RejectTaskModal = ({ taskId, onClose }) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setLoading(true);

    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: "not-started",
        approved: false,
        rejectionReason: rejectionReason,
        statusHistory: arrayUnion({
          status: "rejected",
          changedBy: "admin",
          changedAt: new Date().toISOString(),
          note: `Rejected: ${rejectionReason}`,
        }),
      });
      onClose();
    } catch (error) {
      console.error("Error rejecting task:", error);
      alert("Failed to reject task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="bg-red-500 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Reject Task</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a clear reason for rejecting this task..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
              rows="5"
              required
            />
            {!rejectionReason.trim() && (
              <p className="text-xs text-gray-500 mt-2">
                A detailed rejection reason helps the employee understand what
                needs to be corrected.
              </p>
            )}
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
              disabled={loading || !rejectionReason.trim()}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
            >
              {loading ? "Rejecting..." : "Reject Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditTaskModal = ({ task, projectId, projectAreas, onClose }) => {
  const formatDateForInput = (isoString) => {
    return new Date(isoString).toISOString().split("T")[0];
  };

  const [taskData, setTaskData] = useState({
    name: task.name,
    details: task.details || "",
    createdDate: formatDateForInput(task.createdAt),
    targetDate: task.targetDate,
  });
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(
    task.assignedTo || []
  );
  const [selectedAreas, setSelectedAreas] = useState(task.areaIds || []);

  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const employeesData = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.role === "employee");

        setAllEmployees(employeesData);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchAllEmployees();
  }, [projectId]);

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

      await updateDoc(doc(db, "tasks", task.id), {
        name: taskData.name,
        details: taskData.details,
        createdAt: createdAtISO,
        targetDate: taskData.targetDate,
        assignedTo: selectedEmployees,
        areaIds: selectedAreas,
        statusHistory: arrayUnion({
          status: "edited",
          changedBy: "admin",
          changedAt: new Date().toISOString(),
          note: "Task details updated by admin",
        }),
      });
      onClose();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Edit Task</h2>
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

          {/* Area Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area(s) <span className="text-red-600">*</span>
            </label>
            {projectAreas && projectAreas.length > 0 ? (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                {projectAreas.map((area) => (
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
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
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
                <p className="text-xs text-gray-500 mt-1">
                  Add areas from the Project Details page (Three-dot menu → Area wise)
                </p>
              </div>
            )}
            {projectAreas && projectAreas.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedAreas.length} area(s) selected
              </p>
            )}
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
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
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
            <p className="text-xs text-gray-500 mt-2">
              {selectedEmployees.length} employee(s) selected
            </p>
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
              {loading ? "Updating..." : "Update Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateTaskModal = ({ projectId, employeeId, employeeName, projectAreas, onClose }) => {
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
  const [selectedEmployees, setSelectedEmployees] = useState([employeeId]);
  const [selectedAreas, setSelectedAreas] = useState([]);

  // Debug: Log projectAreas when component mounts
  useEffect(() => {
    console.log("CreateTaskModal - projectAreas received:", projectAreas);
    console.log("CreateTaskModal - projectAreas length:", projectAreas?.length);
  }, [projectAreas]);

  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const employeesData = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.role === "employee");

        setAllEmployees(employeesData);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchAllEmployees();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
        <div className="bg-dimo-blue text-white p-6 rounded-t-lg">
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

          {/* Area Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area(s) <span className="text-red-600">*</span>
            </label>
            {projectAreas && projectAreas.length > 0 ? (
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                {projectAreas.map((area) => (
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
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
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
                <p className="text-xs text-gray-500 mt-1">
                  Add areas from the Project Details page (Three-dot menu → Area wise)
                </p>
              </div>
            )}
            {projectAreas && projectAreas.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedAreas.length} area(s) selected
              </p>
            )}
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
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
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
            <p className="text-xs text-gray-500 mt-2">
              {selectedEmployees.length} employee(s) selected
            </p>
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

export default EmployeeTasks;