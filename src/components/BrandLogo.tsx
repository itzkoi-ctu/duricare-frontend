import React from 'react';

export interface BrandLogoProps {
  variant?: 'full' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  taglineText?: string;
  className?: string;
}

export const BrandMark: React.FC<{ sizeClass?: string; className?: string }> = ({
  sizeClass = 'w-8 h-8',
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClass} ${className} shrink-0 drop-shadow-xs select-none`}
      fill="none"
      role="img"
      aria-label="DuriCare Logo Mark"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* CTU Navy Primary Gradient: #1F5CA9 -> #00AFEF */}
        <linearGradient id="dcCtuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1F5CA9" />
          <stop offset="100%" stopColor="#0072A8" />
        </linearGradient>
        {/* Agricultural Vitality Leaf Gradient: #166534 -> #22C55E */}
        <linearGradient id="dcLeafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        {/* Golden Durian Pulp Gradient */}
        <linearGradient id="dcPulpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Left Durian Shell with Geometric Spikes */}
      <path
        d="M 50 20 C 42 20, 34 25, 30 30 L 20 33 L 26 41 L 15 47 L 23 57 L 14 66 L 24 74 L 20 83 L 32 86 C 40 91, 46 93, 50 93 C 41 87, 37 76, 37 62 C 37 45, 43 31, 50 20 Z"
        fill="url(#dcCtuGrad)"
        className="dark:fill-[#60A5FA]"
      />

      {/* Center Golden Durian Pulp */}
      <path
        d="M 50 32 C 66 32, 80 44, 80 60 C 80 75, 68 85, 54 85 C 49 85, 45 83, 42 79 C 48 74, 52 65, 52 56 C 52 46, 47 37, 42 34 C 44.5 32.5, 47.2 32, 50 32 Z"
        fill="url(#dcPulpGrad)"
      />

      {/* Pulp Highlight */}
      <path
        d="M 55 42 C 64 42, 71 49, 71 60 C 71 69, 65 75, 56 76 C 60 71, 63 64, 63 58 C 63 50, 59 45, 55 42 Z"
        fill="#FEF08A"
        opacity="0.6"
      />

      {/* Top Vitality Care Leaf */}
      <path
        d="M 48 23 C 48 23, 55 10, 72 8 C 76 19, 68 28, 56 29 C 51 29, 48 26, 48 23 Z"
        fill="url(#dcLeafGrad)"
        className="dark:fill-[#4ADE80]"
      />
      <path
        d="M 49 22 C 56 17, 62 14, 70 9"
        stroke="#DCFCE7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Smart IoT Node in CTU Accent */}
      <circle cx="72" cy="8" r="4.5" fill="#1F5CA9" className="dark:fill-[#38BDF8]" />
      <circle cx="72" cy="8" r="2.2" fill="#00AFEF" className="dark:fill-[#0F172A]" />
      <circle
        cx="72"
        cy="8"
        r="7.5"
        stroke="#00AFEF"
        strokeWidth="1.2"
        strokeOpacity="0.7"
        strokeDasharray="2 2"
      />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  showTagline = false,
  taglineText = 'IoT & AI Agriculture',
  className = '',
}) => {
  const markSizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const titleSizeMap = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  if (variant === 'icon') {
    return <BrandMark sizeClass={markSizeMap[size]} className={className} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark sizeClass={markSizeMap[size]} />
      <div className="flex flex-col leading-none">
        <span
          className={`${titleSizeMap[size]} font-extrabold tracking-tight text-[#1F5CA9] dark:text-[#60A5FA]`}
        >
          Duri<span className="text-[#166534] dark:text-[#4ADE80]">Care</span>
        </span>
        {showTagline && (
          <span className="text-[9px] uppercase font-bold tracking-widest text-[#0072A8] dark:text-[#38BDF8] mt-0.5">
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
