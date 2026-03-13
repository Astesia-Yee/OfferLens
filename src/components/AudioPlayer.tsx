import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isCalculatingDuration = false;

    const setAudioData = () => {
      if (audio.duration === Infinity || isNaN(audio.duration)) {
        isCalculatingDuration = true;
        audio.currentTime = 1e101;
        setTimeout(() => {
          audio.currentTime = 0;
          setDuration(audio.duration);
          isCalculatingDuration = false;
        }, 100);
      } else {
        setDuration(audio.duration);
      }
    };

    const setAudioTime = () => {
      if (!isCalculatingDuration) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onEnded = () => {
      if (!isCalculatingDuration) {
        setIsPlaying(false);
      }
    };

    const onDurationChange = () => {
      if (audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRateIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextRateIndex];
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
      setPlaybackRate(nextRate);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col w-full bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex items-center space-x-3">
        <button 
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors shrink-0"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>
        
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1.5 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{duration ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        <button 
          onClick={changePlaybackRate}
          className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shrink-0 min-w-[3.5rem]"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
