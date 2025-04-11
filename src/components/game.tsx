'use client';

import {useState, useEffect, useRef, useCallback} from 'react';
import {simulatePhysics, PhysicsObject} from '@/services/physics';
import {adjustDifficulty, AdjustDifficultyInput} from '@/ai/flows/adjust-difficulty';
import {Button} from '@/components/ui/button';

// Define the game's color palette
const primaryColor = '#3498db';   // Bright blue
const secondaryColor = '#2ecc71'; // Green
const brownColor = '#795548';     // Brown
const accentColor = '#e74c3c';    // Red

const initialObjects: PhysicsObject[] = [
  {x: 100, y: 500, velocityX: 0, velocityY: 0, mass: 1}, // Initial bird position
  {x: 600, y: 500, velocityX: 0, velocityY: 0, mass: 10}, // Initial building block position
  {x: 700, y: 500, velocityX: 0, velocityY: 0, mass: 10}, // Initial building block position
];

export default function Game() {
  const [objects, setObjects] = useState<PhysicsObject[]>(initialObjects);
  const [score, setScore] = useState(0);
  const [birdsUsed, setBirdsUsed] = useState(0);
  const [level, setLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [slingPosition, setSlingPosition] = useState({x: 100, y: 500}); // Slingshot position
  const [birdPosition, setBirdPosition] = useState({x: 100, y: 500}); // Bird position
  const [initialBirdPosition, setInitialBirdPosition] = useState({x: 100, y: 500});
  const [launchForce, setLaunchForce] = useState({x: 0, y: 0});
  const [isFlying, setIsFlying] = useState(false);
  const [structuresDestroyed, setStructuresDestroyed] = useState(0);

  const animationFrameId = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  // Game environment dimensions
  const gameWidth = 1200;
  const gameHeight = 600;

  // Function to reset the bird's position to the slingshot
  const resetBird = () => {
    setBirdPosition(initialBirdPosition);
    setIsFlying(false);
    // Also reset the bird object in the physics simulation
    setObjects(prevObjects => {
      const newObjects = [...prevObjects];
      newObjects[0] = { ...initialObjects[0], x: initialBirdPosition.x, y: initialBirdPosition.y };
      return newObjects;
    });
  };

  // Function to handle launching the bird
  const launchBird = () => {
    if (isFlying) return;

    setIsDragging(false);
    setIsFlying(true);

    const launchSpeed = 20; // Adjust for desired speed
    const velocityX = launchForce.x * launchSpeed;
    const velocityY = launchForce.y * launchSpeed;

    setObjects(prevObjects => {
      const updatedObjects = [...prevObjects];
      updatedObjects[0] = {...updatedObjects[0], x: birdPosition.x, y: birdPosition.y, velocityX: velocityX, velocityY: velocityY};
      return updatedObjects;
    });

    setBirdsUsed(prevBirdsUsed => prevBirdsUsed + 1);
  };

  // Simulate the physics and update game state
  const simulate = useCallback((timestamp: number) => {
    if (!isFlying) {
      lastTimestamp.current = null;
      animationFrameId.current = requestAnimationFrame(simulate);
      return;
    }

    if (!lastTimestamp.current) {
      lastTimestamp.current = timestamp;
      animationFrameId.current = requestAnimationFrame(simulate);
      return;
    }

    const deltaTime = (timestamp - lastTimestamp.current) / 1000; // in seconds
    lastTimestamp.current = timestamp;

    simulatePhysics(objectsRef.current, deltaTime).then(updatedObjects => {
      setObjects(updatedObjects);
      
      // Update the visual bird position from the physics simulation
      const bird = updatedObjects[0];
      setBirdPosition({ x: bird.x, y: bird.y });

      // Check for destroyed structures (very basic)
      const destroyedCount = updatedObjects.slice(1).filter(obj => obj.y > gameHeight - 50).length;
      if (destroyedCount > structuresDestroyed) {
          setScore(prevScore => prevScore + 100 * (destroyedCount - structuresDestroyed));
          setStructuresDestroyed(destroyedCount);
      }

      // Check if the bird is out of bounds or stopped
      if (bird.x < 0 || bird.x > gameWidth || bird.y > gameHeight) {
        resetBird();
      }
    });

    animationFrameId.current = requestAnimationFrame(simulate);
  }, [isFlying, structuresDestroyed, gameWidth, gameHeight, resetBird]);


  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(simulate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [simulate]);

  // Handle mouse/touch drag to control slingshot
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isFlying) return;
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      launchBird();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isFlying) return;
    
    // Get container's bounding box to calculate relative cursor position
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    let cursorX = e.clientX - rect.left;
    let cursorY = e.clientY - rect.top;

    // Limiting the drag distance
    const maxDragDistance = 100;
    const distance = Math.sqrt(Math.pow(cursorX - slingPosition.x, 2) + Math.pow(cursorY - slingPosition.y, 2));
    if (distance > maxDragDistance) {
      const angle = Math.atan2(cursorY - slingPosition.y, cursorX - slingPosition.x);
      cursorX = slingPosition.x + maxDragDistance * Math.cos(angle);
      cursorY = slingPosition.y + maxDragDistance * Math.sin(angle);
    }

    setBirdPosition({x: cursorX, y: cursorY});

    // Calculate launch force
    const forceX = (slingPosition.x - cursorX) / 100;
    const forceY = (slingPosition.y - cursorY) / 100;
    setLaunchForce({x: forceX, y: forceY});
  };

  // AI Difficulty Adjustment
  const adjustGameDifficulty = async () => {
    const input: AdjustDifficultyInput = {
      playerScore: score,
      level: level,
      birdsUsed: birdsUsed,
      structuresDestroyed: structuresDestroyed,
    };

    try {
      const difficultyAdjustment = await adjustDifficulty(input);
      console.log('Difficulty Adjustment:', difficultyAdjustment);

      if (difficultyAdjustment.newLevelStructure) {
        try {
          const newStructure = JSON.parse(difficultyAdjustment.newLevelStructure);
          // Assuming newStructure is an array of objects for blocks
          if (Array.isArray(newStructure)) {
            const newObjects: PhysicsObject[] = [
              initialObjects[0], // Keep the bird
              ...newStructure.map((block: any) => ({
                x: block.x || 600,
                y: block.y || 500,
                velocityX: 0,
                velocityY: 0,
                mass: block.mass || 10,
              }))
            ];
            setObjects(newObjects);
          }
        } catch (e) {
            console.error("Failed to parse new level structure", e)
        }
      }

      setLevel(prevLevel => prevLevel + 1); // Increment level after adjustment
      setStructuresDestroyed(0); // Reset structures destroyed for the new level
      setScore(0);
      setBirdsUsed(0);
      resetBird(); // Reset bird position for the new level

    } catch (error) {
      console.error('Failed to adjust difficulty:', error);
    }
  };

  return (
    <div
      style={{
        width: gameWidth,
        height: gameHeight,
        backgroundColor: primaryColor,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        borderRadius: '8px'
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      {/* Ground */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100px',
          backgroundColor: secondaryColor,
        }}
      />

      {/* Slingshot */}
      <div
        style={{
          position: 'absolute',
          left: slingPosition.x - 10,
          top: slingPosition.y - 20,
          width: '20px',
          height: '50px',
          backgroundColor: brownColor,
          borderRadius: '5px',
        }}
      />

      {/* Bird */}
      <div
        style={{
          position: 'absolute',
          left: birdPosition.x - 15,
          top: birdPosition.y - 15,
          width: '30px',
          height: '30px',
          backgroundColor: accentColor,
          borderRadius: '50%',
          cursor: isFlying ? 'default' : 'grab',
          willChange: 'transform'
        }}
      />

      {/* Building Blocks */}
      {objects.slice(1).map((obj, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: obj.x - 20,
            top: obj.y - 20,
            width: '40px',
            height: '40px',
            backgroundColor: brownColor,
            border: '2px solid #5d4037',
            willChange: 'transform'
          }}
        />
      ))}

      {/* Score Display */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        Score: {score}
      </div>

      {/* Level Display */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        Level: {level}
      </div>

      {/* Birds Used Display */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '20px',
          color: 'white',
          fontSize: '18px',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        }}
      >
        Birds Used: {birdsUsed}
      </div>

      {/* AI Difficulty Adjustment Button */}
      <Button
        onClick={adjustGameDifficulty}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        Next Level
      </Button>
    </div>
  );
}
