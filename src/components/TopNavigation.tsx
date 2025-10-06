import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RefreshButton } from '@/components/RefreshButton';

export function TopNavigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      // Force navigation to auth page after successful sign out
      navigate('/auth', { replace: true });
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center px-6 gap-4">
        {/* Logo and Branding */}
        <div className="flex items-center gap-3 mr-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-light text-primary-foreground">
            <Receipt className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-foreground">DeliveryDesk</h1>
        </div>

        {/* Sync Act! Button */}
        <RefreshButton
          variant="secondary"
          size="default"
        />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
