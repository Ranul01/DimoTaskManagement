import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import Navbar from "../Layout/Navbar";

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return "?";

    const names = name.trim().split(" ");

    if (names.length === 1) {
      // If single name, return first letter
      return names[0].charAt(0).toUpperCase();
    }

    // Return first letter of first name and first letter of last name
    const firstInitial = names[0].charAt(0).toUpperCase();
    const lastInitial = names[names.length - 1].charAt(0).toUpperCase();

    return firstInitial + lastInitial;
  };

  const fetchProject = async () => {
    try {
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      if (projectDoc.exists()) {
        setProject({ id: projectDoc.id, ...projectDoc.data() });
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesWithTasks = async () => {
    try {
      // Fetch all tasks for this project
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", projectId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);

      // Get unique employee IDs from tasks
      const employeeIds = new Set();
      tasksSnapshot.docs.forEach((doc) => {
        const task = doc.data();
        if (task.assignedTo && Array.isArray(task.assignedTo)) {
          task.assignedTo.forEach((empId) => employeeIds.add(empId));
        }
      });

      // Fetch employee details for those IDs
      if (employeeIds.size > 0) {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const employeesData = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((user) => employeeIds.has(user.id));

        setEmployees(employeesData);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button with Icon */}
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

        {/* Project Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-dimo-blue">{project.name}</h1>
          <p className="text-gray-600 mt-2">
            Created on {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Employees Section Header with Add Task Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Team Members</h2>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="bg-dimo-blue text-white px-4 py-2 rounded-lg hover:bg-dimo-dark transition duration-200 flex items-center space-x-2"
          >
            <span className="text-xl">+</span>
            <span>Add New Task</span>
          </button>
        </div>

        {employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">
              No employees assigned tasks in this project yet
            </p>
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="bg-dimo-blue text-white px-6 py-3 rounded-lg hover:bg-dimo-dark transition duration-200"
            >
              Create First Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <div
                key={employee.id}
                onClick={() =>
                  navigate(
                    `/admin/project/${projectId}/employee/${employee.id}`
                  )
                }
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-dimo-blue to-dimo-dark rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {getInitials(employee.name)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-gray-500">{employee.email}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-dimo-blue text-sm font-medium">
                    View Tasks →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => {
            setShowCreateTaskModal(false);
            // Refresh employees list after creating a task
            fetchEmployeesWithTasks();
          }}
        />
      )}
    </div>
  );
};

const CreateTaskModal = ({ projectId, onClose }) => {
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

  useEffect(() => {
    const fetchAllEmployees = async () => {
      // Fetch ALL employees from users collection
      const usersSnapshot = await getDocs(collection(db, "users"));
      const employeesData = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((user) => user.role === "employee"); // Filter only employees

      setAllEmployees(employeesData);
    };
    fetchAllEmployees();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const createdAtISO = new Date(taskData.createdDate).toISOString();

      await addDoc(collection(db, "tasks"), {
        name: taskData.name,
        details: taskData.details,
        projectId,
        assignedTo: selectedEmployees,
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Employees
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
              disabled={loading || selectedEmployees.length === 0}
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
