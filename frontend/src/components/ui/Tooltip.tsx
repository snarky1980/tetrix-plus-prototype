import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Composant Tooltip - Affiche une infobulle au survol
 */
export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
  };

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
        >
          <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg">
            {content}
          </div>
          <div 
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Composant InfoTooltip - Icône "i" avec infobulle
 * Utilisé pour fournir des explications contextuelles
 */
export const InfoTooltip: React.FC<{
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}> = ({ content, position = 'top', size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  return (
    <Tooltip content={content} position={position}>
      <span 
        className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded-full bg-gray-200 text-gray-600 hover:bg-blue-100 hover:text-blue-600 cursor-help transition-colors font-serif italic`}
        aria-label="Information"
      >
        i
      </span>
    </Tooltip>
  );
};

/**
 * Composant HelpText - Texte d'aide avec icône
 */
export const HelpText: React.FC<{
  children: React.ReactNode;
  tooltip?: string;
}> = ({ children, tooltip }) => {
  if (tooltip) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-sm text-gray-500">{children}</span>
        <InfoTooltip content={tooltip} />
      </span>
    );
  }
  return <span className="text-sm text-gray-500">{children}</span>;
};

export default Tooltip;
