import React, { useEffect, useState } from "react";
import './Pagertron.css';
import HighScoreModal from './HighScoreModal';
import HighScoreTicker from './HighScoreTicker';
// Import GameMusic with a key to force complete remount when game state changes
import GameMusic from './GameMusic';

function PagerTron() {
  const SCREEN_WIDTH = 1280;
  const SCREEN_HEIGHT = 720;
  const PLAYER_SIZE = 50;
  const PAGER_SIZE = 50;
  const MISSILE_SIZE = 15;
  const KONAMI_MISSILE_SIZE = 15 * 5; // 75px
  const COLLISION_RADIUS = 20;
  const TRANSITION_DURATION = 2000;
  const SAFE_DISTANCE = 250; // Minimum distance from (640,360)

  // Helper: Generate random pager positions at least SAFE_DISTANCE away from (640,360)
  function generateRandomPagers(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * (SCREEN_WIDTH - PAGER_SIZE));
        y = Math.floor(Math.random() * (SCREEN_HEIGHT - PAGER_SIZE));
      } while (Math.sqrt((x - 640) ** 2 + (y - 360) ** 2) < SAFE_DISTANCE);
      positions.push({ id: i + 1, x, y });
    }
    return positions;
  }

  // Mobile device detection (phone, not tablet)
  const isMobile = /Mobi|Android.*Mobile/.test(navigator.userAgent);
  if (isMobile) {
    return (
      <div style={{
        backgroundColor: "#F25533",
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "white",
        fontFamily: "'Press Start 2P', cursive",
        padding: "20px"
      }}>
        <div style={{
          fontSize: "48px",
          color: "rgba(255, 255, 255, 0.2)",
          lineHeight: "1.2",
          maxWidth: "90%",
          margin: "0 auto"
        }}>
          Coming soon, check it out on your desktop for now
        </div>
      </div>
    );
  }

  // Regular game state variables
  const [pagers, setPagers] = useState(generateRandomPagers(7));
  const [gameStarted, setGameStarted] = useState(false);
  const [player, setPlayer] = useState({ x: 640, y: 360, direction: "up" });
  const [missiles, setMissiles] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [konamiActive, setKonamiActive] = useState(false);
  const [konamiMessageVisible, setKonamiMessageVisible] = useState(false);

  // Finale effect state
  const [finaleActive, setFinaleActive] = useState(false);
  // finalComplete becomes true after a 5-second delay once finaleActive is triggered.
  const [finalComplete, setFinalComplete] = useState(false);
  const [finalMissiles, setFinalMissiles] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);

  const konamiCode = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"
  ];
  const [konamiInput, setKonamiInput] = useState([]);

  // Main game loop (runs when game is active and not over)
  useEffect(() => {
    if (!gameStarted || gameOver || isTransitioning) return;
    const gameLoop = setInterval(() => {
      setMissiles(prevMissiles => {
        const updatedMissiles = prevMissiles
          .map(missile => {
            let newX = missile.x;
            let newY = missile.y;
            const speed = 8;
            if (missile.direction === "up") newY -= speed;
            if (missile.direction === "down") newY += speed;
            if (missile.direction === "left") newX -= speed;
            if (missile.direction === "right") newX += speed;
            return { ...missile, x: newX, y: newY };
          })
          .filter(
            missile =>
              missile.y > 0 &&
              missile.y < SCREEN_HEIGHT &&
              missile.x > 0 &&
              missile.x < SCREEN_WIDTH
          );

      setPagers(prevPagers => {
        let pagersToRemove = [];
        const updatedPagers = prevPagers
          .map(pager => {
            const baseSpeed = 1;
            const speed = baseSpeed * Math.pow(1.2, level - 1);
            const dx = player.x - pager.x;
            const dy = player.y - pager.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let moveX = distance > 0 ? (dx / distance) * speed : 0;
            let moveY = distance > 0 ? (dy / distance) * speed : 0;
            if (Math.random() < 0.2) {
              const jitterAmount = speed * 0.5;
              const randomAngle = Math.random() * 2 * Math.PI;
              moveX += Math.cos(randomAngle) * jitterAmount;
              moveY += Math.sin(randomAngle) * jitterAmount;
            }
            return { ...pager, x: pager.x + moveX, y: pager.y + moveY };
          })
          .filter(pager => {
            const hitByMissile = updatedMissiles.some((missile, missileIndex) => {
              const distance = Math.sqrt(
                Math.pow(missile.x - pager.x, 2) +
                Math.pow(missile.y - pager.y, 2)
              );
              const effectiveMissileSize = konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE;
              if (distance < (PAGER_SIZE + effectiveMissileSize) / 2) {
                pagersToRemove.push(pager);
                setMissiles(prev => prev.filter((_, index) => index !== missileIndex));
                return true;
              }
              return false;
            });
            return !hitByMissile;
          });

        if (pagersToRemove.length > 0) {
          setScore(prevScore => prevScore + pagersToRemove.length * 10);
        }

        const playerHit = updatedPagers.some(pager => {
          const distance = Math.sqrt(
            Math.pow(player.x + PLAYER_SIZE / 2 - (pager.x + PAGER_SIZE / 2), 2) +
            Math.pow(player.y + PLAYER_SIZE / 2 - (pager.y + PAGER_SIZE / 2), 2)
          );
          if (distance < 100) {
            console.log(`Distance to pager at (${pager.x}, ${pager.y}): ${distance}`);
          }
          return distance < COLLISION_RADIUS;
        });

        if (playerHit && !gameOver) {
          console.log("Player hit by pager!");
          setGameOver(true);
        }

        if (updatedPagers.length === 0) {
          setIsTransitioning(true);
          setTimeout(() => {
            setLevel(prevLevel => prevLevel + 1);
            setPagers(generateRandomPagers(7));
            setMissiles([]);
            setIsTransitioning(false);
          }, TRANSITION_DURATION);
        }
        return updatedPagers;
      });
        return updatedMissiles;
      });
    }, 50);
    return () => clearInterval(gameLoop);
  }, [player, level, gameOver, isTransitioning, konamiActive, gameStarted]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!gameStarted) {
        if (event.key === " ") {
          setGameStarted(true);

          // Force a user interaction to help with audio context
          document.body.click();
        }
        return;
      }
      if (gameOver || isTransitioning) return;
      setPlayer(prev => {
        const speed = 8;
        let newX = Math.max(0, Math.min(SCREEN_WIDTH - PLAYER_SIZE, prev.x));
        let newY = Math.max(0, Math.min(SCREEN_HEIGHT - PLAYER_SIZE, prev.y));
        let newDirection = prev.direction;
        if (event.key === "ArrowUp") { newY -= speed; newDirection = "up"; }
        if (event.key === "ArrowDown") { newY += speed; newDirection = "down"; }
        if (event.key === "ArrowLeft") { newX -= speed; newDirection = "left"; }
        if (event.key === "ArrowRight") { newX += speed; newDirection = "right"; }
        return { x: newX, y: newY, direction: newDirection };
      });
      if (event.key === " ") {
        setMissiles(prev => {
          // Calculate the center of the player
          const centerX = player.x + PLAYER_SIZE / 2;
          const centerY = player.y + PLAYER_SIZE / 2;

          // Adjust the starting position based on direction
          let missileX = centerX;
          let missileY = centerY;

          // Add the missile with centered coordinates
          return [
            ...prev,
            { x: missileX, y: missileY, direction: player.direction }
          ];
        });
      }

      // Toggle music with "m" key
      if (event.key.toLowerCase() === "m") {
        // Find the music toggle button and simulate a click
        const musicButton = document.getElementById("music-toggle-button");
        if (musicButton) {
          musicButton.click();
        }
      }

      const key = event.key;
      setKonamiInput(prev => {
        const newInput = [...prev, key];
        if (newInput.length > konamiCode.length) newInput.shift();
        const lastEight = newInput.slice(-konamiCode.length);
        if (JSON.stringify(lastEight) === JSON.stringify(konamiCode)) {
          setKonamiActive(true);
          setKonamiMessageVisible(true);
          setTimeout(() => setKonamiMessageVisible(false), 2000);
          console.log("Konami Code activated, konamiActive:", true);
          return [];
        }
        return newInput;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, player, gameOver, isTransitioning, konamiCode]);

  // When the player dies, trigger the finale effect immediately
  useEffect(() => {
    if (gameOver) {
      // Use a shorter delay (only 1 second) before starting the finale
      const timer = setTimeout(() => {
        // Clear regular missiles when finale begins
        setMissiles([]);
        setFinaleActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameOver]);

  // Finale: Launch missiles in all directions to clear the entire screen
  useEffect(() => {
    if (finaleActive) {
      // Store pager positions before clearing them for explosion effects
      const pagerPositions = pagers.map(pager => ({ x: pager.x, y: pager.y, id: pager.id }));

      // Force clear all pagers immediately to ensure clean wipe effect
      // We'll still create explosions at their last positions
      setTimeout(() => setPagers([]), 100);

      const logoCenter = { x: 640, y: 360 };
      const missiles = [];

      // Create missiles targeting where pagers were (using stored positions)
      pagerPositions.forEach(target => {
        const dx = target.x - logoCenter.x;
        const dy = target.y - logoCenter.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        missiles.push({
          x: logoCenter.x,
          y: logoCenter.y,
          dx: dx / mag,
          dy: dy / mag,
          targetId: target.id
        });
      });

      // Add missiles in a very dense grid pattern to cover the entire screen quickly
      const gridSize = 16; // 16x16 grid = 256 additional missiles for a faster, more thorough screen wipe
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Calculate target positions across the screen
          const targetX = (SCREEN_WIDTH * (i + 0.5)) / gridSize;
          const targetY = (SCREEN_HEIGHT * (j + 0.5)) / gridSize;

          const dx = targetX - logoCenter.x;
          const dy = targetY - logoCenter.y;
          const mag = Math.sqrt(dx * dx + dy * dy);

          // Only add if this is a new direction (avoid duplicates)
          if (mag > 10) { // Avoid center point
            missiles.push({
              x: logoCenter.x,
              y: logoCenter.y,
              dx: dx / mag,
              dy: dy / mag
            });
          }
        }
      }

      setFinalMissiles(missiles);
    }
  }, [finaleActive]);

  // Finale: Update final missiles and clear the screen with explosive effects
  useEffect(() => {
    if (!finaleActive) return;

    const updateInterval = setInterval(() => {
      // Update missile positions
      setFinalMissiles(prevMissiles => {
        const newMissiles = prevMissiles.map(missile => ({
          ...missile,
          x: missile.x + missile.dx * 35, // Faster missile speed
          y: missile.y + missile.dy * 35, // Faster missile speed
        }));

        // Check for missiles that are now out of bounds
        const outOfBoundsMissiles = newMissiles.filter(missile =>
          missile.x < 0 || missile.x > SCREEN_WIDTH ||
          missile.y < 0 || missile.y > SCREEN_HEIGHT
        );

        // Create explosions at the positions of missiles that went out of bounds
        if (outOfBoundsMissiles.length > 0) {
          // Create multiple explosions for each out-of-bounds missile
          outOfBoundsMissiles.forEach(missile => {
            const baseX = Math.max(0, Math.min(SCREEN_WIDTH, missile.x));
            const baseY = Math.max(0, Math.min(SCREEN_HEIGHT, missile.y));

            // Add 2-3 explosions per missile for a faster but still dramatic effect
            const explosionCount = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < explosionCount; i++) {
              setExplosions(prev => [
                ...prev,
                {
                  x: baseX + (Math.random() * 60 - 30),
                  y: baseY + (Math.random() * 60 - 30),
                  size: Math.random() * 120 + 40,
                  createdAt: Date.now() + (i * 40) // Faster stagger timing
                }
              ]);
            }
          });

          // Add some random explosions elsewhere on screen for dramatic effect
          if (Math.random() < 0.3) { // 30% chance each update
            const randomX = Math.random() * SCREEN_WIDTH;
            const randomY = Math.random() * SCREEN_HEIGHT;
            setExplosions(prev => [
              ...prev,
              {
                x: randomX,
                y: randomY,
                size: Math.random() * 150 + 50,
                createdAt: Date.now()
              }
            ]);
          }
        }

        // Keep only missiles that are still on screen
        return newMissiles.filter(missile =>
          missile.x >= 0 && missile.x <= SCREEN_WIDTH &&
          missile.y >= 0 && missile.y <= SCREEN_HEIGHT
        );
      });

      // Clear all pagers with dramatic explosions
      setPagers(prevPagers => {
        // If we have missiles in motion and pagers remaining
        if (finalMissiles.length > 0 && prevPagers.length > 0) {
          // Create explosions for all remaining pagers
          prevPagers.forEach(pager => {
            // Add multiple explosions per pager for a more dramatic effect
            for (let i = 0; i < 3; i++) {
              setExplosions(prev => [
                ...prev,
                {
                  x: pager.x + (Math.random() * 30 - 15),
                  y: pager.y + (Math.random() * 30 - 15),
                  size: Math.random() * 100 + 50,
                  createdAt: Date.now() + (i * 100) // Stagger explosion timing
                }
              ]);
            }
          });

          // Destroy all pagers regardless of missile proximity
          // This ensures the screen is completely cleared during the finale
          const remainingPagers = [];

          return remainingPagers;
        }
        return prevPagers;
      });

      // Remove old explosions
      setExplosions(prev =>
        prev.filter(explosion => Date.now() - explosion.createdAt < 700) // Shorter explosion duration
      );

    }, 50);

    return () => clearInterval(updateInterval);
  }, [finaleActive, SCREEN_WIDTH, SCREEN_HEIGHT, KONAMI_MISSILE_SIZE]);

  // When gameOver and finaleActive are true, use a much shorter finale effect and skip to final screen
  useEffect(() => {
    if (gameOver && finaleActive) {
      // Use a much shorter time for the screen clearing effect
      const timer = setTimeout(() => {
        // Create one final massive explosion effect before transitioning
        const centerX = SCREEN_WIDTH / 2;
        const centerY = SCREEN_HEIGHT / 2;

        // Add a final burst of explosions
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 200;
          setExplosions(prev => [
            ...prev,
            {
              x: centerX + Math.cos(angle) * distance,
              y: centerY + Math.sin(angle) * distance,
              size: Math.random() * 200 + 100,
              createdAt: Date.now() + (i * 50) // Shorter stagger between explosions
            }
          ]);
        }

        // Show high score modal after finale effect
        setTimeout(() => {
          setFinaleActive(false);
          setShowHighScoreModal(true); // Show high score modal first
        }, 500);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [gameOver, finaleActive, SCREEN_WIDTH, SCREEN_HEIGHT]);

  const handleCloseHighScoreModal = () => {
    setShowHighScoreModal(false);
    setFinalComplete(true);
  };

  const resetGame = () => {
    // Reset all game state variables
    setPagers(generateRandomPagers(7));
    setGameStarted(false);
    setPlayer({ x: 640, y: 360, direction: "up" });
    setMissiles([]);
    setGameOver(false);
    setLevel(1);
    setScore(0);
    setIsTransitioning(false);
    setKonamiActive(false);
    setKonamiMessageVisible(false);
    setFinaleActive(false);
    setFinalComplete(false);
    setFinalMissiles([]);
    setExplosions([]);
    setKonamiInput([]);
  };

  // --- Render High Score Modal ---
  if (showHighScoreModal) {
    return (
      <div style={{
        backgroundColor: "#F25533",
        width: `${SCREEN_WIDTH}px`,
        height: `${SCREEN_HEIGHT}px`,
        margin: "auto",
        border: "5px solid white",
        position: "relative"
      }}>
        <GameMusic
          key={`music-highscore-${Date.now()}`}
          isGameStarted={gameStarted}
          isGameOver={gameOver}
        />
        <HighScoreModal
          score={score}
          level={level}
          onClose={handleCloseHighScoreModal}
          isVisible={showHighScoreModal}
        />
      </div>
    );
  }

  // --- Render Final Screen if finalComplete is true ---
  if (finalComplete) {
    return (
      <div style={{
        backgroundColor: "#F25533",
        width: `${SCREEN_WIDTH}px`,
        height: `${SCREEN_HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "white",
        fontFamily: "'Press Start 2P', cursive",
        border: "5px solid white",
        overflow: "hidden",
        margin: "auto",
        position: "relative",
        padding: "20px"
      }}>
        <GameMusic
          key={`music-finalscreen-${Date.now()}`}
          isGameStarted={false}
          isGameOver={true}
        />
        <img
          src="https://media.licdn.com/dms/image/v2/D4E0BAQFJhMcjf87eCA/company-logo_200_200/company-logo_200_200/0/1709897084853/incident_io_logo?e=2147483647&v=beta&t=YhaUWh2pX9QqQKlHsXxEjzyd6KCbH5ntKRAJ6fx2SP4"
          alt="Incident.io Logo"
          style={{ width: "200px", height: "200px" }}
        />
        <div style={{
          fontSize: "48px",
          lineHeight: "1",
          maxWidth: "80%",
          margin: "20px auto 0"
        }}>
          Move fast when you break things.
        </div>
        <div style={{ fontSize: "32px", marginTop: "10px" }}>
          all-in-one incident management
        </div>
        <div style={{ fontSize: "32px", marginTop: "10px" }}>
          <a
            href="https://incident.io"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "white", textDecoration: "underline" }}
          >
            get started at incident.io
          </a>
        </div>

        <button
          onClick={resetGame}
          style={{
            marginTop: "30px",
            padding: "15px 30px",
            fontSize: "24px",
            fontFamily: "'Press Start 2P', cursive",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            border: "3px solid white",
            borderRadius: "5px",
            cursor: "pointer",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  // --- Regular Game Rendering ---
  return (
    <div style={{
      backgroundColor: "#F25533",
      color: "white",
      width: `${SCREEN_WIDTH}px`,
      height: `${SCREEN_HEIGHT}px`,
      position: "relative",
      margin: "auto",
      border: "5px solid white",
      overflow: "hidden"
    }}>
      <GameMusic
        key={`music-game-${gameStarted ? 'playing' : 'menu'}-${gameOver ? 'over' : 'active'}-${Date.now()}`}
        isGameStarted={gameStarted}
        isGameOver={gameOver}
      />
      {/* Background Text Overlay */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontFamily: "'Press Start 2P', cursive",
        textAlign: "center",
        pointerEvents: "none",
        opacity: gameOver || isTransitioning ? 0 : 1,
        transition: "opacity 0.5s",
        zIndex: 0
      }}>
        <div style={{
          fontSize: "100px",
          color: "rgba(255, 255, 255, 0.2)",
          lineHeight: "1",
          maxWidth: "80%",
          margin: "0 auto"
        }}>
          PagerTron
        </div>
        <div style={{
          fontSize: "30px",
          color: "rgba(255, 255, 255, 0.6)",
          marginTop: "-10px"
        }}>
          by incident.io
        </div>
      </div>

      {/* Press Spacebar to Start Overlay */}
      {!gameStarted && !gameOver && (
        <>
          <div style={{
            position: "absolute",
            bottom: "20%",
            width: "100%",
            textAlign: "center",
            fontFamily: "'Press Start 2P', cursive",
            fontSize: "24px",
            color: "white",
            textShadow: "2px 2px 0px #000",
            zIndex: 5,
          }}>
            <div style={{
              animation: "pulse 1s infinite alternate",
              textShadow: "0 0 5px #ff00ff, 0 0 10px #00ffff"
            }}>
              Press Spacebar to Start
            </div>
            <div className="insert-coin" style={{
              fontSize: "16px",
              marginTop: "15px",
              animation: "blink 1s step-end infinite"
            }}>
              INSERT COIN
            </div>
          </div>
          <HighScoreTicker />
        </>
      )}

      {/* Score Counter - arcade scoreboard style */}
      {gameStarted && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          fontSize: "24px",
          fontFamily: "'Press Start 2P', cursive",
          color: "#ffff00",
          textShadow: "0 0 5px #ff8800, 2px 2px 0px #000",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 0.3s",
          zIndex: 1,
          whiteSpace: "nowrap",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "5px 10px",
          borderRight: "2px solid #ff00ff",
          borderBottom: "2px solid #00ffff"
        }}>
          SCORE: {score}
        </div>
      )}

      {/* Level Counter - 80s arcade cabinet style */}
      {gameStarted && (
        <div style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          fontSize: "24px",
          fontFamily: "'Press Start 2P', cursive",
          color: "#88ff88",
          textShadow: "0 0 5px #00ff00, 2px 2px 0px #000",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 0.3s",
          zIndex: 1,
          whiteSpace: "nowrap",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: "5px 10px",
          borderLeft: "2px solid #00ffff",
          borderBottom: "2px solid #ff00ff"
        }}>
          LEVEL: {level}
        </div>
      )}

      {/* Instructions */}
      {gameStarted && (
        <div style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          fontSize: "16px",
          fontFamily: "'Press Start 2P', cursive",
          color: "white",
          textShadow: "1px 1px 0px #000",
          whiteSpace: "nowrap",
          textAlign: "right",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 0.3s",
          zIndex: 1
        }}>
          Instructions: Move: Arrow Keys, Shoot: Spacebar, Music: M, Score: 10 pts per pager
        </div>
      )}

      {/* Konami Code Activation Message */}
      {konamiMessageVisible && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "40px",
          fontFamily: "'Press Start 2P', cursive",
          color: "#00ff00",
          textShadow: "0 0 10px #00ff00, 0 0 20px #ff00ff",
          background: "rgba(0, 0, 0, 0.7)",
          padding: "10px 20px",
          borderRadius: "5px",
          zIndex: 3,
          animation: "pulse 0.5s infinite alternate"
        }}>
          Konami Code Activated!
        </div>
      )}

      {/* Transition Screen - full 80s arcade effect */}
      {isTransitioning && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle, #ff00ff 0%, #00ffff 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          animation: "pulse 0.5s infinite alternate, crt-flicker 0.5s linear forwards",
          zIndex: 2,
          overflow: "hidden"
        }}>
          {/* Scanline effect */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: "linear-gradient(0deg, rgba(0,0,0,0.2) 50%, transparent 50%)",
            backgroundSize: "100% 4px",
            zIndex: 3,
            pointerEvents: "none",
            opacity: 0.3
          }}></div>

          {/* Level text */}
          <div style={{
            fontSize: "64px",
            fontFamily: "'Press Start 2P', cursive",
            color: "#00ff00",
            textShadow: "0 0 10px #00ff00, 0 0 20px #ff00ff, 0 0 30px #ff00ff",
            transform: "scale(1, 1.2)",
            animation: "pixel-shift 0.5s step-end infinite"
          }}>
            LEVEL {level + 1}
          </div>

          {/* Get ready text */}
          <div style={{
            fontSize: "24px",
            fontFamily: "'Press Start 2P', cursive",
            color: "#ffffff",
            textShadow: "0 0 5px #ffffff, 0 0 10px #00ffff",
            marginTop: "20px",
            animation: "blink 0.5s step-end infinite"
          }}>
            GET READY!
          </div>

          {/* Typical 80s patterns */}
          <div style={{
            position: "absolute",
            bottom: "50px",
            width: "80%",
            height: "20px",
            background: "repeating-linear-gradient(90deg, #ff00ff, #ff00ff 10px, #00ffff 10px, #00ffff 20px)",
            zIndex: 1
          }}></div>
        </div>
      )}

      {/* Game Over Screen - authentic 80s arcade cabinet style */}
      {gameOver && !finaleActive && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 2
        }}>
          <div style={{
            fontSize: "64px",
            fontFamily: "'Press Start 2P', cursive",
            color: "#ff0000",
            textShadow: "0 0 15px #ff0000, 0 0 25px #ff0000",
            animation: "pulse 0.5s infinite alternate",
            letterSpacing: "2px",
            transform: "scaleY(1.2)",
            marginBottom: "20px"
          }}>
            GAME OVER
          </div>
        </div>
      )}

      {/* Final Logo and Missile Effect */}
      {finaleActive && (
        <>
          <img
            src="https://media.licdn.com/dms/image/v2/D4E0BAQFJhMcjf87eCA/company-logo_200_200/company-logo_200_200/0/1709897084853/incident_io_logo?e=2147483647&v=beta&t=YhaUWh2pX9QqQKlHsXxEjzyd6KCbH5ntKRAJ6fx2SP4"
            alt="Incident.io Logo"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              width: "200px",
              height: "200px"
            }}
          />
          {/* Render explosions */}
          {explosions.map((explosion, i) => (
            <div
              key={`explosion-${i}`}
              style={{
                position: "absolute",
                width: `${explosion.size}px`,
                height: `${explosion.size}px`,
                left: `${explosion.x - explosion.size / 2}px`,
                top: `${explosion.y - explosion.size / 2}px`,
                borderRadius: "50%",
                background: Math.random() > 0.3
                  ? "radial-gradient(circle, #ffff00 0%, #ff8800 40%, transparent 70%)"
                  : Math.random() > 0.5
                  ? "radial-gradient(circle, #00ffff 0%, #ff00ff 40%, transparent 70%)"
                  : "radial-gradient(circle, #88ff88 0%, #ff00ff 40%, transparent 70%)",
                boxShadow: "0 0 30px #ff00ff, 0 0 15px #ffff00",
                filter: "blur(2px)",
                opacity: 1 - (Date.now() - explosion.createdAt) / 1000,
                zIndex: 12,
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `pulse ${0.2 + Math.random() * 0.4}s infinite alternate`
              }}
            />
          ))}

          {/* Render finale missiles */}
          {finalMissiles.map((missile, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                width: `${KONAMI_MISSILE_SIZE}px`,
                height: `${KONAMI_MISSILE_SIZE}px`,
                left: `${missile.x - KONAMI_MISSILE_SIZE / 2}px`,
                top: `${missile.y - KONAMI_MISSILE_SIZE / 2}px`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 11,
                animation: "pulse 0.5s infinite alternate"
              }}
            >
              <div style={{
                fontSize: "60px",
                lineHeight: 1,
                filter: "drop-shadow(0 0 8px #ff8800)",
                position: "relative"
              }}>
                🔥💥
                {/* Add missile trail effect */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${Math.atan2(missile.dy, missile.dx) * 180 / Math.PI}deg)`,
                  width: "200%",
                  height: "100%",
                  opacity: 0.7,
                  filter: "blur(2px)",
                  pointerEvents: "none"
                }}>
                  <span style={{
                    position: "absolute",
                    right: "100%",
                    fontSize: "40px",
                    color: "#ffff00"
                  }}>
                    ✨✨✨
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Player: Only shown if game is started and not over */}
      {gameStarted && !gameOver && (
        <div
          style={{
            position: "absolute",
            width: `${PLAYER_SIZE}px`,
            height: `${PLAYER_SIZE}px`,
            left: `${player.x}px`,
            top: `${player.y}px`,
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.3s",
            zIndex: 5,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            filter: "drop-shadow(0 0 5px #ff3300)",
            animation: "pulse 1s infinite alternate"
          }}
        >
          <div style={{
            fontSize: "40px",
            lineHeight: 1,
            transform: player.direction === "left" ? "rotate(-90deg)" :
                      player.direction === "right" ? "rotate(90deg)" :
                      player.direction === "down" ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}>
            🔥
          </div>
        </div>
      )}

      {/* Pagers - only show when game is in progress (not game over or finale) */}
      {gameStarted && !gameOver && !finaleActive && pagers.map(pager => (
        <div
          key={pager.id}
          className="absolute w-12 h-12"
          style={{
            position: "absolute",
            width: `${PAGER_SIZE}px`,
            height: `${PAGER_SIZE}px`,
            fontSize: "40px",
            left: `${pager.x}px`,
            top: `${pager.y}px`,
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.3s",
            zIndex: 1
          }}
        >
          📟
        </div>
      ))}

      {/* Missiles - 80s arcade style projectiles - only show during normal gameplay */}
      {gameStarted && !finaleActive && missiles.map((missile, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            width: `${konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE}px`,
            height: `${konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE}px`,
            // Center the missile by offsetting half the missile size
            left: `${missile.x - (konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE) / 2}px`,
            top: `${missile.y - (konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE) / 2}px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.3s",
            zIndex: 3,
            transform: missile.direction === "left" || missile.direction === "right"
              ? "rotate(90deg)"
              : (missile.direction === "down" ? "rotate(180deg)" : "rotate(0deg)"),
            animation: konamiActive
              ? "pulse 0.5s infinite alternate"
              : undefined
          }}
        >
          <div style={{
            fontSize: `${konamiActive ? 60 : 24}px`,
            lineHeight: 1,
            filter: "drop-shadow(0 0 5px #ff8800)",
            // Add trail effect for missiles
            position: "relative"
          }}>
            {konamiActive ? "🔥💥" : "🔥"}
            {/* Improved missile trail effect that works in all directions */}
            <div style={{
              position: "absolute",
              opacity: 0.7,
              filter: "blur(2px)",
              fontSize: `${konamiActive ? 30 : 15}px`,
              color: "#ffff00",
              textAlign: "center",
              // Position the trail behind the missile based on its direction of travel
              // This ensures trails always appear to follow the missile correctly
              ...( missile.direction === "up"
                  ? { bottom: "100%", left: "0", width: "100%" }
                  : missile.direction === "down"
                  ? { top: "100%", left: "0", width: "100%" }
                  : missile.direction === "left"
                  ? { right: "100%", top: "0", height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end" }
                  : { left: "100%", top: "0", height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start" }
              )
            }}>
              {/* Add multiple sparkles for Konami mode */}
              {konamiActive ? "✨✨✨" : "✨"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PagerTron;