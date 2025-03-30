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
  const [konamiActive, setKonamiActive] = useState(false); // Track Konami Code activation
  const [konamiMessageVisible, setKonamiMessageVisible] = useState(false); // Track flash message visibility
  const [gameStarted, setGameStarted] = useState(false); // Track if the game has started

  const PLAYER_SIZE = 50;
  const PAGER_SIZE = 50;
  const MISSILE_SIZE = 15; // Default size
  const KONAMI_MISSILE_SIZE = 15 * 5; // 75px when Konami Code is active
  const COLLISION_RADIUS = 20;
  const TRANSITION_DURATION = 2000;

  // Simplified Konami Code sequence (only arrow keys)
  const konamiCode = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"
  ];
  const [konamiInput, setKonamiInput] = useState([]);

  useEffect(() => {
    if (!gameStarted || gameOver || isTransitioning) return;

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
              const effectiveMissileSize = konamiActive ? KONAMI_MISSILE_SIZE : MISSILE_SIZE;
              if (distance < (PAGER_SIZE + effectiveMissileSize) / 2) {
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
  }, [player, level, gameOver, isTransitioning, konamiActive, gameStarted]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Start the game on spacebar press if not started
      if (!gameStarted && event.key === " ") {
        setGameStarted(true);
        return;
      }

      if (!gameStarted || gameOver || isTransitioning) return;

      // Handle player movement and shooting
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

      // Handle Konami Code (only arrow keys)
      const key = event.key;
      setKonamiInput((prev) => {
        const newInput = [...prev, key];
        if (newInput.length > konamiCode.length) {
          newInput.shift(); // Keep array length manageable
        }

        // Check if the last 8 inputs match the Konami Code (arrow keys only)
        const lastEight = newInput.slice(-konamiCode.length);
        if (JSON.stringify(lastEight) === JSON.stringify(konamiCode)) {
          setKonamiActive(true);
          setKonamiMessageVisible(true); // Show flash message
          setTimeout(() => setKonamiMessageVisible(false), 2000); // Hide after 2 seconds
          console.log("Konami Code activated, konamiActive:", true); // Debug log
          return []; // Reset input after success
        }
        return newInput;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, gameOver, isTransitioning, gameStarted]);

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
      {/* Initial Screen */}
      {!gameStarted && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "40px",
          color: "#ffffff",
          textShadow: "2