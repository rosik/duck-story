import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { Duck } from '../objects/Duck.js';
import { CloudSystem } from '../objects/Cloud.js';

/**
 * The Calm Pond scene - first scene in the story
 */
export class CalmPondScene extends BaseScene {
  /**
   * Create a new CalmPondScene
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    super(game);

    // Scene-specific elements
    this.duck = null;
    this.cloudSystem = null;
    this.water = null;

    // Camera animation
    this.cameraAnimation = {
      inProgress: false,
      startPosition: null,
      startTarget: null,
      targetPosition: new THREE.Vector3(-45, 10, -55),
      targetLookAt: new THREE.Vector3(0, 0, 0),
      duration: 1.0,
      startTime: 0
    };
  }

  /**
   * Initialize the scene
   * @returns {Promise} - Resolves when initialization is complete
   */
  async init() {
    try {
      // Call parent init to create common elements
      await super.init();

      console.log('Initializing Calm Pond scene');

      // Create water surface
      this.createWater();

      // Create cloud system
      this.cloudSystem = new CloudSystem(this.game, 80, {
        interactive: false, // Clouds aren't interactive in this scene
        windSpeed: { x: 0, y: 0, z: 7 }
      });
      this.scene.add(this.cloudSystem);

      // Create duck
      this.duck = new Duck(this.game);
      await this.duck.load();
      this.duck.position.set(0, 0, 0);
      this.duck.scale.set(6, 6, 6);
      this.scene.add(this.duck);

      // Preload sounds
      try {
        if (this.game.audioManager) {
          await this.game.audioManager.preloadSounds({
            'quack': 'sounds/quack.mp3',
            'water': 'sounds/water_ambient.mp3',
            'success': 'sounds/success.mp3'
          });

          // Play ambient water sound
          this.game.audioManager.playSound('water', {
            volume: 0.3,
            loop: true
          });
        }
      } catch (error) {
        console.warn('Error loading sounds, continuing without audio:', error);
      }

      // Setup camera
      this.setupCamera();

      console.log('Calm Pond scene initialized');
    } catch (error) {
      console.error('Error initializing Calm Pond scene:', error);
      // Ensure we mark the scene as initialized even if there's an error
      this.isInitialized = true;
      this.isActive = true;
    }
  }

  /**
   * Create water surface
   */
  createWater() {
    try {
      // Create a large circle geometry for water
      const radius = 100;
      const segments = 64;
      const geometry = new THREE.CircleGeometry(radius, segments);

      // Rotate to be horizontal (XZ plane)
      geometry.rotateX(-Math.PI / 2);

      // Create water material
      const material = new THREE.MeshStandardMaterial({
        color: 0x4A87E8,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.8
      });

      // Create mesh and add to scene
      this.water = new THREE.Mesh(geometry, material);
      this.water.position.y = 0.1; // Slightly above ground
      this.water.receiveShadow = true;

      this.scene.add(this.water);
    } catch (error) {
      console.error('Error creating water:', error);
    }
  }

  /**
   * Setup camera for this scene
   */
  setupCamera() {
    try {
      // Set initial position
      this.game.camera.position.set(-90, 50, -110);
      this.game.camera.lookAt(0, 1, 0);

      // Store original position for swaying
      this.game.camera.userData.basePosition = this.game.camera.position.clone();
      this.game.camera.userData.baseTarget = new THREE.Vector3(0, 1, 0);
      this.game.camera.userData.swayEnabled = true;
      this.game.camera.userData.swayAmplitude = 0.02;
      this.game.camera.userData.swaySpeed = 0.5;
      this.game.camera.userData.swayTime = 0;
    } catch (error) {
      console.error('Error setting up camera:', error);
    }
  }

  /**
   * Handle START button click
   */
  onStartButtonClicked() {
    try {
      console.log('START button clicked in Calm Pond scene');
      this.animateCameraToGamePosition();
    } catch (error) {
      console.error('Error handling START button click:', error);
    }
  }

  /**
   * Animate camera to game position
   */
  animateCameraToGamePosition() {
    try {
      // Disable camera sway during animation
      this.game.camera.userData.swayEnabled = false;

      // Store animation state
      this.cameraAnimation.inProgress = true;
      this.cameraAnimation.startPosition = this.game.camera.position.clone();
      this.cameraAnimation.startTarget = this.game.camera.userData.baseTarget.clone();
      this.cameraAnimation.startTime = performance.now();

      // Hide START button
      const startButton = document.getElementById('startButton');
      if (startButton) {
        startButton.style.display = 'none';
      }

      // Show feedback
      if (this.game.uiSystem) {
        this.game.uiSystem.showFeedback("Let's start Sunny's adventure!", 'info', {
          duration: 3000,
          animation: 'fade'
        });
      }
    } catch (error) {
      console.error('Error animating camera:', error);
    }
  }

