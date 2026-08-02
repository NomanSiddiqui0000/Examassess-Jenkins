import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { User, NotificationPreferences, PrivacySettings } from '../../types';
import './TeacherAccountSettings.css';

interface TeacherAccountSettingsProps {
    onProfileUpdate?: () => void;
    userProfile?: User | null;
}

export const TeacherAccountSettings: React.FC<TeacherAccountSettingsProps> = ({ userProfile }) => {
    const [user, setUser] = useState<User | null>(userProfile || null);
    const [loading, setLoading] = useState(!userProfile);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast((current) => (current?.message === message ? null : current));
        }, 4000);
    };

    // Security Section State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Notification Preferences State
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
        emailOnStudentJoin: true,
        emailOnAssessmentEnd: true,
        emailOnAssessmentCreated: true,
    });
    const [savingNotification, setSavingNotification] = useState(false);

    // Privacy Settings State
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
        showProfileImage: true,
        showProfessionalTitle: true,
        showOrganization: true,
        showSubjects: true,
        showBio: true,
    });
    const [savingPrivacy, setSavingPrivacy] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/teacher/profile');
            const profileData = response.data?.profile || {};
            setUser(profileData);
            if (profileData.notificationPreferences) {
                setNotificationPrefs(profileData.notificationPreferences);
            }
            if (profileData.privacySettings) {
                setPrivacySettings(profileData.privacySettings);
            }
        } catch (error: any) {
            console.error('Failed to load settings:', error);
            showToast('Could not load account settings.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all password fields.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('New password must be at least 8 characters long.', 'error');
            return;
        }

        try {
            setChangingPassword(true);
            await api.post('/teacher/change-password', {
                currentPassword,
                newPassword,
            });
            showToast('Password updated successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            const errText = error.response?.data?.message || 'Failed to change password. Check your current password.';
            showToast(errText, 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleNotificationToggle = async (key: keyof NotificationPreferences) => {
        const updated = {
            ...notificationPrefs,
            [key]: !notificationPrefs[key],
        };
        setNotificationPrefs(updated);
        try {
            setSavingNotification(true);
            await api.put('/teacher/profile', {
                notificationPreferences: updated,
            });
            showToast('Notification preferences updated', 'success');
        } catch (error) {
            console.error('Failed to update notification preferences:', error);
            showToast('Failed to save notification preference', 'error');
            // Revert state on error
            setNotificationPrefs({ ...notificationPrefs });
        } finally {
            setSavingNotification(false);
        }
    };

    const handlePrivacyToggle = async (key: keyof PrivacySettings) => {
        const updated = {
            ...privacySettings,
            [key]: !privacySettings[key],
        };
        setPrivacySettings(updated);
        try {
            setSavingPrivacy(true);
            await api.put('/teacher/profile', {
                privacySettings: updated,
            });
            showToast('Privacy settings updated', 'success');
        } catch (error) {
            console.error('Failed to update privacy settings:', error);
            showToast('Failed to save privacy setting', 'error');
            // Revert state on error
            setPrivacySettings({ ...privacySettings });
        } finally {
            setSavingPrivacy(false);
        }
    };

    const getPasswordStrength = (pass: string): { level: 'weak' | 'medium' | 'strong'; text: string } => {
        if (pass.length === 0) return { level: 'weak', text: '' };
        if (pass.length < 8) return { level: 'weak', text: 'Weak (min 8 chars)' };
        const hasNumber = /\d/.test(pass);
        const hasUpper = /[A-Z]/.test(pass);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
        const score = (hasNumber ? 1 : 0) + (hasUpper ? 1 : 0) + (hasSpecial ? 1 : 0);
        if (pass.length >= 12 && score >= 2) return { level: 'strong', text: 'Strong' };
        if (pass.length >= 8 && score >= 1) return { level: 'medium', text: 'Medium' };
        return { level: 'weak', text: 'Weak' };
    };

    const strength = getPasswordStrength(newPassword);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    if (loading && !user) {
        return (
            <div className="account-settings-container" style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b' }}>Loading account settings...</p>
            </div>
        );
    }

    return (
        <div className="account-settings-container">
            {toast && (
                <div className={`settings-toast ${toast.type}`}>
                    <span className="settings-toast-icon">
                        {toast.type === 'success' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        )}
                    </span>
                    <span>{toast.message}</span>
                    <button type="button" className="settings-toast-close" onClick={() => setToast(null)} aria-label="Close notification">
                        &times;
                    </button>
                </div>
            )}
            <div className="account-settings-header">
                <h2 className="account-settings-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent, #FD6A01)' }}>
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    Account Settings
                </h2>
                <p className="account-settings-subtitle">
                    Manage your security, notifications, privacy, and account preferences for ExamAssess.
                </p>
            </div>

            {/* 1. Security Section */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <div className="settings-card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <div>
                        <h3>Security & Password</h3>
                        <p>Update your login credentials and maintain strong account security.</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordChange}>
                    <div className="settings-form-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <div className="settings-input-wrapper">
                            <input
                                id="currentPassword"
                                type={showCurrentPass ? 'text' : 'password'}
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowCurrentPass(!showCurrentPass)}
                                aria-label="Toggle password visibility"
                            >
                                {showCurrentPass ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="settings-form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <div className="settings-input-wrapper">
                            <input
                                id="newPassword"
                                type={showNewPass ? 'text' : 'password'}
                                placeholder="Enter new password (min. 8 characters)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowNewPass(!showNewPass)}
                                aria-label="Toggle password visibility"
                            >
                                {showNewPass ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                        {newPassword && (
                            <div className="password-strength-container">
                                <div className="password-strength-meter">
                                    <div className={`password-strength-fill ${strength.level}`} />
                                </div>
                                <span className={`password-strength-label ${strength.level}`}>
                                    Password strength: {strength.text}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="settings-form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div className="settings-input-wrapper">
                            <input
                                id="confirmPassword"
                                type={showConfirmPass ? 'text' : 'password'}
                                placeholder="Re-type new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                aria-label="Toggle password visibility"
                            >
                                {showConfirmPass ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                        {changingPassword ? 'Updating Password...' : 'Change Password'}
                    </button>
                </form>
            </div>

            {/* 2. Account Information Section */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <div className="settings-card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <div>
                        <h3>Account Information</h3>
                        <p>Core platform identifiers and verification status for your account.</p>
                    </div>
                </div>

                <div className="settings-info-grid">
                    <div className="settings-info-item">
                        <div className="settings-info-label">Registered Email</div>
                        <div className="settings-info-value">{user?.email || 'N/A'}</div>
                    </div>

                    <div className="settings-info-item">
                        <div className="settings-info-label">Account Type</div>
                        <div className="settings-info-value" style={{ textTransform: 'capitalize' }}>
                            {user?.role || 'Teacher'}
                        </div>
                    </div>

                    <div className="settings-info-item">
                        <div className="settings-info-label">Email Verification</div>
                        <div className="settings-info-value">
                            {user?.emailVerified ? (
                                <span className="status-badge verified">Verified</span>
                            ) : (
                                <span className="status-badge unverified">Pending</span>
                            )}
                        </div>
                    </div>

                    <div className="settings-info-item">
                        <div className="settings-info-label">Member Since</div>
                        <div className="settings-info-value">{formatDate(user?.memberSince)}</div>
                    </div>

                    <div className="settings-info-item">
                        <div className="settings-info-label">Last Profile Update</div>
                        <div className="settings-info-value">{formatDate(user?.lastProfileUpdate || user?.memberSince)}</div>
                    </div>
                </div>
            </div>

            {/* 3. Notification Preferences Section */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <div className="settings-card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                    </div>
                    <div>
                        <h3>Notification Preferences</h3>
                        <p>Choose when you want ExamAssess to notify you about platform activities.</p>
                    </div>
                </div>

                <div className="settings-toggle-list">
                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Student Joins Classroom</div>
                            <div className="settings-toggle-desc">
                                Receive an email notification whenever a new student successfully enrolls in any of your active classrooms.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={notificationPrefs.emailOnStudentJoin}
                                onChange={() => handleNotificationToggle('emailOnStudentJoin')}
                                disabled={savingNotification}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>

                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Assessment Created Successfully</div>
                            <div className="settings-toggle-desc">
                                Get an email confirmation containing summary details when you create or publish a new assessment.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={notificationPrefs.emailOnAssessmentCreated}
                                onChange={() => handleNotificationToggle('emailOnAssessmentCreated')}
                                disabled={savingNotification}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>

                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Assessment Window Ends</div>
                            <div className="settings-toggle-desc">
                                Be notified by email when a scheduled assessment window closes and student submissions are finalized.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={notificationPrefs.emailOnAssessmentEnd}
                                onChange={() => handleNotificationToggle('emailOnAssessmentEnd')}
                                disabled={savingNotification}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>
                </div>
            </div>

            {/* 4. Privacy & Visibility Section */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <div className="settings-card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div>
                        <h3>Privacy & Visibility</h3>
                        <p>Control what professional identity information students can see when taking your assessments.</p>
                    </div>
                </div>

                <div className="settings-toggle-list">
                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Show Profile Photo</div>
                            <div className="settings-toggle-desc">
                                Display your profile avatar on assessment introduction headers and classroom rosters.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={privacySettings.showProfileImage}
                                onChange={() => handlePrivacyToggle('showProfileImage')}
                                disabled={savingPrivacy}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>

                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Show Professional Title</div>
                            <div className="settings-toggle-desc">
                                Display your academic or professional title (e.g., Senior Lecturer, Professor) next to your name.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={privacySettings.showProfessionalTitle}
                                onChange={() => handlePrivacyToggle('showProfessionalTitle')}
                                disabled={savingPrivacy}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>

                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Show Organization</div>
                            <div className="settings-toggle-desc">
                                Show your university, school, or institute affiliation to enrolled students.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={privacySettings.showOrganization}
                                onChange={() => handlePrivacyToggle('showOrganization')}
                                disabled={savingPrivacy}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>

                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Show Subjects & Expertise</div>
                            <div className="settings-toggle-desc">
                                Allow students to see the teaching subjects listed on your public teacher profile.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={privacySettings.showSubjects}
                                onChange={() => handlePrivacyToggle('showSubjects')}
                                disabled={savingPrivacy}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>

                    <div className="settings-toggle-item">
                        <div className="settings-toggle-info">
                            <div className="settings-toggle-title">Show Biography</div>
                            <div className="settings-toggle-desc">
                                Make your short professional bio visible when students click to view teacher details.
                            </div>
                        </div>
                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={privacySettings.showBio}
                                onChange={() => handlePrivacyToggle('showBio')}
                                disabled={savingPrivacy}
                            />
                            <span className="settings-slider" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
