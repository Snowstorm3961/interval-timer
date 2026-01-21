import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function IntervalTimer() {
  const [primaryInterval, setPrimaryInterval] = useState(20);
  const [secondaryInterval, setSecondaryInterval] = useState(10);
  const [useSecondary, setUseSecondary] = useState(false);
  const [tickInterval, setTickInterval] = useState(0); // 0 = off, 1 = every second, 5 = every 5 sec
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isPrimaryPhase, setIsPrimaryPhase] = useState(true);
  
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const phaseStartRef = useRef(0);
  const lastTickRef = useRef(0);
  const isPrimaryPhaseRef = useRef(true);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playBeep = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Pleasant major chord chime
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      const startTime = now + i * 0.05;
      const duration = 0.3;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }, [getAudioContext]);

  const playTick = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Soft, short tick sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now); // A5 - higher, subtle
    
    const duration = 0.05;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
  }, [getAudioContext]);

  const tick = useCallback((timestamp) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      phaseStartRef.current = timestamp;
      lastTickRef.current = 0;
      isPrimaryPhaseRef.current = true;
      setIsPrimaryPhase(true);
    }
    
    const currentInterval = isPrimaryPhaseRef.current ? primaryInterval : secondaryInterval;
    const phaseElapsed = (timestamp - phaseStartRef.current) / 1000;
    
    setElapsed(phaseElapsed);
    
    // Handle ticks
    if (tickInterval > 0) {
      const tickCount = Math.floor(phaseElapsed / tickInterval);
      if (tickCount > lastTickRef.current && phaseElapsed < currentInterval) {
        lastTickRef.current = tickCount;
        playTick();
      }
    }
    
    // Check if phase completed
    if (phaseElapsed >= currentInterval) {
      playBeep();
      phaseStartRef.current = timestamp;
      lastTickRef.current = 0;
      
      if (useSecondary) {
        isPrimaryPhaseRef.current = !isPrimaryPhaseRef.current;
        setIsPrimaryPhase(isPrimaryPhaseRef.current);
      }
    }
    
    animationRef.current = requestAnimationFrame(tick);
  }, [primaryInterval, secondaryInterval, useSecondary, tickInterval, playBeep, playTick]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = null;
      phaseStartRef.current = null;
      lastTickRef.current = 0;
      isPrimaryPhaseRef.current = true;
      setIsPrimaryPhase(true);
      animationRef.current = requestAnimationFrame(tick);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, tick]);

  const handleStart = () => {
    getAudioContext(); // Initialize on user interaction
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    setElapsed(0);
    setIsPrimaryPhase(true);
    isPrimaryPhaseRef.current = true;
    startTimeRef.current = null;
    phaseStartRef.current = null;
    lastTickRef.current = 0;
  };

  const currentInterval = isPrimaryPhase ? primaryInterval : secondaryInterval;
  const progress = elapsed / currentInterval;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);
  
  const intervalOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
  const tickOptions = [
    { value: 0, label: 'Off' },
    { value: 1, label: '1s' },
    { value: 5, label: '5s' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-light text-white mb-2 tracking-wide">Interval Timer</h1>
      
      {/* Phase indicator */}
      {useSecondary && (
        <div className={`text-sm uppercase tracking-widest mb-6 transition-colors duration-300 ${isPrimaryPhase ? 'text-purple-300' : 'text-teal-300'}`}>
          {isPrimaryPhase ? 'Work' : 'Rest'}
        </div>
      )}
      {!useSecondary && <div className="mb-6" />}
      
      {/* Circular Progress */}
      <div className="relative mb-8">
        <svg width="280" height="280" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke={`url(#gradient-${isPrimaryPhase ? 'primary' : 'secondary'})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-colors duration-300"
            style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
          />
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="gradient-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#22d3d2" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light text-white tabular-nums">
            {Math.ceil(currentInterval - elapsed)}
          </span>
          <span className={`text-sm mt-2 uppercase tracking-widest transition-colors duration-300 ${isPrimaryPhase ? 'text-purple-300' : 'text-teal-300'}`}>
            seconds
          </span>
        </div>
        
        {/* Pulse animation when running */}
        {isRunning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`w-64 h-64 rounded-full border-2 opacity-30 animate-ping ${isPrimaryPhase ? 'border-purple-400' : 'border-teal-400'}`}
              style={{ animationDuration: '2s' }}
            />
          </div>
        )}
      </div>
      
      {/* Primary Interval Selector */}
      <div className="mb-4 w-full max-w-lg">
        <label className="block text-purple-300 text-sm mb-3 text-center uppercase tracking-wider">
          {useSecondary ? 'Work Interval' : 'Interval'}
        </label>
        <div className="flex flex-wrap justify-center gap-2">
          {intervalOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => !isRunning && setPrimaryInterval(opt)}
              disabled={isRunning}
              className={`
                w-11 h-11 rounded-full text-sm font-medium transition-all duration-200
                ${primaryInterval === opt 
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50' 
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }
                ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      
      {/* Secondary Timer Toggle & Selector */}
      <div className="mb-4 w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-3">
          <label className="text-teal-300 text-sm uppercase tracking-wider">
            Rest Interval
          </label>
          <button
            onClick={() => !isRunning && setUseSecondary(!useSecondary)}
            disabled={isRunning}
            className={`
              w-12 h-6 rounded-full transition-all duration-200 relative
              ${useSecondary ? 'bg-teal-500' : 'bg-white/20'}
              ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className={`
              w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200
              ${useSecondary ? 'left-6' : 'left-0.5'}
            `} />
          </button>
        </div>
        
        {useSecondary && (
          <div className="flex flex-wrap justify-center gap-2">
            {intervalOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => !isRunning && setSecondaryInterval(opt)}
                disabled={isRunning}
                className={`
                  w-11 h-11 rounded-full text-sm font-medium transition-all duration-200
                  ${secondaryInterval === opt 
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/50' 
                    : 'bg-white/10 text-teal-200 hover:bg-white/20'
                  }
                  ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Tick Interval Selector */}
      <div className="mb-8 w-full max-w-lg">
        <label className="block text-amber-300 text-sm mb-3 text-center uppercase tracking-wider">
          Tick Sound
        </label>
        <div className="flex justify-center gap-3">
          {tickOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => !isRunning && setTickInterval(opt.value)}
              disabled={isRunning}
              className={`
                px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${tickInterval === opt.value 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50' 
                  : 'bg-white/10 text-amber-200 hover:bg-white/20'
                }
                ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex gap-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="px-10 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full font-medium text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200 uppercase tracking-wider"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-medium text-lg shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 transition-all duration-200 uppercase tracking-wider"
          >
            Stop
          </button>
        )}
      </div>
      
      {/* Status indicator */}
      <div className="mt-8 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-purple-300 text-sm uppercase tracking-wider">
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>
    </div>
  );
}
