'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Settings, FileText, MessageCircle, Heart, LogOut, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const tabs = [
    { value: 'post', label: '내 게시글', icon: FileText, href: '/mypage/post' },
    { value: 'comment', label: '내 댓글', icon: MessageCircle, href: '/mypage/comment' },
    { value: 'like', label: '좋아요', icon: Heart, href: '/mypage/like' },
    { value: 'study', label: '스터디 신청', icon: Users, href: '/mypage/study' },
  ];

  const currentTab = pathname?.split('/')[2] || 'post';

  const handleLogout = async () => {
    await logout();
    router.push('/signin');
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/signin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <MyPageSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <UserAvatar
              src={user.profileImageUrl}
              name={user.name}
              className="h-24 w-24 sm:h-20 sm:w-20"
            />

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold mb-1">{user.name}</h1>
              <p className="text-muted-foreground">{user.trackName}</p>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        user={user}
      />
    </div>
  );
}

function MyPageSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Skeleton className="h-24 w-24 sm:h-20 sm:w-20 rounded-full" />
            <div className="flex-1 text-center sm:text-left">
              <Skeleton className="h-6 w-32 mb-2 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-24 mx-auto sm:mx-0" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-4 border-b border-border pb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
