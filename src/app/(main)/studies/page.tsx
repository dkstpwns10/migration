'use client';

import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { api, Study } from '@/lib/api';
import { BUDGET_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useInfiniteQuery } from '@tanstack/react-query';

export default function Studies() {
  const fetchStudies = async ({ pageParam = 0 }) => {
    const res: any = await api.get('/studies', {
      page: pageParam,
      size: 10,
    });

    // Map API response to Study interface
    const content = res.content.map((item: any): Study => ({
      id: item.id,
      name: item.name,
      description: item.description,
      capacity: item.capacity,
      currentMemberCount: item.currentMemberCount,
      status: item.status,
      budget: item.budget,
      chatUrl: item.chatUrl,
      refUrl: item.refUrl,
      tags: item.tags || [],
      leader: {
        id: item.leader?.id,
        name: item.leader?.name,
        trackName: item.leader?.trackName,
        profileImageUrl: item.leader?.profileImageUrl,
      },
      schedule: item.schedule,
      isLeader: item.isLeader,
      isRecruitmentClosed: item.isRecruitmentClosed,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      content,
      hasNext: res.hasNext,
      pageNumber: res.pageNumber,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['studies'],
    queryFn: fetchStudies,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.pageNumber + 1 : undefined),
    staleTime: 0,
  });

  const studies = data?.pages.flatMap((page) => page.content) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">스터디 모집</h1>
          <p className="text-muted-foreground mt-1">
            함께 성장할 스터디를 찾아보세요
          </p>
        </div>
        <Button variant="linearPrimary" asChild>
          <Link href="/studies/create">스터디 개설</Link>
        </Button>
      </div>

      {/* Studies List */}
      {isLoading ? (
        <StudyListSkeleton />
      ) : studies.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">모집 중인 스터디가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {studies.map((study, index) => (
            <div
              key={study.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <StudyCard study={study} />
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="linear"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                불러오는 중...
              </>
            ) : (
              '더 보기'
            )}
          </Button>
        </div>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}

function StudyCard({ study }: { study: Study }) {
  const timeAgo = formatDistanceToNow(new Date(study.createdAt), {
    addSuffix: true,
    locale: ko,
  });

  const isFull = study.currentMemberCount >= study.capacity;

  return (
    <Link href={`/studies/${study.id}`}>
      <Card className="card-interactive h-full">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar
                src={study.leader.profileImageUrl}
                name={study.leader.name}
                className="h-10 w-10 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{study.leader.name}</p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>
            <Badge
              variant={isFull ? 'secondary' : 'default'}
              className={cn(!isFull && 'bg-success text-success-foreground')}
            >
              {isFull ? '마감' : '모집중'}
            </Badge>
          </div>

          {/* Content */}
          <h3 className="font-semibold text-base mb-2 line-clamp-1">
            {study.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {study.description}
          </p>

          {/* Tags */}
          {study.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {study.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {study.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{study.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                {study.currentMemberCount}/{study.capacity}명
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-normal">
                {BUDGET_LABELS[study.budget as keyof typeof BUDGET_LABELS] || study.budget}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StudyListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
