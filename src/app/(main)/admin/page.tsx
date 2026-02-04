'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Calendar,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { api, adminApi, studyApi, scheduleApi, AdminTrack, Study, Schedule, ScheduleCreateRequest } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  trackId: number;
  trackName: string;
  profileImageUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface AdminUsersResponse {
  content: AdminUser[];
  pageNumber: number;
  pageSize: number;
  hasNext: boolean;
  totalElements?: number;
}

type DecisionType = 'APPROVED' | 'REJECTED';

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <AdminPageSkeleton />;
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h2>
        <p className="text-muted-foreground mb-4">관리자만 접근할 수 있는 페이지입니다.</p>
        <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
      </div>
    );
  }

  return <AdminContent />;
}

function AdminContent() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState('users');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            관리자 페이지
          </h1>
          <p className="text-muted-foreground">유저, 트랙, 스터디 관리</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">유저 관리</span>
          </TabsTrigger>
          <TabsTrigger value="tracks" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">트랙 관리</span>
          </TabsTrigger>
          <TabsTrigger value="studies" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">스터디 승인</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">일정 관리</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="tracks" className="mt-6">
          <TrackManagementTab />
        </TabsContent>

        <TabsContent value="studies" className="mt-6">
          <StudyApprovalTab />
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <ScheduleManagementTab />
        </TabsContent>
      </Tabs>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}

