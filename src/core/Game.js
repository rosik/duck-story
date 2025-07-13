import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { InteractionSystem } from './InteractionSystem.js';
import { AudioManager } from './AudioManager.js';
import { UISystem } from './UISystem.js';

// Import scenes
import { CalmPondScene } from '../scenes/CalmPondScene.js';

/**
 * Main Game class - entry point for the application
 */
export class Game {
  /**
   * Create a new Game instance
   */
  constructor() {
    // Core systems
    this.sceneManager = null;
    this.interactionSystem = null;
    this.audioManager = null;
    this.uiSystem = null;

    // Three.js components
    this.renderer = null;
    this.camera = null;
    this.clock = null;

    // Game state
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * Initialize the game
   */
  async init() {
    console.log('Initializing game...');

    // Create clock for timing
    this.clock = new THREE.Clock();

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('gameCanvas'),
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      45, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );

    // Set initial position
    this.camera.position.set(-90, 50, -110);
    this.camera.lookAt(0, 1, 0);

    // Initialize core systems
    this.sceneManager = new SceneManager(this);
    this.interactionSystem = new InteractionSystem(this.camera, document.getElementById('gameCanvas'));
    this.audioManager = new AudioManager();
    this.uiSystem = new UISystem();

    // Register scenes
    this.sceneManager.registerScene('calmPond', new CalmPondScene(this));

    // Setup event listeners
    this.setupEventListeners();

    // Start with first scene
    await this.sceneManager.transitionTo('calmPond');

    // Hide loading screen
    document.getElementById('loadingScreen').style.display = 'none';

    // Start animation loop
    this.isInitialized = true;
    this.isRunning = true;
    this.animate();

    console.log('Game initialized successfully');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // START button click
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', () => {
      console.log('Start button clicked - initiating camera animation');
      this.sceneManager.currentScene.onStartButtonClicked();
    });
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (!this.isRunning) return;

    const deltaTime = this.clock.getDelta();

    // Update current scene
    if (this.sceneManager.currentScene) {
      this.sceneManager.currentScene.update(deltaTime);
    }

    // Update interaction system
    this.interactionSystem.update(deltaTime);

    // Render scene
    if (this.sceneManager.currentScene) {
      this.renderer.render(this.sceneManager.currentScene.scene, this.camera);
    }
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
