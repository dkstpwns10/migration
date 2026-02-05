'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CategoryTabs } from '@/components/ui/CategoryTabs';
import { TopicTabs } from '@/components/ui/TopicTabs';
import { PostCard } from '@/components/post/PostCard';
import { PostListSkeleton } from '@/components/post/PostCardSkeleton';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { api, PostSummary } from '@/lib/api';

function IndexContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic')?.toUpperCase() || undefined;
  const isMobile = useIsMobile();

  const getHeaderInfo = () => {
    switch (topic) {
      case 'NOTICE':
        return { title: '공지사항', desc: 'PotenUp의 새로운 소식과 안내를 확인하세요' };
      case 'KNOWLEDGE':
        return { title: '지식줍줍', desc: '개발 지식과 유용한 정보를 공유합니다' };
      case 'EMPLOYMENT_TIP':
        return { title: '취업팁', desc: '취업 성공을 위한 꿀팁을 나눠보세요' };
      case 'SMALL_TALK':
        return { title: '자유게시판', desc: '자유롭게 이야기를 나누는 공간입니다' };
      default:
        return { title: '홈', desc: 'PotenUp의 모든 소식을 확인하세요' };
    }
  };

  const headerInfo = getHeaderInfo();

  const fetchPosts = async ({ pageParam = 0 }) => {
    const params: any = {
      page: pageParam,
      size: 10,
    };
    if (topic && topic !== 'ALL') {
      params.topic = topic;
    }

    const res: any = await api.get('/posts/summary', params);
    
    // Map API response to PostSummary interface
    const contents = res.contents.map((item: any) => ({
      id: item.postId,
      topic: item.topic,
      title: item.title,
      preview: '', // API doesn't provide preview
      author: {
        id: item.writerId,
        name: item.writerName,
        trackName: item.trackName,
        profileImageUrl: item.profileImageUrl,
      },
      reactionCount: item.reactions.reduce((acc: number, curr: any) => acc + curr.count, 0),
      commentCount: item.commentsCount,
      viewCount: 0, // API doesn't provide viewCount
      isReacted: item.reactions.some((r: any) => r.reactedByMe),
      createdAt: item.wroteAt,
      highlightType: item.highlightType,
    }));

    return {
      contents,
      hasNext: res.hasNext,
      nextPage: res.nextPage,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['posts', topic],
    queryFn: fetchPosts,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextPage : undefined),
    staleTime: 0,
  });

  const posts = data?.pages.flatMap((page) => page.contents) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">{headerInfo.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{headerInfo.desc}</p>
      </div>

      {/* Topic Filter - PC uses CategoryTabs (for sub-nav), Mobile uses TopicTabs (for full nav if needed, but header handles main nav now) */}
      {/* CategoryTabs only renders for KNOWLEDGE/EMPLOYMENT_TIP now as sub-nav */}
      <div className="flex items-center justify-between gap-4">
        {isMobile ? <TopicTabs /> : <CategoryTabs />}
      </div>

      {/* Posts Grid - PC uses 2-column, Mobile uses single column */}
      {isLoading ? (
        <PostListSkeleton />
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">아직 게시글이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
          {posts.map((post, index) => (
            <div
              key={`${post.id}-${index}`}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PostCard post={post} />
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
            className="min-w-[140px]"
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

export default function Index() {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <IndexContent />
    </Suspense>
  );
}
