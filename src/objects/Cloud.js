import * as THREE from 'three';

/**
 * Cloud class representing a single cloud in the cloud system
 */
export class Cloud extends THREE.Mesh {
  /**
   * Create a new Cloud instance
   * @param {Game} game - Reference to the main game instance
   * @param {Object} options - Cloud options
   */
  constructor(game, options = {}) {
    // Default options
    const defaultOptions = {
      size: 1.0,
      opacity: 0.8,
      interactive: true,
      countable: false,
      cloudNumber: null
    };

    const settings = { ...defaultOptions, ...options };

    // Create geometry and material
    const geometry = new THREE.BoxGeometry(2, 1, 3);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.0,
      metalness: 0.0,
      transparent: true,
      opacity: settings.opacity
    });

    // Call parent constructor
    super(geometry, material);

    // Store reference to game
    this.game = game;

    // Store original geometry for morphing
    this.originalGeometry = geometry.clone();

    // Cloud properties
    this.isInteractive = settings.interactive;
    this.isCounted = false;
    this.isCountable = settings.countable;
    this.cloudNumber = settings.cloudNumber;

    // Apply size
    const scale = 3 * settings.size;
    this.scale.set(scale, scale * 0.7, scale);

    // Apply random rotation
    this.rotation.y = Math.random() * Math.PI * 2;

    // Setup interactions if interactive
    if (this.isInteractive && this.game.interactionSystem) {
      this.setupInteractions();
    }
  }

  /**
   * Setup interactions for the cloud
   */
  setupInteractions() {
    // Register with interaction system
    this.game.interactionSystem.register(this, {
      onClick: this.onTap.bind(this),
      onHoverStart: this.onHoverStart.bind(this),
      onHoverEnd: this.onHoverEnd.bind(this)
    });
  }

  /**
   * Handle tap/click interaction
   */
  onTap() {
    console.log('Cloud tapped!');

    // Change cloud shape
    this.morphShape();

    // Play sound effect
    if (this.game.audioManager) {
      this.game.audioManager.playSound('cloudPop', { volume: 0.5 });
    }

    // If countable and not counted yet, trigger count event
    if (this.isCountable && this.cloudNumber !== null && !this.isCounted) {
      this.isCounted = true;

      // Highlight cloud
      this.highlight();

      // Show number
      if (this.game.uiSystem) {
        this.game.uiSystem.showNumber(this.cloudNumber, {
          size: 'large',
          position: 'center',
          duration: 1500,
          animation: 'pop'
        });
      }

      // Play number sound
      if (this.game.audioManager) {
        this.game.audioManager.playNarration(`number${this.cloudNumber}`);
      }

      // Dispatch custom event
      const event = new CustomEvent('cloudCounted', {
        detail: {
          cloud: this,
          number: this.cloudNumber
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Handle hover start
   */
  onHoverStart() {
    // Apply hover effect
    if (this.isInteractive) {
      this.material.emissive.set(0x333333);
      this.material.emissiveIntensity = 0.5;

      // Scale up slightly
      this.userData.originalScale = this.scale.clone();
      this.scale.multiplyScalar(1.05);
    }
  }

  /**
   * Handle hover end
   */
  onHoverEnd() {
    // Remove hover effect
    if (this.isInteractive) {
      this.material.emissive.set(0x000000);
      this.material.emissiveIntensity = 0;

      // Restore original scale
      if (this.userData.originalScale) {
        this.scale.copy(this.userData.originalScale);
      }
    }
  }

  /**
   * Morph the cloud shape
   */
  morphShape() {
    // Create a new random shape by modifying vertices
    const newGeometry = this.originalGeometry.clone();
    const positions = newGeometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      // Don't modify bottom vertices (keep base shape)
      if (positions[i + 1] > 0) {
        positions[i] += (Math.random() - 0.5) * 0.5;
        positions[i + 1] += (Math.random() - 0.5) * 0.5;
        positions[i + 2] += (Math.random() - 0.5) * 0.5;
      }
    }

    newGeometry.attributes.position.needsUpdate = true;
    newGeometry.computeVertexNormals();

    // Replace geometry
    this.geometry.dispose();
    this.geometry = newGeometry;
  }

  /**
   * Highlight the cloud (for counting)
   */
  highlight() {
    // Apply highlight effect
    this.material.emissive.set(0x3366ff);
    this.material.emissiveIntensity = 0.5;

    // Scale up
    this.userData.originalScale = this.scale.clone();
    this.scale.multiplyScalar(1.2);

    // Add glow effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });

    const glowGeometry = this.geometry.clone();
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.scale.multiplyScalar(1.2);
    this.add(glowMesh);

    // Store reference to glow mesh
    this.glowMesh = glowMesh;
  }

  /**
   * Remove highlight
   */
  unhighlight() {
    // Remove highlight effect
    this.material.emissive.set(0x000000);
    this.material.emissiveIntensity = 0;

    // Restore original scale
    if (this.userData.originalScale) {
      this.scale.copy(this.userData.originalScale);
    }

    // Remove glow effect
    if (this.glowMesh) {
      this.remove(this.glowMesh);
      this.glowMesh.geometry.dispose();
      this.glowMesh.material.dispose();
      this.glowMesh = null;
    }
  }

  /**
   * Update the cloud
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Any continuous updates needed
  }
}

/**
 * CloudSystem class representing a system of clouds
 */
export class CloudSystem extends THREE.Group {
  /**
   * Create a new CloudSystem
   * @param {Game} game - Reference to the main game instance
   * @param {number} count - Number of clouds to create
   * @param {Object} options - Cloud system options
   */
  constructor(game, count = 25, options = {}) {
    super();

    this.game = game;
    this.clouds = [];
    this.countingClouds = [];

    // Default options
    const defaultOptions = {
      radius: 100,
      height: { min: 20, max: 30 },
      interactive: true,
      countingEnabled: false,
      countingCloudCount: 5,
      windSpeed: { x: 0, y: 0, z: 7 }
    };

    this.options = { ...defaultOptions, ...options };

    // Create clouds
    this.createClouds(count);
  }

  /**
   * Create clouds
   * @param {number} count - Number of clouds to create
   */
  createClouds(count) {
    for (let i = 0; i < count; i++) {
      // Create cloud
      const cloud = new Cloud(this.game, {
        size: 1 + Math.random(),
        opacity: 0.7 + Math.random() * 0.3,
        interactive: this.options.interactive
      });

      // Random position within a cylinder
      const radius = this.options.radius * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      cloud.position.x = radius * Math.cos(theta);
      cloud.position.z = radius * Math.sin(theta);
      cloud.position.y = this.options.height.min + Math.random() * (this.options.height.max - this.options.height.min);

      // Store original position for resetting
      cloud.userData.originalPosition = cloud.position.clone();
      cloud.userData.outOfScene = false;

      // Add to system
      this.add(cloud);
      this.clouds.push(cloud);
    }
  }

  /**
   * Setup counting game
   * @param {number} cloudCount - Number of clouds to count
   */
  setupCountingGame(cloudCount = 5) {
    // Use specified count or default
    const count = cloudCount || this.options.countingCloudCount;

    // Reset any previous counting clouds
    this.countingClouds.forEach(cloud => {
      cloud.isCountable = false;
      cloud.cloudNumber = null;
      cloud.isCounted = false;
      cloud.unhighlight();
    });

    this.countingClouds = [];

    // Select random clouds for counting
    const selectedClouds = this.clouds
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    // Assign numbers to selected clouds
    selectedClouds.forEach((cloud, index) => {
      cloud.isCountable = true;
      cloud.cloudNumber = index + 1;
      cloud.isCounted = false;

      // Make counting clouds more prominent
      cloud.scale.multiplyScalar(1.5);
      cloud.material.color.set(0xf0f0ff);

      this.countingClouds.push(cloud);
    });

    // Listen for cloud counted events
    window.addEventListener('cloudCounted', this.onCloudCounted.bind(this));

    // Return the counting clouds
    return this.countingClouds;
  }

  /**
   * Handle cloud counted event
   * @param {CustomEvent} event - Cloud counted event
   */
  onCloudCounted(event) {
    const { cloud, number } = event.detail;

    console.log(`Cloud counted: ${number}`);

    // Check if all clouds have been counted
    const allCounted = this.countingClouds.every(cloud => cloud.isCounted);

    if (allCounted) {
      console.log('All clouds counted!');

      // Show completion message
      if (this.game.uiSystem) {
        this.game.uiSystem.showFeedback('Great job counting!', 'success', {
          duration: 3000,
          animation: 'pop'
        });
      }

      // Play completion sound
      if (this.game.audioManager) {
        this.game.audioManager.playSound('success');
      }

      // Dispatch completion event
      const completionEvent = new CustomEvent('countingCompleted', {
        detail: {
          count: this.countingClouds.length
        }
      });
      window.dispatchEvent(completionEvent);
    }
  }

  /**
   * Update the cloud system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    const windSpeed = this.options.windSpeed;

    // Update each cloud
    this.clouds.forEach(cloud => {
      // Move cloud with wind
      cloud.position.x += windSpeed.x * deltaTime;
      cloud.position.y += windSpeed.y * deltaTime;
      cloud.position.z += windSpeed.z * deltaTime;

      // Check if cloud is out of bounds
      const distanceFromCenter = Math.sqrt(
        cloud.position.x * cloud.position.x +
        cloud.position.z * cloud.position.z
      );

      if (distanceFromCenter >= this.options.radius) {
        // Reset cloud position
        const radius = this.options.radius;
        const theta = Math.random() * Math.PI * 2;
        cloud.position.x = radius * Math.cos(theta);
        cloud.position.z = radius * Math.sin(theta);
        cloud.position.y = this.options.height.min + Math.random() * (this.options.height.max - this.options.height.min);
      }

      // Update cloud
      cloud.update(deltaTime);
    });
  }
}
