import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserLayout from '../../components/Layout/UserLayout';
import './QuizResult.css';

interface ResultData {
    id: string;
    score: number;
    totalMarks: number;
    passed: boolean | string | number;
    timeTaken: number;
    correctAnswers: number;
    totalQuestions: number;
    passingMarks: number;
    percentage: number;
    submittedAt?: string | Date;
    subject?: string;
    teacher?: string;
    duration?: number;
    attemptNumber?: number;
    attemptCount?: number;
    hidden?: boolean;
}

const QuizResult: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result: ResultData = location.state?.result;
    const quizTitle: string = location.state?.quizTitle || 'Assessment Result';

    if (!result) {
        navigate('/user/dashboard');
        return null;
    }

    if (result.hidden) {
        return (
            <UserLayout>
                <div className="result-page-wrapper">
                    <div className="result-page-container" style={{ maxWidth: 600, marginTop: 40 }}>
                        <div className="result-section-panel" style={{ textAlign: 'center', padding: '40px 32px' }}>
                            <div className="result-status-pill pass" style={{ marginBottom: 20 }}>
                                <span>Assessment Submitted</span>
                            </div>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, margin: '0 0 12px 0', color: '#0f172a' }}>
                                Responses Successfully Recorded
                            </h2>
                            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: '0 0 28px 0' }}>
                                Thank you for completing the assessment. Your answers have been received and submitted for grading.
                            </p>
                            <button
                                type="button"
                                className="btn-result-primary"
                                onClick={() => navigate('/user/dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </UserLayout>
        );
    }

    // ── Derive values strictly from backend result ──
    const percentage = result.percentage ?? (
        result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0
    );
    const incorrectAnswers = Math.max(0, (result.totalQuestions ?? 0) - (result.correctAnswers ?? 0));

    // Robust pass/fail normalization to ensure UI always matches backend evaluation exactly
    const rawPassed = result.passed ?? (result as any).isPassed ?? (result as any).status;
    const passedStr = String(rawPassed ?? '').toLowerCase().trim();
    const isPassed = Boolean(
        rawPassed === true ||
        rawPassed === 1 ||
        passedStr === 'true' ||
        passedStr === '1' ||
        passedStr === 'pass' ||
        passedStr === 'passed' ||
        passedStr === 'success' ||
        passedStr.startsWith('pass')
    );

    // Dynamic attempt count: use provided number or display "Single Attempt" if unsupported/absent
    const attemptVal = result.attemptNumber ?? result.attemptCount ?? (result as any).submissionNumber;
    const attemptDisplay = (attemptVal !== undefined && attemptVal !== null && Number(attemptVal) > 0)
        ? `#${attemptVal}`
        : 'Single Attempt';

    const formatTime = (s: number) => {
        if (!s || s <= 0) return '0m 00s';
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}m ${String(sec).padStart(2, '0')}s`;
    };

    const formatDate = (dateVal?: string | Date) => {
        if (!dateVal) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        try {
            return new Date(dateVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'Recently';
        }
    };

    // Derive professional performance level from percentage
    const getPerformanceLevel = (pct: number) => {
        if (pct >= 90) return 'Excellent';
        if (pct >= 75) return 'Very Good';
        if (pct >= 60) return 'Good';
        return 'Needs Improvement';
    };

    return (
        <UserLayout>
            <div className="result-page-wrapper">
                <div className="result-page-container">

                    {/* 1. Hero Result Section (ExamAssess Primary Blue) */}
                    <header className="result-hero">
                        <div className="result-hero-left">
                            <span className="result-hero-subtitle">Assessment Completed</span>
                            <h1 className="result-hero-title">{quizTitle}</h1>
                            <div className="result-hero-meta">
                                <span>Completed on: <strong>{formatDate(result.submittedAt)}</strong></span>
                                <span>•</span>
                                <span>Total Questions: <strong>{result.totalQuestions ?? 0}</strong></span>
                            </div>
                        </div>
                        <div className="result-hero-right">
                            <div className="result-hero-score-badge">
                                <span className="result-hero-score-val">{percentage}%</span>
                                <span className="result-hero-score-lbl">Final Score</span>
                            </div>
                            <div className={`result-status-pill ${isPassed ? 'pass' : 'fail'}`}>
                                {isPassed ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                )}
                                <span>{isPassed ? 'PASSED' : 'FAILED'}</span>
                            </div>
                        </div>
                    </header>

                    {/* 2. Professional Score Display Panel */}
                    <section className="result-score-panel">
                        <div className="score-metric-box">
                            <span className="score-metric-lbl">Score Percentage</span>
                            <span className={`score-metric-val ${isPassed ? 'pass-text' : 'fail-text'}`}>{percentage}%</span>
                        </div>
                        <div className="score-metric-box">
                            <span className="score-metric-lbl">Marks Obtained</span>
                            <span className="score-metric-val">{result.score ?? 0} / {result.totalMarks ?? 0}</span>
                        </div>
                        <div className="score-metric-box">
                            <span className="score-metric-lbl">Performance Level</span>
                            <span className="score-metric-val" style={{ fontSize: 24 }}>{getPerformanceLevel(percentage)}</span>
                        </div>
                        <div className="score-metric-box">
                            <span className="score-metric-lbl">Status Badge</span>
                            <span className={`score-metric-val ${isPassed ? 'pass-text' : 'fail-text'}`} style={{ fontSize: 24 }}>
                                {isPassed ? 'Passed' : 'Failed'}
                            </span>
                        </div>
                    </section>

                    {/* 3. Performance Feedback Section (Neutral White Card) */}
                    <section className={`result-feedback-box ${isPassed ? 'pass' : 'fail'}`}>
                        <div className="feedback-content">
                            <h4>{isPassed ? 'Excellent Work!' : 'Keep Practicing'}</h4>
                            <p>
                                {isPassed
                                    ? 'You successfully passed this assessment. You have demonstrated strong comprehension of the subject matter. Keep maintaining this level of performance in your upcoming learning modules.'
                                    : 'You did not meet the required passing score for this assessment. We recommend reviewing the incorrect answers to identify knowledge gaps, studying the course material, and attempting again. Practice makes progress.'}
                            </p>
                        </div>
                    </section>

                    {/* 4. Professional Information Layout Grid */}
                    <section className="result-section-panel">
                        <div className="result-section-header">
                            <h3 className="result-section-title">Performance Metrics</h3>
                        </div>
                        <div className="result-metrics-grid">
                            <div className="result-metric-card">
                                <span className="result-metric-card-val">{result.score ?? 0} / {result.totalMarks ?? 0}</span>
                                <span className="result-metric-card-lbl">Marks Obtained</span>
                            </div>
                            <div className="result-metric-card">
                                <span className="result-metric-card-val">{result.passingMarks ?? 'N/A'}</span>
                                <span className="result-metric-card-lbl">Passing Threshold</span>
                            </div>
                            <div className="result-metric-card">
                                <span className="result-metric-card-val green">{result.correctAnswers ?? 0}</span>
                                <span className="result-metric-card-lbl">Correct Answers</span>
                            </div>
                            <div className="result-metric-card">
                                <span className="result-metric-card-val orange">{incorrectAnswers}</span>
                                <span className="result-metric-card-lbl">Incorrect Answers</span>
                            </div>
                            <div className="result-metric-card">
                                <span className="result-metric-card-val">{result.totalQuestions ?? 0}</span>
                                <span className="result-metric-card-lbl">Total Questions</span>
                            </div>
                            <div className="result-metric-card">
                                <span className="result-metric-card-val">{formatTime(result.timeTaken ?? 0)}</span>
                                <span className="result-metric-card-lbl">Time Taken</span>
                            </div>
                        </div>
                    </section>

                    {/* 5. Assessment Summary Panel */}
                    <section className="result-section-panel">
                        <div className="result-section-header">
                            <h3 className="result-section-title">Assessment Summary</h3>
                        </div>
                        <div className="result-summary-grid">
                            <div className="summary-row">
                                <span className="summary-row-lbl">Quiz Name</span>
                                <span className="summary-row-val">{quizTitle}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Subject / Category</span>
                                <span className="summary-row-val">{result.subject || (result as any).category || 'General Assessment'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Duration</span>
                                <span className="summary-row-val">{result.duration ? `${result.duration} mins` : formatTime(result.timeTaken ?? 0)}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Attempt Information</span>
                                <span className="summary-row-val">{attemptDisplay}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Completed At</span>
                                <span className="summary-row-val">{formatDate(result.submittedAt)}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Result Status</span>
                                <span className="summary-row-val" style={{ color: isPassed ? '#10b981' : '#F5820D', fontWeight: 700 }}>
                                    {isPassed ? 'Passed' : 'Failed'}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Passing Threshold</span>
                                <span className="summary-row-val">{result.passingMarks ?? 'N/A'}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-row-lbl">Completion Status</span>
                                <span className="summary-row-val">Completed & Graded</span>
                            </div>
                        </div>
                    </section>

                    {/* 6. Next Actions Bar */}
                    <section className="result-actions-bar">
                        <span className="actions-bar-info">
                            {isPassed ? 'You have completed this assessment requirement.' : 'You may review your responses or return to the dashboard.'}
                        </span>
                        <div className="actions-bar-buttons">
                            <button
                                type="button"
                                className="btn-result-secondary"
                                onClick={() => navigate('/user/results')}
                            >
                                View All Results
                            </button>
                            <button
                                type="button"
                                className="btn-result-secondary"
                                onClick={() => navigate('/user/dashboard')}
                            >
                                Back to Dashboard
                            </button>
                            {result.id && (
                                <button
                                    type="button"
                                    className="btn-result-primary"
                                    onClick={() => navigate(`/user/review/${result.id}`)}
                                >
                                    Review Answers
                                </button>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </UserLayout>
    );
};

export default QuizResult;
