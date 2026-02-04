'use client';

import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Users, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyApi, Recruitment } from '@/lib/api';
import { RECRUITMENT_STATUS_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function MyStudyRecruitmentsPage() {
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<Recruitment | null>(null);

  const { data: recruitmentsData, isLoading } = useQuery({
    queryKey: ['my-recruitments'],
    queryFn: () => studyApi.getMyRecruitments(),
  });

  const cancelMutation = useMutation({
    mutationFn: (recruitment: Recruitment) =>
      studyApi.cancelRecruitment(recruitment.studyId, recruitment.id),
    onSuccess: () => {
      toast.success('신청이 취소되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['my-recruitments'] });
      setCancelTarget(null);
    },
    onError: () => {
      toast.error('신청 취소에 실패했습니다.');
    },
  });

  const recruitments = recruitmentsData?.content || [];
  const pendingRecruitments = recruitments.filter((r) => r.status === 'PENDING');
  const processedRecruitments = recruitments.filter((r) => r.status !== 'PENDING');

  if (isLoading) {
    return <RecruitmentListSkeleton />;
  }

  if (recruitments.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">신청한 스터디가 없습니다</h3>
        <p className="text-muted-foreground mb-4">
          관심있는 스터디에 신청해보세요
        </p>
        <Button asChild>
          <Link href="/studies">스터디 둘러보기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Recruitments */}
      {pendingRecruitments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-amber-500" />
            대기 중인 신청
            <Badge variant="secondary">{pendingRecruitments.length}</Badge>
          </h2>
          <div className="space-y-3">
            {pendingRecruitments.map((recruitment) => (
              <RecruitmentCard
                key={recruitment.id}
                recruitment={recruitment}
                onCancel={() => setCancelTarget(recruitment)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Processed Recruitments */}
      {processedRecruitments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            처리된 신청
            <Badge variant="outline">{processedRecruitments.length}</Badge>
          </h2>
          <div className="space-y-3">
            {processedRecruitments.map((recruitment) => (
              <RecruitmentCard key={recruitment.id} recruitment={recruitment} />
            ))}
          </div>
        </section>
      )}

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 취소</AlertDialogTitle>
            <AlertDialogDescription>
              "{cancelTarget?.studyName}" 스터디 신청을 취소하시겠습니까?
              <span className="block mt-2 text-destructive">
                취소 후에는 다시 신청해야 합니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '신청 취소'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RecruitmentCard({
  recruitment,
  onCancel,
}: {
  recruitment: Recruitment;
  onCancel?: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(recruitment.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  const getStatusBadge = () => {
    switch (recruitment.status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            대기중
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3" />
            승인됨
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            거절됨
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/studies/${recruitment.studyId}`}
                className="font-semibold hover:text-primary transition-colors truncate"
              >
                {recruitment.studyName}
              </Link>
              {getStatusBadge()}
            </div>
            {recruitment.trackName && (
              <p className="text-sm text-muted-foreground mb-2">
                {recruitment.trackName}
              </p>
            )}
            <div className="bg-muted/50 p-3 rounded-md mb-2">
              <p className="text-sm">{recruitment.appeal}</p>
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo} 신청</p>
            {recruitment.approvedAt && (
              <p className="text-xs text-success mt-1">
                {formatDistanceToNow(new Date(recruitment.approvedAt), {
                  addSuffix: true,
                  locale: ko,
                })}{' '}
                승인됨
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/studies/${recruitment.studyId}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                보기
              </Link>
            </Button>
            {recruitment.status === 'PENDING' && onCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onCancel}
              >
                <XCircle className="h-4 w-4 mr-1" />
                취소
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecruitmentListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
