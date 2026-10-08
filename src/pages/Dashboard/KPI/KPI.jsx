<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { fetchPortfolio, fetchProjects, fetchWeeklyExpectancy } from '../../../../api.jsx'; // Chỉnh đường dẫn dẫn tới api.jsx của bạn

function KPI() {
    const [portfolioData, setPortfolioData] = useState({
        totalProjects: 0,
        totalBudget: 0,
        onTimeRate: 100
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadKPIData = async () => {
            try {
                setLoading(true);

                // 1. Lấy thông tin Portfolio chung (Total Projects & Total Budget)
                const portfolioRes = await fetchPortfolio().catch(() => null);

                // 2. Lấy danh sách tất cả dự án
                const projects = await fetchProjects();
                const projectList = Array.isArray(projects) ? projects : projects?.data || [];

                if (projectList.length === 0) {
                    setPortfolioData({
                        totalProjects: portfolioRes?.totalProjects || 0,
                        totalBudget: portfolioRes?.totalBudget || 0,
                        onTimeRate: 100
                    });
                    setLoading(false);
                    return;
                }

                let totalRateSum = 0;
                let evaluatedProjectsCount = 0;

                // 3. Tính On-Time Rate của tuần hiện tại cho từng Project
                await Promise.all(
                    projectList.map(async (project) => {
                        const projectId = project._id || project.id;
                        try {
                            const weeklyData = await fetchWeeklyExpectancy(projectId);
                            const currentWeekNum = weeklyData?.currentProjectWeek || 1;
                            const weeks = weeklyData?.weeks || [];

                            // Tìm tuần hiện tại
                            const currentWeekData = weeks.find(
                                (w) => Number(w.weekNumber) === Number(currentWeekNum)
                            ) || weeks[weeks.length - 1]; // Fallback lấy tuần cuối nếu vượt quá phạm vi

                            if (currentWeekData) {
                                const real = currentWeekData.realProgress ?? 0;
                                const plan = currentWeekData.expectancy ?? 0;

                                let projectRate = 100;
                                if (plan > 0) {
                                    // Tỷ lệ real / plan (Tối đa 100%)
                                    projectRate = Math.min(100, Math.round((real / plan) * 100));
                                } else {
                                    // Nếu plan = 0 mà real >= 0 thì đạt 100%
                                    projectRate = 100;
                                }

                                totalRateSum += projectRate;
                                evaluatedProjectsCount += 1;
                            } else {
                                totalRateSum += 100;
                                evaluatedProjectsCount += 1;
                            }
                        } catch (err) {
                            console.error(`Lỗi tải dữ liệu tuần dự án ${projectId}:`, err);
                            totalRateSum += 100;
                            evaluatedProjectsCount += 1;
                        }
                    })
                );

                // 4. Tính On-Time Rate trung bình của toàn hệ thống
                const finalGlobalRate = evaluatedProjectsCount > 0
                    ? Math.round(totalRateSum / evaluatedProjectsCount)
                    : 100;

                setPortfolioData({
                    totalProjects: portfolioRes?.totalProjects || projectList.length,
                    totalBudget: portfolioRes?.totalBudget || 0,
                    onTimeRate: finalGlobalRate
                });

            } catch (err) {
                console.error("Lỗi khi đồng bộ dữ liệu KPI:", err);
            } finally {
                setLoading(false);
            }
        };

        loadKPIData();
    }, []);

    if (loading) {
        return <div className="text-xs text-slate-400 p-4">Đang tải số liệu hệ thống...</div>;
    }

    return (
        <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>

            {/* Card 1: Total Projects */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-primary">
                <span className="icon" data-icon="listTodo">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path><path d="m3 17 2 2 4-4"></path><rect x="3" y="4" width="6" height="6" rx="1"></rect></svg>
                </span>
              </span>
                <div>
                    <p className="stat-card-label">Total Projects</p>
                    <p className="stat-card-value">{portfolioData.totalProjects}</p>
                </div>
            </div>

            {/* Card 2: On-Time Rate */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-success">
                <span className="icon" data-icon="checkCircle2">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="m16 9-5.5 5.5L8 12"></path></svg>
                </span>
              </span>
                <div>
                    <p className="stat-card-label">On-Time Rate</p>
                    <p className="stat-card-value">{portfolioData.onTimeRate}%</p>
                </div>
            </div>

            {/* Card 3: Total Budget */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-warning">
                <span className="icon" data-icon="loader">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"></path><path d="m16.2 7.8 2.9-2.9"></path><path d="M18 12h4"></path><path d="m16.2 16.2 2.9 2.9"></path><path d="M12 18v4"></path><path d="m4.9 19.1 2.9-2.9"></path><path d="M2 12h4"></path><path d="m4.9 4.9 2.9 2.9"></path></svg>
                </span>
              </span>
                <div>
                    <p className="stat-card-label">Total Budget</p>
                    <p className="stat-card-value">${(portfolioData.totalBudget || 0).toLocaleString('en-US')}</p>
                </div>
            </div>

        </div>
    );
}

=======
import React, { useState, useEffect } from 'react';
import { fetchPortfolio, fetchProjects, fetchWeeklyExpectancy } from '../../../../api.jsx'; // Chỉnh đường dẫn dẫn tới api.jsx của bạn

function KPI() {
    const [portfolioData, setPortfolioData] = useState({
        totalProjects: 0,
        totalBudget: 0,
        onTimeRate: 100
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadKPIData = async () => {
            try {
                setLoading(true);

                // 1. Lấy thông tin Portfolio chung (Total Projects & Total Budget)
                const portfolioRes = await fetchPortfolio().catch(() => null);

                // 2. Lấy danh sách tất cả dự án
                const projects = await fetchProjects();
                const projectList = Array.isArray(projects) ? projects : projects?.data || [];

                if (projectList.length === 0) {
                    setPortfolioData({
                        totalProjects: portfolioRes?.totalProjects || 0,
                        totalBudget: portfolioRes?.totalBudget || 0,
                        onTimeRate: 100
                    });
                    setLoading(false);
                    return;
                }

                let totalRateSum = 0;
                let evaluatedProjectsCount = 0;

                // 3. Tính On-Time Rate của tuần hiện tại cho từng Project
                await Promise.all(
                    projectList.map(async (project) => {
                        const projectId = project._id || project.id;
                        try {
                            const weeklyData = await fetchWeeklyExpectancy(projectId);
                            const currentWeekNum = weeklyData?.currentProjectWeek || 1;
                            const weeks = weeklyData?.weeks || [];

                            // Tìm tuần hiện tại
                            const currentWeekData = weeks.find(
                                (w) => Number(w.weekNumber) === Number(currentWeekNum)
                            ) || weeks[weeks.length - 1]; // Fallback lấy tuần cuối nếu vượt quá phạm vi

                            if (currentWeekData) {
                                const real = currentWeekData.realProgress ?? 0;
                                const plan = currentWeekData.expectancy ?? 0;

                                let projectRate = 100;
                                if (plan > 0) {
                                    // Tỷ lệ real / plan (Tối đa 100%)
                                    projectRate = Math.min(100, Math.round((real / plan) * 100));
                                } else {
                                    // Nếu plan = 0 mà real >= 0 thì đạt 100%
                                    projectRate = 100;
                                }

                                totalRateSum += projectRate;
                                evaluatedProjectsCount += 1;
                            } else {
                                totalRateSum += 100;
                                evaluatedProjectsCount += 1;
                            }
                        } catch (err) {
                            console.error(`Lỗi tải dữ liệu tuần dự án ${projectId}:`, err);
                            totalRateSum += 100;
                            evaluatedProjectsCount += 1;
                        }
                    })
                );

                // 4. Tính On-Time Rate trung bình của toàn hệ thống
                const finalGlobalRate = evaluatedProjectsCount > 0
                    ? Math.round(totalRateSum / evaluatedProjectsCount)
                    : 100;

                setPortfolioData({
                    totalProjects: portfolioRes?.totalProjects || projectList.length,
                    totalBudget: portfolioRes?.totalBudget || 0,
                    onTimeRate: finalGlobalRate
                });

            } catch (err) {
                console.error("Lỗi khi đồng bộ dữ liệu KPI:", err);
            } finally {
                setLoading(false);
            }
        };

        loadKPIData();
    }, []);

    if (loading) {
        return <div className="text-xs text-slate-400 p-4">Đang tải số liệu hệ thống...</div>;
    }

    return (
        <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>

            {/* Card 1: Total Projects */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-primary">
                <span className="icon" data-icon="listTodo">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path><path d="m3 17 2 2 4-4"></path><rect x="3" y="4" width="6" height="6" rx="1"></rect></svg>
                </span>
              </span>
                <div>
                    <p className="stat-card-label">Total Projects</p>
                    <p className="stat-card-value">{portfolioData.totalProjects}</p>
                </div>
            </div>

            {/* Card 2: On-Time Rate */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-success">
                <span className="icon" data-icon="checkCircle2">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="m16 9-5.5 5.5L8 12"></path></svg>
                </span>
              </span>
                <div>
                    <p className="stat-card-label">On-Time Rate</p>
                    <p className="stat-card-value">{portfolioData.onTimeRate}%</p>
                </div>
            </div>

            {/* Card 3: Total Budget */}
            <div className="card stat-card">
              <span className="stat-card-icon tone-warning">
                <span className="icon" data-icon="loader">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"></path><path d="m16.2 7.8 2.9-2.9"></path><path d="M18 12h4"></path><path d="m16.2 16.2 2.9 2.9"></path><path d="M12 18v4"></path><path d="m4.9 19.1 2.9-2.9"></path><path d="M2 12h4"></path><path d="m4.9 4.9 2.9 2.9"></path></svg>
                </span>
              </span>
                <div>
                    <p className="stat-card-label">Total Budget</p>
                    <p className="stat-card-value">${(portfolioData.totalBudget || 0).toLocaleString('en-US')}</p>
                </div>
            </div>

        </div>
    );
}

>>>>>>> 67953cc8b94ed89fa49feb0092c4d156a0f1ad36
export default KPI;