// ==================== User Management Tab ====================
function UserManagementTab() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'users', 'PENDING'],
    queryFn: async () => {
      const res = await api.get<AdminUsersResponse>('/admin/users', { status: 'PENDING' });
      return res.content || [];
    },
  });

  const { data: approvedUsers, isLoading: approvedLoading } = useQuery({
    queryKey: ['admin', 'users', 'APPROVED'],
    queryFn: async () => {
      const res = await api.get<AdminUsersResponse>('/admin/users', { status: 'APPROVED' });
      return res.content || [];
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ userId, decision }: { userId: number; decision: DecisionType }) => {
      await adminApi.decideUser(userId, decision);
    },
    onSuccess: (_, variables) => {
      const action = variables.decision === 'APPROVED' ? '승인' : '거절';
      toast.success(`유저가 ${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDialogOpen(false);
      setSelectedUser(null);
      setDecisionType(null);
    },
    onError: () => {
      toast.error('처리 중 오류가 발생했습니다.');
    },
  });

  const handleDecision = (user: AdminUser, decision: DecisionType) => {
    setSelectedUser(user);
    setDecisionType(decision);
    setDialogOpen(true);
  };

  const confirmDecision = () => {
    if (selectedUser && decisionType) {
      decisionMutation.mutate({ userId: selectedUser.id, decision: decisionType });
    }
  };

  const pendingCount = pendingUsers?.length || 0;
  const approvedCount = approvedUsers?.length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">승인 대기</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-sm text-muted-foreground">승인된 유저</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 gap-2">
            <Clock className="h-4 w-4" />
            승인 대기
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 gap-2">
            <CheckCircle className="h-4 w-4" />
            승인된 유저
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <UserListSkeleton />
          ) : pendingUsers?.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="대기 중인 유저가 없습니다"
              description="모든 가입 요청이 처리되었습니다."
            />
          ) : (
            <div className="space-y-3">
              {pendingUsers?.map((adminUser) => (
                <UserCard
                  key={adminUser.id}
                  user={adminUser}
                  onApprove={() => handleDecision(adminUser, 'APPROVED')}
                  onReject={() => handleDecision(adminUser, 'REJECTED')}
                  showActions
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedLoading ? (
            <UserListSkeleton />
          ) : approvedUsers?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="승인된 유저가 없습니다"
              description="아직 승인된 유저가 없습니다."
            />
          ) : (
            <div className="space-y-3">
              {approvedUsers?.map((adminUser) => (
                <UserCard key={adminUser.id} user={adminUser} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decisionType === 'APPROVED' ? '유저 승인' : '유저 거절'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.name}님의 가입을{' '}
              {decisionType === 'APPROVED' ? '승인' : '거절'}하시겠습니까?
              {decisionType === 'REJECTED' && (
                <span className="block mt-2 text-destructive">
                  거절된 유저는 서비스를 이용할 수 없습니다.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecision}
              disabled={decisionMutation.isPending}
              className={decisionType === 'REJECTED' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {decisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : decisionType === 'APPROVED' ? (
                '승인'
              ) : (
                '거절'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Track Management Tab ====================
function TrackManagementTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<AdminTrack | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTrack | null>(null);
  const [formData, setFormData] = useState({
    trackName: '',
    startDate: '',
    endDate: '',
  });

  const { data: tracks, isLoading } = useQuery({
    queryKey: ['admin', 'tracks'],
    queryFn: async () => {
      const res = await adminApi.getAllTracks();
      return res.content || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { trackName: string; startDate: string; endDate: string }) =>
      adminApi.createTrack(data),
    onSuccess: () => {
      toast.success('트랙이 생성되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('트랙 생성에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { trackName?: string; startDate?: string; endDate?: string } }) =>
      adminApi.updateTrack(id, data),
    onSuccess: () => {
      toast.success('트랙이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] });
      setEditingTrack(null);
      resetForm();
    },
    onError: () => {
      toast.error('트랙 수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteTrack(id),
    onSuccess: () => {
      toast.success('트랙이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('트랙 삭제에 실패했습니다.');
    },
  });

  const resetForm = () => {
    setFormData({ trackName: '', startDate: '', endDate: '' });
  };

  const handleCreate = () => {
    if (!formData.trackName || !formData.startDate || !formData.endDate) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingTrack) return;
    updateMutation.mutate({
      id: editingTrack.trackId,
      data: formData,
    });
  };

  const openEditDialog = (track: AdminTrack) => {
    setEditingTrack(track);
    setFormData({
      trackName: track.trackName,
      startDate: track.startDate,
      endDate: track.endDate,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">트랙 목록</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          트랙 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : tracks?.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="트랙이 없습니다"
          description="새로운 트랙을 추가해주세요."
        />
      ) : (
        <div className="space-y-3">
          {tracks?.map((track) => (
            <Card key={track.trackId}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{track.trackName}</p>
                  <p className="text-sm text-muted-foreground">
                    {track.startDate} ~ {track.endDate}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(track)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(track)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>트랙 추가</DialogTitle>
            <DialogDescription>새로운 트랙 정보를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trackName">트랙 이름</Label>
              <Input
                id="trackName"
                value={formData.trackName}
                onChange={(e) => setFormData({ ...formData, trackName: e.target.value })}
                placeholder="예: Backend 5기"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTrack} onOpenChange={(open) => !open && setEditingTrack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>트랙 수정</DialogTitle>
            <DialogDescription>트랙 정보를 수정해주세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTrackName">트랙 이름</Label>
              <Input
                id="editTrackName"
                value={formData.trackName}
                onChange={(e) => setFormData({ ...formData, trackName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editStartDate">시작일</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndDate">종료일</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrack(null)}>
              취소
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>트랙 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.trackName} 트랙을 삭제하시겠습니까?
              <span className="block mt-2 text-destructive">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.trackId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Study Approval Tab ====================
function StudyApprovalTab() {
  const queryClient = useQueryClient();
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const { data: pendingStudies, isLoading } = useQuery({
    queryKey: ['admin', 'studies', 'pending'],
    queryFn: async () => {
      const res = await adminApi.getPendingStudies();
      return res.content || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (studyId: number) => studyApi.approveStudy(studyId),
    onSuccess: () => {
      toast.success('스터디가 승인되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'studies'] });
      setSelectedStudy(null);
      setActionType(null);
    },
    onError: () => {
      toast.error('스터디 승인에 실패했습니다.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (studyId: number) => studyApi.rejectStudy(studyId),
    onSuccess: () => {
      toast.success('스터디가 거절되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'studies'] });
      setSelectedStudy(null);
      setActionType(null);
    },
    onError: () => {
      toast.error('스터디 거절에 실패했습니다.');
    },
  });

  const handleAction = (study: Study, action: 'approve' | 'reject') => {
    setSelectedStudy(study);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedStudy || !actionType) return;
    if (actionType === 'approve') {
      approveMutation.mutate(selectedStudy.id);
    } else {
      rejectMutation.mutate(selectedStudy.id);
    }
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">승인 대기 중인 스터디</h2>
        <Badge variant="secondary">{pendingStudies?.length || 0}개</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : pendingStudies?.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="대기 중인 스터디가 없습니다"
          description="모든 스터디 신청이 처리되었습니다."
        />
      ) : (
        <div className="space-y-4">
          {pendingStudies?.map((study) => (
            <Card key={study.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{study.name}</h3>
                      <Badge variant="outline">
                        {study.currentMemberCount}/{study.capacity}명
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {study.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserAvatar
                        src={study.leader?.profileImageUrl}
                        name={study.leader?.name || ''}
                        className="h-5 w-5"
                      />
                      <span>{study.leader?.name}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(study.createdAt), { addSuffix: true, locale: ko })}</span>
                    </div>
                    {study.tags && study.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {study.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleAction(study, 'reject')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      거절
                    </Button>
                    <Button size="sm" onClick={() => handleAction(study, 'approve')}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      승인
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedStudy && !!actionType} onOpenChange={(open) => {
        if (!open) {
          setSelectedStudy(null);
          setActionType(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              스터디 {actionType === 'approve' ? '승인' : '거절'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedStudy?.name}" 스터디를 {actionType === 'approve' ? '승인' : '거절'}하시겠습니까?
              {actionType === 'reject' && (
                <span className="block mt-2 text-destructive">
                  거절된 스터디는 사용자에게 표시되지 않습니다.
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
    </div>
  );
}

// ==================== Schedule Management Tab ====================
function ScheduleManagementTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<ScheduleCreateRequest>({
    trackId: 0,
    month: '',
    recruitStartDate: '',
    recruitEndDate: '',
    studyEndDate: '',
  });

  const { data: tracks } = useQuery({
    queryKey: ['admin', 'tracks'],
    queryFn: async () => {
      const res = await adminApi.getAllTracks();
      return res.content || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleCreateRequest) => scheduleApi.createSchedule(data),
    onSuccess: () => {
      toast.success('스터디 일정이 생성되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedules'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('스터디 일정 생성에 실패했습니다.');
    },
  });

  const resetForm = () => {
    setFormData({
      trackId: 0,
      month: '',
      recruitStartDate: '',
      recruitEndDate: '',
      studyEndDate: '',
    });
  };

  const handleCreate = () => {
    if (!formData.trackId || !formData.month || !formData.recruitStartDate || !formData.recruitEndDate || !formData.studyEndDate) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">스터디 일정(차수) 관리</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          일정 추가
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>스터디 일정 관리 기능</p>
            <p className="text-sm mt-1">각 트랙별 스터디 모집 일정을 관리할 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>스터디 일정 추가</DialogTitle>
            <DialogDescription>새로운 스터디 일정을 생성합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trackSelect">트랙 선택</Label>
              <select
                id="trackSelect"
                className="w-full h-10 px-3 border rounded-md bg-background"
                value={formData.trackId}
                onChange={(e) => setFormData({ ...formData, trackId: Number(e.target.value) })}
              >
                <option value={0}>트랙을 선택하세요</option>
                {tracks?.map((track) => (
                  <option key={track.trackId} value={track.trackId}>
                    {track.trackName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">차수 (월)</Label>
              <Input
                id="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                placeholder="예: 1, 2, 3..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recruitStartDate">모집 시작일</Label>
              <Input
                id="recruitStartDate"
                type="date"
                value={formData.recruitStartDate}
                onChange={(e) => setFormData({ ...formData, recruitStartDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recruitEndDate">모집 종료일</Label>
              <Input
                id="recruitEndDate"
                type="date"
                value={formData.recruitEndDate}
                onChange={(e) => setFormData({ ...formData, recruitEndDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studyEndDate">스터디 종료일</Label>
              <Input
                id="studyEndDate"
                type="date"
                value={formData.studyEndDate}
                onChange={(e) => setFormData({ ...formData, studyEndDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Shared Components ====================
function UserCard({
  user,
  onApprove,
  onReject,
  showActions = false,
}: {
  user: AdminUser;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(user.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={user.profileImageUrl}
            name={user.name}
            className="h-12 w-12"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{user.name}</p>
              <Badge variant="outline" className="text-xs">
                {user.trackName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo} 가입 요청</p>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                거절
              </Button>
              <Button size="sm" onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-1" />
                승인
              </Button>
            </div>
          )}
          {!showActions && user.status === 'APPROVED' && (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              승인됨
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function UserListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <UserListSkeleton />
    </div>
  );
}
