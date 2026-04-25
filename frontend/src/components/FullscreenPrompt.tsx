import { useState, useEffect } from 'react';

export default function FullscreenPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we are already in fullscreen
    const isFullscreen = document.fullscreenElement != null;
    const hasDismissed = localStorage.getItem('bloom_fullscreen_dismissed') === 'true';
    
    if (!isFullscreen && !hasDismissed) {
      // Small delay so it doesn't pop up instantly, making it feel smoother
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsVisible(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleGoFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setIsVisible(false);
    } catch (err) {
      console.error("Error attempting to enable fullscreen:", err);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('bloom_fullscreen_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="card" style={{ 
        maxWidth: '420px', 
        width: '100%', 
        textAlign: 'center', 
        animation: 'fadeUp 400ms var(--ease-out)',
        border: '1px solid var(--border-strong)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          color: 'var(--accent)'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', marginBottom: '12px' }}>
          Immersive Experience
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14.5px', lineHeight: 1.6 }}>
          Bloom is best experienced in full screen. It minimizes distractions and lets you focus completely on your learning.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={handleDismiss} style={{ flex: 1 }}>
            Maybe Later
          </button>
          <button className="btn btn-primary" onClick={handleGoFullscreen} style={{ flex: 1 }}>
            Go Full Screen
          </button>
        </div>
      </div>
    </div>
  );
}