  /**
   * Update camera animation
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateCameraAnimation() {
    try {
      if (!this.cameraAnimation.inProgress) return;

      const currentTime = performance.now();
      const elapsed = (currentTime - this.cameraAnimation.startTime) / 1000; // Convert to seconds
      const t = Math.min(elapsed / this.cameraAnimation.duration, 1);

      // Cubic easing
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Interpolate position
      this.game.camera.position.lerpVectors(
        this.cameraAnimation.startPosition,
        this.cameraAnimation.targetPosition,
        ease
      );

      // Interpolate target
      const currentTarget = new THREE.Vector3();
      currentTarget.lerpVectors(
        this.cameraAnimation.startTarget,
        this.cameraAnimation.targetLookAt,
        ease
      );
      this.game.camera.lookAt(currentTarget);

      // Update base values for when sway is re-enabled
      this.game.camera.userData.basePosition.copy(this.game.camera.position);
      this.game.camera.userData.baseTarget.copy(currentTarget);

      // Check if animation is complete
      if (t >= 1) {
        this.cameraAnimation.inProgress = false;
        console.log('Camera animation complete');

        // Transition to next scene after delay
        setTimeout(() => {
          this.transitionToNextScene();
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating camera animation:', error);
      this.cameraAnimation.inProgress = false;
    }
  }

  /**
   * Transition to the next scene
   */
  transitionToNextScene() {
    try {
      // In a real implementation, this would transition to the "Up in the Clouds" scene
      console.log('Would transition to "Up in the Clouds" scene here');

      // For now, just show a message
      if (this.game.uiSystem) {
        this.game.uiSystem.showFeedback('Sunny is ready for the clouds!', 'success', {
          duration: 3000,
          animation: 'pop'
        });
      }

      // Show START button again
      const startButton = document.getElementById('startButton');
      if (startButton) {
        startButton.style.display = 'block';
      }

      // Re-enable camera sway
      this.game.camera.userData.swayEnabled = true;
    } catch (error) {
      console.error('Error transitioning to next scene:', error);
    }
  }

  /**
   * Update camera sway
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateCameraSway(deltaTime) {
    try {
      if (!this.game.camera.userData.swayEnabled) return;

      this.game.camera.userData.swayTime += deltaTime * this.game.camera.userData.swaySpeed;

      // Calculate sway offsets
      const swayX = Math.sin(this.game.camera.userData.swayTime) * this.game.camera.userData.swayAmplitude;
      const swayY = Math.sin(this.game.camera.userData.swayTime * 0.7) * this.game.camera.userData.swayAmplitude * 0.5;
      const swayZ = Math.cos(this.game.camera.userData.swayTime * 0.3) * this.game.camera.userData.swayAmplitude * 0.3;

      // Apply sway to position
      this.game.camera.position.copy(this.game.camera.userData.basePosition);
      this.game.camera.position.x += swayX;
      this.game.camera.position.y += swayY;
      this.game.camera.position.z += swayZ;

      // Apply slight sway to target
      const target = this.game.camera.userData.baseTarget.clone();
      target.x += swayX * 0.2;
      target.y += swayY * 0.3;

      this.game.camera.lookAt(target);
    } catch (error) {
      console.error('Error updating camera sway:', error);
    }
  }

  /**
   * Update the scene
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    try {
      // Update camera animation if in progress
      if (this.cameraAnimation.inProgress) {
        this.updateCameraAnimation();
      } else {
        // Update camera sway
        this.updateCameraSway(deltaTime);
      }

      // Update cloud system
      if (this.cloudSystem) {
        this.cloudSystem.update(deltaTime);
      }

      // Update duck
      if (this.duck) {
        this.duck.update(deltaTime);
      }

      // Update water animation
      if (this.water) {
        // Simple water animation - adjust y-scale slightly based on time
        this.water.position.y = 0.1 + Math.sin(Date.now() * 0.001) * 0.05;
      }
    } catch (error) {
      console.error('Error updating scene:', error);
    }
  }

  /**
   * Clean up the scene
   */
  cleanup() {
    try {
      // Stop any sounds
      if (this.game.audioManager) {
        this.game.audioManager.stopSound('water');
      }

      // Call parent cleanup
      super.cleanup();
    } catch (error) {
      console.error('Error cleaning up scene:', error);
    }
  }
}
