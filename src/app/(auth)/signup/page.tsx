'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, Track } from '@/lib/api';
import { toast } from 'sonner';
import { VALIDATION } from '@/lib/constants';

const signUpSchema = z.object({
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(VALIDATION.NAME_MAX_LENGTH, `이름은 ${VALIDATION.NAME_MAX_LENGTH}자 이내로 입력해주세요`),
  phoneNumber: z
    .string()
    .regex(VALIDATION.PHONE_PATTERN, '올바른 전화번호 형식이 아닙니다 (예: 01012345678)'),
  trackId: z.string().min(1, '트랙을 선택해주세요'),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  // Check for pending idToken
  // Safe to access sessionStorage in useEffect
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('pendingIdToken');
    setIdToken(token);
    if (!token) {
      toast.error('인증 정보가 없습니다. 다시 로그인해주세요.');
      router.push('/signin');
    }
  }, [router]);

  // Fetch tracks
  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => api.get<Track[]>('/admin/tracks').then((res: any) => res.content),
  });

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: (data: SignUpFormData) =>
      api.post('/users/signup', {
        idToken,
        trackId: parseInt(data.trackId),
        name: data.name,
        phoneNumber: data.phoneNumber,
        provider: 'GOOGLE',
      }),
    onSuccess: () => {
      // Clear stored idToken
      sessionStorage.removeItem('pendingIdToken');
      setIsSuccess(true);
    },
    onError: (error: any) => {
      toast.error(error.message || '회원가입에 실패했습니다.');
    },
  });

  const onSubmit = (data: SignUpFormData) => {
    signUpMutation.mutate(data);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-soft">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">가입 신청 완료!</h2>
            <p className="text-muted-foreground mb-6">
              관리자 승인 후 커뮤니티에 참여하실 수 있습니다.
              <br />
              승인이 완료되면 알림을 보내드려요.
            </p>
            <Button onClick={() => router.push('/signin')} className="w-full">
              로그인 페이지로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prevent flash of content if no token
  if (!idToken) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/signin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          로그인으로 돌아가기
        </Link>

        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <p className="text-muted-foreground mt-2">
              Google 인증이 완료되었습니다.
              <br />
              추가 정보를 입력해주세요.
            </p>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Track Selection */}
              <div className="space-y-2">
                <Label htmlFor="trackId">참여 과정</Label>
                <Select
                  onValueChange={(value) => setValue('trackId', value)}
                  disabled={isLoadingTracks}
                >
                  <SelectTrigger className={errors.trackId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="과정을 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {tracks?.map((track: { id: number; trackName: string }) => (
                      <SelectItem key={track.id} value={String(track.id)}>
                        {track.trackName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.trackId && (
                  <p className="text-sm text-destructive">{errors.trackId.message}</p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">이름 (실명)</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  {...register('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">전화번호</Label>
                <Input
                  id="phoneNumber"
                  placeholder="01012345678"
                  {...register('phoneNumber')}
                  className={errors.phoneNumber ? 'border-destructive' : ''}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={signUpMutation.isPending}
              >
                {signUpMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    가입 신청 중...
                  </>
                ) : (
                  '가입 신청하기'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              가입 신청 후 관리자 승인이 필요합니다.
              <br />
              승인까지 1-2일 정도 소요될 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
