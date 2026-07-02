import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base Skeleton Component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-slate-200 dark:bg-slate-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined
  };
  
  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Card Skeleton Component
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`card p-6 ${className}`}>
    <div className="flex items-start gap-4 mb-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={16} />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton width="100%" height={16} />
      <Skeleton width="80%" height={16} />
      <Skeleton width="90%" height={16} />
    </div>
  </div>
);

/**
 * List Item Skeleton Component
 */
export const ListItemSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-4 p-4 ${className}`}>
    <Skeleton variant="circular" width={40} height={40} />
    <div className="flex-1 space-y-2">
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={14} />
    </div>
    <Skeleton width={80} height={32} variant="rounded" />
  </div>
);

/**
 * Table Skeleton Component
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`overflow-hidden ${className}`}>
    {/* Header */}
    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={100} height={20} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} width={80} height={16} />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Stats Card Skeleton Component
 */
export const StatsCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`card p-6 ${className}`}>
    <Skeleton width="40%" height={16} className="mb-4" />
    <Skeleton width="60%" height={32} className="mb-2" />
    <Skeleton width="30%" height={14} />
  </div>
);

/**
 * Dashboard Skeleton Component
 */
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-6 ${className}`}>
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Form Skeleton Component
 */
export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton width="30%" height={16} />
        <Skeleton width="100%" height={40} variant="rounded" />
      </div>
    ))}
    <div className="flex gap-4 pt-4">
      <Skeleton width="40%" height={44} variant="rounded" />
      <Skeleton width="30%" height={44} variant="rounded" />
    </div>
  </div>
);

/**
 * Profile Skeleton Component
 */
export const ProfileSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-6 ${className}`}>
    <Skeleton variant="circular" width={120} height={120} />
    <div className="flex-1 space-y-3">
      <Skeleton width="50%" height={24} />
      <Skeleton width="70%" height={18} />
      <Skeleton width="40%" height={16} />
      <div className="flex gap-4 pt-2">
        <Skeleton width={100} height={36} variant="rounded" />
        <Skeleton width={100} height={36} variant="rounded" />
      </div>
    </div>
  </div>
);

/**
 * Class Card Skeleton Component
 */
export const ClassCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`card p-6 hover:shadow-lg transition-shadow ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <Skeleton width="70%" height={20} className="mb-2" />
        <Skeleton width="40%" height={16} />
      </div>
      <Skeleton variant="circular" width={40} height={40} />
    </div>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton width={80} height={24} variant="rounded" />
      <Skeleton width={80} height={24} variant="rounded" />
    </div>
    <div className="space-y-2">
      <Skeleton width="100%" height={16} />
      <Skeleton width="80%" height={16} />
    </div>
  </div>
);

/**
 * Grades Table Skeleton Component
 */
export const GradesTableSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = ''
}) => (
  <div className={`card overflow-hidden ${className}`}>
    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <Skeleton width="30%" height={24} />
        <Skeleton width={120} height={36} variant="rounded" />
      </div>
    </div>
    <TableSkeleton rows={rows} columns={6} />
  </div>
);

/**
 * Transcript Skeleton Component
 */
export const TranscriptSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`max-w-5xl mx-auto space-y-8 ${className}`}>
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="space-y-2">
          <Skeleton width={200} height={28} />
          <Skeleton width={300} height={16} />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton width={100} height={40} variant="rounded" />
        <Skeleton width={140} height={40} variant="rounded" />
      </div>
    </div>
    
    {/* Overview Card */}
    <div className="card p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton width="50%" height={14} />
            <Skeleton width="60%" height={32} />
          </div>
        ))}
      </div>
    </div>
    
    {/* Semesters */}
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={150} height={24} />
          <div className="flex gap-4">
            <Skeleton width={80} height={20} />
            <Skeleton width={60} height={20} />
          </div>
        </div>
        <TableSkeleton rows={3} columns={4} />
      </div>
    ))}
  </div>
);

export default Skeleton;
