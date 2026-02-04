'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, X, Users, Link2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { studyApi, StudyCreateRequest, BudgetType } from '@/lib/api';
import { BUDGET_LABELS, VALIDATION } from '@/lib/constants';
import { toast } from 'sonner';

export default function CreateStudyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [formData, setFormData] = useState<StudyCreateRequest>({
    name: '',
    description: '',
    capacity: 5,
    budget: 'FREE',
    chatUrl: '',
    refUrl: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: StudyCreateRequest) => studyApi.createStudy(data),
    onSuccess: (data) => {
      toast.success('스터디가 생성되었습니다. 관리자 승인 후 공개됩니다.');
      router.push(`/studies/${data.studyId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || '스터디 생성에 실패했습니다.');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '스터디 이름을 입력해주세요.';
    } else if (formData.name.length < VALIDATION.STUDY_NAME_MIN) {
      newErrors.name = `스터디 이름은 최소 ${VALIDATION.STUDY_NAME_MIN}자 이상이어야 합니다.`;
    } else if (formData.name.length > VALIDATION.STUDY_NAME_MAX) {
      newErrors.name = `스터디 이름은 최대 ${VALIDATION.STUDY_NAME_MAX}자까지 가능합니다.`;
    }

    if (!formData.description.trim()) {
      newErrors.description = '스터디 설명을 입력해주세요.';
    } else if (formData.description.length > VALIDATION.STUDY_DESC_MAX) {
      newErrors.description = `스터디 설명은 최대 ${VALIDATION.STUDY_DESC_MAX}자까지 가능합니다.`;
    }

    if (formData.capacity < VALIDATION.STUDY_CAPACITY_MIN) {
      newErrors.capacity = `최소 ${VALIDATION.STUDY_CAPACITY_MIN}명 이상이어야 합니다.`;
    }

    if (!formData.chatUrl.trim()) {
      newErrors.chatUrl = '오픈 채팅방 URL을 입력해주세요.';
    } else if (!isValidUrl(formData.chatUrl)) {
      newErrors.chatUrl = '올바른 URL 형식이 아닙니다.';
    }

    if (formData.refUrl && !isValidUrl(formData.refUrl)) {
      newErrors.refUrl = '올바른 URL 형식이 아닙니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createMutation.mutate(formData);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;

    if (formData.tags && formData.tags.length >= VALIDATION.STUDY_TAGS_MAX) {
      toast.error(`태그는 최대 ${VALIDATION.STUDY_TAGS_MAX}개까지 추가할 수 있습니다.`);
      return;
    }

    if (formData.tags?.includes(tag)) {
      toast.error('이미 추가된 태그입니다.');
      return;
    }

    setFormData({
      ...formData,
      tags: [...(formData.tags || []), tag],
    });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
        <p className="text-muted-foreground mb-4">스터디를 개설하려면 로그인이 필요합니다.</p>
        <Button onClick={() => router.push('/signin')}>로그인하기</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">스터디 개설</h1>
          <p className="text-muted-foreground">새로운 스터디를 만들어 함께 성장하세요</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>스터디의 기본 정보를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Study Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                스터디 이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: React 스터디"
                maxLength={VALIDATION.STUDY_NAME_MAX}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/{VALIDATION.STUDY_NAME_MAX}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                스터디 설명 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="스터디 목표, 진행 방식, 예상 일정 등을 자세히 작성해주세요..."
                rows={6}
                maxLength={VALIDATION.STUDY_DESC_MAX}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/{VALIDATION.STUDY_DESC_MAX}
              </p>
            </div>

            {/* Capacity & Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">
                  모집 인원 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={VALIDATION.STUDY_CAPACITY_MIN}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
                {errors.capacity && (
                  <p className="text-sm text-destructive">{errors.capacity}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">
                  비용 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.budget}
                  onValueChange={(value) => setFormData({ ...formData, budget: value as BudgetType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>태그 (최대 {VALIDATION.STUDY_TAGS_MAX}개)</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="예: React, TypeScript"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>링크 정보</CardTitle>
            <CardDescription>스터디 관련 링크를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chat URL */}
            <div className="space-y-2">
              <Label htmlFor="chatUrl">
                <MessageCircle className="h-4 w-4 inline mr-1" />
                오픈 채팅방 URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="chatUrl"
                value={formData.chatUrl}
                onChange={(e) => setFormData({ ...formData, chatUrl: e.target.value })}
                placeholder="https://open.kakao.com/..."
              />
              {errors.chatUrl && (
                <p className="text-sm text-destructive">{errors.chatUrl}</p>
              )}
            </div>

            {/* Reference URL */}
            <div className="space-y-2">
              <Label htmlFor="refUrl">
                <Link2 className="h-4 w-4 inline mr-1" />
                참고 자료 URL (선택)
              </Label>
              <Input
                id="refUrl"
                value={formData.refUrl}
                onChange={(e) => setFormData({ ...formData, refUrl: e.target.value })}
                placeholder="https://notion.so/... 또는 https://github.com/..."
              />
              {errors.refUrl && (
                <p className="text-sm text-destructive">{errors.refUrl}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notice */}
        <Card className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              스터디 개설 후 관리자 승인을 거쳐 공개됩니다. 승인까지 시간이 소요될 수 있습니다.
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              '스터디 개설'
            )}
          </Button>
        </div>
      </form>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}
