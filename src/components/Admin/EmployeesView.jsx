// filepath: src/components/Admin/EmployeesView.jsx
import { useRef } from "react";
import EmployeeCard from "./EmployeeCard";

const EmployeesView = ({ employees, getEmployeeTaskSummary, handleEmployeeClick }) => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Summaries</h2>
        <p className="text-gray-600 mt-2">
          View task summaries for each employee
        </p>
      </div>

      {/* Employees Section */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No employees found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Scroll Buttons - Hidden on mobile */}
          {employees.length > 3 && (
            <>
              <button
                onClick={() => scroll("left")}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => scroll("right")}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide flex gap-6 pb-4 snap-x snap-mandatory"
          >
            {employees.map((employee) => {
              const summary = getEmployeeTaskSummary(employee.id);
              return (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  summary={summary}
                  handleEmployeeClick={handleEmployeeClick}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeesView;