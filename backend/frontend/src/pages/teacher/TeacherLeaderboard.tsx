import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Avatar from '../../components/Avatar';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './TeacherLeaderboard.css';

interface TeacherLeaderboardProps {
    classrooms: any[];
}

const TeacherLeaderboard: React.FC<TeacherLeaderboardProps> = ({ classrooms }) => {
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
    const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'overall'>('overall');
    const [students, setStudents] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>('');

    useEffect(() => {
        if (classrooms && classrooms.length > 0 && !selectedClassroomId) {
            setSelectedClassroomId(classrooms[0]._id);
        }
    }, [classrooms, selectedClassroomId]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!selectedClassroomId) return;
            setLoading(true);
            try {
                const res = await api.get(`/teacher/classrooms/${selectedClassroomId}/leaderboard?timeFilter=${timeFilter}`);
                setStudents(res.data.students || []);
                setInsights(res.data.insights || null);
            } catch (err) {
                console.error('Failed to load leaderboard', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [selectedClassroomId, timeFilter]);

    const handleExport = (format: 'csv' | 'pdf') => {
        if (format === 'csv') {
            const header = ['Rank', 'Name', 'Email', 'Average Score', 'Accuracy', 'Completed', 'Total Points', 'Trend', 'Badge'];
            const rows = students.map(s => [
                s.rank,
                `"${s.name}"`,
                `"${s.email}"`,
                `${s.averageScore}%`,
                `${s.accuracy}%`,
                s.assessmentsCompleted,
                s.totalPoints,
                s.trend > 0 ? `+${s.trend}` : s.trend,
                `"${s.badge}"`
            ]);
            const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Leaderboard-${timeFilter}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    const topThree = students.slice(0, 3);

    return (
        <div className="teacher-leaderboard-container">
            <div className="leaderboard-header-section">
                <div className="leaderboard-title">
                    <h1><Trophy size={28} className="text-primary" style={{ marginRight: '8px', color: 'var(--color-accent, #ea580c)' }} /> Classroom Leaderboard</h1>
                    <p>Track classroom rankings, student performance, achievements, and progress over time.</p>
                </div>

                <div className="leaderboard-filters">
                    <div className="filter-group">
                        <span className="filter-label">Select Classroom</span>
                        <select 
                            className="form-select" 
                            value={selectedClassroomId} 
                            onChange={(e) => setSelectedClassroomId(e.target.value)}
                        >
                            {classrooms.map(c => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group" style={{ marginLeft: 'auto' }}>
                        <span className="filter-label">Timeframe</span>
                        <div className="time-filter-pills">
                            <button className={`time-filter-pill ${timeFilter === 'weekly' ? 'active' : ''}`} onClick={() => setTimeFilter('weekly')}>Weekly</button>
                            <button className={`time-filter-pill ${timeFilter === 'monthly' ? 'active' : ''}`} onClick={() => setTimeFilter('monthly')}>Monthly</button>
                            <button className={`time-filter-pill ${timeFilter === 'overall' ? 'active' : ''}`} onClick={() => setTimeFilter('overall')}>Overall</button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="empty-state">
                    <h3>Loading Leaderboard...</h3>
                </div>
            ) : students.length === 0 ? (
                <div className="empty-state card">
                    <h3>No leaderboard available yet.</h3>
                    <p>Once students complete assessments, rankings and achievements will appear here.</p>
                </div>
            ) : (
                <>
                    {/* Top Performers Podium */}
                    {topThree.length > 0 && (
                        <div className="podium-container">
                            {topThree[1] && (
                                <div className="podium-card rank-2">
                                    <div className="podium-medal"><Medal size={28} color="#94a3b8" /></div>
                                    <Avatar src={topThree[1].profileImage} name={topThree[1].name} size={80} className="podium-avatar" />
                                    <span className="podium-name">{topThree[1].name}</span>
                                    <span className="podium-score">{topThree[1].averageScore}%</span>
                                    {topThree[1].badge && <span className="podium-badge">{topThree[1].badge}</span>}
                                </div>
                            )}
                            {topThree[0] && (
                                <div className="podium-card rank-1">
                                    <div className="podium-medal"><Medal size={28} color="#fbbf24" /></div>
                                    <Avatar src={topThree[0].profileImage} name={topThree[0].name} size={80} className="podium-avatar" />
                                    <span className="podium-name">{topThree[0].name}</span>
                                    <span className="podium-score">{topThree[0].averageScore}%</span>
                                    {topThree[0].badge && <span className="podium-badge">{topThree[0].badge}</span>}
                                </div>
                            )}
                            {topThree[2] && (
                                <div className="podium-card rank-3">
                                    <div className="podium-medal"><Medal size={28} color="#b45309" /></div>
                                    <Avatar src={topThree[2].profileImage} name={topThree[2].name} size={80} className="podium-avatar" />
                                    <span className="podium-name">{topThree[2].name}</span>
                                    <span className="podium-score">{topThree[2].averageScore}%</span>
                                    {topThree[2].badge && <span className="podium-badge">{topThree[2].badge}</span>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Insights Section */}
                    {insights && (
                        <div className="insights-grid">
                            <div className="insight-card">
                                <span className="insight-label">Class Average</span>
                                <span className="insight-value">{insights.classAverage}%</span>
                            </div>
                            <div className="insight-card">
                                <span className="insight-label">Highest Score</span>
                                <span className="insight-value">{insights.highestAverage}%</span>
                            </div>
                            <div className="insight-card">
                                <span className="insight-label">Pass Rate</span>
                                <span className="insight-value">{insights.passRate}%</span>
                            </div>
                            <div className="insight-card">
                                <span className="insight-label">Highest Accuracy</span>
                                <span className="insight-value">{insights.highestAccuracy}%</span>
                            </div>
                            <div className="insight-card">
                                <span className="insight-label">Fastest Average</span>
                                <span className="insight-value">{insights.fastestAverageCompletionTime}</span>
                            </div>
                        </div>
                    )}

                    {/* Leaderboard Table */}
                    <div className="leaderboard-table-container">
                        <div className="leaderboard-toolbar">
                            <input 
                                type="text" 
                                className="form-input leaderboard-search" 
                                placeholder="Search student by name or email..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <div className="leaderboard-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>Export CSV</button>
                            </div>
                        </div>
                        <div className="leaderboard-table-responsive">
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th className="rank-cell">Rank</th>
                                        <th>Student</th>
                                        <th>Score</th>
                                        <th>Accuracy</th>
                                        <th>Completed</th>
                                        <th>Total Points</th>
                                        <th>Trend</th>
                                        <th>Badge</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr key={student.studentId}>
                                            <td className="rank-cell">#{student.rank}</td>
                                            <td>
                                                <div className="student-cell">
                                                    <Avatar src={student.profileImage} name={student.name} size={40} className="student-avatar" />
                                                    <div className="student-info">
                                                        <span className="student-name">{student.name}</span>
                                                        <span className="student-email">{student.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="score-cell">{student.averageScore}%</td>
                                            <td>{student.accuracy}%</td>
                                            <td>{student.assessmentsCompleted}</td>
                                            <td>{student.totalPoints}</td>
                                            <td className="trend-cell">
                                                {student.trend > 0 ? (
                                                    <span className="trend-up" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={16} /> +{student.trend}%</span>
                                                ) : student.trend < 0 ? (
                                                    <span className="trend-down" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={16} /> {student.trend}%</span>
                                                ) : (
                                                    <span className="trend-stable" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Minus size={16} /> 0%</span>
                                                )}
                                            </td>
                                            <td>
                                                {student.badge && <span className="achievement-badge">{student.badge}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                                No students matched your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TeacherLeaderboard;
