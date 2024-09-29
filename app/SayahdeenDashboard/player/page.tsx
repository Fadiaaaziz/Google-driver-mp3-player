import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, SkipBack, Play, Pause, SkipForward, Volume2, Loader } from 'lucide-react';

interface File {
    id: string;
    name: string;
    mimeType: string;
}

interface PlayerProps {
  files: File[];
  currentTrack: string | null;
  setCurrentTrack: (id: string) => void;
}

const API_KEY = 'AIzaSyDLcMWPDMRjrf74olIkuccJVWeemWofIRI';
const speedOptions = [1, 1.25, 1.5, 1.75, 2];

const Player: React.FC<PlayerProps> = ({ files, currentTrack, setCurrentTrack }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (currentTrack) {
      const audioUrl = `https://www.googleapis.com/drive/v3/files/${currentTrack}?alt=media&key=${API_KEY}`;
      
      const audio = new Audio(audioUrl);
      audio.crossOrigin = "anonymous";
      
      audio.addEventListener('canplay', () => {
        setIsLoading(false);
        setIsPlaying(true);
        audio.play().catch(error => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      });

      audio.addEventListener('loadstart', () => {
        setIsLoading(true);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('durationchange', () => {
        setDuration(audio.duration);
      });

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      visualize();

      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = '';
        audio.removeEventListener('canplay', () => {});
        audio.removeEventListener('loadstart', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('durationchange', () => {});
      };
    }
  }, [currentTrack]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error("Error playing audio:", error);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSpeedChange = () => {
    const currentIndex = speedOptions.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    const newSpeed = speedOptions[nextIndex];
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const visualize = () => {
    if (canvasRef.current && analyserRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const width = canvas.width;
        const height = canvas.height;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#4fd1c5';
        
        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    }
    animationRef.current = requestAnimationFrame(visualize);
  };

  const handleNext = () => {
    const currentIndex = files.findIndex(file => file.id === currentTrack);
    const nextIndex = (currentIndex + 1) % files.length;
    setCurrentTrack(files[nextIndex].id);
  };

  const handlePrevious = () => {
    const currentIndex = files.findIndex(file => file.id === currentTrack);
    const previousIndex = (currentIndex - 1 + files.length) % files.length;
    setCurrentTrack(files[previousIndex].id);
  };

  const buttonVariants = {
    playing: { scale: 1 },
    loading: { scale: 1, rotate: 360 },
    stopped: { scale: 1 }
  };

  return (
    <motion.footer
      className={`bg-white border-t border-gray-200 p-2 sm:p-4 ${isMinimized ? 'h-10 sm:h-12' : ''}`}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {isMinimized ? (
        <div className="flex items-center space-x-2 sm:space-x-4">
          <motion.button
            className="text-teal-600 hover:text-teal-700"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 size={16} className="sm:w-5 sm:h-5" />
          </motion.button>
          <div className="flex-grow">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-semibold text-teal-800 truncate mb-2 sm:mb-0">
              {currentTrack ? files.find(f => f.id === currentTrack)?.name : 'No file selected'}
            </h3>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <motion.button
                className="text-teal-600 hover:text-teal-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 size={16} className="sm:w-6 sm:h-6" />
              </motion.button>
              <motion.button
                className="text-teal-600 hover:text-teal-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevious}
              >
                <SkipBack size={16} className="sm:w-6 sm:h-6" />
              </motion.button>
              <motion.button
                className="bg-teal-500 text-white rounded-full p-2 sm:p-3 hover:bg-teal-600"
                onClick={togglePlayPause}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                variants={buttonVariants}
                animate={isLoading ? "loading" : isPlaying ? "playing" : "stopped"}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {isLoading ? (
                  <Loader size={16} className="animate-spin sm:w-6 sm:h-6" />
                ) : isPlaying ? (
                  <Pause size={16} className="sm:w-6 sm:h-6" />
                ) : (
                  <Play size={16} className="sm:w-6 sm:h-6" />
                )}
              </motion.button>
              <motion.button
                className="text-teal-600 hover:text-teal-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
              >
                <SkipForward size={16} className="sm:w-6 sm:h-6" />
              </motion.button>
              <motion.button
                className="text-teal-600 hover:text-teal-700 font-semibold text-xs sm:text-sm"
                onClick={handleSpeedChange}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {speed}x
              </motion.button>
            </div>
          </div>
          <canvas ref={canvasRef} width="800" height="60" className="w-full h-8 sm:h-12" />
          <div className="flex items-center justify-between mt-2 sm:mt-4">
            <span className="text-xs sm:text-sm text-gray-500">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full mx-2 sm:mx-4 h-1 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-gray-500">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center mt-2 sm:mt-4">
            <Volume2 size={16} className="text-gray-500 mr-2 sm:w-5 sm:h-5" />
            <inputs
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-1/4 h-1 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </>
      )}
   
      <audio
        ref={audioRef}
        src={currentTrack ? `https://www.googleapis.com/drive/v3/files/${currentTrack}?alt=media&key=${API_KEY}` : ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
      />
    </motion.footer>
  );
};

export default Player;