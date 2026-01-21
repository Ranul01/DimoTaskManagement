import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const EmployeeCard = ({ employee, summary, handleEmployeeClick }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [mouseStart, setMouseStart] = useState(null);

  const COLORS = {
    notStarted: "#9CA3AF",
    inProgress: "#60A5FA",
    completed: "#34D399",
    pending: "#FB923C",
    hold: "#FBBF24",
  };

  const chartData = [
    {
      name: "Not Started",
      value: summary.notStarted,
      color: COLORS.notStarted,
    },
    {
      name: "In Progress",
      value: summary.inProgress,
      color: COLORS.inProgress,
    },
    { name: "Completed", value: summary.completed, color: COLORS.completed },
    { name: "Pending", value: summary.pending, color: COLORS.pending },
    { name: "On Hold", value: summary.hold, color: COLORS.hold },
  ].filter((item) => item.value > 0);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;
    
    // If it's not a swipe, do nothing (prevent click navigation)
    if (!isSwipe) {
      setTouchStart(null);
      setTouchEnd(null);
    }
  };

  const onMouseDown = (e) => {
    setMouseStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = (e) => {
    if (!mouseStart) return;

    const deltaX = Math.abs(e.clientX - mouseStart.x);
    const deltaY = Math.abs(e.clientY - mouseStart.y);
    
    // If mouse moved less than 5px, consider it a click (prevent navigation)
    if (deltaX < 5 && deltaY < 5) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setMouseStart(null);
  };

  const handleCardClick = (e) => {
    // Prevent navigation on click
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleCardClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden flex-shrink-0 w-full md:w-[calc(33.333%-1rem)] snap-center select-none"
    >
      {/* Card Header */}
      <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-dimo-blue">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-white truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-blue-100 truncate">{employee.email}</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        {/* Total Tasks */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-gray-700">
            Total Tasks:
          </span>
          <span className="text-2xl font-bold text-dimo-blue">
            {summary.total}
          </span>
        </div>

        {/* Pie Chart */}
        {summary.total > 0 ? (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mb-6 h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm">No tasks assigned</p>
          </div>
        )}

        {/* Task Summary Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.notStarted }}
              ></div>
              <span className="text-sm text-gray-600">Not Started:</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {summary.notStarted}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.inProgress }}
              ></div>
              <span className="text-sm text-gray-600">In Progress:</span>
            </div>
            <span className="text-sm font-semibold text-blue-700">
              {summary.inProgress}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.completed }}
              ></div>
              <span className="text-sm text-gray-600">Completed:</span>
            </div>
            <span className="text-sm font-semibold text-green-700">
              {summary.completed}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.pending }}
              ></div>
              <span className="text-sm text-gray-600">Pending Approval:</span>
            </div>
            <span className="text-sm font-semibold text-orange-700">
              {summary.pending}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.hold }}
              ></div>
              <span className="text-sm text-gray-600">On Hold:</span>
            </div>
            <span className="text-sm font-semibold text-yellow-700">
              {summary.hold}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;