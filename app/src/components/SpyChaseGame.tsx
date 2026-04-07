import { useEffect, useRef, useState, useCallback } from 'react';

interface SpyChaseGameProps {
  onGameOver: (score: number, survivalTime: number) => void;
  isComplete: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'car' | 'barrier' | 'oil';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const LANE_COUNT = 3;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const PLAYER_CAR_WIDTH = 40;
const PLAYER_CAR_HEIGHT = 70;

export function SpyChaseGame({ onGameOver, isComplete }: SpyChaseGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStateRef = useRef({
    player: { x: CANVAS_WIDTH / 2 - PLAYER_CAR_WIDTH / 2, y: CANVAS_HEIGHT - 120, lane: 1 },
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    score: 0,
    startTime: Date.now(),
    gameOver: false,
    speed: 3,
    waitingPhase: true,
    waitTimer: 0,
    tipOffActive: false,
    tipOffTimer: 0,
    roadOffset: 0,
  });

  const [, setScore] = useState(0);
  const [gameState, setGameState] = useState<'waiting' | 'driving' | 'tipped' | 'crashed' | 'escaped'>('waiting');
  const [, setSurvivalTime] = useState(0);

  // Touch controls
  const touchStartX = useRef(0);
  const playerLane = useRef(1);

  const spawnObstacle = useCallback(() => {
    const state = gameStateRef.current;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const types: Obstacle['type'][] = ['car', 'car', 'car', 'barrier', 'oil'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const obstacle: Obstacle = {
      x: lane * LANE_WIDTH + LANE_WIDTH / 2 - 20,
      y: -50,
      width: type === 'barrier' ? LANE_WIDTH - 10 : 40,
      height: type === 'oil' ? 40 : 60,
      type,
    };
    
    state.obstacles.push(obstacle);
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 30,
        color,
      });
    }
  }, []);

  const checkCollision = useCallback((player: typeof gameStateRef.current.player, obstacle: Obstacle) => {
    return (
      player.x < obstacle.x + obstacle.width &&
      player.x + PLAYER_CAR_WIDTH > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + PLAYER_CAR_HEIGHT > obstacle.y
    );
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw road
    state.roadOffset = (state.roadOffset + state.speed) % 40;
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(20, 0, CANVAS_WIDTH - 40, CANVAS_HEIGHT);

    // Draw lane markings
    ctx.strokeStyle = '#3a3a5a';
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 2;
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * LANE_WIDTH, -state.roadOffset);
      ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Waiting phase - informant hasn't arrived
    if (state.waitingPhase) {
      state.waitTimer++;
      
      // Draw player car waiting
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(state.player.x, state.player.y, PLAYER_CAR_WIDTH, PLAYER_CAR_HEIGHT);
      
      // Draw car details
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(state.player.x + 5, state.player.y + 10, PLAYER_CAR_WIDTH - 10, 15);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(state.player.x + 8, state.player.y + 55, 8, 10);
      ctx.fillRect(state.player.x + 24, state.player.y + 55, 8, 10);

      // Draw "waiting" text
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AWAITING INFORMANT...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
      
      // Progress indicator
      const dots = '.'.repeat(Math.floor(state.waitTimer / 30) % 4);
      ctx.fillStyle = '#3c6e47';
      ctx.font = '14px monospace';
      ctx.fillText(`SECURE LINE${dots}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

      // Start driving after 3 seconds
      if (state.waitTimer > 180) {
        state.waitingPhase = false;
        setGameState('driving');
      }

      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Tip-off mechanic - random police alert
    if (!state.tipOffActive && Math.random() < 0.003) {
      state.tipOffActive = true;
      state.tipOffTimer = 0;
      setGameState('tipped');
    }

    if (state.tipOffActive) {
      state.tipOffTimer++;
      
      // Flash warning
      if (state.tipOffTimer < 120) {
        if (Math.floor(state.tipOffTimer / 10) % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ TIPPED OFF! ⚠️', CANVAS_WIDTH / 2, 80);
          ctx.font = '14px monospace';
          ctx.fillText('POLICE INCOMING!', CANVAS_WIDTH / 2, 105);
        }
      } else {
        state.tipOffActive = false;
        setGameState('driving');
      }
    }

    // Update player position based on lane
    const targetX = state.player.lane * LANE_WIDTH + LANE_WIDTH / 2 - PLAYER_CAR_WIDTH / 2;
    state.player.x += (targetX - state.player.x) * 0.2;

    // Spawn obstacles
    if (Math.random() < 0.02 + state.score / 50000) {
      spawnObstacle();
    }

    // Update obstacles
    state.obstacles = state.obstacles.filter(obs => {
      obs.y += state.speed;
      
      // Check collision
      if (!state.gameOver && checkCollision(state.player, obs)) {
        if (obs.type === 'oil') {
          // Spin out but survive
          createParticles(state.player.x + PLAYER_CAR_WIDTH / 2, state.player.y + PLAYER_CAR_HEIGHT / 2, '#8B4513', 10);
          state.score = Math.max(0, state.score - 500);
        } else {
          // Crash!
          createParticles(state.player.x + PLAYER_CAR_WIDTH / 2, state.player.y + PLAYER_CAR_HEIGHT / 2, '#ff4400', 30);
          state.gameOver = true;
          setGameState('crashed');
          const survivalSeconds = (Date.now() - state.startTime) / 1000;
          setSurvivalTime(survivalSeconds);
          onGameOver(state.score, survivalSeconds);
        }
      }
      
      // Score for dodging
      if (obs.y > CANVAS_HEIGHT && !state.gameOver) {
        state.score += 100;
      }
      
      return obs.y < CANVAS_HEIGHT + 50;
    });

    // Update particles
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });

    // Increase speed over time
    if (!state.gameOver) {
      state.speed = 3 + state.score / 10000;
      state.score += 1;
    }

    // Draw obstacles
    state.obstacles.forEach(obs => {
      if (obs.type === 'car') {
        // Enemy car
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(obs.x + 5, obs.y + obs.height - 15, obs.width - 10, 10);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(obs.x + 5, obs.y + 5, 8, 5);
        ctx.fillRect(obs.x + obs.width - 13, obs.y + 5, 8, 5);
      } else if (obs.type === 'barrier') {
        // Road barrier
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#000000';
        for (let i = 0; i < obs.width; i += 20) {
          ctx.fillRect(obs.x + i, obs.y, 10, obs.height);
        }
      } else if (obs.type === 'oil') {
        // Oil slick
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.stroke();
      }
    });

    // Draw player car
    ctx.fillStyle = state.gameOver ? '#666666' : '#ffd700';
    ctx.fillRect(state.player.x, state.player.y, PLAYER_CAR_WIDTH, PLAYER_CAR_HEIGHT);
    
    // Car body details
    ctx.fillStyle = state.gameOver ? '#444444' : '#ffaa00';
    ctx.fillRect(state.player.x + 5, state.player.y + 10, PLAYER_CAR_WIDTH - 10, 15);
    
    // Headlights
    ctx.fillStyle = state.gameOver ? '#333333' : '#00ffff';
    ctx.fillRect(state.player.x + 8, state.player.y + 55, 8, 10);
    ctx.fillRect(state.player.x + 24, state.player.y + 55, 8, 10);
    
    // Glow effect
    if (!state.gameOver) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.strokeRect(state.player.x - 2, state.player.y - 2, PLAYER_CAR_WIDTH + 4, PLAYER_CAR_HEIGHT + 4);
      ctx.shadowBlur = 0;
    }

    // Draw particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    });

    // Draw UI
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score.toLocaleString()}`, 10, 25);
    
    const currentTime = (Date.now() - state.startTime) / 1000;
    ctx.fillStyle = '#3c6e47';
    ctx.font = '12px monospace';
    ctx.fillText(`TIME: ${currentTime.toFixed(1)}s`, 10, 45);

    if (state.tipOffActive) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ESCAPE ROUTE COMPROMISED!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
    }

    // Check if processing complete - allow escape
    if (isComplete && !state.gameOver) {
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓ EVIDENCE SECURED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillStyle = '#3c6e47';
      ctx.font = '12px monospace';
      ctx.fillText('CONTINUE ESCAPING FOR BONUS POINTS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
    }

    setScore(state.score);

    if (!state.gameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [checkCollision, createParticles, isComplete, onGameOver, spawnObstacle]);

  // Handle touch/click for lane changes
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = clientX - touchStartX.current;
    
    if (Math.abs(diff) > 30) {
      if (diff > 0 && playerLane.current < LANE_COUNT - 1) {
        playerLane.current++;
      } else if (diff < 0 && playerLane.current > 0) {
        playerLane.current--;
      }
      gameStateRef.current.player.lane = playerLane.current;
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current.gameOver || gameStateRef.current.waitingPhase) return;
      
      if (e.key === 'ArrowLeft' && playerLane.current > 0) {
        playerLane.current--;
        gameStateRef.current.player.lane = playerLane.current;
      } else if (e.key === 'ArrowRight' && playerLane.current < LANE_COUNT - 1) {
        playerLane.current++;
        gameStateRef.current.player.lane = playerLane.current;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Start game loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#080a0f]">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-[#2a3b4f] touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      />
      
      <div className="mt-4 text-center">
        <p className="text-[#3c6e47] text-xs font-mono">
          {gameState === 'waiting' ? 'AWAITING CONTACT...' : 
           gameState === 'tipped' ? 'POLICE ALERT - EVADE!' : 
           'SWIPE OR ARROW KEYS TO SWITCH LANES'}
        </p>
      </div>
    </div>
  );
}
