import React from 'react';

interface Owner {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

interface OwnerAvatarProps {
  owner: Owner;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show owner name next to avatar */
  showName?: boolean;
  /** Show email below name */
  showEmail?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Reusable owner avatar component with consistent styling.
 * Shows initials when no avatar image is available.
 */
const OwnerAvatar: React.FC<OwnerAvatarProps> = ({
  owner,
  size = 'md',
  showName = false,
  showEmail = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  };

  const initial = owner.name.charAt(0).toUpperCase();

  const avatarElement = owner.avatar ? (
    <img
      src={owner.avatar}
      alt={owner.name}
      className={`${sizeClasses[size]} rounded-full object-cover`}
      title={owner.name}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center font-medium text-gray-600`}
      title={owner.name}
    >
      {initial}
    </div>
  );

  if (!showName) {
    return <div className={className}>{avatarElement}</div>;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {avatarElement}
      <div>
        <p className="text-sm font-medium text-gray-900">{owner.name}</p>
        {showEmail && owner.email && (
          <p className="text-xs text-gray-500">{owner.email}</p>
        )}
      </div>
    </div>
  );
};

export default OwnerAvatar;
