import React from 'react';
import { cn } from '@/utils/cn';

export interface AvatarProps {
  alt?: string;
  icon?: React.ReactNode;
  shape?: 'circle' | 'square';
  size?: 'large' | 'small' | 'default' | number;
  src?: string;
  srcSet?: string;
  draggable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => boolean;
  children?: React.ReactNode;
}

const Avatar: React.FC<AvatarProps> = ({
  alt,
  icon,
  shape = 'circle',
  size = 'default',
  src,
  srcSet,
  draggable = false,
  className,
  style,
  onError,
  children,
}) => {
  const [hasError, setHasError] = React.useState(false);

  const handleError = () => {
    const errorHandled = onError?.();
    if (!errorHandled) {
      setHasError(true);
    }
  };

  const getSizeClasses = () => {
    if (typeof size === 'number') {
      return {
        width: size,
        height: size,
        fontSize: size * 0.45,
      };
    }

    switch (size) {
      case 'large':
        return 'w-10 h-10 text-lg';
      case 'small':
        return 'w-6 h-6 text-xs';
      default:
        return 'w-8 h-8 text-sm';
    }
  };

  const getShapeClasses = () => {
    return shape === 'circle' ? 'rounded-full' : 'rounded-md';
  };

  const avatarClasses = cn(
    'inline-flex items-center justify-center bg-gray-100 text-gray-500 font-medium overflow-hidden',
    getShapeClasses(),
    typeof size === 'number' ? '' : getSizeClasses(),
    className
  );

  const avatarStyle = typeof size === 'number' ? { ...getSizeClasses(), ...style } : style;

  // Determine what to render
  let content: React.ReactNode = null;

  if (src && !hasError) {
    content = (
      <img
        src={src}
        srcSet={srcSet}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={draggable}
        onError={handleError}
      />
    );
  } else if (icon) {
    content = icon;
  } else if (children) {
    content = children;
  } else if (alt) {
    // Generate initials from alt text
    const initials = alt
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    content = initials;
  } else {
    // Default user icon
    content = (
      <svg
        className="w-full h-full text-gray-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <span
      className={avatarClasses}
      style={avatarStyle}
    >
      {content}
    </span>
  );
};

export { Avatar };