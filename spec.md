# Snake Game

## Overview
A classic Snake game implemented as a 2D game where the player controls a snake to eat food and grow longer while avoiding collisions.

## Game Mechanics
- Grid-based game board rendered dynamically
- Snake starts with initial length and moves continuously in the current direction
- Player controls the snake using arrow keys (up, down, left, right)
- Food appears at random positions on the grid
- Snake grows by one segment each time it eats food
- Score increases by 1 for each food item consumed
- Game ends when snake collides with walls or itself

## User Interface
- Game board displaying the snake and food
- Current score display
- Game over screen with restart button
- Responsive design for desktop and mobile devices
- Smooth animations for snake movement
- Purple color theme for all primary call-to-action buttons (Submit Score, Restart, etc.)
- Consistent purple accent color across light and dark modes

## Game State Management
- All game state (snake position, food location, score, game status) is managed in the frontend
- No backend persistence required - game resets on page refresh
- Game loop handles continuous snake movement and collision detection

## Controls
- Arrow keys for directional movement
- Restart button to begin new game after game over

## Styling Requirements
- Primary buttons use purple color theme instead of blue
- Purple color variants for background, text, hover, and focus states
- Consistent purple hue maintained across both light and dark modes
- Updated CSS variables and component-level classes to reflect purple accent color

## Technical Requirements
- Built with React and TypeScript
- Responsive design supporting both desktop and mobile
- English language interface
