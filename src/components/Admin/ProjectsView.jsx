import { useState, useEffect, useRef } from "react";

const ProjectsView = ({ projects, navigate, setShowCreateModal, setShowEditModal, setEditingProject }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleDeleteProject = async (e, project) => {
    e.stopPropagation();
    setOpenMenuId(null);

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${project.name}"? This will also delete all tasks associated with this project. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const { deleteDoc, doc, collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("../../firebase/config");

      // Delete all tasks associated with this project
      const tasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", project.id)
      );
      const tasksSnapshot = await getDocs(tasksQuery);

      // Delete all tasks in parallel
      const deleteTaskPromises = tasksSnapshot.docs.map((taskDoc) =>
        deleteDoc(doc(db, "tasks", taskDoc.id))
      );
      await Promise.all(deleteTaskPromises);

      // Delete the project
      await deleteDoc(doc(db, "projects", project.id));
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project and its tasks");
    }
  };

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
            <div key={project.id} className="relative">
              <div
                onClick={(e) => {
                  // Don't navigate if clicking on the menu button or dropdown
                  if (e.target.closest('.menu-button') || e.target.closest('.menu-dropdown')) {
                    return;
                  }
                  navigate(`/admin/project/${project.id}`);
                }}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer overflow-hidden"
              >
                {/* Three Dot Menu Button */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => handleMenuToggle(e, project.id)}
                    className="menu-button bg-white text-gray-600 p-2 rounded-full hover:bg-gray-100 transition duration-200 shadow-md"
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
                </div>

                <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-6">
                  <h3 className="text-xl font-bold text-white pr-8">
                    {project.name}
                  </h3>
                </div>
              </div>

              {/* Dropdown Menu */}
              {openMenuId === project.id && (
                <div
                  ref={menuRef}
                  className="menu-dropdown absolute top-12 right-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20"
                >
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
                    onClick={(e) => handleDeleteProject(e, project)}
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
          ))}
        </div>
      )}
    </>
  );
};

export default ProjectsView;