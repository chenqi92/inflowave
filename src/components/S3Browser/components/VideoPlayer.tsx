/**
 * 增强的视频播放器组件
 * 提供完整的播放控制功能
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  PictureInPicture,
  Settings,
  List,
  Repeat,
  Repeat1,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/useTranslation';
import type { S3Object } from '@/types/s3';

interface VideoPlayerProps {
  src: string;
  object: S3Object;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  playlist?: S3Object[];
  currentIndex?: number;
}

type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;
type RepeatMode = 'none' | 'one' | 'all';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  object,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  playlist = [],
  currentIndex = 0,
}) => {
  const { t } = useTranslation('s3');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  // 视频元数据
  const [videoInfo, setVideoInfo] = useState({
    width: 0,
    height: 0,
    duration: 0,
  });

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  // 快进/快退
  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // 音量控制
  const handleVolumeChange = useCallback((value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  }, [isMuted]);

  // 进度控制
  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  // 播放速度
  const handleSpeedChange = useCallback((speed: string) => {
    const speedValue = parseFloat(speed) as PlaybackSpeed;
    if (videoRef.current) {
      videoRef.current.playbackRate = speedValue;
      setPlaybackSpeed(speedValue);
    }
  }, []);

  // 循环模式
  const toggleRepeatMode = useCallback(() => {
    const modes: RepeatMode[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
    if (videoRef.current) {
      videoRef.current.loop = nextMode === 'one';
    }
  }, [repeatMode]);

  // 全屏控制
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  // 画中画
  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-picture error:', error);
    }
  }, []);

  // 处理视频结束
  const handleVideoEnded = useCallback(() => {
    if (repeatMode === 'one') {
      if (videoRef.current) {
        videoRef.current.play();
      }
    } else if (repeatMode === 'all' && hasNext) {
      onNext?.();
    } else if (hasNext) {
      // 不循环但有下一个视频时，停留在最后一帧
      setIsPlaying(false);
    }
  }, [repeatMode, hasNext, onNext]);

  // 控制栏自动隐藏
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange([Math.min(volume + 0.1, 1)]);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange([Math.max(volume - 0.1, 0)]);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
          e.preventDefault();
          if (hasNext) onNext?.();
          break;
        case 'p':
          e.preventDefault();
          if (hasPrevious) onPrevious?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, handleVolumeChange, volume, toggleMute, toggleFullscreen, hasNext, hasPrevious, onNext, onPrevious]);

  // 视频事件监听
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleLoadedMetadata = () => {
      setVideoInfo({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
      setDuration(video.duration);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, [handleVideoEnded]);

  // 全屏状态监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 格式化时间
  const formatTime = (time: number): string => {
    if (!isFinite(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-auto max-h-[70vh]"
        onClick={togglePlay}
      />

      {/* 缓冲指示器 */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* 控制栏 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* 进度条 */}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-4 cursor-pointer"
        />

        {/* 控制按钮 */}
        <div className="flex items-center justify-between gap-2 text-white">
          {/* 左侧控制 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="hover:bg-white/20"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            {hasPrevious && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevious}
                className="hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            )}

            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            )}

            {/* 音量控制 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* 时间显示 */}
            <span className="text-sm tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* 右侧控制 */}
          <div className="flex items-center gap-2">
            {/* 循环模式 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeatMode}
              className={cn(
                'hover:bg-white/20',
                repeatMode !== 'none' && 'text-blue-400'
              )}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </Button>

            {/* 播放速度 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/20 text-xs"
                >
                  {playbackSpeed}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('video_player.speed')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={playbackSpeed.toString()} onValueChange={handleSpeedChange}>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                    <DropdownMenuRadioItem key={speed} value={speed.toString()}>
                      {speed}x
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 画中画 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePictureInPicture}
              className="hover:bg-white/20"
            >
              <PictureInPicture className="h-4 w-4" />
            </Button>

            {/* 全屏 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 视频信息（仅在全屏或鼠标悬停时显示） */}
        {(isFullscreen || showControls) && videoInfo.width > 0 && (
          <div className="mt-2 text-xs text-white/60">
            {object.name} • {videoInfo.width}×{videoInfo.height}
            {playlist.length > 1 && ` • ${currentIndex + 1}/${playlist.length}`}
          </div>
        )}
      </div>
    </div>
  );
};
