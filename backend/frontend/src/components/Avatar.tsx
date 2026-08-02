import React, { useState } from 'react';
import './Avatar.css';

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

// Generate consistent background color based on name string
const generateColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Professional soft colors
    const colors = [
        '#3b82f6', // blue
        '#10b981', // emerald
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
    ];
    return colors[Math.abs(hash) % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 40, className = '', style }) => {
    const [imageError, setImageError] = useState(false);

    const displayName = name?.trim() || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const backgroundColor = generateColor(displayName);

    const containerStyle: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.4}px`, // Scale font size relative to container
        ...style
    };

    return (
        <div 
            className={`avatar-container ${className}`} 
            style={{ ...containerStyle, backgroundColor: (!src || imageError) ? backgroundColor : 'transparent' }}
        >
            {src && !imageError ? (
                <img 
                    src={src} 
                    alt={displayName} 
                    className="avatar-image" 
                    onError={() => setImageError(true)} 
                />
            ) : (
                <span className="avatar-initials">{initial}</span>
            )}
        </div>
    );
};

export default Avatar;
