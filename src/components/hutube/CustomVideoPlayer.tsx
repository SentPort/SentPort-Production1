import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Settings, Timer, ChevronRight, ChevronLeft, Minus, Plus } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  thumbnail?: string;
  autoPlay?: boolean;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: () => void;
  videoId?: string;
  userId?: string | null;
  onVideoEnd?: () => void;
}

export default function CustomVideoPlayer({
  src,
  thumbnail,
  autoPlay = false,
  isTheaterMode = false,
  onTheaterModeToggle,
  videoId,
  userId,
  onVideoEnd
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [previewImage, setPreviewImage] = useState<string>('');
  const progressBarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      if (!isDraggingProgress) {
        setCurrentTime(video.currentTime);
      }

      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onVideoEnd) {
        onVideoEnd();
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isDraggingProgress]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.05));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          onTheaterModeToggle?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [duration, onTheaterModeToggle]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Track watch time for analytics
  useEffect(() => {
    if (!videoId) return;

    const watchTimeTrackerRef = { current: 0 };
    let lastUpdateTime = Date.now();
    let intervalId: number;

    const updateWatchTime = () => {
      const now = Date.now();
      const elapsed = (now - lastUpdateTime) / 1000; // Convert to seconds

      if (videoRef.current && !videoRef.current.paused) {
        watchTimeTrackerRef.current += elapsed;
      }

      lastUpdateTime = now;
    };

    // Update watch time every second
    intervalId = window.setInterval(updateWatchTime, 1000);

    // Track watch time on unmount or when user leaves
    const handleBeforeUnload = async () => {
      if (watchTimeTrackerRef.current > 0) {
        // Use sendBeacon for reliable tracking on page unload
        const { supabase } = await import('../../lib/supabase');
        try {
          await supabase.rpc('record_video_view', {
            p_video_id: videoId,
            p_user_id: userId || null,
            p_watched_seconds: Math.floor(watchTimeTrackerRef.current),
            p_traffic_source: 'direct',
            p_device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
          });
        } catch (error) {
          console.error('Error tracking watch time:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Track final watch time on component unmount
      handleBeforeUnload();
    };
  }, [videoId, userId]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current || !duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pos * duration;

    setHoverTime(time);
    setHoverPosition(e.clientX - rect.left);
  };

  const handleProgressLeave = () => {
    setHoverTime(null);
  };

  useEffect(() => {
    const previewVideo = previewVideoRef.current;
    if (!previewVideo || hoverTime === null || !duration) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 160;
      canvasRef.current.height = 90;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Only seek if video is ready
    if (previewVideo.readyState < 2) {
      const handleLoadedData = () => {
        if (hoverTime !== null) {
          previewVideo.currentTime = hoverTime;
        }
      };
      previewVideo.addEventListener('loadeddata', handleLoadedData, { once: true });
      return () => previewVideo.removeEventListener('loadeddata', handleLoadedData);
    }

    // Set the time to capture
    previewVideo.currentTime = hoverTime;

    const captureFrame = () => {
      if (ctx && previewVideo.readyState >= 2) {
        try {
          ctx.drawImage(previewVideo, 0, 0, 160, 90);
          setPreviewImage(canvas.toDataURL());
        } catch (err) {
          console.error('Error capturing frame:', err);
        }
      }
    };

    previewVideo.addEventListener('seeked', captureFrame, { once: true });

    // Timeout fallback in case seeked doesn't fire
    const timeout = setTimeout(() => {
      if (previewVideo.readyState >= 2) {
        captureFrame();
      }
    }, 100);

    return () => {
      previewVideo.removeEventListener('seeked', captureFrame);
      clearTimeout(timeout);
    };
  }, [hoverTime, duration]);

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying && !showSettings && !showVolumeSlider) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSettings && !showVolumeSlider) {
      setShowControls(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100 || 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        autoPlay={autoPlay}
        poster={thumbnail}
        playsInline
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            togglePlayPause();
          }
        }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Hidden video element for generating preview thumbnails */}
      <video
        ref={previewVideoRef}
        src={src}
        className="hidden"
        preload="auto"
        muted
        playsInline
        crossOrigin="anonymous"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-4 pb-2">
          <div className="relative mb-3">
            {hoverTime !== null && progressBarRef.current && (
              <div
                className="absolute bottom-full mb-2 pointer-events-none z-50"
                style={{
                  left: `${Math.max(80, Math.min(hoverPosition, progressBarRef.current.offsetWidth - 80))}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-black/95 rounded-lg overflow-hidden shadow-2xl border border-white/20">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-40 h-auto block"
                    />
                  ) : (
                    <div className="w-40 h-[90px] bg-gray-800 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className="px-2 py-1 text-center bg-black">
                    <span className="text-white text-xs font-medium">
                      {formatTime(hoverTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Expanded hover area with generous padding above and below */}
            <div
              className="relative -my-6 py-6"
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            >
              <div
                ref={progressBarRef}
                className="relative h-1 bg-gray-800 rounded-full cursor-pointer group hover:h-1.5 transition-all"
                onClick={handleProgressClick}
              >
                <div
                  className="absolute h-full bg-gray-600 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                <div
                  className="absolute h-full bg-red-600 rounded-full flex items-center justify-end"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayPause}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
              </button>

              <div
                className="relative group/volume"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={toggleMute}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {showVolumeSlider && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <div className="bg-black/90 rounded-lg px-3 py-4 backdrop-blur-sm shadow-lg">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const newVolume = parseFloat(e.target.value);
                          setVolume(newVolume);
                          setIsMuted(newVolume === 0);
                        }}
                        className="h-24 cursor-pointer accent-red-600"
                        orient="vertical"
                        style={{
                          writingMode: 'bt-lr',
                          WebkitAppearance: 'slider-vertical',
                          width: '4px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <span className="text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowSpeedMenu(false);
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {onTheaterModeToggle && (
                <button
                  onClick={onTheaterModeToggle}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isTheaterMode ? 'Default view' : 'Theater mode'}
                >
                  {isTheaterMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5 rotate-45" />}
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="absolute bottom-16 right-4 bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden min-w-[280px]">
          {!showSpeedMenu ? (
            <div className="py-2">
              <button
                onClick={() => setShowSpeedMenu(true)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors text-white"
              >
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5" strokeWidth={1.5} />
                  <span>Playback Speed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">{playbackRate}x</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          ) : (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-white/20">
                <button
                  onClick={() => setShowSpeedMenu(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <span className="text-white font-medium">Playback Speed</span>
              </div>

              <div className="px-4 py-4 border-b border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setPlaybackRate(Math.max(0.25, playbackRate - 0.25))}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </button>
                  <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.25"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="flex-1 accent-red-600"
                  />
                  <button
                    onClick={() => setPlaybackRate(Math.min(2, playbackRate + 0.25))}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="text-center text-white font-medium">{playbackRate}x</div>
              </div>

              <div className="py-2">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
                    className={`w-full px-4 py-2 text-left transition-colors ${
                      playbackRate === speed
                        ? 'bg-red-600 text-white'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {speed === 1 ? 'Normal' : `${speed}x`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
