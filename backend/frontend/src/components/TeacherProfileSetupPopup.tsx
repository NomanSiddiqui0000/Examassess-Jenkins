import React, { useEffect, useState } from 'react';
import api from '../utils/api';

interface TeacherProfileSetupPopupProps {
    onComplete: () => void;
}

const TeacherProfileSetupPopup: React.FC<TeacherProfileSetupPopupProps> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasPrompted = sessionStorage.getItem('profileSetupPrompted') === 'true' || sessionStorage.getItem('skipProfilePopup') === 'true';
        if (hasPrompted) return;

        api.get('/teacher/profile').then((res) => {
            const profile = res.data.profile;
            if (!profile) return;
            const isComplete = Boolean(
                profile.professionalTitle &&
                profile.organization &&
                (profile.subjects && Array.isArray(profile.subjects) && profile.subjects.length > 0) &&
                profile.bio &&
                profile.profileImage
            );
            if (!isComplete) {
                setIsVisible(true);
            }
        }).catch(console.error);
    }, []);

    const handleSkip = () => {
        sessionStorage.setItem('profileSetupPrompted', 'true');
        sessionStorage.setItem('skipProfilePopup', 'true');
        setIsVisible(false);
    };

    const handleComplete = () => {
        sessionStorage.setItem('profileSetupPrompted', 'true');
        sessionStorage.setItem('skipProfilePopup', 'true');
        setIsVisible(false);
        onComplete();
    };

    if (!isVisible) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', overflow: 'hidden', padding: 0 }}>
                <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--color-primary, #0D2F69), var(--color-accent, #3b82f6))' }} />
                <div style={{ padding: '36px 32px 32px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        background: 'var(--color-surface-2, #f8fafc)',
                        color: 'var(--color-primary, #0D2F69)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        boxShadow: '0 4px 12px rgba(13, 47, 105, 0.06)'
                    }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '28px', height: '28px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: 'var(--color-text-primary, #0f172a)', fontFamily: "'Outfit', sans-serif" }}>
                        Complete your instructor profile
                    </h2>
                    
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary, #64748b)', marginBottom: '28px', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto 28px' }}>
                        Adding your title, organization, and photo helps students recognize you and builds trust in your assessments. You can update it anytime from <strong>My Profile</strong>.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleSkip} style={{ minWidth: '130px', padding: '10px 20px' }}>
                            Skip for now
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleComplete} style={{ minWidth: '160px', padding: '10px 20px' }}>
                            Complete Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherProfileSetupPopup;
