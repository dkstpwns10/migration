'use client';

import Link from 'next/link';
import { Loader2, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MyComment {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  isDeleted: boolean;
}

export default function MyComments() {
  const fetchMyComments = async ({ pageParam = 0 }) => {
    const res: any = await api.get('/comments/me', {
      page: pageParam,
      size: 10,
    });

    // Map API response
    const contents = res.contents.map((item: any): MyComment => ({
      id: item.commentId,
      postId: item.postId,
      content: item.content,
      createdAt: item.createdAt,
      isDeleted: item.isDeleted,
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
    queryKey: ['comments', 'me'],
    queryFn: fetchMyComments,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextPage : undefined),
    staleTime: 0,
  });

  const comments = data?.pages.flatMap((page) => page.contents) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">작성한 댓글이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Link key={comment.id} href={`/post/${comment.postId}`}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-sm mb-2 line-clamp-2">
                {comment.isDeleted ? (
                  <span className="text-muted-foreground italic">삭제된 댓글입니다.</span>
                ) : (
                  comment.content
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </p>
            </CardContent>
          </Card>
        </Link>
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
