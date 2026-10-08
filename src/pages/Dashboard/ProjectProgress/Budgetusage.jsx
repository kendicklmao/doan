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
    PieChart,
    Pie
} from "recharts";
import { Loader2, Wallet, FolderKanban } from "lucide-react";
import { fetchProjects, fetchTasksByProject } from "../../../../api.jsx";

const formatMoney = (v) => `$${Math.round(v || 0).toLocaleString("en-US")}`;

const isDoneTask = (task) =>
    (task.columnId && typeof task.columnId === "object" && task.columnId.position === 3) ||
    task.position === 3;

const getPoints = (task) => Number(task.points ?? task.point ?? 0) || 0;

// Màu theo mức sử dụng budget
const getUsageColor = (percent) => {
    if (percent > 100) return "#ef4444"; // vượt budget
    if (percent >= 80) return "#f59e0b"; // sắp hết
    return "#10b981"; // ổn
};

const getStatusLabel = (percent) => {
    if (percent > 100) return "Over budget";
    if (percent >= 80) return "Warning";
    return "On track";
};

const BarTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white/95 p-3 border border-slate-200/80 rounded-xl shadow-lg text-sm">
            <p className="font-bold text-slate-800 mb-1.5">{d.name}</p>
            <p style={{ margin: "2px 0", color: "#475569" }}>Budget: <b>{formatMoney(d.budget)}</b></p>
            <p style={{ margin: "2px 0", color: d.color }}>Used: <b>{formatMoney(d.used)}</b> ({d.usedPercent}%)</p>
            <p style={{ margin: "2px 0", color: d.remaining < 0 ? "#ef4444" : "#475569" }}>
                {d.remaining < 0 ? "Over budget by" : "Remaining"}: <b>{formatMoney(Math.abs(d.remaining))}</b>
            </p>
            {!d.hasRate && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Estimated (no cost per point set)</p>
            )}
        </div>
    );
};

const StatBox = ({ label, value, color }) => (
    <div style={{ padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" }}>
        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{label}</div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: color || "#0f172a" }}>{value}</div>
    </div>
);

