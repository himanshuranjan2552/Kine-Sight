import React from 'react';
import '../styles/exercise-demo.css';

interface Props {
  exerciseId: string;
}

export function ExerciseDemo({ exerciseId }: Props) {
  return (
    <div className={`exercise-demo demo-${exerciseId}`}>
      <svg viewBox="0 0 100 100" width="80" height="80" className="stick-figure">
        {/* Animated Background Ring */}
        <circle cx="50" cy="50" r="44" fill="var(--bg-input)" className="demo-bg" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--primary)" strokeWidth="2" strokeOpacity="0.5" className="demo-ring" />

        {/* Head */}
        <circle cx="50" cy="20" r="9" className="demo-head" fill="#FFFFFF" />
        
        {/* Body */}
        <line x1="50" y1="29" x2="50" y2="55" className="demo-body" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        
        {/* Arms */}
        <line x1="50" y1="34" x2="30" y2="48" className="demo-arm demo-arm-l" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="34" x2="70" y2="48" className="demo-arm demo-arm-r" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        
        {/* Legs */}
        <line x1="50" y1="55" x2="35" y2="85" className="demo-leg demo-leg-l" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="55" x2="65" y2="85" className="demo-leg demo-leg-r" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
