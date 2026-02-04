'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, User, Mail, GraduationCap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, User as UserType } from '@/lib/api';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType;
}

export function ProfileEditModal({ open, onOpenChange, user }: ProfileEditModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { checkAuth } = useAuth();

  // 프로필 이미지 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // 프로필 이미지 직접 업로드 (POST /users/profiles/me)
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.upload<Record<string, unknown>>('/users/profiles/me', formData);
      return response;
    },
    onSuccess: async () => {
      toast.success('프로필 이미지가 변경되었습니다.');
      await checkAuth(); // 사용자 정보 새로고침
      queryClient.invalidateQueries({ queryKey: ['user'] });
      handleClose();
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      const errorMessage = error?.message || '프로필 이미지 변경에 실패했습니다.';
      toast.error(errorMessage);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setSelectedFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>내 정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              {previewUrl ? (
                <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-primary/20">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <UserAvatar
                  src={user.profileImageUrl}
                  name={user.name}
                  className="h-24 w-24 ring-4 ring-primary/20"
                />
              )}

              {/* Camera overlay */}
              <button
                onClick={triggerFileInput}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-8 w-8 text-white" />
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <Button
              variant="link"
              size="sm"
              onClick={triggerFileInput}
              className="mt-2 text-primary"
            >
              <Camera className="h-4 w-4 mr-1" />
              이미지 변경
            </Button>
          </div>

          {/* User Info Fields (Read-only) */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                이름
              </Label>
              <Input
                id="name"
                value={user.name || ''}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                이메일
              </Label>
              <Input
                id="email"
                value={user.email || ''}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="track" className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                트랙
              </Label>
              <Input
                id="track"
                value={user.trackName || ''}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            이름, 이메일, 트랙 정보는 관리자에게 문의하여 변경할 수 있습니다.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
