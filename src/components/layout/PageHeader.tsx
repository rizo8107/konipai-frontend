import React, { ReactNode } from 'react';

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

function PageHeader({ heading, subheading, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
          {subheading && (
            <p className="text-muted-foreground">{subheading}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

// Default export for compatibility
export default PageHeader;
