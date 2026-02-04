'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Calendar,
  ExternalLink,
  MessageCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyApi, StudyDetail, Recruitment } from '@/lib/api';
import { BUDGET_LABELS, STUDY_STATUS_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function StudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studyId = Number(params.studyId);

  const { data: study, isLoading, error } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => studyApi.getStudy(studyId),
    enabled: !!studyId,
  });

  if (isLoading) {
    return <StudyDetailSkeleton />;
  }

  if (error || !study) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">스터디를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-4">요청하신 스터디가 존재하지 않거나 삭제되었습니다.</p>
        <Button onClick={() => router.push('/studies')}>스터디 목록으로</Button>
      </div>
    );
  }

  return <StudyDetailContent study={study} />;
}

function StudyDetailContent({ study }: { study: StudyDetail }) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [appeal, setAppeal] = useState('');

  const isFull = study.currentMemberCount >= study.capacity;
  const canApply = !study.isLeader && !study.isRecruitmentClosed && !isFull && study.status === 'APPROVED';

  // 스터디 신청
  const applyMutation = useMutation({
    mutationFn: () => studyApi.applyStudy(study.id, { appeal }),
    onSuccess: () => {
      toast.success('스터디 신청이 완료되었습니다.');
      setIsApplyOpen(false);
      setAppeal('');
      queryClient.invalidateQueries({ queryKey: ['study', study.id] });
    },
    onError: () => {
      toast.error('스터디 신청에 실패했습니다.');
    },
  });

  // 스터디 삭제
  const deleteMutation = useMutation({
    mutationFn: () => studyApi.deleteStudy(study.id),
    onSuccess: () => {
      toast.success('스터디가 삭제되었습니다.');
      router.push('/studies');
    },
    onError: () => {
      toast.error('스터디 삭제에 실패했습니다.');
    },
  });

  const handleApply = () => {
    if (!appeal.trim()) {
      toast.error('지원 동기를 입력해주세요.');
      return;
    }
    applyMutation.mutate();
  };

  const getStatusBadge = () => {
    if (study.status === 'PENDING') {
      return <Badge variant="secondary">승인 대기</Badge>;
    }
    if (study.status === 'REJECTED') {
      return <Badge variant="destructive">거절됨</Badge>;
    }
    if (study.isRecruitmentClosed || isFull) {
      return <Badge variant="secondary">모집 마감</Badge>;
    }
    return <Badge className="bg-success text-success-foreground">모집중</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{study.name}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            {formatDistanceToNow(new Date(study.createdAt), { addSuffix: true, locale: ko })} 개설
          </p>
        </div>
        {study.isLeader && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/studies/${study.id}/edit`}>
                <Pencil className="h-4 w-4 mr-1" />
                수정
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>스터디 소개</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{study.description}</p>
            </CardContent>
          </Card>

          {/* Tags */}
          {study.tags && study.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>기술 스택 / 태그</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {study.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leader's Recruitment Management */}
          {study.isLeader && (
            <RecruitmentManagement studyId={study.id} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Leader Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">스터디장</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={study.leader?.profileImageUrl}
                  name={study.leader?.name || ''}
                  className="h-12 w-12"
                />
                <div>
                  <p className="font-medium">{study.leader?.name}</p>
                  {study.leader?.trackName && (
                    <p className="text-sm text-muted-foreground">{study.leader.trackName}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Study Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">스터디 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">모집 인원</span>
                <span className="font-medium">
                  {study.currentMemberCount} / {study.capacity}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">비용</span>
                <Badge variant="outline">
                  {BUDGET_LABELS[study.budget as keyof typeof BUDGET_LABELS] || study.budget}
                </Badge>
              </div>
              {study.schedule && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">차수</span>
                    <span className="font-medium">{study.schedule.month}차</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">모집 기간</span>
                    <span className="text-sm">
                      {study.schedule.recruitStartDate} ~ {study.schedule.recruitEndDate}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          {(study.chatUrl || study.refUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">관련 링크</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {study.chatUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={study.chatUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      오픈 채팅방
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </Button>
                )}
                {study.refUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={study.refUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      참고 자료
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Apply Button */}
          {canApply && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => setIsApplyOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              스터디 신청하기
            </Button>
          )}

          {study.isLeader && (
            <div className="text-center text-sm text-muted-foreground py-2">
              당신은 이 스터디의 스터디장입니다
            </div>
          )}

          {!canApply && !study.isLeader && study.status === 'APPROVED' && (
            <div className="text-center text-sm text-muted-foreground py-2">
              {isFull ? '모집이 마감되었습니다' : '현재 신청할 수 없습니다'}
            </div>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>스터디 신청</DialogTitle>
            <DialogDescription>
              "{study.name}" 스터디에 신청합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appeal">지원 동기</Label>
              <Textarea
                id="appeal"
                placeholder="스터디에 참여하고 싶은 이유를 작성해주세요..."
                value={appeal}
                onChange={(e) => setAppeal(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyOpen(false)}>
              취소
            </Button>
            <Button onClick={handleApply} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '신청하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>스터디 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 스터디를 삭제하시겠습니까?
              <span className="block mt-2 text-destructive">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}

// Recruitment Management Component for Study Leader
function RecruitmentManagement({ studyId }: { studyId: number }) {
  const queryClient = useQueryClient();
  const [selectedRecruitment, setSelectedRecruitment] = useState<Recruitment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: recruitmentsData, isLoading } = useQuery({
    queryKey: ['study', studyId, 'recruitments'],
    queryFn: () => studyApi.getRecruitments(studyId),
  });

  const recruitments = recruitmentsData?.content || [];
  const pendingRecruitments = recruitments.filter((r) => r.status === 'PENDING');
  const processedRecruitments = recruitments.filter((r) => r.status !== 'PENDING');

  const approveMutation = useMutation({
    mutationFn: (recruitmentId: number) =>
      studyApi.approveRecruitment(studyId, recruitmentId),
    onSuccess: () => {
      toast.success('신청이 승인되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['study', studyId] });
      setSelectedRecruitment(null);
      setActionType(null);
    },
    onError: () => {
      toast.error('승인 처리에 실패했습니다.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (recruitmentId: number) =>
      studyApi.rejectRecruitment(studyId, recruitmentId),
    onSuccess: () => {
      toast.success('신청이 거절되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['study', studyId] });
      setSelectedRecruitment(null);
      setActionType(null);
    },
    onError: () => {
      toast.error('거절 처리에 실패했습니다.');
    },
  });

  const handleAction = (recruitment: Recruitment, action: 'approve' | 'reject') => {
    setSelectedRecruitment(recruitment);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedRecruitment || !actionType) return;
    if (actionType === 'approve') {
      approveMutation.mutate(selectedRecruitment.id);
    } else {
      rejectMutation.mutate(selectedRecruitment.id);
    }
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          신청자 관리
          {pendingRecruitments.length > 0 && (
            <Badge variant="destructive">{pendingRecruitments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 gap-2">
              <Clock className="h-4 w-4" />
              대기 중
              {pendingRecruitments.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingRecruitments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex-1 gap-2">
              <CheckCircle className="h-4 w-4" />
              처리 완료
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : pendingRecruitments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>대기 중인 신청이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRecruitments.map((recruitment) => (
                  <RecruitmentCard
                    key={recruitment.id}
                    recruitment={recruitment}
                    onApprove={() => handleAction(recruitment, 'approve')}
                    onReject={() => handleAction(recruitment, 'reject')}
                    showActions
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : processedRecruitments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>처리된 신청이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {processedRecruitments.map((recruitment) => (
                  <RecruitmentCard key={recruitment.id} recruitment={recruitment} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!selectedRecruitment && !!actionType} onOpenChange={(open) => {
          if (!open) {
            setSelectedRecruitment(null);
            setActionType(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                신청 {actionType === 'approve' ? '승인' : '거절'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedRecruitment?.userName}님의 신청을 {actionType === 'approve' ? '승인' : '거절'}하시겠습니까?
                {actionType === 'reject' && (
                  <span className="block mt-2 text-destructive">
                    거절된 신청은 복구할 수 없습니다.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAction}
                disabled={isPending}
                className={actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : actionType === 'approve' ? (
                  '승인'
                ) : (
                  '거절'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function RecruitmentCard({
  recruitment,
  onApprove,
  onReject,
  showActions = false,
}: {
  recruitment: Recruitment;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(recruitment.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        <UserAvatar
          src={recruitment.userProfileImageUrl}
          name={recruitment.userName}
          className="h-10 w-10"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{recruitment.userName}</p>
            {recruitment.trackName && (
              <Badge variant="outline" className="text-xs">
                {recruitment.trackName}
              </Badge>
            )}
            {!showActions && (
              <Badge
                variant={recruitment.status === 'APPROVED' ? 'default' : 'destructive'}
                className={cn(
                  'text-xs',
                  recruitment.status === 'APPROVED' && 'bg-success text-success-foreground'
                )}
              >
                {recruitment.status === 'APPROVED' ? '승인됨' : '거절됨'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{timeAgo} 신청</p>
          <p className="text-sm bg-muted/50 p-3 rounded-md">{recruitment.appeal}</p>
        </div>
        {showActions && (
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onReject}
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StudyDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-16" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-20 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>

          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
