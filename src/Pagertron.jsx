import React, { useEffect, useState } from "react";
import './Pagertron.css';

function Pagertron() {
  const initialPagers = [
    { x: 50, y: 50 },
    { x: 1200, y: 50 },
    { x: 50, y: 650 },
    { x: 1200, y: 650 },
    { x: 300, y: 50 },
    { x: 900, y: 50 },
    { x: 300, y: 650 },
  ];

  const [player, setPlayer] = useState({ x: 640, y: 360, direction: "up" });
  const [pagers, setPagers] = useState(initialPagers);
  const [missiles, setMissiles] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const PLAYER_SIZE = 50;
  const PAGER_SIZE = 50;
  const MISSILE_SIZE = 15;
  const COLLISION_RADIUS = 20;
  const TRANSITION_DURATION = 2000;

  useEffect(() => {
    if (gameOver || isTransitioning) return;

    const gameLoop = setInterval(() => {
      setMissiles((prevMissiles) => {
        const updatedMissiles = prevMissiles
          .map((missile) => {
            let newX = missile.x;
            let newY = missile.y;
            const speed = 8;
            if (missile.direction === "up") newY -= speed;
            if (missile.direction === "down") newY += speed;
            if (missile.direction === "left") newX -= speed;
            if (missile.direction === "right") newX += speed;
            return { ...missile, x: newX, y: newY };
          })
          .filter((missile) => 
            missile.y > 0 && missile.y < 720 && missile.x > 0 && missile.x < 1280
          );

        setPagers((prevPagers) => {
          let pagersToRemove = [];
          const updatedPagers = prevPagers.map((pager) => {
            const baseSpeed = 1;
            const speed = baseSpeed * Math.pow(1.2, level - 1);

            // Calculate direction toward the player
            let dx = player.x - pager.x;
            let dy = player.y - pager.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Normalize direction and apply speed
            let moveX = 0;
            let moveY = 0;
            if (distance > 0) { // Avoid division by zero
              moveX = (dx / distance) * speed;
              moveY = (dy / distance) * speed;
            }

            // Add random jitter to movement (20% chance to deviate)
            const jitterChance = Math.random();
            if (jitterChance < 0.2) { // 20% chance to add jitter
              const jitterAmount = speed * 0.5; // Jitter is up to 50% of the speed
              const randomAngle = Math.random() * 2 * Math.PI; // Random angle in radians
              moveX += Math.cos(randomAngle) * jitterAmount;
              moveY += Math.sin(randomAngle) * jitterAmount;
            }

            // Update pager position
            const newX = pager.x + moveX;
            const newY = pager.y + moveY;

            return { ...pager, x: newX, y: newY };
          }).filter((pager) => {
            const hitByMissile = updatedMissiles.some((missile, missileIndex) => {
              const distance = Math.sqrt(
                Math.pow(missile.x - pager.x, 2) + 
                Math.pow(missile.y - pager.y, 2)
              );
              if (distance < (PAGER_SIZE + MISSILE_SIZE) / 2) {
                pagersToRemove.push(pager);
                setMissiles((prev) => prev.filter((_, index) => index !== missileIndex));
                return true;
              }
              return false;
            });

            return !hitByMissile;
          });

          if (pagersToRemove.length > 0) {
            setScore((prevScore) => prevScore + (pagersToRemove.length * 10));
          }

          const playerHit = updatedPagers.some((pager) => {
            const distance = Math.sqrt(
              Math.pow(player.x + PLAYER_SIZE/2 - (pager.x + PAGER_SIZE/2), 2) + 
              Math.pow(player.y + PLAYER_SIZE/2 - (pager.y + PAGER_SIZE/2), 2)
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
              setLevel((prevLevel) => prevLevel + 1);
              setPagers([...initialPagers]);
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
  }, [player, level, gameOver, isTransitioning]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (gameOver || isTransitioning) return;
      setPlayer((prev) => {
        const speed = 8;
        let newX = Math.max(0, Math.min(1280 - PLAYER_SIZE, prev.x));
        let newY = Math.max(0, Math.min(720 - PLAYER_SIZE, prev.y));
        let newDirection = prev.direction;
        
        if (event.key === "ArrowUp") {
          newY -= speed;
          newDirection = "up";
        }
        if (event.key === "ArrowDown") {
          newY += speed;
          newDirection = "down";
        }
        if (event.key === "ArrowLeft") {
          newX -= speed;
          newDirection = "left";
        }
        if (event.key === "ArrowRight") {
          newX += speed;
          newDirection = "right";
        }

        return { x: newX, y: newY, direction: newDirection };
      });

      if (event.key === " ") {
        setMissiles((prev) => [...prev, { 
          x: player.x + PLAYER_SIZE/2, 
          y: player.y, 
          direction: player.direction 
        }]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, gameOver, isTransitioning]);

  return (
    <div style={{ 
      backgroundColor: "#F25533", 
      color: "white", 
      width: "1280px", 
      height: "720px", 
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
          fontSize: "200px",
          color: "rgba(255, 255, 255, 0.1)", // Keep PagerTron subtle
          textShadow: "4px 4px 10px rgba(0, 0, 0, 0.5)",
          lineHeight: "1"
        }}>
          PagerTron
        </div>
        <div style={{
          fontSize: "40px",
          color: "rgba(255, 255, 255, 0.5)", // Increased opacity for visibility
          textShadow: "2px 2px 5px rgba(0, 0, 0, 0.7)", // Stronger shadow for contrast
          marginTop: "-20px"
        }}>
          by incident.io
        </div>
      </div>
      {/* Score Counter */}
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
        zIndex: 1
      }}>
        Score: {score}
      </div>
      {/* Level Counter */}
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
        zIndex: 1
      }}>
        Level: {level}
      </div>
      {/* Instructions */}
      <div style={{ 
        position: "absolute", 
        bottom: "10px", 
        right: "10px", 
        fontSize: "16px", 
        fontFamily: "'Press Start 2P', cursive", 
        color: "white",
        textShadow: "1px 1px 0px #000",
        maxWidth: "300px",
        textAlign: "right",
        opacity: isTransitioning ? 0 : 1,
        transition: "opacity 0.3s",
        zIndex: 1
      }}>
        Instructions: Move: Arrow Keys, Shoot: Spacebar, Score: 10 pts per pager
      </div>
      {/* Title */}
      <h1 style={{ 
        position: "absolute", 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)", 
        fontSize: "96px", 
        fontFamily: "'Press Start 2P', cursive", 
        color: "white",
        textShadow: "4px 4px 0px #000", 
        opacity: gameOver || isTransitioning ? 0 : 1, 
        transition: "opacity 0.5s",
        zIndex: 1
      }}>
        PagerTron
      </h1>
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
      {gameOver && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "64px", fontFamily: "'Press Start 2P', cursive", zIndex: 2 }}>
          Game Over
        </div>
      )}
      {/* Player */}
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
      >🔥</div>
      {/* Pagers */}
      {pagers.map((pager, index) => (
        <div
          key={index}
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
        >📟</div>
      ))}
      {/* Missiles */}
      {missiles.map((missile, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            position: "absolute",
            width: `${MISSILE_SIZE}px`,
            height: `${MISSILE_SIZE}px`,
            fontSize: "20px",
            left: `${missile.x}px`,
            top: `${missile.y}px`,
            textAlign: "center",
            lineHeight: `${MISSILE_SIZE}px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.3s",
            zIndex: 1
          }}
        >
          <span>🔥❤️</span>
        </div>
      ))}
    </div>
  );
}

export default Pagertron;