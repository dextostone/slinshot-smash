/**
 * Represents the state of a physical object in the game.
 */
export interface PhysicsObject {
  /**
   * The current X coordinate of the object.
   */
  x: number;
  /**
   * The current Y coordinate of the object.
   */
  y: number;
  /**
   * The current horizontal velocity of the object.
   */
  velocityX: number;
  /**
   * The current vertical velocity of the object.
   */
  velocityY: number;
  /**
   * The mass of the object.
   */
  mass: number;
}

/**
 * Simulates the physics of the game environment, updating the positions and states of objects.
 *
 * @param objects An array of PhysicsObject representing the objects to simulate.
 * @param deltaTime The time elapsed since the last simulation step, in seconds.
 * @returns An array of updated PhysicsObject with their new positions and states after the simulation.
 */
export async function simulatePhysics(
  objects: PhysicsObject[],
  deltaTime: number
): Promise<PhysicsObject[]> {
  const gravity = 400; // Increased gravity for a more "heavy" feel
  const airResistanceCoefficient = 0.001;
  const groundY = 600 - 50; // 600 is game height, 100 is ground height, so 500 is the top of the ground
  
  const objectWidth = 40; // Assuming all objects are 40x40 for collision
  const birdWidth = 30;

  const updatedObjects = objects.map((obj, index) => {
    let newVelocityX = obj.velocityX;
    let newVelocityY = obj.velocityY;
    let newX = obj.x;
    let newY = obj.y;

    // Bird is the first object, affected by gravity and drag
    if (index === 0) {
        newVelocityY += gravity * deltaTime;

        const speed = Math.sqrt(newVelocityX ** 2 + newVelocityY ** 2);
        const dragForceX = -airResistanceCoefficient * newVelocityX * speed;
        const dragForceY = -airResistanceCoefficient * newVelocityY * speed;

        const accelerationX = dragForceX / obj.mass;
        const accelerationY = dragForceY / obj.mass;

        newVelocityX += accelerationX * deltaTime;
        newVelocityY += accelerationY * deltaTime;
        
        newX += newVelocityX * deltaTime;
        newY += newVelocityY * deltaTime;

        // Ground collision for the bird
        if (newY > groundY) {
            newY = groundY;
            newVelocityY = 0; // Stop vertical movement
            newVelocityX *= 0.5; // Friction
        }
    } else {
        // Blocks are affected by gravity
         newVelocityY += gravity * deltaTime;
         newX += newVelocityX * deltaTime;
         newY += newVelocityY * deltaTime;

        // Ground collision for blocks
        if (newY > groundY) {
            newY = groundY;
            newVelocityY = 0;
            newVelocityX *= 0.8; // Friction
        }
    }

    return { ...obj, x: newX, y: newY, velocityX: newVelocityX, velocityY: newVelocityY };
  });

  // Collision detection and response
  for (let i = 0; i < updatedObjects.length; i++) {
    for (let j = i + 1; j < updatedObjects.length; j++) {
      const obj1 = updatedObjects[i];
      const obj2 = updatedObjects[j];

      const w1 = i === 0 ? birdWidth : objectWidth;
      const h1 = i === 0 ? birdWidth : objectWidth;
      const w2 = j === 0 ? birdWidth : objectWidth;
      const h2 = j === 0 ? birdWidth : objectWidth;

      const dx = obj2.x - obj1.x;
      const dy = obj2.y - obj1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (w1 + w2) / 2;

      if (distance < minDistance) {
        // Collision detected
        const angle = Math.atan2(dy, dx);
        const overlap = minDistance - distance;

        // Separate objects
        const totalMass = obj1.mass + obj2.mass;
        const move1 = -overlap * (obj2.mass / totalMass);
        const move2 = overlap * (obj1.mass / totalMass);

        obj1.x += Math.cos(angle) * move1;
        obj1.y += Math.sin(angle) * move1;
        obj2.x += Math.cos(angle) * move2;
        obj2.y += Math.sin(angle) * move2;
        
        // Elastic collision response
        const v1 = {x: obj1.velocityX, y: obj1.velocityY};
        const v2 = {x: obj2.velocityX, y: obj2.velocityY};
        
        const m1 = obj1.mass;
        const m2 = obj2.mass;

        const newVelX1 = (v1.x * (m1 - m2) + (2 * m2 * v2.x)) / (m1 + m2);
        const newVelY1 = (v1.y * (m1 - m2) + (2 * m2 * v2.y)) / (m1 + m2);
        const newVelX2 = (v2.x * (m2 - m1) + (2 * m1 * v1.x)) / (m1 + m2);
        const newVelY2 = (v2.y * (m2 - m1) + (2 * m1 * v1.y)) / (m1 + m2);

        // Apply a factor to lose some energy
        const energyLoss = 0.8;
        obj1.velocityX = newVelX1 * energyLoss;
        obj1.velocityY = newVelY1 * energyLoss;
        obj2.velocityX = newVelX2 * energyLoss;
        obj2.velocityY = newVelY2 * energyLoss;
      }
    }
  }

  return updatedObjects;
}
