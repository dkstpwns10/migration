'use client';

import { useRouter } from 'next/navigation';
import { Bell, Check, MessageCircle, Heart, Megaphone, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, NotificationsResponse, mapNotificationResponse, Notification } from '@/lib/api';
import { toast } from 'sonner';

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  COMMENT: MessageCircle,
  REPLY: MessageCircle,
  LIKE: Heart,
  NOTICE: Megaphone,
};

interface NotificationSheetProps {
  trigger: React.ReactNode;
}

export function NotificationSheet({ trigger }: NotificationSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // 알림 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<NotificationsResponse>('/notifications');
      return res.notifications.map(mapNotificationResponse);
    },
    enabled: open,
  });

  const notifications = data || [];

  // 알림 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
    onError: () => toast.error('알림 읽음 처리에 실패했습니다.'),
  });

  // 전체 읽음 처리
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
    onError: () => toast.error('전체 읽음 처리에 실패했습니다.'),
  });

  const handleMarkAsRead = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setOpen(false);
    if (notification.relatedId) {
      router.push(`/post/${notification.relatedId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">알림</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 text-xs gap-1 px-2"
            >
              <CheckCheck className="h-3 w-3" />
              모두 읽음
            </Button>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 w-3/4 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">알림이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={(e) => handleMarkAsRead(notification.id, e)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                router.push('/notifications');
              }}
            >
              모든 알림 보기
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: (e: React.MouseEvent) => void;
}) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50',
        !notification.isRead && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          notification.type === 'LIKE' && 'bg-rose-100 text-rose-500',
          notification.type === 'COMMENT' && 'bg-blue-100 text-blue-500',
          notification.type === 'REPLY' && 'bg-blue-100 text-blue-500',
          notification.type === 'NOTICE' && 'bg-amber-100 text-amber-600',
          !['LIKE', 'COMMENT', 'REPLY', 'NOTICE'].includes(notification.type) &&
            'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notification.isRead && 'font-medium')}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-6 w-6"
          onClick={onMarkAsRead}
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
