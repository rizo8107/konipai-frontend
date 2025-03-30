import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  CreditCard, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarItemProps {
  icon: React.ElementType;
  title: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  title, 
  path, 
  active, 
  collapsed,
  onNavigate
}) => {
  return (
    <Link 
      to={path} 
      className={cn(
        "flex items-center py-3 px-4 text-sm rounded-md transition-colors",
        active 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
        collapsed && "justify-center"
      )}
      onClick={onNavigate}
    >
      <Icon size={20} className={cn(collapsed ? "mx-0" : "mr-3")} />
      {!collapsed && <span>{title}</span>}
    </Link>
  );
};

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { title: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { title: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { title: 'Customers', path: '/admin/customers', icon: Users },
    { title: 'Products', path: '/admin/products', icon: Package },
    { title: 'Payments', path: '/admin/payments', icon: CreditCard },
    { title: 'WhatsApp Activities', path: '/admin/whatsapp', icon: MessageSquare },
    { title: 'WhatsApp Templates', path: '/admin/whatsapp-templates', icon: MessageSquare },
    { title: 'Email Activities', path: '/admin/email', icon: Mail },
    { title: 'Email Templates', path: '/admin/email-templates', icon: Mail },
    { title: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div 
      className={cn(
        "bg-card h-full border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        isMobile ? "w-full" : ""
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && <span className="text-xl font-bold text-foreground">Konipai</span>}
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
        )}
      </div>
      
      {/* Navigation items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <SidebarItem
            key={item.path}
            icon={item.icon}
            title={item.title}
            path={item.path}
            active={location.pathname === item.path}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
};
