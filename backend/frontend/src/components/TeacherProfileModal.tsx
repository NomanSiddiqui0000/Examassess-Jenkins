import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { X, Users, BookOpen, ClipboardList, Calendar, MapPin, Briefcase } from 'lucide-react';
import './TeacherProfileModal.css';

interface TeacherProfileModalProps {
    teacherId: string;
    onClose: () => void;
}

interface TeacherProfile {
    profile: {
        fullName: string;
        profileImage?: string;
        professionalTitle?: string;
        organization?: string;
        subjects?: string;
        bio?: string;
        memberSince: string;
    };
    stats: {
        totalClassrooms: number;
        totalStudents: number;
        totalAssessments: number;
        totalQuestionsUploaded: number;
    };
}

const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({ teacherId, onClose }) => {
    const [data, setData] = useState<TeacherProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/user/teacher-profile/${teacherId}`)
            .then(res => setData(res.data))
            .catch(err => setError(err.response?.data?.message || 'Failed to load profile'))
            .finally(() => setLoading(false));
    }, [teacherId]);

    // parse subjects if they are comma separated
    const subjectsList = data?.profile?.subjects?.split(',').map(s => s.trim()).filter(Boolean) || [];

    // format joined date
    const joinedDate = data?.profile?.memberSince 
        ? new Date(data.profile.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Recently';

    return (
        <div className="modal-overlay profile-modal-overlay" onClick={onClose}>
            <div className="modal-content teacher-profile-modal" onClick={e => e.stopPropagation()}>
                <button className="profile-modal-close" onClick={onClose} aria-label="Close modal">
                    <X size={20} />
                </button>
                
                {loading ? (
                    <div className="profile-loading">
                        <div className="loading-spinner" />
                        <p>Loading profile...</p>
                    </div>
                ) : error ? (
                    <div className="profile-error">
                        <div className="auth-status-icon danger">
                            <X size={24} />
                        </div>
                        <p>{error}</p>
                    </div>
                ) : data && (
                    <div className="teacher-profile-wrapper">
                        <div className="profile-cover-banner"></div>
                        <div className="teacher-profile-details">
                            <div className="profile-header-premium">
                                <div className="profile-avatar-premium">
                                    {data.profile.profileImage ? (
                                        <img src={data.profile.profileImage} alt={data.profile.fullName} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {data.profile.fullName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-title-area">
                                    <h2>{data.profile.fullName}</h2>
                                    
                                    <div className="profile-badges-row">
                                        {data.profile.professionalTitle && (
                                            <span className="profile-info-badge">
                                                <Briefcase size={14} />
                                                {data.profile.professionalTitle}
                                            </span>
                                        )}
                                        {data.profile.organization && (
                                            <span className="profile-info-badge">
                                                <MapPin size={14} />
                                                {data.profile.organization}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="profile-body-content">
                                {data.profile.bio && (
                                    <div className="profile-section">
                                        <h3>About the Instructor</h3>
                                        <p>{data.profile.bio}</p>
                                    </div>
                                )}

                                {subjectsList.length > 0 && (
                                    <div className="profile-section">
                                        <h3>Expertise & Subjects</h3>
                                        <div className="subjects-tags">
                                            {subjectsList.map((subject, idx) => (
                                                <span key={idx} className="subject-pill">{subject}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="profile-stats-grid-premium">
                                    <div className="stat-card">
                                        <div className="stat-icon-wrapper classrooms"><BookOpen size={20} /></div>
                                        <div className="stat-info">
                                            <div className="stat-value">{data.stats.totalClassrooms}</div>
                                            <div className="stat-label">Classrooms</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon-wrapper students"><Users size={20} /></div>
                                        <div className="stat-info">
                                            <div className="stat-value">{data.stats.totalStudents}</div>
                                            <div className="stat-label">Students</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon-wrapper assessments"><ClipboardList size={20} /></div>
                                        <div className="stat-info">
                                            <div className="stat-value">{data.stats.totalAssessments}</div>
                                            <div className="stat-label">Assessments</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon-wrapper joined"><Calendar size={20} /></div>
                                        <div className="stat-info">
                                            <div className="stat-value">{joinedDate}</div>
                                            <div className="stat-label">Joined</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherProfileModal;
