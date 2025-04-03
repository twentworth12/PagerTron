import React, { useEffect, useState } from "react";
import './Pagertron.css';

function PagerTron() {
  // Static dimensions for desktop version
  const SCREEN_WIDTH = 1280;
  const SCREEN_HEIGHT = 720;
  const PLAYER_SIZE = 50;
  const PAGER_SIZE = 50;
  const MISSILE_SIZE = 15;
  const KONAMI_MISSILE_SIZE = 15 * 5; // 75px
  const COLLISION_RADIUS = 20;
  const TRANSITION_DURATION = 2000;
  const SAFE_DISTANCE = 200; // Minimum distance from (640,360)

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

  // Regular game state variables for desktop
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
          .filter(missile =>
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
        if (event.key === " ") setGameStarted(true);
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
        setMissiles(prev => [
          ...prev,
          { x: player.x + PLAYER_SIZE / 2, y: player.y, direction: player.direction }
        ]);
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

  // When the player dies, wait 3 seconds then trigger the finale effect.
  useEffect(() => {
    if (gameOver) {
      const timer = setTimeout(() => setFinaleActive(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameOver]);

  // Finale: Spawn one missile per remaining pager simultaneously.
  useEffect(() => {
    if (finaleActive) {
      const logoCenter = { x: 640, y: 360 };
      setFinalMissiles(
        pagers.map(target => {
          const dx = target.x - logoCenter.x;
          const dy = target.y - logoCenter.y;
          const mag = Math.sqrt(dx * dx + dy * dy);
          return { x: logoCenter.x, y: logoCenter.y, dx: dx / mag, dy: dy / mag, targetId: target.id };
        })
      );
    }
  }, [finaleActive]);

  // Finale: Update final missiles and check for collisions with pagers.
  useEffect(() => {
    if (!finaleActive) return;
    const updateInterval = setInterval(() => {
      setFinalMissiles(prevMissiles => {
        const newMissiles = prevMissiles.map(missile => ({
          ...missile,
          x: missile.x + missile.dx * 10,
          y: missile.y + missile.dy * 10,
        }));
        return newMissiles.filter(missile =>
          missile.x >= 0 && missile.x <= SCREEN_WIDTH &&
          missile.y >= 0 && missile.y <= SCREEN_HEIGHT
        );
      });
      setPagers(prevPagers =>
        prevPagers.filter(pager => {
          return !finalMissiles.some(missile => {
            const distance = Math.sqrt((missile.x - pager.x) ** 2 + (missile.y - pager.y) ** 2);
            return distance < 20;
          });
        })
      );
    }, 50);
    return () => clearInterval(updateInterval);
  }, [finaleActive, finalMissiles]);

  // When gameOver and finaleActive are true, wait an additional 5 seconds then show final text.
  useEffect(() => {
    if (gameOver && finaleActive) {
      const timer = setTimeout(() => {
        setFinaleActive(false);
        setFinalComplete(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameOver, finaleActive]);

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
        padding: "20px"
      }}>
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
        <div style={{ fontSize: "32px", marginTop: "10px", whiteSpace: "nowrap" }}>
          all-in-one incident management
        </div>
        <div style={{ fontSize: "32px", marginTop: "10px", whiteSpace: "nowrap" }}>
          <a 
            href="https://incident.io" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: "white", textDecoration: "underline" }}
          >
            get started at incident.io
          </a>
        </div>
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

      {/* Press Spacebar / Tap to Start Overlay */}
      {!gameStarted && !gameOver && (
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
          {isMobile ? "Tap to Start" : "Press Spacebar to Start"}
        </div>
      )}

      {/* Score Counter */}
      {gameStarted && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          fontSize: "24px",
          fontFamily: "'Press Start 2P', cursive",
          color: "white",
          textShadow: "2px 2px 0px #000",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 0.3s",
          zIndex: 1,
          whiteSpace: "nowrap"
        }}>
          Score: {score}
        </div>
      )}

      {/* Level Counter */}
      {gameStarted && (
        <div style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          fontSize: "24px",
          fontFamily: "'Press Start 2P', cursive",
          color: "white",
          textShadow: "2px 2px 0px #000",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 0.3s",
          zIndex: 1,
          whiteSpace: "nowrap"
        }}>
          Level: {level}
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
          Instructions: Move: Arrow Keys, Shoot: Spacebar, Score: 10 pts per pager
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

      {/* Transition Screen */}
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
          animation: "pulse 0.5s infinite alternate",
          zIndex: 2
        }}>
          <div style={{
            fontSize: "64px",
            fontFamily: "'Press Start 2P', cursive",
            color: "#00ff00",
            textShadow: "0 0 10px #00ff00, 0 0 20px #ff00ff, 0 0 30px #ff00ff",
          }}>
            Level {level + 1}
          </div>
          <div style={{
            fontSize: "24px",
            fontFamily: "'Press Start 2P', cursive",
            color: "#ffffff",
            textShadow: "0 0 5px #ffffff",
            marginTop: "20px"
          }}>
            Get Ready!
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameOver && !finaleActive && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "64px",
          fontFamily: "'Press Start 2P', cursive",
          zIndex: 2
        }}>
          Game Over
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
          {finalMissiles.map((missile, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                width: `${MISSILE_SIZE}px`,
                height: `${MISSILE_SIZE}px`,
                left: `${missile.x}px`,
                top: `${missile.y}px`,
                textAlign: "center",
                lineHeight: `${MISSILE_SIZE}px`,
                zIndex: 11,
              }}
            >
              <span>🔥</span>
            </div>
          ))}
        </>
      )}

      {/* Player: Only shown if game is started and not over */}
      {gameStarted && !gameOver && (
        <div
          className="absolute w-12 h-12"
          style={{
            position: "absolute",
            width: `${PLAYER_SIZE}px`,
            height: `${PLAYER_SIZE}px`,
            fontSize: "40px",
            left: `${player.x}px`,
            top: `${player.y}px`,
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.3s",
            zIndex: 1
          }}
        >
          🔥
        </div>
      )}

      {/* Pagers */}
      {gameStarted && pagers.map(pager => (
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

      {/* Missiles */}
      {gameStarted && missiles.map((missile, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            position: "absolute",
            width: `${konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE}px`,
            height: `${konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE}px`,
            fontSize: `${konamiActive ? 100 : 20}px`,
            left: `${missile.x - (konamiActive ? (KONAMI_MISSILE_SIZE - MISSILE_SIZE) / 2 : 0)}px`,
            top: `${missile.y - (konamiActive ? (KONAMI_MISSILE_SIZE - MISSILE_SIZE) / 2 : 0)}px`,
            textAlign: "center",
            lineHeight: `${konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE}px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.3s, width 0.3s, height 0.3s, font-size 0.3s",
            zIndex: 1
          }}
        >
          <span>🔥❤️</span>
        </div>
      ))}
    </div>
  );
}

export default PagerTron;