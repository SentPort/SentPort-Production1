import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Keyboard, MousePointer2, Hand } from 'lucide-react';
import BlogWheelCard from './BlogWheelCard';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count?: number;
  comment_count?: number;
  blog_accounts?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  blog_feed_metrics?: Array<{
    total_comments_30d: number;
    engagement_score: number;
  }>;
  is_pinned?: boolean;
  cover_image_url?: string;
}

interface BlogWheelProps {
  posts: BlogPost[];
  onPostClick?: (postId: string) => void;
  title?: string;
  subtitle?: string;
  onRemoveFromCollection?: (postId: string) => void;
  showRemoveButton?: boolean;
  showEditButton?: boolean;
}

export default function BlogWheel({ posts, onPostClick, title, subtitle, onRemoveFromCollection, showRemoveButton, showEditButton }: BlogWheelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const visibleCards = 5;
  const cardAngleSpacing = 360 / Math.max(posts.length, visibleCards);
  const radius = 350;

  const goToNext = useCallback(() => {
    if (isTransitioning || posts.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % posts.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, posts.length]);

  const goToPrev = useCallback(() => {
    if (isTransitioning || posts.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, posts.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = currentX - startX;
    if (Math.abs(diff) > 50) {
      if (showTip) {
        setShowTip(false);
        localStorage.setItem('blogWheelTipShown', 'true');
      }
      if (diff > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = currentX - startX;
    if (Math.abs(diff) > 50) {
      if (showTip) {
        setShowTip(false);
        localStorage.setItem('blogWheelTipShown', 'true');
      }
      if (diff > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  useEffect(() => {
    const tipShown = localStorage.getItem('blogWheelTipShown');
    if (!tipShown && posts.length > 0) {
      const timer = setTimeout(() => {
        setShowTip(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [posts.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
        if (showTip) {
          setShowTip(false);
          localStorage.setItem('blogWheelTipShown', 'true');
        }
      } else if (e.key === 'ArrowRight') {
        goToNext();
        if (showTip) {
          setShowTip(false);
          localStorage.setItem('blogWheelTipShown', 'true');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, showTip]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (wheelRef.current && wheelRef.current.contains(target)) {
        const isOverCard = target.closest('[data-wheel-card]');
        if (isOverCard) {
          e.preventDefault();
          if (Math.abs(e.deltaY) > 10) {
            if (showTip) {
              setShowTip(false);
              localStorage.setItem('blogWheelTipShown', 'true');
            }
            if (e.deltaY > 0) {
              goToNext();
            } else {
              goToPrev();
            }
          }
        }
      }
    };

    const currentWheel = wheelRef.current;
    if (currentWheel) {
      currentWheel.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (currentWheel) {
        currentWheel.removeEventListener('wheel', handleWheel);
      }
    };
  }, [goToNext, goToPrev, showTip]);

  const getCardStyle = (index: number) => {
    const position = (index - currentIndex + posts.length) % posts.length;
    const angle = position * cardAngleSpacing;
    const adjustedAngle = angle > 180 ? angle - 360 : angle;

    const radian = (adjustedAngle * Math.PI) / 180;
    const x = Math.sin(radian) * radius;
    const z = Math.cos(radian) * radius - radius;
    const y = -80;

    const isCenterCard = position === 0;
    const scale = isCenterCard ? 1.15 : Math.max(0.7, 1 - Math.abs(adjustedAngle) / 180);
    const opacity = isCenterCard ? 1 : Math.max(0.3, 1 - Math.abs(adjustedAngle) / 120);
    const blur = isCenterCard ? 0 : Math.min(3, Math.abs(adjustedAngle) / 60);

    const isVisible = Math.abs(adjustedAngle) < 90;

    return {
      transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) translateZ(${z}px) scale(${scale})`,
      opacity: isVisible ? opacity : 0,
      filter: `blur(${blur}px)`,
      zIndex: isCenterCard ? 50 : Math.round(50 - Math.abs(adjustedAngle)),
      transition: isTransitioning ? 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)' : 'none',
      pointerEvents: isCenterCard ? 'auto' : 'none',
    };
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">No posts to display</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={wheelRef}
        className="relative min-h-[450px] md:min-h-[550px] mb-4 overflow-visible select-none w-full"
        style={{
          perspective: '2000px',
          filter: 'drop-shadow(0 0 40px rgba(251, 191, 36, 0.15))'
        }}
      >
        <div
          className="relative cursor-grab active:cursor-grabbing w-full"
          style={{
            transformStyle: 'preserve-3d',
            height: '100%',
          }}
          data-wheel-card
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                ...getCardStyle(index),
                left: '50%',
              }}
            >
              <BlogWheelCard
                post={post}
                onClick={() => onPostClick?.(post.id)}
                isCenterCard={index === currentIndex}
                onRemove={showRemoveButton && onRemoveFromCollection ? () => onRemoveFromCollection(post.id) : undefined}
                showEdit={showEditButton}
              />
            </div>
          ))}
        </div>

        {showTip && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-emerald-300">
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  <MousePointer2 className="w-5 h-5" />
                  <Hand className="w-5 h-5" />
                </div>
                <div className="md:hidden flex items-center gap-2">
                  <Hand className="w-5 h-5" />
                </div>
                <div className="font-medium">
                  <span className="hidden md:inline">Use arrow keys, mouse wheel, or drag to navigate</span>
                  <span className="md:hidden">Swipe to navigate</span>
                </div>
                <button
                  onClick={() => {
                    setShowTip(false);
                    localStorage.setItem('blogWheelTipShown', 'true');
                  }}
                  className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
                  aria-label="Close tip"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-teal-500"></div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full mt-0 space-y-6">
        {(title || subtitle) && (
          <div className="text-center px-4 relative z-50">
            {title && (
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-3 font-serif">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-gray-300 text-base md:text-lg">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 px-4 relative z-50">
          <button
            onClick={goToPrev}
            disabled={isTransitioning}
            className="group bg-slate-700 hover:bg-slate-600 text-emerald-300 hover:text-emerald-200 p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-emerald-500/30"
            aria-label="Previous post"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          </button>

          <div className="flex gap-2 items-center">
            {posts.slice(0, Math.min(posts.length, 10)).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isTransitioning) {
                    setIsTransitioning(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsTransitioning(false), 600);
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex % Math.min(posts.length, 10)
                    ? 'w-8 bg-emerald-400'
                    : 'w-2 bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to post ${index + 1}`}
              />
            ))}
            {posts.length > 10 && (
              <span className="text-gray-400 text-xs md:text-sm ml-2">
                {currentIndex + 1} / {posts.length}
              </span>
            )}
          </div>

          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className="group bg-slate-700 hover:bg-slate-600 text-emerald-300 hover:text-emerald-200 p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-emerald-500/30"
            aria-label="Next post"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="text-center px-4 relative z-50">
          <div className="inline-flex items-center gap-3 bg-slate-800/60 backdrop-blur border-2 border-emerald-500/30 rounded-full px-6 py-3 shadow-md">
            <div className="hidden md:flex items-center gap-2 text-emerald-400">
              <Keyboard className="w-5 h-5" />
              <MousePointer2 className="w-5 h-5" />
              <Hand className="w-5 h-5" />
            </div>
            <div className="md:hidden flex items-center gap-2 text-emerald-400">
              <Hand className="w-5 h-5" />
            </div>
            <p className="text-emerald-200 text-sm md:text-base font-medium">
              <span className="hidden md:inline">Use arrow keys, mouse wheel, or drag to navigate</span>
              <span className="md:hidden">Swipe or tap arrows to navigate</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
