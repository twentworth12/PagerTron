import React, { useEffect, useRef, useState } from 'react';

// Force browser to load and autoplay without affecting the game's spacebar controls
const forcePlay = () => {
  try {
    // Only simulate a click event, never a keyboard event to avoid spacebar issues
    const click = new MouseEvent('click', {
      bubbles: false, // Prevent event bubbling to avoid affecting game controls
      cancelable: true,
      view: window
    });

    // Create a temporary element to dispatch the event on, to prevent global document events
    const tempButton = document.createElement('button');
    tempButton.style.display = 'none';
    document.body.appendChild(tempButton);
    tempButton.dispatchEvent(click);
    document.body.removeChild(tempButton);

  } catch (e) {
    console.log('Error simulating click for audio context:', e);
  }
};

const GameMusic = ({ isGameStarted, isGameOver }) => {
  const introMusicRef = useRef(null);
  const gameplayMusicRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true); // Start with music muted by default
  const [initializing, setInitializing] = useState(true);
  
  // Initialize audio on component mount
  useEffect(() => {
    console.log("Initializing GameMusic component");

    // Create audio elements
    introMusicRef.current = new Audio('/music/Race.mp3');
    introMusicRef.current.loop = true;
    introMusicRef.current.volume = 0.5;
    introMusicRef.current.autoplay = true; // Try autoplay attribute

    // Preload gameplay music
    gameplayMusicRef.current = new Audio('/music/Fatality.mp3');
    gameplayMusicRef.current.loop = true;
    gameplayMusicRef.current.volume = 0.4;

    // Attempt to preload both audio files
    introMusicRef.current.preload = "auto";
    gameplayMusicRef.current.preload = "auto";

    // Force a load attempt for both tracks
    introMusicRef.current.load();
    gameplayMusicRef.current.load();

    // Add event listeners to know when audio is loaded
    introMusicRef.current.addEventListener('canplaythrough', () => {
      console.log('Intro music loaded and ready to play');
    });

    gameplayMusicRef.current.addEventListener('canplaythrough', () => {
      console.log('Gameplay music loaded and ready to play');
    });
    
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
          // Use only click and touchstart, not keydown to avoid spacebar conflicts
          const handleFirstInteraction = () => {
            introMusicRef.current.play().catch(e => console.error(e));
            ['click', 'touchstart'].forEach(type => {
              document.removeEventListener(type, handleFirstInteraction);
            });
          };

          // Only use click and touch events to avoid keydown conflicts with spacebar
          ['click', 'touchstart'].forEach(type => {
            document.addEventListener(type, handleFirstInteraction, { once: true });
          });
        });
      }
    };
    
    // Only try to start music if not muted
    if (!isMuted) {
      // Use various techniques to try to start the music
      startIntroMusic();

      // Brute force approach - try every 500ms for first 5 seconds
      const autoplayAttempts = [];
      for (let i = 1; i <= 10; i++) {
        autoplayAttempts.push(
          setTimeout(() => {
            if (initializing && !isMuted) {
              forcePlay();
              startIntroMusic();
            }
          }, i * 500)
        );
      }
    } else {
      // If starting muted, just mark as initialized
      setInitializing(false);
    }

    // Force audio playback if user clicks anywhere on the page
    const handleAnyClick = () => {
      if (initializing && !isMuted) {
        startIntroMusic();
      }
    };

    // Only add the click listener, not keydown to avoid spacebar conflicts
    document.addEventListener('click', handleAnyClick);

    // Clean up on unmount
    return () => {
      // Clear any timeouts that might have been created
      if (typeof autoplayAttempts !== 'undefined' && autoplayAttempts) {
        autoplayAttempts.forEach(timeout => clearTimeout(timeout));
      }
      document.removeEventListener('click', handleAnyClick);
      
      if (introMusicRef.current) {
        introMusicRef.current.pause();
      }
      
      if (gameplayMusicRef.current) {
        gameplayMusicRef.current.pause();
      }
    };
  }, [initializing, isMuted]);
  
  // Handle music transitions based on game state
  useEffect(() => {
    if (isMuted) return; // Skip transitions if muted

    // Debug log to see state changes
    console.log("Music transition - Game Started:", isGameStarted, "Game Over:", isGameOver);

    const handleMusicTransition = async () => {
      if (!introMusicRef.current || !gameplayMusicRef.current) return;
      
      if (isGameStarted && !isGameOver) {
        // Transition to gameplay music
        try {
          console.log("Switching to gameplay music");

          // Stop intro music immediately
          introMusicRef.current.pause();
          introMusicRef.current.currentTime = 0;

          // Immediately start gameplay music with a very short delay
          gameplayMusicRef.current.currentTime = 0;
          console.log("Attempting to play gameplay music");

          // Force user interaction to enable audio
          forcePlay();
          document.body.click();

          // Try to play with aggressive retry
          const playPromise = gameplayMusicRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log("Gameplay music started successfully");
            }).catch(e => {
              console.error('Failed to play gameplay music:', e);
              // Try multiple times with increasing delay
              setTimeout(() => {
                forcePlay();
                gameplayMusicRef.current.play().catch(err => {
                  console.error('Second attempt failed:', err);
                  // One more try after a longer delay
                  setTimeout(() => {
                    forcePlay();
                    gameplayMusicRef.current.play().catch(console.error);
                  }, 500);
                });
              }, 100);
            });
          }
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
    
    // Run the music transition immediately
    handleMusicTransition();

    // Also set up a delayed retry to handle edge cases
    if (isGameStarted && !isGameOver && !isMuted) {
      const retryTimer = setTimeout(() => {
        console.log("Retry playing gameplay music");
        if (gameplayMusicRef.current && gameplayMusicRef.current.paused) {
          forcePlay();
          gameplayMusicRef.current.play().catch(console.error);
        }
      }, 1000);

      return () => clearTimeout(retryTimer);
    }

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
  
  // Block any keydown events on this component to prevent spacebar conflicts
  useEffect(() => {
    const preventKeydown = (e) => {
      // Only prevent spacebar to avoid blocking other keyboard controls
      if (e.key === " " || e.keyCode === 32) {
        e.stopPropagation();
      }
    };

    // Add a keydown listener to our button element to prevent spacebar from toggling music
    const buttonElement = document.getElementById("music-toggle-button");
    if (buttonElement) {
      buttonElement.addEventListener("keydown", preventKeydown, { capture: true });

      return () => {
        buttonElement.removeEventListener("keydown", preventKeydown, { capture: true });
      };
    }
  }, []);

  // Render mute/unmute button
  return (
    <button
      id="music-toggle-button"
      tabIndex="-1" // Prevent button from receiving focus and keyboard events
      onClick={(e) => {
        e.preventDefault(); // Prevent any default or bubbling
        e.stopPropagation();
        toggleMute();
      }}
      onKeyDown={(e) => {
        // Prevent spacebar from toggling the button
        if (e.key === " " || e.keyCode === 32) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }}
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
      {isMuted ? '🔈 CLICK FOR MUSIC' : '🔊 MUSIC ON'}
    </button>
  );
};

export default GameMusic;