export default function BudgetUsage() {
    const [rows, setRows] = useState([]);
    const [skipped, setSkipped] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState("all");

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await fetchProjects();
                const projects = Array.isArray(data) ? data : data?.data || [];

                const list = await Promise.all(
                    projects.map(async (project) => {
                        const id = String(project._id || project.id);
                        const budget = Number(project.budget) || 0;
                        let tasks = [];
                        try {
                            const t = await fetchTasksByProject(id);
                            tasks = Array.isArray(t) ? t : t?.data || [];
                        } catch {
                            tasks = [];
                        }

                        const costPerPoint = Number(project.costPerPoint) || 0;
                        const totalPoints = tasks.reduce((s, t) => s + getPoints(t), 0);
                        const donePoints = tasks.filter(isDoneTask).reduce((s, t) => s + getPoints(t), 0);

                        let used = 0;
                        if (costPerPoint > 0) {
                            // Có đơn giá: đã dùng = points đã Done x đơn giá (có thể vượt budget)
                            used = donePoints * costPerPoint;
                        } else {
                            // Chưa có đơn giá: ước tính theo tiến độ (không bao giờ vượt budget)
                            let ratio = 0;
                            if (totalPoints > 0) ratio = donePoints / totalPoints;
                            else if (tasks.length > 0) ratio = tasks.filter(isDoneTask).length / tasks.length;
                            used = budget * ratio;
                        }

                        const usedPercent = budget > 0 ? Math.round((used / budget) * 100) : 0;

                        return {
                            id,
                            name: project.name || "Untitled",
                            budget,
                            used,
                            remaining: budget - used,
                            usedPercent,
                            hasRate: costPerPoint > 0,
                            costPerPoint,
                            donePoints,
                            totalPoints,
                            // thanh xếp chồng (đơn vị %), dừng ở 100%
                            usedBar: Math.min(usedPercent, 100),
                            remainingBar: Math.max(100 - usedPercent, 0),
                            color: getUsageColor(usedPercent)
                        };
                    })
                );

                setRows(list.filter((r) => r.budget > 0));
                setSkipped(list.filter((r) => r.budget <= 0).length);
            } catch (err) {
                console.error("Error loading budget usage:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const selected = selectedId === "all" ? null : rows.find((r) => r.id === selectedId) || null;
    const visibleRows = selected ? [selected] : rows;

    const totalBudget = visibleRows.reduce((s, r) => s + r.budget, 0);
    const totalUsed = visibleRows.reduce((s, r) => s + r.used, 0);
    const totalPercent = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

    return (
        <div
            className="card"
            style={{ padding: "20px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
        >
            {/* Header + bộ lọc dự án */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Wallet size={20} style={{ color: "#4f46e5" }} />
                    <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
                            Budget Usage
                        </h3>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                            Done points x cost per point (estimated by progress when not set)
                        </p>
                    </div>
                </div>

                {rows.length > 0 && (
                    <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: "220px" }}>
                        <span style={{ position: "absolute", left: 12, pointerEvents: "none", color: "#6366f1", display: "flex" }}>
                            <FolderKanban size={16} />
                        </span>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 12px 8px 36px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#334155",
                                cursor: "pointer",
                                outline: "none"
                            }}
                        >
                            <option value="all">All projects</option>
                            {rows.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
                    <Loader2 className="animate-spin" size={28} style={{ color: "#4f46e5" }} />
                </div>
            ) : rows.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
                    No project has a budget yet.
                </p>
            ) : selected ? (
                /* ===== Xem 1 dự án: biểu đồ tròn + số liệu ===== */
                <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center" }}>
                    <div style={{ position: "relative", width: 240, height: 240, flex: "0 0 auto", margin: "0 auto" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: "Used", value: Math.min(selected.used, selected.budget) },
                                        { name: "Remaining", value: Math.max(selected.budget - selected.used, 0) }
                                    ]}
                                    dataKey="value"
                                    innerRadius={72}
                                    outerRadius={105}
                                    startAngle={90}
                                    endAngle={-270}
                                    stroke="none"
                                >
                                    <Cell fill={selected.color} />
                                    <Cell fill="#e2e8f0" />
                                </Pie>
                                <Tooltip formatter={(v, n) => [formatMoney(v), n]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                            <span style={{ fontSize: "28px", fontWeight: 700, color: selected.color }}>{selected.usedPercent}%</span>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{getStatusLabel(selected.usedPercent)}</span>
                        </div>
                    </div>

                    <div style={{ flex: "1 1 300px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                        <StatBox label="Budget" value={formatMoney(selected.budget)} />
                        <StatBox label="Used" value={formatMoney(selected.used)} color={selected.color} />
                        <StatBox
                            label={selected.remaining < 0 ? "Over budget by" : "Remaining"}
                            value={formatMoney(Math.abs(selected.remaining))}
                            color={selected.remaining < 0 ? "#ef4444" : undefined}
                        />
                        <StatBox label="Points done" value={`${selected.donePoints} / ${selected.totalPoints}`} />
                        <StatBox
                            label="Cost per point"
                            value={selected.hasRate ? formatMoney(selected.costPerPoint) : "Not set"}
                        />
                    </div>
                </div>
            ) : (
                /* ===== Xem tất cả: thanh ngang từng dự án ===== */
                <>
                    <div style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                        Total used: <b style={{ color: "#0f172a" }}>{formatMoney(totalUsed)}</b> / {formatMoney(totalBudget)} ({totalPercent}%)
                    </div>
                    <div style={{ width: "100%", height: Math.max(180, rows.length * 56 + 40) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rows}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#64748b", fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#334155", fontSize: 13 }} />
                                <Tooltip content={<BarTooltip />} cursor={{ fill: "#f8fafc" }} />
                                <Bar dataKey="usedBar" stackId="b" barSize={22}>
                                    {rows.map((r, i) => (
                                        <Cell key={i} fill={r.color} />
                                    ))}
                                </Bar>
                                <Bar dataKey="remainingBar" stackId="b" barSize={22} fill="#e2e8f0" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {!loading && rows.length > 0 && (
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#64748b", marginTop: "12px" }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#10b981", marginRight: 6 }} />&lt; 80%</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f59e0b", marginRight: 6 }} />80 - 100%</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#ef4444", marginRight: 6 }} />Over budget</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#e2e8f0", marginRight: 6 }} />Remaining</span>
                    {skipped > 0 && <span style={{ marginLeft: "auto" }}>{skipped} project(s) without budget are hidden</span>}
                </div>
            )}
        </div>
    );
}