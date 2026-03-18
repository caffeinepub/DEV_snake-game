import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Play, Pause, RotateCcw, Info, Heart } from 'lucide-react';
import { useHighScores, useSubmitScore } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const GAME_SPEED = 100;

type Position = { x: number; y: number };
type Direction = { x: number; y: number };

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Direction>(INITIAL_DIRECTION);
  const foodRef = useRef<Position>(generateFood(INITIAL_SNAKE));
  const lastUpdateTimeRef = useRef<number>(0);

  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameOver'>('idle');
  const [showGameOver, setShowGameOver] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const { data: highScores, isLoading: isLoadingScores } = useHighScores();
  const submitScore = useSubmitScore();

  function generateFood(snake: Position[]): Position {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--game-bg').trim();
    const bgColor = `oklch(${ctx.fillStyle})`;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--game-grid').trim();
    const gridColor = `oklch(${ctx.strokeStyle})`;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake
    snakeRef.current.forEach((segment, index) => {
      const snakeColorValue = getComputedStyle(document.documentElement).getPropertyValue('--game-snake').trim();
      const snakeColor = `oklch(${snakeColorValue})`;
      
      if (index === 0) {
        // Head - brighter
        ctx.fillStyle = snakeColor;
        ctx.fillRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeSize = 3;
        const eyeOffset = 5;
        if (directionRef.current.x === 1) {
          ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + 5, eyeSize, eyeSize);
          ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + 12, eyeSize, eyeSize);
        } else if (directionRef.current.x === -1) {
          ctx.fillRect(segment.x * CELL_SIZE + 2, segment.y * CELL_SIZE + 5, eyeSize, eyeSize);
          ctx.fillRect(segment.x * CELL_SIZE + 2, segment.y * CELL_SIZE + 12, eyeSize, eyeSize);
        } else if (directionRef.current.y === 1) {
          ctx.fillRect(segment.x * CELL_SIZE + 5, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * CELL_SIZE + 12, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, eyeSize);
        } else {
          ctx.fillRect(segment.x * CELL_SIZE + 5, segment.y * CELL_SIZE + 2, eyeSize, eyeSize);
          ctx.fillRect(segment.x * CELL_SIZE + 12, segment.y * CELL_SIZE + 2, eyeSize, eyeSize);
        }
      } else {
        // Body - slightly transparent
        ctx.fillStyle = snakeColor.replace(')', ' / 0.8)');
        ctx.fillRect(
          segment.x * CELL_SIZE + 1,
          segment.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
      }
    });

    // Draw food
    const foodColorValue = getComputedStyle(document.documentElement).getPropertyValue('--game-food').trim();
    const foodColor = `oklch(${foodColorValue})`;
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * CELL_SIZE + CELL_SIZE / 2,
      foodRef.current.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, []);

  const updateGame = useCallback(() => {
    // Update direction
    directionRef.current = nextDirectionRef.current;

    const head = snakeRef.current[0];
    const newHead = {
      x: head.x + directionRef.current.x,
      y: head.y + directionRef.current.y,
    };

    // Check wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      setGameState('gameOver');
      setShowGameOver(true);
      return;
    }

    // Check self collision
    if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setGameState('gameOver');
      setShowGameOver(true);
      return;
    }

    // Add new head
    snakeRef.current = [newHead, ...snakeRef.current];

    // Check food collision
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      setScore(prev => prev + 1);
      foodRef.current = generateFood(snakeRef.current);
      toast.success('Yum! +1 point', { duration: 1000 });
    } else {
      // Remove tail if no food eaten
      snakeRef.current.pop();
    }

    drawGame();
  }, [drawGame]);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'playing') return;

    if (timestamp - lastUpdateTimeRef.current >= GAME_SPEED) {
      updateGame();
      lastUpdateTimeRef.current = timestamp;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, updateGame]);

  const startGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    foodRef.current = generateFood(INITIAL_SNAKE);
    setScore(0);
    setGameState('playing');
    setShowGameOver(false);
    lastUpdateTimeRef.current = 0;
    drawGame();
  }, [drawGame]);

  const pauseGame = useCallback(() => {
    setGameState('paused');
  }, []);

  const resumeGame = useCallback(() => {
    setGameState('playing');
    lastUpdateTimeRef.current = performance.now();
  }, []);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameState === 'idle') {
      if (e.key.startsWith('Arrow')) {
        startGame();
      }
      return;
    }

    if (gameState === 'gameOver') return;

    if (e.key === ' ') {
      e.preventDefault();
      if (gameState === 'playing') {
        pauseGame();
      } else if (gameState === 'paused') {
        resumeGame();
      }
      return;
    }

    const currentDir = directionRef.current;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentDir.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentDir.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (currentDir.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentDir.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
        break;
    }
  }, [gameState, startGame, pauseGame, resumeGame]);

  const handleSubmitScore = useCallback(() => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    submitScore.mutate(
      { playerName: playerName.trim(), score },
      {
        onSuccess: () => {
          toast.success('Score submitted successfully!');
          setShowGameOver(false);
          setPlayerName('');
        },
        onError: () => {
          toast.error('Failed to submit score');
        },
      }
    );
  }, [playerName, score, submitScore]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    drawGame();
  }, [drawGame]);

  const topScores = highScores
    ?.sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10) || [];

  return (
    <div className="min-h-screen game-gradient">
      <Toaster />
      
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Snake Game</h1>
                <p className="text-sm text-muted-foreground">Classic arcade fun</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowInstructions(true)}>
              <Info className="w-4 h-4 mr-2" />
              How to Play
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 max-w-7xl mx-auto">
          {/* Game Area */}
          <div className="flex flex-col items-center gap-6">
            <Card className="w-full max-w-[480px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Score: {score}</CardTitle>
                    <CardDescription>
                      {gameState === 'idle' && 'Press any arrow key to start'}
                      {gameState === 'playing' && 'Use arrow keys to move'}
                      {gameState === 'paused' && 'Game paused'}
                      {gameState === 'gameOver' && 'Game Over!'}
                    </CardDescription>
                  </div>
                  <Badge variant={gameState === 'playing' ? 'default' : 'secondary'} className="text-sm">
                    {gameState === 'idle' && 'Ready'}
                    {gameState === 'playing' && 'Playing'}
                    {gameState === 'paused' && 'Paused'}
                    {gameState === 'gameOver' && 'Game Over'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={GRID_SIZE * CELL_SIZE}
                    height={GRID_SIZE * CELL_SIZE}
                    className="border-2 border-border rounded-lg shadow-lg"
                    tabIndex={0}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card className="w-full max-w-[480px]">
              <CardContent className="pt-6">
                <div className="flex gap-3 justify-center flex-wrap">
                  {gameState === 'idle' && (
                    <Button onClick={startGame} size="lg" className="gap-2">
                      <Play className="w-5 h-5" />
                      Start Game
                    </Button>
                  )}
                  {gameState === 'playing' && (
                    <Button onClick={pauseGame} size="lg" variant="secondary" className="gap-2">
                      <Pause className="w-5 h-5" />
                      Pause
                    </Button>
                  )}
                  {gameState === 'paused' && (
                    <Button onClick={resumeGame} size="lg" className="gap-2">
                      <Play className="w-5 h-5" />
                      Resume
                    </Button>
                  )}
                  {(gameState === 'playing' || gameState === 'paused' || gameState === 'gameOver') && (
                    <Button onClick={startGame} size="lg" variant="outline" className="gap-2">
                      <RotateCcw className="w-5 h-5" />
                      Restart
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  High Scores
                </CardTitle>
                <CardDescription>Top 10 players</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingScores ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : topScores.length > 0 ? (
                  <div className="space-y-2">
                    {topScores.map(([name, scoreValue], index) => (
                      <div
                        key={`${name}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-accent text-accent-foreground' :
                            index === 1 ? 'bg-primary/20 text-primary' :
                            index === 2 ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                        <Badge variant="outline">{Number(scoreValue)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No scores yet. Be the first!
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">⌨️</span>
                  </div>
                  <p className="text-muted-foreground">Use arrow keys to control the snake</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">🎯</span>
                  </div>
                  <p className="text-muted-foreground">Eat the red food to grow and score points</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">⚠️</span>
                  </div>
                  <p className="text-muted-foreground">Avoid hitting walls or yourself</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">⏸️</span>
                  </div>
                  <p className="text-muted-foreground">Press Space to pause/resume</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            © 2025. Built with <Heart className="w-4 h-4 text-destructive fill-destructive" /> using{' '}
            <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      {/* Game Over Dialog */}
      <Dialog open={showGameOver} onOpenChange={setShowGameOver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Game Over!</DialogTitle>
            <DialogDescription>
              You scored {score} point{score !== 1 ? 's' : ''}. Submit your score to the leaderboard!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitScore();
                  }
                }}
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGameOver(false)}>
              Skip
            </Button>
            <Button onClick={handleSubmitScore} disabled={submitScore.isPending}>
              {submitScore.isPending ? 'Submitting...' : 'Submit Score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">How to Play</DialogTitle>
            <DialogDescription>Master the classic Snake game</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="controls" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="controls">Controls</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="controls" className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <kbd className="px-3 py-2 bg-background border rounded font-mono text-sm">↑ ↓ ← →</kbd>
                  <span>Move the snake in any direction</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <kbd className="px-3 py-2 bg-background border rounded font-mono text-sm">Space</kbd>
                  <span>Pause or resume the game</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <kbd className="px-3 py-2 bg-background border rounded font-mono text-sm">Any Arrow</kbd>
                  <span>Start a new game from idle state</span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="rules" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span> Objective
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Eat as much food as possible to grow your snake and increase your score. Each food item is worth 1 point.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span> Game Over Conditions
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Running into the walls</li>
                    <li>Running into your own body</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">💡</span> Pro Tips
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Plan your path ahead to avoid trapping yourself</li>
                    <li>Use the edges strategically but carefully</li>
                    <li>The snake moves continuously, so stay focused!</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={() => setShowInstructions(false)}>Got it!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
