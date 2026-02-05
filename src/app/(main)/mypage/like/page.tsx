'use client';

import { Loader2, Heart } from 'lucide-react';
import { PostCard } from '@/components/post/PostCard';
import { PostListSkeleton } from '@/components/post/PostCardSkeleton';
import { Button } from '@/components/ui/button';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, PostSummary } from '@/lib/api';

export default function MyLikes() {
  const fetchLikedPosts = async ({ pageParam = 0 }) => {
    const res: any = await api.get('/posts/posts/me/liked', {
      page: pageParam,
      size: 10,
    });

    // Map API response to PostSummary interface
    const contents = res.contents.map((item: any): PostSummary => ({
      id: item.postId,
      topic: item.topic,
      title: item.title,
      preview: '',
      author: {
        id: item.writerId,
        name: item.writerName,
        profileImageUrl: item.profileImageUrl,
      },
      reactionCount: item.reactions?.reduce((acc: number, r: any) => acc + r.count, 0) || 0,
      commentCount: item.commentsCount,
      viewCount: 0,
      isReacted: item.reactions?.some((r: any) => r.reactedByMe) || false,
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
    queryKey: ['posts', 'me', 'liked'],
    queryFn: fetchLikedPosts,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextPage : undefined),
    staleTime: 0,
  });

  const posts = data?.pages.flatMap((page) => page.contents) || [];

  if (isLoading) {
    return <PostListSkeleton count={3} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">좋아요한 게시글이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
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
    </div>
  );
}
