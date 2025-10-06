/*
 * COMMENTED OUT - OLD SIDEBAR COMPONENT (Phase 2: Dashboard Consolidation)
 * Preserved for potential design revert
 * Replaced by TopNavigation.tsx
 */

/*
import { LayoutDashboard, FileText, Truck, LogOut, User, Receipt, RefreshCw } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navigation = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  // DISABLED: No longer using task/deliverables data - report hidden from navigation
  // {
  //   title: 'Deliverables Report',
  //   url: '/deliverables',
  //   icon: FileText,
  // },
  {
    title: 'Invoices',
    url: '/invoices',
    icon: Receipt,
  },
  // COMMENTED OUT: Dashboard refresh button replaces need for separate sync page
  // {
  //   title: 'Act! CRM Sync',
  //   url: '/act-sync',
  //   icon: RefreshCw,
  // },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  // Get current page title based on route
  const getCurrentPageTitle = () => {
    const currentNav = navigation.find(nav => nav.url === location.pathname);
    return currentNav ? currentNav.title : 'Dashboard';
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      // Force navigation to auth page after successful sign out
      navigate('/auth', { replace: true });
    }
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "!text-black hover:bg-gray-100 hover:!text-black transition-colors duration-200";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-light text-primary-foreground">
            <Receipt className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#000000' }}>DeliveryDesk</h1>
              <p className="text-sm" style={{ color: '#000000' }}>{getCurrentPageTitle()}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavClassName}
                    >
                      <item.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: '#000000' }} />
                      {!isCollapsed && <span className="font-normal" style={{ color: '#000000' }}>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#000000' }}>
                {user?.email}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-auto p-0 text-xs"
                style={{ color: '#000000' }}
              >
                <LogOut className="h-3 w-3 mr-1" style={{ color: '#000000' }} />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
*/