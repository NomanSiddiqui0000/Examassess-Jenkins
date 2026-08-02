import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { User } from '../models/User';
import { TeacherClassroom } from '../models/TeacherClassroom';
import { TeacherAssessment } from '../models/TeacherAssessment';
import { TeacherQuestion } from '../models/TeacherQuestion';
import { ClassroomStudent } from '../models/ClassroomStudent';
import sharp from 'sharp';
import mongoose from 'mongoose';

export function filterTeacherPrivacy(teacher: any) {
    if (!teacher) return teacher;
    const privacy = teacher.privacySettings || {
        showProfileImage: true,
        showProfessionalTitle: true,
        showOrganization: true,
        showSubjects: true,
        showBio: true,
    };
    return {
        ...teacher,
        profileImage: privacy.showProfileImage ? teacher.profileImage : undefined,
        professionalTitle: privacy.showProfessionalTitle ? teacher.professionalTitle : undefined,
        organization: privacy.showOrganization ? teacher.organization : undefined,
        subjects: privacy.showSubjects ? teacher.subjects : undefined,
        bio: privacy.showBio ? teacher.bio : undefined,
    };
}

const imagesDir = path.resolve(__dirname, '../../teacher-profiles');
fs.mkdir(imagesDir, { recursive: true }).catch(console.error);

export const getTeacherProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [classrooms, assessments, questions] = await Promise.all([
            TeacherClassroom.countDocuments({ teacherId: userId }),
            TeacherAssessment.countDocuments({ teacherId: userId }),
            TeacherQuestion.countDocuments({ teacherId: userId })
        ]);

        const enrollments = await ClassroomStudent.find({ teacherId: userId });
        const studentSet = new Set<string>();
        enrollments.forEach(e => {
            studentSet.add(e.studentId?.toString() || e.invitedEmail);
        });
        const totalStudents = studentSet.size;

        res.json({
            profile: {
                profileImage: user.profileImage,
                professionalTitle: user.professionalTitle,
                organization: user.organization,
                subjects: user.subjects,
                bio: user.bio,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
                notificationPreferences: user.notificationPreferences || {
                    emailOnStudentJoin: true,
                    emailOnAssessmentEnd: true,
                    emailOnAssessmentCreated: true,
                },
                privacySettings: user.privacySettings || {
                    showProfileImage: true,
                    showProfessionalTitle: true,
                    showOrganization: true,
                    showSubjects: true,
                    showBio: true,
                },
                memberSince: user.createdAt,
                lastProfileUpdate: user.updatedAt,
            },
            stats: {
                totalClassrooms: classrooms,
                totalStudents: totalStudents,
                totalAssessments: assessments,
                totalQuestionsUploaded: questions
            }
        });
    } catch (error) {
        console.error('Error fetching teacher profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateTeacherProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { professionalTitle, organization, subjects, bio, notificationPreferences, privacySettings } = req.body;

        const updateData: any = {};
        if (professionalTitle !== undefined) updateData.professionalTitle = professionalTitle;
        if (organization !== undefined) updateData.organization = organization;
        if (subjects !== undefined) updateData.subjects = subjects;
        if (bio !== undefined) updateData.bio = bio;

        if (notificationPreferences && typeof notificationPreferences === 'object') {
            if (notificationPreferences.emailOnStudentJoin !== undefined) updateData['notificationPreferences.emailOnStudentJoin'] = Boolean(notificationPreferences.emailOnStudentJoin);
            if (notificationPreferences.emailOnAssessmentEnd !== undefined) updateData['notificationPreferences.emailOnAssessmentEnd'] = Boolean(notificationPreferences.emailOnAssessmentEnd);
            if (notificationPreferences.emailOnAssessmentCreated !== undefined) updateData['notificationPreferences.emailOnAssessmentCreated'] = Boolean(notificationPreferences.emailOnAssessmentCreated);
        }
        if (privacySettings && typeof privacySettings === 'object') {
            if (privacySettings.showProfileImage !== undefined) updateData['privacySettings.showProfileImage'] = Boolean(privacySettings.showProfileImage);
            if (privacySettings.showProfessionalTitle !== undefined) updateData['privacySettings.showProfessionalTitle'] = Boolean(privacySettings.showProfessionalTitle);
            if (privacySettings.showOrganization !== undefined) updateData['privacySettings.showOrganization'] = Boolean(privacySettings.showOrganization);
            if (privacySettings.showSubjects !== undefined) updateData['privacySettings.showSubjects'] = Boolean(privacySettings.showSubjects);
            if (privacySettings.showBio !== undefined) updateData['privacySettings.showBio'] = Boolean(privacySettings.showBio);
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ message: 'Profile updated successfully', profile: user });
    } catch (error) {
        console.error('Error updating teacher profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const uploadProfileImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'No image uploaded' });
        }

        const userModel = await User.findById(userId);

        if (userModel && userModel.profileImage) {
            const oldFilename = path.basename(userModel.profileImage);
            const oldFilepath = path.join(imagesDir, oldFilename);
            try {
                await fs.unlink(oldFilepath);
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    console.error('Failed to delete old image file:', err);
                }
            }
        }

        const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
        const filepath = path.join(imagesDir, filename);

        await sharp(req.file.buffer)
            .resize({ width: 600, height: 600, fit: 'cover' })
            .webp({ quality: 85, effort: 6 })
            .toFile(filepath);

        const relativePath = `/teacher-profiles/${filename}`;

        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage: relativePath },
            { new: true }
        );

        res.json({ message: 'Profile image updated', profileImage: relativePath });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const removeProfileImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId);

        if (user && user.profileImage) {
            const filename = path.basename(user.profileImage);
            const filepath = path.join(imagesDir, filename);

            try {
                await fs.unlink(filepath);
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    console.error('Failed to delete image file:', err);
                }
            }

            user.profileImage = undefined;
            await user.save();
        }

        res.json({ message: 'Profile image removed' });
    } catch (error) {
        console.error('Error removing profile image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getPublicTeacherProfile = async (req: Request, res: Response) => {
    try {
        const teacherId = req.params.teacherId;

        if (!mongoose.Types.ObjectId.isValid(teacherId)) {
            return res.status(400).json({ message: 'Invalid teacher ID' });
        }

        const user = await User.findById(teacherId).select('fullName profileImage professionalTitle organization subjects bio createdAt privacySettings').lean();

        if (!user) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const [classrooms, assessments, questions] = await Promise.all([
            TeacherClassroom.countDocuments({ teacherId }),
            TeacherAssessment.countDocuments({ teacherId }),
            TeacherQuestion.countDocuments({ teacherId })
        ]);

        const enrollments = await ClassroomStudent.find({ teacherId });
        const studentSet = new Set<string>();
        enrollments.forEach(e => {
            studentSet.add(e.studentId?.toString() || e.invitedEmail);
        });
        const totalStudents = studentSet.size;

        const filteredTeacher = filterTeacherPrivacy(user);

        res.json({
            profile: {
                fullName: filteredTeacher.fullName,
                profileImage: filteredTeacher.profileImage,
                professionalTitle: filteredTeacher.professionalTitle,
                organization: filteredTeacher.organization,
                subjects: filteredTeacher.subjects,
                bio: filteredTeacher.bio,
                memberSince: user.createdAt,
            },
            stats: {
                totalClassrooms: classrooms,
                totalStudents: totalStudents,
                totalAssessments: assessments,
                totalQuestionsUploaded: questions
            }
        });
    } catch (error) {
        console.error('Error fetching public teacher profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
