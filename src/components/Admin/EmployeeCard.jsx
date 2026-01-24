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
    
    if (deltaX < 5 && deltaY < 5) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setMouseStart(null);
  };

  const handleCardClick = (e) => {
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
      className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden flex-shrink-0 w-full md:w-[calc(33.333%-1rem)] snap-center select-none"
    >
      {/* Card Header */}
      <div className="bg-gradient-to-r from-dimo-blue to-dimo-dark p-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-dimo-blue">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-white truncate">
              {employee.name}
            </h3>
            <p className="text-xs text-blue-100 truncate">{employee.email}</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Total Tasks */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">
            Total Tasks:
          </span>
          <span className="text-xl font-bold text-dimo-blue">
            {summary.total}
          </span>
        </div>

        {/* Pie Chart */}
        {summary.total > 0 ? (
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
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
                    fontSize: "0.875rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mb-4 h-[150px] flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm">No tasks assigned</p>
          </div>
        )}

        {/* Task Summary Details - Vertical Layout */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.notStarted }}
              ></div>
              <span className="text-xs text-gray-600">Not Started</span>
            </div>
            <span className="text-xs font-semibold text-gray-700">
              {summary.notStarted}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.inProgress }}
              ></div>
              <span className="text-xs text-gray-600">In Progress</span>
            </div>
            <span className="text-xs font-semibold text-blue-700">
              {summary.inProgress}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.completed }}
              ></div>
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <span className="text-xs font-semibold text-green-700">
              {summary.completed}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.pending }}
              ></div>
              <span className="text-xs text-gray-600">Pending</span>
            </div>
            <span className="text-xs font-semibold text-orange-700">
              {summary.pending}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.hold }}
              ></div>
              <span className="text-xs text-gray-600">On Hold</span>
            </div>
            <span className="text-xs font-semibold text-yellow-700">
              {summary.hold}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;