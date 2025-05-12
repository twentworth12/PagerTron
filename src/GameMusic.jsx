import React, { useEffect, useRef, useState } from 'react';

// Force browser to load and autoplay
const forcePlay = () => {
  try {
    // Try to simulate a user event to unlock audio
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    document.dispatchEvent(click);
  } catch (e) {
    console.log('Error simulating click:', e);
  }
};

const GameMusic = ({ isGameStarted, isGameOver }) => {
  const introMusicRef = useRef(null);
  const gameplayMusicRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Initialize audio on component mount
  useEffect(() => {
    // Create audio elements
    introMusicRef.current = new Audio('/music/Race.mp3');
    introMusicRef.current.loop = true;
    introMusicRef.current.volume = 0.5;
    introMusicRef.current.autoplay = true; // Try autoplay attribute
    
    gameplayMusicRef.current = new Audio('/music/Fatality.mp3');
    gameplayMusicRef.current.loop = true;
    gameplayMusicRef.current.volume = 0.4;
    
    // Helper function to start playing intro music
    const startIntroMusic = () => {
      if (!introMusicRef.current) return;
      
      const promise = introMusicRef.current.play();
      if (promise !== undefined) {
        promise.then(() => {
          console.log('Intro music started');
          setInitializing(false);
        }).catch(err => {
          console.log('Autoplay still prevented. Will try with user gesture.', err);
          
          // Specifically set up for first valid user interaction
          const handleFirstInteraction = () => {
            introMusicRef.current.play().catch(e => console.error(e));
            ['click', 'touchstart', 'keydown'].forEach(type => {
              document.removeEventListener(type, handleFirstInteraction);
            });
          };
          
          ['click', 'touchstart', 'keydown'].forEach(type => {
            document.addEventListener(type, handleFirstInteraction, { once: true });
          });
        });
      }
    };
    
    // Use various techniques to try to start the music
    startIntroMusic();
    
    // Brute force approach - try every 500ms for first 5 seconds
    const autoplayAttempts = [];
    for (let i = 1; i <= 10; i++) {
      autoplayAttempts.push(
        setTimeout(() => {
          if (initializing) {
            forcePlay();
            startIntroMusic();
          }
        }, i * 500)
      );
    }
    
    // Force audio playback if user clicks anywhere on the page
    const handleAnyClick = () => {
      if (initializing) {
        startIntroMusic();
      }
    };
    
    document.addEventListener('click', handleAnyClick);
    
    // Clean up on unmount
    return () => {
      autoplayAttempts.forEach(timeout => clearTimeout(timeout));
      document.removeEventListener('click', handleAnyClick);
      
      if (introMusicRef.current) {
        introMusicRef.current.pause();
      }
      
      if (gameplayMusicRef.current) {
        gameplayMusicRef.current.pause();
      }
    };
  }, [initializing]);
  
  // Handle music transitions based on game state
  useEffect(() => {
    if (isMuted) return; // Skip transitions if muted
    
    const handleMusicTransition = async () => {
      if (!introMusicRef.current || !gameplayMusicRef.current) return;
      
      if (isGameStarted && !isGameOver) {
        // Transition to gameplay music
        try {
          introMusicRef.current.pause();
          introMusicRef.current.currentTime = 0;
          
          // Start gameplay music
          gameplayMusicRef.current.currentTime = 0;
          await gameplayMusicRef.current.play().catch(e => {
            console.error('Failed to play gameplay music:', e);
            forcePlay();
            gameplayMusicRef.current.play().catch(console.error);
          });
        } catch (error) {
          console.error('Error in music transition to gameplay:', error);
        }
      } else if (isGameOver) {
        // Fade out gameplay music and start intro music again
        try {
          // Fade out gameplay music
          const fadeOut = setInterval(() => {
            if (gameplayMusicRef.current) {
              if (gameplayMusicRef.current.volume > 0.1) {
                gameplayMusicRef.current.volume -= 0.1;
              } else {
                clearInterval(fadeOut);
                gameplayMusicRef.current.pause();
                gameplayMusicRef.current.volume = 0.4; // Reset volume for next time
                
                // Restart the intro music
                introMusicRef.current.currentTime = 0;
                introMusicRef.current.volume = 0.5;
                introMusicRef.current.play().catch(e => {
                  console.error('Failed to restart intro music after game over:', e);
                  forcePlay();
                  introMusicRef.current.play().catch(console.error);
                });
              }
            } else {
              clearInterval(fadeOut);
            }
          }, 100);
        } catch (error) {
          console.error('Error in music transition to game over:', error);
        }
      } else if (!isGameStarted && !isGameOver && !introMusicRef.current.paused) {
        // Already playing intro music, nothing to do
      } else if (!isGameStarted && !isGameOver) {
        // Start/restart intro music if it's not playing
        try {
          gameplayMusicRef.current.pause();
          
          introMusicRef.current.currentTime = 0;
          introMusicRef.current.play().catch(e => {
            console.error('Failed to play intro music:', e);
            forcePlay();
            introMusicRef.current.play().catch(console.error);
          });
        } catch (error) {
          console.error('Error restarting intro music:', error);
        }
      }
    };
    
    handleMusicTransition();
  }, [isGameStarted, isGameOver, isMuted]);
  
  // Toggle mute function for the music button
  const toggleMute = () => {
    setIsMuted(prevMuted => {
      const newMuted = !prevMuted;
      
      if (newMuted) {
        // Mute audio - pause both tracks
        if (introMusicRef.current) introMusicRef.current.pause();
        if (gameplayMusicRef.current) gameplayMusicRef.current.pause();
      } else {
        // Unmute - resume appropriate track based on game state
        if (isGameStarted && !isGameOver) {
          if (gameplayMusicRef.current) {
            gameplayMusicRef.current.play().catch(e => {
              console.error('Failed to resume gameplay music:', e);
              forcePlay();
              gameplayMusicRef.current.play();
            });
          }
        } else {
          if (introMusicRef.current) {
            introMusicRef.current.play().catch(e => {
              console.error('Failed to resume intro music:', e);
              forcePlay();
              introMusicRef.current.play();
            });
          }
        }
      }
      
      return newMuted;
    });
  };
  
  // Render mute/unmute button
  return (
    <button
      onClick={toggleMute}
      style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.6)',
        border: '2px solid white',
        borderRadius: '5px',
        color: 'white',
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '12px',
        padding: '5px 10px',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isMuted ? '🔈 MUSIC OFF' : '🔊 MUSIC ON'}
    </button>
  );
};

export default GameMusic;