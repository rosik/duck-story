import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Duck class representing the rubber duck character
 */
export class Duck extends THREE.Group {
  /**
   * Create a new Duck instance
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    super();
    this.game = game;
    this.model = null;
    this.isLoaded = false;
    this.isInteractive = true;

    // Animation properties
    this.bobbing = {
      enabled: true,
      speed: 1.0,
      amplitude: 0.1,
      time: 0
    };

    // Sound properties
    this.sounds = {
      quack: null
    };

    // Interaction properties
    this.lastInteractionTime = 0;
    this.interactionCooldown = 1.0; // seconds
  }

  /**
   * Load the duck model
   * @returns {Promise} - Resolves when the model is loaded
   */
  async load() {
    if (this.isLoaded) {
      return this;
    }

    try {
      console.log('Loading duck model...');
      this.model = await this.loadDuckModel();

      // Apply transformations
      this.model.scale.set(8, 8, 8);
      this.model.position.set(0, 0, 0);
      this.model.rotation.y = Math.PI; // Rotate 180 degrees

      // Apply materials
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Add model to group
      this.add(this.model);

      // Setup interactions
      this.setupInteractions();

      this.isLoaded = true;
      console.log('Duck model loaded successfully');

      return this;
    } catch (error) {
      console.error('Failed to load duck model:', error);

      // Create fallback duck
      this.createFallbackDuck();

      // Setup interactions
      this.setupInteractions();

      this.isLoaded = true;
      return this;
    }
  }

  /**
   * Load the duck model using GLTFLoader
   * @returns {Promise<THREE.Group>} - The loaded model
   */
  loadDuckModel() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      // Check if the model file exists before attempting to load it
      fetch('models/Rubber_Duck.gltf')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Model file not found (${response.status})`);
          }

          // If the file exists, load it with GLTFLoader
          loader.load(
            'models/Rubber_Duck.gltf',
            (gltf) => {
              resolve(gltf.scene);
            },
            (xhr) => {
              console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
              console.error('Error loading model:', error);
              reject(error);
            }
          );
        })
        .catch(error => {
          console.warn('Using fallback duck model:', error.message);
          reject(error);
        });
    });
  }

  /**
   * Create a fallback duck using primitive shapes
   */
  createFallbackDuck() {
    console.log('Creating fallback duck model');

    // Create a group for the duck
    const duckGroup = new THREE.Group();

    // Duck body (yellow sphere)
    const bodyGeometry = new THREE.SphereGeometry(2, 32, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 3, 0);
    body.castShadow = true;
    duckGroup.add(body);

    // Duck head (smaller yellow sphere)
    const headGeometry = new THREE.SphereGeometry(1, 24, 24);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 4.5, 1.5);
    head.castShadow = true;
    duckGroup.add(head);

    // Duck beak (orange cone)
    const beakGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    beakGeometry.rotateX(Math.PI / 2);
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xFF9900 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, 4.5, 3);
    beak.castShadow = true;
    duckGroup.add(beak);

    // Add the duck group to this object
    this.model = duckGroup;
    this.add(duckGroup);
  }

  /**
   * Setup interactions for the duck
   */
  setupInteractions() {
    // Register with interaction system
    this.game.interactionSystem.register(this, {
      onClick: this.onTap.bind(this),
      onHoverStart: this.onHoverStart.bind(this),
      onHoverEnd: this.onHoverEnd.bind(this),
      onDragStart: this.onDragStart.bind(this),
      onDrag: this.onDrag.bind(this),
      onDragEnd: this.onDragEnd.bind(this)
    });
  }

  /**
   * Handle tap/click interaction
   */
  onTap() {
    const currentTime = performance.now() / 1000;

    // Check cooldown
    if (currentTime - this.lastInteractionTime < this.interactionCooldown) {
      return;
    }

    console.log('Duck tapped!');
    this.lastInteractionTime = currentTime;

    // Play quack sound
    if (this.game.audioManager) {
      this.game.audioManager.playSound('quack');
    }

    // Play animation
    this.playQuackAnimation();

    // Show feedback
    if (this.game.uiSystem) {
      this.game.uiSystem.showFeedback('Quack!', 'info', {
        duration: 1000,
        animation: 'pop'
      });
    }
  }

  /**
   * Handle hover start
   */
  onHoverStart() {
    // Apply hover effect
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.userData.originalEmissive = child.material.emissive.clone();
          child.material.emissive.set(0x333333);
        }
      });
    }
  }

  /**
   * Handle hover end
   */
  onHoverEnd() {
    // Remove hover effect
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh && child.userData.originalEmissive) {
          child.material.emissive.copy(child.userData.originalEmissive);
        }
      });
    }
  }

  /**
   * Handle drag start
   * @param {THREE.Vector3} point - Point where drag started
   */
  onDragStart(point) {
    console.log('Duck drag started');

    // Store original position
    this.userData.dragStartPosition = this.position.clone();
  }

  /**
   * Handle drag
   * @param {THREE.Vector3} newPosition - New position
   * @param {THREE.Vector3} startPosition - Start position
   */
  onDrag(newPosition, startPosition) {
    // Only implement in scenes where duck should be draggable
    // Default implementation does nothing
  }

  /**
   * Handle drag end
   */
  onDragEnd() {
    console.log('Duck drag ended');
  }

  /**
   * Play quack animation
   */
  playQuackAnimation() {
    // Simple animation - scale up and down
    const duration = 0.3;
    const originalScale = this.scale.clone();

    // Scale up
    const scaleUp = () => {
      this.scale.set(
        originalScale.x * 1.2,
        originalScale.y * 1.2,
        originalScale.z * 1.2
      );

      // Scale back after delay
      setTimeout(() => {
        this.scale.copy(originalScale);
      }, duration * 500);
    };

    scaleUp();
  }

  /**
   * Update the duck
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update bobbing animation
    if (this.bobbing.enabled) {
      this.bobbing.time += deltaTime * this.bobbing.speed;

      const yOffset = Math.sin(this.bobbing.time) * this.bobbing.amplitude;

      // Apply to position
      if (this.model) {
        this.model.position.y = yOffset;
      }
    }
  }
}
