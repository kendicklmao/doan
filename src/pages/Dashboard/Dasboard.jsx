import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    Legend
} from "recharts";
import { Loader2, Users, Layers, Activity, FolderKanban } from "lucide-react";

// Import API functions
import {
    fetchProjects,
    fetchTasksByProject,
    fetchMembersByProject,
    fetchWeeklyExpectancy
} from "../../../api.jsx";

// Import KPI Component
import KPI from "./KPI/KPI";
import BudgetUsage from "./ProjectProgress/Budgetusage.jsx";

// Tooltip tùy chỉnh cho biểu đồ Weekly Progress
const CustomWeeklyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200/80 rounded-xl shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-1.5">{label}</p>
                {payload[0] && (
                    <div className="flex items-center gap-2 text-indigo-600 font-medium my-0.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                        <span>Plan Progress:</span>
                        <span className="font-bold">{payload[0].value} pts</span>
                    </div>
                )}
                {payload[1] && payload[1].value !== null && payload[1].value !== undefined && (
                    <div className="flex items-center gap-2 text-emerald-600 font-medium my-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Real Progress:</span>
                        <span className="font-bold">{payload[1].value} pts</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    // State chung cho Dashboard
    const [projectProgressData, setProjectProgressData] = useState([]);
    const [loadingProgress, setLoadingProgress] = useState(true);

    const [resourceAllocation, setResourceAllocation] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);

    const [projectsList, setProjectsList] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    // State riêng cho Weekly Expectancy Chart
    const [weeklyChartData, setWeeklyChartData] = useState([]);
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [weeklyError, setWeeklyError] = useState(null);

    const getMemberDisplayName = (member) => {
        if (!member) return "User";
        if (typeof member === "object") {
            if (member.userId && typeof member.userId === "object") {
                return member.userId.username || member.userId.name || member.userId.email || "User";
            }
            return member.username || member.name || member.email || "User";
        }
        return "User";
    };

    const getInitials = (name) => {
        if (!name) return "??";
        const words = String(name).trim().split(/\s+/);
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    // 1. Tải danh sách projects, tiến độ dự án & phân bổ nhân sự
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoadingProgress(true);
                setLoadingResources(true);

                const data = await fetchProjects();
                const fetchedProjects = Array.isArray(data) ? data : data?.data || [];
                setProjectsList(fetchedProjects);

                if (fetchedProjects.length > 0) {
                    const firstId = fetchedProjects[0]._id || fetchedProjects[0].id;
                    setSelectedProjectId(firstId);
                }

                const userMap = {};
                const progressList = [];

                await Promise.all(
                    fetchedProjects.map(async (project) => {
                        const pId = project._id || project.id;

                        let projectMembers = [];
                        try {
                            const pMembersData = await fetchMembersByProject(pId);
                            projectMembers = Array.isArray(pMembersData)
                                ? pMembersData
                                : pMembersData?.data || pMembersData?.members || [];
                        } catch (err) {
                            projectMembers = Array.isArray(project.assignees)
                                ? project.assignees
                                : Array.isArray(project.members)
                                    ? project.members
                                    : [];
                        }

                        projectMembers.forEach((member) => {
                            const uId =
                                typeof member === "object"
                                    ? member._id || member.id || member.userId?._id || member.userId
                                    : member;

                            if (uId && !userMap[String(uId)]) {
                                userMap[String(uId)] = {
                                    id: String(uId),
                                    name: getMemberDisplayName(member),
                                    email: typeof member === "object" ? member.email || member.userId?.email || "" : "",
                                    role: typeof member === "object" ? member.role || member.userId?.role || "Member" : "Member",
                                    totalTasks: 0,
                                    completedTasks: 0,
                                    inProgressTasks: 0
                                };
                            }
                        });

                        let percent = 0;
                        try {
                            const tasksData = await fetchTasksByProject(pId);
                            const tasksList = Array.isArray(tasksData) ? tasksData : tasksData?.data || [];

                            if (tasksList.length > 0) {
                                const doneTasksCount = tasksList.filter((task) => {
                                    if (task.columnId && typeof task.columnId === "object") {
                                        return task.columnId.position === 3;
                                    }
                                    return task.position === 3;
                                }).length;

                                percent = Math.round((doneTasksCount / tasksList.length) * 100);
                            }

                            tasksList.forEach((task) => {
                                const isDone =
                                    (task.columnId && typeof task.columnId === "object" && task.columnId.position === 3) ||
                                    task.position === 3;

                                const taskAssignees = Array.isArray(task.assignees)
                                    ? task.assignees
                                    : task.assignee
                                        ? [task.assignee]
                                        : [];

                                taskAssignees.forEach((assignee) => {
                                    const assigneeId = String(
                                        typeof assignee === "object"
                                            ? assignee._id || assignee.id || assignee.userId
                                            : assignee
                                    );

                                    if (!userMap[assigneeId]) {
                                        userMap[assigneeId] = {
                                            id: assigneeId,
                                            name: getMemberDisplayName(assignee),
                                            email: typeof assignee === "object" ? assignee.email || "" : "",
                                            role: "Member",
                                            totalTasks: 0,
                                            completedTasks: 0,
                                            inProgressTasks: 0
                                        };
                                    }

                                    userMap[assigneeId].totalTasks += 1;
                                    if (isDone) {
                                        userMap[assigneeId].completedTasks += 1;
                                    } else {
                                        userMap[assigneeId].inProgressTasks += 1;
                                    }
                                });
                            });
                        } catch (err) {
                            percent = 0;
                        }

                        progressList.push({
                            name: project.name || "Untitled",
                            progress: percent,
                            color: project.color || "#4f46e5"
                        });
                    })
                );

                setProjectProgressData(progressList);
                setResourceAllocation(Object.values(userMap));
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoadingProgress(false);
                setLoadingResources(false);
            }
        };

        loadDashboardData();
    }, []);

    // 2. Tải dữ liệu biểu đồ Weekly Expectancy Progress khi đổi Project
    useEffect(() => {
        const loadWeeklyData = async () => {
            if (!selectedProjectId) return;

            try {
                setLoadingWeekly(true);
                setWeeklyError(null);

                const data = await fetchWeeklyExpectancy(selectedProjectId);

                // Chuẩn hóa định dạng tuần thành tiếng Anh "Week X"
                const formattedWeeks = (data?.weeks || []).map((item) => {
                    let formattedWeek = item.week;
                    if (typeof item.week === "string") {
                        formattedWeek = item.week.replace(/^Tuần\s*/i, "Week ");
                    } else if (typeof item.week === "number") {
                        formattedWeek = `Week ${item.week}`;
                    }
                    return {
                        ...item,
                        week: formattedWeek
                    };
                });

                setWeeklyChartData(formattedWeeks);
            } catch (err) {
                setWeeklyError(err.message || "Failed to load weekly progress data");
            } finally {
                setLoadingWeekly(false);
            }
        };

        loadWeeklyData();
    }, [selectedProjectId]);

    return (
        <main className="page-content">
            <div className="page-content-inner stack">
                <div>
                    <h1>Welcome back, Cao</h1>
                    <p className="page-subtitle">Here's what's happening across your workspace today.</p>
                </div>

                {/* KPI Section */}
                <KPI />
                <BudgetUsage/>
                {/* Project Progress (%) Chart */}
                <div
                    className="card"
                    style={{
                        padding: "20px",
                        background: "#fff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                        <Layers size={20} style={{ color: "#4f46e5" }} />
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                            Project Progress (%)
                        </h3>
                    </div>

                    {loadingProgress ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px" }}>
                            <Loader2 className="animate-spin" size={28} style={{ color: "#4f46e5" }} />
                        </div>
                    ) : projectProgressData.length === 0 ? (
                        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>No project data available.</p>
                    ) : (
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={projectProgressData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#64748b", fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#334155", fontSize: 13 }} />
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, "Progress"]}
                                        contentStyle={{
                                            borderRadius: "8px",
                                            border: "none",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                                        }}
                                    />
                                    <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={20}>
                                        {projectProgressData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Biểu đồ Weekly Progress Overview (Viết trực tiếp) */}
                <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    {/* Header + Modern Filter Dropdown */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                                    Weekly Progress Overview
                                </h3>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: 0, marginTop: "2px" }}>
                                    Expected story points vs real progress per week
                                </p>
                            </div>
                        </div>

                        {/* Filter đẹp mắt */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            {projectsList && projectsList.length > 0 && (
                                <div className="relative flex items-center min-w-[220px]">
                                    <div className="absolute left-3 pointer-events-none text-indigo-500">
                                        <FolderKanban size={16} />
                                    </div>
                                    <select
                                        value={selectedProjectId || ""}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-sm rounded-xl font-medium shadow-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none"
                                    >
                                        {projectsList.map((proj) => {
                                            const pId = proj._id || proj.id;
                                            return (
                                                <option key={pId} value={pId}>
                                                    {proj.name || "Untitled Project"}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chart Content */}
                    {loadingWeekly ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "320px" }}>
                            <Loader2 className="animate-spin" size={28} style={{ color: "#4f46e5" }} />
                            <span style={{ fontSize: "14px", color: "#94a3b8", marginLeft: "8px" }}>Loading chart data...</span>
                        </div>
                    ) : weeklyError ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "320px", color: "#ef4444", fontSize: "14px" }}>
                            {weeklyError}
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weeklyChartData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="week"
                                        tick={{ fill: "#64748b", fontSize: 12 }}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "#64748b", fontSize: 12 }}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tickLine={false}
                                        label={{ value: "Points (pts)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                                    />
                                    <Tooltip content={<CustomWeeklyTooltip />} />
                                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: "12px", fontSize: "13px" }} />

                                    {/* Plan Progress Line (Expectancy) */}
                                    <Line
                                        name="Plan Progress"
                                        type="monotone"
                                        dataKey="expectancy"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                                        activeDot={{ r: 7, stroke: "#6366f1", strokeWidth: 3 }}
                                    />

                                    {/* Real Progress Line */}
                                    <Line
                                        name="Real Progress"
                                        type="monotone"
                                        dataKey="realProgress"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        strokeDasharray="4 4"
                                        dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                                        connectNulls={true}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Resource Allocation Table */}
                <div
                    className="card"
                    style={{
                        padding: "20px",
                        background: "#fff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                        <Users size={20} style={{ color: "#4f46e5" }} />
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                            Resource Allocation (Task Distribution)
                        </h3>
                    </div>

                    {loadingResources ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 0" }}>
                            <Loader2 className="animate-spin" size={28} style={{ color: "#4f46e5" }} />
                        </div>
                    ) : resourceAllocation.length === 0 ? (
                        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>No member data available.</p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                                <thead>
                                <tr style={{ borderBottom: "2px solid #f1f5f9", color: "#64748b" }}>
                                    <th style={{ padding: "12px 8px" }}>User</th>
                                    <th style={{ padding: "12px 8px" }}>Role</th>
                                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Active Tasks</th>
                                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Done Tasks</th>
                                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Total Assigned</th>
                                </tr>
                                </thead>
                                <tbody>
                                {resourceAllocation.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: "10px" }}>
                                                <span
                                                    style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "50%",
                                                        background: "#4f46e5",
                                                        color: "#fff",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 600,
                                                        fontSize: "12px"
                                                    }}
                                                >
                                                    {getInitials(item.name)}
                                                </span>
                                            <div>
                                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
                                                {item.email && <div style={{ fontSize: "12px", color: "#94a3b8" }}>{item.email}</div>}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "#475569" }}>{item.role}</td>
                                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                                <span
                                                    style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        background: "#fef3c7",
                                                        color: "#d97706",
                                                        fontWeight: 600,
                                                        fontSize: "12px"
                                                    }}
                                                >
                                                    {item.inProgressTasks}
                                                </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                                <span
                                                    style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        background: "#d1fae5",
                                                        color: "#059669",
                                                        fontWeight: 600,
                                                        fontSize: "12px"
                                                    }}
                                                >
                                                    {item.completedTasks}
                                                </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>
                                            {item.totalTasks}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}