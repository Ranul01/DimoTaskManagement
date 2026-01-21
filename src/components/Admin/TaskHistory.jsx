import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import Navbar from "../Layout/Navbar";

const TaskHistory = () => {
  const navigate = useNavigate();
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    taskName: "",
    assignee: "",
    project: "",
    startDate: "",
    endDate: "",
  });

  // Sort state
  const [sortBy, setSortBy] = useState("deletedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    // Fetch employees
    const fetchEmployees = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const employeesData = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.role === "employee");
      setEmployees(employeesData);
    };

    // Fetch projects
    const fetchProjects = async () => {
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectsData);
    };

    fetchEmployees();
    fetchProjects();

    // Listen to deleted tasks
    const q = query(collection(db, "tasks"), where("deleted", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDeletedTasks(tasksData);
      setFilteredTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply filters whenever filter state or deleted tasks change
  useEffect(() => {
    let filtered = [...deletedTasks];

    // Filter by task name
    if (filters.taskName) {
      filtered = filtered.filter((task) =>
        task.name.toLowerCase().includes(filters.taskName.toLowerCase())
      );
    }

    // Filter by assignee
    if (filters.assignee) {
      filtered = filtered.filter((task) =>
        task.assignedTo?.includes(filters.assignee)
      );
    }

    // Filter by project
    if (filters.project) {
      filtered = filtered.filter((task) => task.projectId === filters.project);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (task) => new Date(task.deletedAt) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (task) => new Date(task.deletedAt) <= new Date(filters.endDate)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "deletedAt":
          aValue = new Date(a.deletedAt);
          bValue = new Date(b.deletedAt);
          break;
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "taskName":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          aValue = new Date(a.deletedAt);
          bValue = new Date(b.deletedAt);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTasks(filtered);
  }, [filters, deletedTasks, sortBy, sortOrder]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      taskName: "",
      assignee: "",
      project: "",
      startDate: "",
      endDate: "",
    });
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    return employee?.name || "Unknown";
  };

  const getProjectName = (projectId) => {
    const project = projects.find((proj) => proj.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "not-started":
        return "bg-gray-100 text-gray-800";
      case "hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate("/admin")}
            className="mb-4 inline-flex items-center text-dimo-blue hover:text-dimo-dark transition-colors duration-200 group touch-manipulation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-6 sm:w-6 transform group-hover:-translate-x-1 transition-transform duration-200"
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
          <h1 className="text-2xl sm:text-3xl font-bold text-dimo-blue">Task History</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            View all deleted tasks ({filteredTasks.length} total)
          </p>
        </div>

        {/* Collapsible Filters */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div
            className="flex items-center justify-between p-4 sm:p-6 cursor-pointer touch-manipulation"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-dimo-blue flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Filters</h2>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {showFilters && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  className="text-xs sm:text-sm text-dimo-blue hover:text-dimo-dark transition touch-manipulation"
                >
                  Clear All
                </button>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 text-gray-600 transition-transform duration-200 flex-shrink-0 ${
                  showFilters ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {showFilters && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
                {/* Task Name Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={filters.taskName}
                    onChange={(e) => handleFilterChange("taskName", e.target.value)}
                    placeholder="Search by task name..."
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                  />
                </div>

                {/* Assignee Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <select
                    value={filters.assignee}
                    onChange={(e) => handleFilterChange("assignee", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    value={filters.project}
                    onChange={(e) => handleFilterChange("project", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                  >
                    <option value="">All Projects</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Deleted From
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Deleted To
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
                    >
                      <option value="deletedAt">Deletion Date</option>
                      <option value="createdAt">Creation Date</option>
                      <option value="taskName">Task Name</option>
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      }}
                      className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition touch-manipulation"
                      title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                    >
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
            <p className="text-gray-500 text-base sm:text-lg">Loading history...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-4"
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
            <p className="text-gray-500 text-base sm:text-lg">No deleted tasks found</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                {/* Main Task Row - Always Visible - Horizontal on Desktop */}
                <div
                  onClick={() => toggleTaskExpand(task.id)}
                  className="p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors touch-manipulation"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    {/* Desktop: 3 columns, Mobile: Stack vertically */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                      {/* Task Name */}
                      <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5 text-dimo-blue flex-shrink-0 mt-0.5 sm:mt-0"
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
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2">
                            {task.name}
                          </div>
                        </div>
                      </div>

                      {/* Project */}
                      <div className="flex items-center space-x-2 pl-6 sm:pl-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700 truncate">
                          {getProjectName(task.projectId)}
                        </span>
                      </div>

                      {/* Assigned To */}
                      <div className="flex items-center space-x-2 pl-6 sm:pl-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700 truncate">
                          {task.assignedTo?.map((empId) => getEmployeeName(empId)).join(", ") ||
                            "Unassigned"}
                        </span>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                        expandedTaskId === task.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Expanded Details - Horizontal Layout */}
                {expandedTaskId === task.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {/* Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Status
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status.replace("-", " ").toUpperCase()}
                          </span>
                          {task.approved && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              ✓ Approved
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Created Date
                        </label>
                        <div className="text-xs sm:text-sm text-gray-900">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(task.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* Deleted Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Deleted Date
                        </label>
                        <div className="text-xs sm:text-sm text-gray-900">
                          {new Date(task.deletedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(task.deletedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* Deleted By */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Deleted By
                        </label>
                        <div className="text-xs sm:text-sm text-gray-900">
                          {task.deletedBy || "Unknown"}
                        </div>
                      </div>

                      {/* Target Date (if exists) */}
                      {task.targetDate && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Target Date
                          </label>
                          <div className="text-xs sm:text-sm text-gray-900">
                            {new Date(task.targetDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {/* Rejection Reason (if exists) */}
                      {task.rejectionReason && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Rejection Reason
                          </label>
                          <div className="text-xs sm:text-sm text-red-600 bg-red-50 p-2 sm:p-3 rounded">
                            {task.rejectionReason}
                          </div>
                        </div>
                      )}

                      {/* Hold Reason (if exists) */}
                      {task.holdReason && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Hold Reason
                          </label>
                          <div className="text-xs sm:text-sm text-yellow-700 bg-yellow-50 p-2 sm:p-3 rounded">
                            {task.holdReason}
                          </div>
                        </div>
                      )}

                      {/* Full Details (if exists) */}
                      {task.details && (
                        <div className="sm:col-span-2 lg:col-span-4">
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Task Details
                          </label>
                          <div className="text-xs sm:text-sm text-gray-700 bg-white p-2 sm:p-3 rounded border border-gray-200 whitespace-pre-wrap">
                            {task.details}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskHistory;