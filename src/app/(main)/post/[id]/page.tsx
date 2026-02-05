'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MessageCircle, MoreHorizontal, Trash2, Edit, Send, Pencil, X, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Textarea } from '@/components/ui/textarea';
import { TopicBadge } from '@/components/ui/TopicBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi, commentApi, reactionApi, userApi, Post, Comment, UserSummary } from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [commentText, setCommentText] = useState('');
  const [mentionUserIds, setMentionUserIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Debounced Like States
  const [visualIsReacted, setVisualIsReacted] = useState<boolean | null>(null);
  const [visualReactionCount, setVisualReactionCount] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resolveImageSrc = (src: string) => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    // Contains /api/v1/ anywhere (handles "localhost:8080/api/v1/..." without protocol)
    const apiIndex = src.indexOf('/api/v1/');
    if (apiIndex !== -1) return src.slice(apiIndex);
    // Full URL - extract pathname
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const url = new URL(src);
        return `/api/v1${url.pathname}${url.search}`;
      } catch {
        return src;
      }
    }
    if (src.startsWith('/api/')) return src;
    if (src.startsWith('/files/')) return `${API_BASE_URL}${src}`;
    if (src.startsWith('files/')) return `${API_BASE_URL}/${src}`;
    return src;
  };

  // Fetch Post
  const { data: post, isLoading: isPostLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const [res, reactionRes] = await Promise.all([
        postApi.getPost(Number(id)),
        reactionApi.getPostReaction(Number(id)).catch(() => null)
      ]);

      const reactionSummary = reactionRes?.summaries?.['LIKE'];
      const isReacted = reactionSummary?.reactedByMe || false;
      const reactionCount = reactionSummary?.count || 0;

      // Sync visual state if not currently debouncing
      if (debounceTimerRef.current === null) {
        setVisualIsReacted(isReacted);
        setVisualReactionCount(reactionCount);
      }

      return {
        id: res.postId,
        topic: res.topic,
        title: res.title,
        content: res.content,
        preview: '',
        author: {
          id: res.writerId,
          name: res.writerName,
          trackName: res.trackName,
          profileImageUrl: res.profileImageUrl,
        },
        reactionCount: reactionCount,
        commentCount: res.commentsCount,
        viewCount: 0,
        isReacted: isReacted,
        isAuthor: user ? res.writerId === user.id : false,
        createdAt: res.wroteAt,
        updatedAt: res.wroteAt,
        highlightType: res.highlightType,
        previousPost: res.previousPost,
        nextPost: res.nextPost,
      } as Post & { previousPost?: any; nextPost?: any };
    },
    enabled: !!id,
    staleTime: 0,
  });

  // Fetch Comments
  const { data: comments, isLoading: isCommentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const res: any = await commentApi.getComments(Number(id));
      const mapComment = (c: any): Comment => ({
        id: c.commentId,
        content: c.content,
        author: {
          id: c.author.userId,
          name: c.author.name,
          trackName: c.author.trackName,
          profileImageUrl: c.author.profileImageUrl,
        },
        reactionCount: c.commentReactionStats?.totalCount || 0,
        isReacted: Object.values(c.commentReactionStats?.summaries || {}).some((s: any) => s.reactedByMe),
        isAuthor: user ? c.author.userId === user.id : false,
        isDeleted: c.isDeleted,
        createdAt: c.createdAt,
        updatedAt: c.createdAt,
        mentionedUsers: c.mentionedUsers,
        replies: c.replies?.map(mapComment),
      });
      return res.contents.map(mapComment);
    },
    enabled: !!id,
    staleTime: 0,
  });

  // Like Post Mutation (Simple Version for Debounce)
  const syncLikeMutation = useMutation({
    mutationFn: async (shouldReact: boolean) => {
      if (!post) return;
      if (shouldReact) {
        await reactionApi.addReaction({ targetType: 'POST', targetId: post.id, reactionType: 'LIKE' });
      } else {
        await reactionApi.removeReaction({ targetType: 'POST', targetId: post.id, reactionType: 'LIKE' });
      }
    },
    onSettled: () => {
      debounceTimerRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const handleLikeClick = () => {
    if (!post || visualIsReacted === null || visualReactionCount === null) return;

    // 1. Update UI Immediately
    const nextReacted = !visualIsReacted;
    const nextCount = nextReacted ? visualReactionCount + 1 : visualReactionCount - 1;
    
    setVisualIsReacted(nextReacted);
    setVisualReactionCount(nextCount);

    // 2. Debounce Server Sync
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Only sync if the final state is different from the original server state
      if (nextReacted !== post.isReacted) {
        syncLikeMutation.mutate(nextReacted);
      } else {
        debounceTimerRef.current = null;
      }
    }, 500); // 0.5초 대기
  };

  // Comment Mutation
  const commentMutation = useMutation({
    mutationFn: ({ content, mentionIds }: { content: string; mentionIds?: number[] }) =>
      commentApi.createComment({
        postId: Number(id),
        content,
        mentionUserIds: mentionIds?.length ? mentionIds : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      setCommentText('');
      setMentionUserIds([]);
      toast.success('댓글이 작성되었습니다.');
    },
    onError: () => toast.error('댓글 작성에 실패했습니다.'),
  });

  // Delete Post Mutation
  const deletePostMutation = useMutation({
    mutationFn: () => postApi.deletePost(Number(id)),
    onSuccess: () => {
      toast.success('게시글이 삭제되었습니다.');
      router.push('/');
    },
    onError: () => toast.error('게시글 삭제에 실패했습니다.'),
  });

  if (isPostLoading) return <PostDetailSkeleton />;

  if (!post) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">게시글을 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-4">삭제되었거나 존재하지 않는 게시글입니다.</p>
        <Button variant="linear" onClick={() => router.push('/')}>홈으로 돌아가기</Button>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">게시글</h1>
      </div>

      {/* Post Content */}
      <Card>
        <CardContent className="p-6">
          {/* Author & Meta */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserAvatar src={post.author.profileImageUrl} name={post.author.name} className="h-12 w-12" />
              <div>
                <p className="font-medium">{post.author.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {post.author.trackName && <span>{post.author.trackName}</span>}
                  {post.author.trackName && <span>·</span>}
                  <span>{timeAgo}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TopicBadge topic={post.topic} />
              {post.isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/post/${post.id}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />수정
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Title & Content */}
          <h2 className="text-xl font-bold mb-4">{post.title}</h2>
          <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              urlTransform={(value) => value}
              components={{
                img: ({ src, alt, ...props }: any) => {
                  if (!src) return null;
                  const resolvedSrc = resolveImageSrc(src);
                  console.log('[Image Debug] raw:', src, '→ resolved:', resolvedSrc);
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedSrc}
                      alt={alt}
                      className="rounded-lg shadow-sm border border-border/50 max-h-[500px] object-contain my-4"
                      onError={(e) => {
                        console.error('[Image Error] Failed to load:', resolvedSrc, 'original:', src);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      {...props}
                    />
                  );
                },
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4 text-muted-foreground">
              <button
                onClick={handleLikeClick}
                className={cn('flex items-center gap-1.5 text-sm transition-colors hover:text-rose-500', visualIsReacted && 'text-rose-500')}
              >
                <Heart className={cn('h-5 w-5', visualIsReacted && 'fill-current')} />
                <span>{visualReactionCount}</span>
              </button>
              <div className="flex items-center gap-1.5 text-sm">
                <MessageCircle className="h-5 w-5" /><span>{post.commentCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post Navigation (이전/다음 게시글) */}
      {((post as any).previousPost || (post as any).nextPost) && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            {(post as any).previousPost && (
              <button
                onClick={() => router.push(`/post/${(post as any).previousPost.previousPostId}`)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                <ChevronUp className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">이전글: {(post as any).previousPost.previousPostTitle}</span>
              </button>
            )}
            {(post as any).nextPost && (
              <button
                onClick={() => router.push(`/post/${(post as any).nextPost.nextPostId}`)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">다음글: {(post as any).nextPost.nextPostTitle}</span>
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">댓글 {post.commentCount}개</h3>

          {/* Comment Input */}
          <div className="flex gap-3 mb-4">
            <UserAvatar src={user?.profileImageUrl} name={user?.name || '나'} className="h-10 w-10 flex-shrink-0" />
            <div className="flex-1">
              <MentionTextarea
                value={commentText}
                onChange={setCommentText}
                onMentionChange={setMentionUserIds}
                placeholder="댓글을 입력하세요... (@로 멘션)"
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="linearPrimary"
                  size="sm"
                  onClick={() => commentMutation.mutate({ content: commentText, mentionIds: mentionUserIds })}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {commentMutation.isPending ? '작성 중...' : '댓글 작성'}
                </Button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {(isCommentsLoading || (comments && comments.length > 0)) && (
            <div className="space-y-4 pt-4 border-t">
              {isCommentsLoading ? (
                <p className="text-center text-muted-foreground py-4">댓글을 불러오는 중...</p>
              ) : (
                comments?.map((comment: Comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={Number(id)}
                    currentUserId={user?.id}
                  />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePostMutation.mutate()} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="h-20 lg:h-0" />
    </div>
  );
}

function CommentItem({ comment, postId, currentUserId, depth = 0 }: {
  comment: Comment;
  postId: number;
  currentUserId?: number;
  depth?: number;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isAuthor = currentUserId ? comment.author.id === currentUserId : false;

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko });

  // Comment Like
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (comment.isReacted) {
        await reactionApi.removeReaction({ targetType: 'COMMENT', targetId: comment.id, reactionType: 'LIKE' });
      } else {
        await reactionApi.addReaction({ targetType: 'COMMENT', targetId: comment.id, reactionType: 'LIKE' });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['comments', String(postId)] });
      const previousComments = queryClient.getQueryData(['comments', String(postId)]);

      queryClient.setQueryData(['comments', String(postId)], (old: Comment[] | undefined) => {
        if (!old) return old;
        return old.map((c) => {
          if (c.id === comment.id) {
            const wasReacted = c.isReacted;
            return {
              ...c,
              isReacted: !wasReacted,
              reactionCount: wasReacted ? c.reactionCount - 1 : c.reactionCount + 1,
            };
          }
          // Handle replies if needed (nested structure)
          if (c.replies) {
             return {
               ...c,
               replies: c.replies.map(r => {
                 if (r.id === comment.id) {
                   const wasReacted = r.isReacted;
                   return {
                     ...r,
                     isReacted: !wasReacted,
                     reactionCount: wasReacted ? r.reactionCount - 1 : r.reactionCount + 1,
                   };
                 }
                 return r;
               })
             };
          }
          return c;
        });
      });

      return { previousComments };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['comments', String(postId)], context?.previousComments);
      toast.error('좋아요 처리에 실패했습니다.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', String(postId)] });
    },
  });

  // Comment Edit
  const editMutation = useMutation({
    mutationFn: (content: string) => commentApi.updateComment(comment.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', String(postId)] });
      setIsEditing(false);
      toast.success('댓글이 수정되었습니다.');
    },
    onError: () => toast.error('댓글 수정에 실패했습니다.'),
  });

  // Comment Delete
  const deleteMutation = useMutation({
    mutationFn: () => commentApi.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', String(postId)] });
      queryClient.invalidateQueries({ queryKey: ['post', String(postId)] });
      toast.success('댓글이 삭제되었습니다.');
    },
    onError: () => toast.error('댓글 삭제에 실패했습니다.'),
  });

  // Reply
  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      commentApi.createComment({ postId, parentId: comment.id, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', String(postId)] });
      queryClient.invalidateQueries({ queryKey: ['post', String(postId)] });
      setIsReplying(false);
      setReplyText('');
      toast.success('답글이 작성되었습니다.');
    },
    onError: () => toast.error('답글 작성에 실패했습니다.'),
  });

  return (
    <div className={cn('flex gap-3', comment.isDeleted && 'opacity-60')}>
      <UserAvatar src={comment.author.profileImageUrl} name={comment.author.name} className="h-9 w-9 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.author.trackName ? `[${comment.author.trackName}] ` : ''}{comment.author.name}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          {!comment.isDeleted && isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setIsEditing(true); setEditText(comment.content); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment Content or Edit Mode */}
        {isEditing ? (
          <div className="mt-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
            <div className="flex gap-2 mt-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-3.5 w-3.5 mr-1" />취소
              </Button>
              <Button
                size="sm"
                onClick={() => editMutation.mutate(editText)}
                disabled={!editText.trim() || editMutation.isPending}
              >
                {editMutation.isPending ? '수정 중...' : '수정'}
              </Button>
            </div>
          </div>
        ) : (
          <p className={cn('text-sm mt-1 whitespace-pre-wrap', comment.isDeleted && 'text-muted-foreground italic')}>
            {comment.isDeleted ? '삭제된 댓글입니다.' : renderContentWithMentions(comment.content, comment.mentionedUsers)}
          </p>
        )}

        {/* Comment Actions */}
        {!comment.isDeleted && !isEditing && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => likeMutation.mutate()}
              className={cn('flex items-center gap-1 text-xs transition-colors hover:text-rose-500', comment.isReacted && 'text-rose-500')}
              disabled={likeMutation.isPending}
            >
              <Heart className={cn('h-3.5 w-3.5', comment.isReacted && 'fill-current')} />
              {comment.reactionCount > 0 && <span>{comment.reactionCount}</span>}
            </button>
            {depth === 0 && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
                답글
              </button>
            )}
          </div>
        )}

        {/* Reply Input */}
        {isReplying && (
          <div className="mt-3 flex gap-2">
            <Textarea
              placeholder="답글을 입력하세요..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[60px] resize-none text-sm flex-1"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => replyMutation.mutate(replyText)}
                disabled={!replyText.trim() || replyMutation.isPending}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setIsReplying(false); setReplyText(''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
            {comment.replies.map((reply: Comment) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                currentUserId={currentUserId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
              <AlertDialogDescription>이 댓글을 삭제하시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function renderContentWithMentions(content: string, mentionedUsers?: Array<{ id: number; name: string }>) {
  if (!mentionedUsers || mentionedUsers.length === 0) return content;

  const mentionNames = mentionedUsers.map((u) => u.name);
  const escaped = mentionNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp('@(' + escaped.join('|') + ')', 'g');
  const parts = content.split(pattern);

  return parts.map((part, i) =>
    mentionNames.includes(part) ? (
      <span key={i} className="text-primary bg-primary/10 px-1.5 py-0.5 rounded-md font-medium mx-0.5">
        @{part}
      </span>
    ) : (
      part
    )
  );
}

function MentionTextarea({
  value,
  onChange,
  onMentionChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onMentionChange: (ids: number[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIds, setMentionIds] = useState<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: mentionUsers } = useQuery({
    queryKey: ['mention-users'],
    queryFn: () => userApi.getMentionUsers({ size: 50 }),
    enabled: showMentions,
    staleTime: 60 * 1000,
  });

  const filteredUsers = (Array.isArray(mentionUsers) ? mentionUsers : []).filter(
    (u: UserSummary) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (mentionUser: UserSummary) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      const beforeAt = textBeforeCursor.slice(0, atMatch.index);
      const afterCursor = value.slice(cursorPos);
      const newValue = `${beforeAt}@${mentionUser.name} ${afterCursor}`;
      onChange(newValue);

      const newIds = [...mentionIds, mentionUser.userId];
      setMentionIds(newIds);
      onMentionChange(newIds);

      setShowMentions(false);

      setTimeout(() => {
        const newCursorPos = beforeAt.length + mentionUser.name.length + 2;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowMentions(false), 200)}
        className={cn('min-h-[80px] resize-none', className)}
      />
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-popover border border-border rounded-md shadow-md max-h-[160px] overflow-y-auto z-50">
          {filteredUsers.slice(0, 8).map((u: UserSummary) => (
            <button
              key={u.userId}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              onMouseDown={(e) => {
                e.preventDefault();
                selectMention(u);
              }}
            >
              <UserAvatar src={u.profileImageUrl} name={u.name} className="h-6 w-6" />
              <span className="font-medium">{u.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-7 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}
