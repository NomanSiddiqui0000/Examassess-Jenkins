import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import './TeacherProfileSection.css';

interface TeacherProfileSectionProps {
    onProfileUpdate?: () => void;
}

interface ProfileData {
    profile: {
        fullName: string;
        email: string;
        role: string;
        professionalTitle?: string;
        organization?: string;
        subjects?: string;
        bio?: string;
        profileImage?: string;
        memberSince?: string;
        emailVerified?: boolean;
    };
    stats: {
        totalClassrooms: number;
        totalAssessments: number;
    };
}

export const TeacherProfileSection: React.FC<TeacherProfileSectionProps> = ({ onProfileUpdate }) => {
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form states
    const [form, setForm] = useState({
        professionalTitle: '',
        organization: '',
        subjects: '',
        bio: '',
    });

    // Image Upload & Crop Modal states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string>('');
    const [zoom, setZoom] = useState<number>(1);
    const [rotate, setRotate] = useState<number>(0);
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [uploading, setUploading] = useState(false);
    const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast((current) => (current?.message === message ? null : current));
        }, 4000);
    };

    const loadProfile = async (showLoadingSpinner = true) => {
        if (showLoadingSpinner) setLoading(true);
        setError('');
        try {
            const res = await api.get('/teacher/profile');
            setData(res.data);
            const prof = res.data.profile;
            setForm({
                professionalTitle: prof.professionalTitle || '',
                organization: prof.organization || '',
                subjects: prof.subjects || '',
                bio: prof.bio || '',
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load profile.');
        } finally {
            if (showLoadingSpinner) setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const calculateCompletion = () => {
        if (!data) return 0;
        const fields = [
            data.profile.fullName,
            data.profile.email,
            form.professionalTitle,
            form.organization,
            form.subjects,
            form.bio,
            data.profile.profileImage
        ];
        const completed = fields.filter(val => val && val.toString().trim().length > 0).length;
        return Math.round((completed / fields.length) * 100);
    };

    const handleResetForm = () => {
        if (!data) return;
        const prof = data.profile;
        setForm({
            professionalTitle: prof.professionalTitle || '',
            organization: prof.organization || '',
            subjects: prof.subjects || '',
            bio: prof.bio || '',
        });
        showToast('Form reset to saved values.', 'success');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.put('/teacher/profile', form);
            showToast('Profile updated successfully.', 'success');
            loadProfile(false);
            onProfileUpdate?.();
        } catch (err: any) {
            const errMsg = err.response?.data?.message || 'Failed to update profile.';
            setError(errMsg);
            showToast(errMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setCropImageSrc(reader.result);
                setZoom(1);
                setRotate(0);
                setOffset({ x: 0, y: 0 });
                setShowCropModal(true);
            }
        };
        reader.readAsDataURL(file);
        // Reset file input value so same file can be re-selected if needed
        e.target.value = '';
    };

    const getCroppedImgBlob = (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const image = new Image();
            image.src = cropImageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 400; // High quality 400x400 output
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);

                ctx.save();
                ctx.translate(size / 2, size / 2);
                ctx.rotate((rotate * Math.PI) / 180);
                ctx.scale(zoom, zoom);
                // Scale offset relative to 400px output size vs 280px preview
                ctx.translate(offset.x * (size / 280), offset.y * (size / 280));

                const aspect = image.width / image.height;
                let drawW = size;
                let drawH = size;
                if (aspect > 1) {
                    drawH = size / aspect;
                } else {
                    drawW = size * aspect;
                }
                ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/webp', 0.85);
            };
            image.onerror = () => resolve(null);
        });
    };

    const handleApplyCropAndUpload = async () => {
        setUploading(true);
        try {
            const blob = await getCroppedImgBlob();
            if (!blob) {
                showToast('Failed to process cropped image.', 'error');
                return;
            }
            const file = new File([blob], `profile_${Date.now()}.webp`, { type: blob.type || 'image/webp' });
            const formData = new FormData();
            formData.append('file', file);

            await api.post('/teacher/profile/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowCropModal(false);
            showToast('Profile image updated successfully.', 'success');
            loadProfile(false);
            onProfileUpdate?.();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to upload image.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImageClick = () => {
        setShowRemoveConfirmModal(true);
    };

    const handleConfirmRemoveImage = async () => {
        setShowRemoveConfirmModal(false);
        try {
            await api.delete('/teacher/profile/image');
            if (data) {
                setData((prev: any) => prev ? {
                    ...prev,
                    profile: {
                        ...prev.profile,
                        profileImage: undefined
                    }
                } : prev);
            }
            showToast('Profile image removed successfully.', 'success');
            loadProfile(false);
            onProfileUpdate?.();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to remove image.', 'error');
        }
    };

    // Canvas panning logic for Crop modal
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (!showCropModal || !cropImageSrc) return;
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = cropImageSrc;
        img.onload = () => {
            const size = 280;
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, size, size);

            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.rotate((rotate * Math.PI) / 180);
            ctx.scale(zoom, zoom);
            ctx.translate(offset.x, offset.y);

            const aspect = img.width / img.height;
            let drawW = size;
            let drawH = size;
            if (aspect > 1) {
                drawH = size / aspect;
            } else {
                drawW = size * aspect;
            }
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
        };
    }, [showCropModal, cropImageSrc, zoom, rotate, offset]);

    if (loading) return <div className="loading-spinner" style={{ margin: '60px auto' }} />;
    if (error && !data) return <div className="error-message">{error}</div>;
    if (!data) return null;

    const completionPercent = calculateCompletion();
    const subjectsList = data.profile.subjects ? data.profile.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];

    return (
        <div className="teacher-profile-section">
            {/* Floating Toast Notification */}
            {toast && (
                <div className={`profile-toast profile-toast-${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === 'success' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        )}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            )}

            {/* Page Header */}
            <div className="profile-page-header">
                <h2>Profile</h2>
            </div>

            <div className="profile-workspace-grid">
                {/* Left Column: Profile Card & Identity */}
                <div className="profile-sidebar-column">
                    <div className="profile-card profile-identity-card">
                        <div className="profile-image-wrapper">
                            {data.profile.profileImage ? (
                                <img src={data.profile.profileImage} alt={data.profile.fullName} />
                            ) : (
                                <div className="profile-image-fallback">
                                    {data.profile.fullName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="profile-photo-actions">
                            <button type="button" className="btn-photo-change" onClick={() => fileInputRef.current?.click()}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                Change Photo
                            </button>
                            {data.profile.profileImage && (
                                <button type="button" className="btn-photo-remove" onClick={handleRemoveImageClick} title="Remove photo" aria-label="Remove photo">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    Remove Photo
                                </button>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                        </div>

                        <div className="profile-identity-details">
                            <div className="identity-name-row">
                                <h3 className="identity-name">{data.profile.fullName}</h3>
                                {data.profile.emailVerified && (
                                    <span className="identity-verified-badge" title="Verified Instructor" aria-label="Verified Instructor">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </span>
                                )}
                            </div>
                            {data.profile.professionalTitle && (
                                <div className="identity-title">{data.profile.professionalTitle}</div>
                            )}
                            {data.profile.organization && (
                                <div className="identity-org">{data.profile.organization}</div>
                            )}
                            {!data.profile.professionalTitle && !data.profile.organization && (
                                <div className="identity-placeholder">Add your professional details</div>
                            )}

                            {subjectsList.length > 0 && (
                                <div className="identity-subjects">
                                    {subjectsList.map((sub, idx) => (
                                        <React.Fragment key={idx}>
                                            <span className="subject-item">{sub}</span>
                                            {idx < subjectsList.length - 1 && <span className="subject-dot">•</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}

                            {data.profile.bio && (
                                <div className="identity-bio-section">
                                    <div className="bio-heading">About</div>
                                    <p>{data.profile.bio}</p>
                                </div>
                            )}

                            <div className="identity-meta-list">
                                <div className="meta-row">
                                    <span className="meta-label">Member Since</span>
                                    <span className="meta-value">{new Date(data.profile.memberSince || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">Last Updated</span>
                                    <span className="meta-value">Today</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Completion Indicator */}
                    <div className="profile-card completion-card-clean">
                        <div className="completion-top">
                            <span className="completion-title">Profile Completion</span>
                            <span className="completion-score">{completionPercent}%</span>
                        </div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${completionPercent}%` }} />
                        </div>
                        <p className="completion-description">
                            {completionPercent === 100
                                ? 'Your profile is ready.'
                                : 'Complete your profile information.'}
                        </p>
                    </div>
                </div>

                {/* Right Column: Editable Account & Professional Information */}
                <div className="profile-main-column">
                    <div className="profile-card settings-form-card">
                        <div className="settings-card-header">
                            <h3>Profile</h3>
                        </div>

                        <form onSubmit={handleSave} className="settings-form">
                            {/* Section 1: Account Information */}
                            <div className="form-section">
                                <div className="form-section-header">
                                    <h4>Account Information</h4>
                                </div>
                                <div className="form-grid-2">
                                    <div className="form-field">
                                        <label htmlFor="fullName">Full Name</label>
                                        <input id="fullName" type="text" className="input-clean input-disabled" value={data.profile.fullName} disabled />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="emailAddress">Email Address</label>
                                        <input id="emailAddress" type="text" className="input-clean input-disabled" value={data.profile.email} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="section-divider" />

                            {/* Section 2: Professional Information */}
                            <div className="form-section">
                                <div className="form-section-header">
                                    <h4>Professional Information</h4>
                                </div>
                                <div className="form-stack">
                                    <div className="form-field">
                                        <label htmlFor="professionalTitle">Professional Title</label>
                                        <input
                                            id="professionalTitle"
                                            type="text"
                                            className="input-clean"
                                            name="professionalTitle"
                                            value={form.professionalTitle}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Senior Mathematics & Physics Instructor"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="organization">Institution / Organization</label>
                                        <input
                                            id="organization"
                                            type="text"
                                            className="input-clean"
                                            name="organization"
                                            value={form.organization}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Stanford University"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label htmlFor="subjects">Academic Subjects</label>
                                        <input
                                            id="subjects"
                                            type="text"
                                            className="input-clean"
                                            name="subjects"
                                            value={form.subjects}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Algebra, Calculus, Physics (comma separated)"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="section-divider" />

                            {/* Section 3: Biography */}
                            <div className="form-section">
                                <div className="form-section-header">
                                    <h4>Biography</h4>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="bio">Biography</label>
                                    <textarea
                                        id="bio"
                                        className="textarea-clean"
                                        name="bio"
                                        value={form.bio}
                                        onChange={handleInputChange}
                                        rows={4}
                                        placeholder="Write a short professional biography..."
                                        maxLength={250}
                                    />
                                    <div className="textarea-footer">
                                        <span className="char-count">{form.bio.length} / 250</span>
                                    </div>
                                </div>
                            </div>

                            {/* Form Footer Actions */}
                            <div className="form-footer-actions">
                                <button type="button" className="btn-secondary-clean" onClick={handleResetForm} disabled={saving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary-clean" disabled={saving}>
                                    {saving ? (
                                        <span className="btn-loading-content">
                                            <div className="spinner-clean" />
                                            Saving Changes...
                                        </span>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Professional Image Crop Dialog */}
            {showCropModal && (
                <div className="crop-modal-overlay">
                    <div className="crop-modal-content">
                        <div className="crop-modal-header">
                            <h3>Crop & Reposition Photo</h3>
                            <button className="crop-close-btn" onClick={() => setShowCropModal(false)}>&times;</button>
                        </div>
                        <p className="crop-modal-subtitle">Drag to reposition and zoom.</p>

                        <div className="crop-canvas-wrapper">
                            <canvas
                                ref={previewCanvasRef}
                                width={280}
                                height={280}
                                className="crop-preview-canvas"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                            <div className="crop-guide-overlay" />
                        </div>

                        <div className="crop-controls">
                            <div className="control-row">
                                <label>Zoom:</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.05"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="zoom-slider"
                                />
                                <span>{Math.round(zoom * 100)}%</span>
                            </div>
                            <div className="control-row rotate-buttons">
                                <label>Rotate:</label>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRotate((r) => (r - 90 + 360) % 360)}>↺ -90°</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRotate((r) => (r + 90) % 360)}>↻ +90°</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setZoom(1); setRotate(0); setOffset({ x: 0, y: 0 }); }}>Reset</button>
                            </div>
                        </div>

                        <div className="crop-modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCropModal(false)} disabled={uploading}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleApplyCropAndUpload} disabled={uploading}>
                                {uploading ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }} />
                                        Uploading...
                                    </span>
                                ) : (
                                    'Apply & Upload Photo'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRemoveConfirmModal && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '32px 28px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </div>
                        
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>
                            Remove your profile picture?
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                            This action cannot be undone.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ minWidth: '110px', padding: '8px 16px' }}
                                onClick={() => setShowRemoveConfirmModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                style={{ minWidth: '110px', padding: '8px 16px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={handleConfirmRemoveImage}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherProfileSection;
