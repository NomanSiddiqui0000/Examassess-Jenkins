import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AssessmentAttempt } from '../models/AssessmentAttempt';
import { TeacherAssessment } from '../models/TeacherAssessment';
import { ClassroomStudent } from '../models/ClassroomStudent';
import { User } from '../models/User';

export const getClassroomLeaderboard = async (req: Request, res: Response) => {
    try {
        const { id: classroomId } = req.params;
        const timeFilter = req.query.timeFilter as string || 'overall';
        
        if (!mongoose.Types.ObjectId.isValid(classroomId)) {
            return res.status(400).json({ message: 'Invalid classroom ID' });
        }

        // Determine date filters
        const now = new Date();
        let currentPeriodFilter: any = {};
        let previousPeriodFilter: any = {};
        
        if (timeFilter === 'weekly') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            currentPeriodFilter = { submittedAt: { $gte: lastWeek } };
            previousPeriodFilter = { submittedAt: { $gte: twoWeeksAgo, $lt: lastWeek } };
        } else if (timeFilter === 'monthly') {
            const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            currentPeriodFilter = { submittedAt: { $gte: lastMonth } };
            previousPeriodFilter = { submittedAt: { $gte: twoMonthsAgo, $lt: lastMonth } };
        }

        // Fetch current period attempts
        const currentMatchStage = {
            classroomId: new mongoose.Types.ObjectId(classroomId),
            status: { $in: ['submitted', 'auto_submitted'] },
            ...currentPeriodFilter
        };

        const currentAttempts = await AssessmentAttempt.find(currentMatchStage)
            .populate('studentId', 'fullName username email profileImage')
            .lean();

        // Fetch previous period attempts (only if not 'overall' for trend)
        let previousAttempts: any[] = [];
        if (timeFilter !== 'overall') {
            const previousMatchStage = {
                classroomId: new mongoose.Types.ObjectId(classroomId),
                status: { $in: ['submitted', 'auto_submitted'] },
                ...previousPeriodFilter
            };
            previousAttempts = await AssessmentAttempt.find(previousMatchStage).lean();
        }

        // Aggregate by student
        const studentStatsMap = new Map<string, any>();
        
        currentAttempts.forEach(attempt => {
            if (!attempt.studentId) return;
            const studentIdStr = (attempt.studentId as any)._id.toString();
            
            if (!studentStatsMap.has(studentIdStr)) {
                studentStatsMap.set(studentIdStr, {
                    studentId: studentIdStr,
                    name: (attempt.studentId as any).fullName || (attempt.studentId as any).username,
                    email: (attempt.studentId as any).email,
                    profileImage: (attempt.studentId as any).profileImage,
                    totalPercentage: 0,
                    assessmentsCompleted: 0,
                    totalPoints: 0,
                    totalMarks: 0,
                    passedCount: 0,
                    lastActivity: attempt.submittedAt,
                    scores: [],
                    timeTakenTotal: 0
                });
            }
            
            const stats = studentStatsMap.get(studentIdStr);
            stats.totalPercentage += attempt.percentage || 0;
            stats.assessmentsCompleted += 1;
            stats.totalPoints += attempt.score || 0;
            stats.totalMarks += attempt.totalMarks || 0;
            if (attempt.passed) stats.passedCount += 1;
            stats.scores.push(attempt.percentage || 0);
            stats.timeTakenTotal += attempt.timeTaken || 0;
            
            if (attempt.submittedAt && (!stats.lastActivity || new Date(attempt.submittedAt) > new Date(stats.lastActivity))) {
                stats.lastActivity = attempt.submittedAt;
            }
        });

        // Compute trends
        const previousStudentScores = new Map<string, number[]>();
        previousAttempts.forEach(attempt => {
            if (!attempt.studentId) return;
            const sid = attempt.studentId.toString();
            if (!previousStudentScores.has(sid)) previousStudentScores.set(sid, []);
            previousStudentScores.get(sid)!.push(attempt.percentage || 0);
        });

        let studentsList = Array.from(studentStatsMap.values()).map(stats => {
            const avgScore = stats.assessmentsCompleted > 0 ? stats.totalPercentage / stats.assessmentsCompleted : 0;
            const accuracy = stats.totalMarks > 0 ? (stats.totalPoints / stats.totalMarks) * 100 : 0;
            const passRate = stats.assessmentsCompleted > 0 ? (stats.passedCount / stats.assessmentsCompleted) * 100 : 0;
            const averageTime = stats.assessmentsCompleted > 0 ? stats.timeTakenTotal / stats.assessmentsCompleted : 0;

            let trend = 0;
            if (timeFilter !== 'overall') {
                const prevScores = previousStudentScores.get(stats.studentId) || [];
                const prevAvg = prevScores.length > 0 ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length : 0;
                if (prevScores.length === 0) {
                    trend = avgScore > 0 ? 100 : 0; 
                } else {
                    trend = avgScore - prevAvg;
                }
            } else {
                // If overall, compare latest attempt to all previous attempts
                if (stats.scores.length > 1) {
                    const latest = stats.scores[stats.scores.length - 1];
                    const prevScores = stats.scores.slice(0, -1);
                    const prevAvg = prevScores.reduce((a:number, b:number) => a + b, 0) / prevScores.length;
                    trend = latest - prevAvg;
                }
            }

            return {
                ...stats,
                averageScore: Math.round(avgScore * 10) / 10,
                accuracy: Math.round(accuracy * 10) / 10,
                passRate: Math.round(passRate * 10) / 10,
                averageTime,
                trend: Math.round(trend * 10) / 10,
                badge: ''
            };
        });

        // Sort students: Primary: Average Score, Then Accuracy, Then Assessments Completed
        studentsList.sort((a, b) => {
            if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            if (b.assessmentsCompleted !== a.assessmentsCompleted) return b.assessmentsCompleted - a.assessmentsCompleted;
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

        // Assign Rank and Badges
        let highestScore = 0;
        let mostActiveId = '';
        let mostActiveCount = 0;
        let fastestAverageTimeId = '';
        let fastestAverageTime = Infinity;
        let highestAccuracyId = '';
        let highestAccuracy = 0;

        let totalClassScore = 0;
        let totalClassPass = 0;
        let totalClassTime = 0;

        let rank = 1;
        studentsList = studentsList.map((s, index) => {
            s.rank = rank++;
            
            totalClassScore += s.averageScore;
            totalClassPass += s.passRate;
            totalClassTime += s.averageTime;

            if (s.averageScore > highestScore) highestScore = s.averageScore;
            
            if (s.assessmentsCompleted > mostActiveCount) {
                mostActiveCount = s.assessmentsCompleted;
                mostActiveId = s.studentId;
            }
            if (s.averageTime > 0 && s.averageTime < fastestAverageTime) {
                fastestAverageTime = s.averageTime;
                fastestAverageTimeId = s.studentId;
            }
            if (s.accuracy > highestAccuracy) {
                highestAccuracy = s.accuracy;
                highestAccuracyId = s.studentId;
            }

            return s;
        });

        // Dynamic Badge Assignment
        studentsList = studentsList.map(s => {
            let badge = '';
            if (s.rank === 1 && studentsList.length > 0) badge = 'Top Performer';
            else if (s.studentId === highestAccuracyId && s.accuracy === 100) badge = 'Perfect Accuracy';
            else if (s.studentId === mostActiveId && s.assessmentsCompleted > 2) badge = 'Most Active';
            else if (s.averageScore >= 90) badge = 'Consistent Learner';
            else if (s.studentId === fastestAverageTimeId && s.assessmentsCompleted > 0) badge = 'Fast Solver';
            else if (s.trend > 15) badge = 'High Improvement';
            
            s.badge = badge;
            return s;
        });

        // Compile Insights
        const totalStudents = studentsList.length;
        const classAverage = totalStudents > 0 ? totalClassScore / totalStudents : 0;
        const passRate = totalStudents > 0 ? totalClassPass / totalStudents : 0;
        const averageCompletionTime = totalStudents > 0 ? totalClassTime / totalStudents : 0;
        
        const mostActiveStudentName = studentsList.find(s => s.studentId === mostActiveId)?.name || '-';
        const fastestStudentName = studentsList.find(s => s.studentId === fastestAverageTimeId)?.name || '-';

        const insights = {
            classAverage: Math.round(classAverage * 10) / 10,
            highestAverage: Math.round(highestScore * 10) / 10,
            passRate: Math.round(passRate * 10) / 10,
            mostActiveStudent: mostActiveStudentName,
            mostAssessmentsCompleted: mostActiveCount,
            fastestAverageCompletionTime: fastestAverageTime === Infinity ? '-' : `${Math.floor(fastestAverageTime / 60)}m ${Math.floor(fastestAverageTime % 60)}s`,
            highestAccuracy: Math.round(highestAccuracy * 10) / 10,
            averageCompletionTime: `${Math.floor(averageCompletionTime / 60)}m ${Math.floor(averageCompletionTime % 60)}s`
        };

        res.json({
            students: studentsList,
            insights
        });

    } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Failed to fetch leaderboard data', error: err.message });
    }
};
