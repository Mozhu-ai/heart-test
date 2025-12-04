import React, { useState, useCallback } from 'react';
import HeartScene from './components/HeartScene';
import { resumeAudio } from './services/audioService';

const App: React.FC = () => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [interacted, setInteracted] = useState(false);

  const toggleSound = useCallback(async () => {
    if (!interacted) {
      setInteracted(true);
    }
    
    if (!soundEnabled) {
      try {
        await resumeAudio();
        setSoundEnabled(true);
      } catch (e) {
        console.error("Audio context failed to resume", e);
      }
    } else {
      setSoundEnabled(false);
    }
  }, [soundEnabled, interacted]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white selection:bg-pink-500 selection:text-white">
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <HeartScene soundEnabled={soundEnabled} />
      </div>

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
        
        {/* Header / Title */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white/90">
              Lumina <span className="text-pink-500">Cordis</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/50 tracking-wider uppercase mt-1">
              Volumetric Physics Visualization
            </p>
          </div>
        </header>

        {/* Audio Toggle (Sticky/Persistent) */}
        <div className="absolute top-6 right-6 sm:top-10 sm:right-10 pointer-events-auto">
          <button
            onClick={toggleSound}
            className={`
              group relative flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300
              ${soundEnabled 
                ? 'bg-pink-500/20 border-pink-500/50 hover:bg-pink-500/30' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
              }
            `}
          >
            <div className="relative w-4 h-4">
               {soundEnabled ? (
                 <div className="flex items-end justify-center gap-[2px] h-full w-full">
                   <span className="w-1 bg-pink-400 animate-[bounce_0.8s_infinite] h-full"></span>
                   <span className="w-1 bg-pink-400 animate-[bounce_0.8s_infinite_0.1s] h-2/3"></span>
                   <span className="w-1 bg-pink-400 animate-[bounce_0.8s_infinite_0.2s] h-full"></span>
                 </div>
               ) : (
                 <svg className="w-full h-full text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                 </svg>
               )}
            </div>
            <span className={`text-sm font-medium tracking-wide ${soundEnabled ? 'text-pink-100' : 'text-white/70'}`}>
              {soundEnabled ? 'AUDIO ACTIVE' : 'ENABLE SOUND'}
            </span>
            
            {/* Glow effect */}
            {soundEnabled && (
              <div className="absolute inset-0 rounded-full bg-pink-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            )}
          </button>
        </div>

        {/* Footer */}
        <footer className="text-right pointer-events-auto">
           <div className="text-[10px] sm:text-xs text-white/30 font-mono tracking-widest uppercase">
             Render Mode: WebGL 2.0 • {soundEnabled ? 'Audio: 48kHz Procedural' : 'Audio: Muted'}
           </div>
           <div className="text-[10px] sm:text-xs text-white/20 mt-1">
             x = 16sin³(t) • 15k Particles
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
