import * as THREE from 'three';

/**
 * Base class for all scenes
 */
export class BaseScene {
  /**
   * Create a new BaseScene
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.isInitialized = false;
    this.isActive = false;

    // Common scene elements
    this.sky = null;
    this.ground = null;
    this.lights = {
      ambient: null,
      directional: null
    };
  }

  /**
   * Initialize the scene
   * @returns {Promise} - Resolves when initialization is complete
   */
  async init() {
    console.log(`Initializing scene: ${this.constructor.name}`);

    if (this.isInitialized) {
      console.warn(`Scene ${this.constructor.name} already initialized`);
      return;
    }

    // Create common elements
    this.createSky();
    this.createGround();
    this.createLights();

    // Mark as initialized
    this.isInitialized = true;
    this.isActive = true;

    console.log(`Scene initialized: ${this.constructor.name}`);
  }

  /**
   * Create sky with gradient
   */
  createSky() {
    // Create a large box geometry
    const geometry = new THREE.BoxGeometry(1000, 1000, 1000);

    // Create shader material for gradient
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0.5, 0.8, 1.0) },
        bottomColor: { value: new THREE.Color(1.0, 1.0, 1.0) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = max(0.0, min(1.0, (h + 1.0) / 2.0));
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
      side: THREE.BackSide // Render the inside of the box
    });

    // Create mesh and add to scene
    this.sky = new THREE.Mesh(geometry, material);
    this.scene.add(this.sky);
  }

  /**
   * Create ground plane
   */
  createGround() {
    // Create a large circle geometry
    const radius = 100;
    const segments = 50;
    const geometry = new THREE.CircleGeometry(radius, segments);

    // Rotate to be horizontal (XZ plane)
    geometry.rotateX(-Math.PI / 2);

    // Create green material
    const material = new THREE.MeshStandardMaterial({
      color: 0x6AE86F,
      roughness: 0.8,
      metalness: 0.2
    });

    // Create mesh and add to scene
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.position.y = 0; // At origin
    this.ground.receiveShadow = true;

    this.scene.add(this.ground);
  }

  /**
   * Create lights
   */
  createLights() {
    // Add ambient light
    this.lights.ambient = new THREE.AmbientLight(0xFFFFFF, 0.5);
    this.scene.add(this.lights.ambient);

    // Add directional light (sun)
    this.lights.directional = new THREE.DirectionalLight(0xFFFFFF, 1);
    this.lights.directional.position.set(50, 200, 100);
    this.lights.directional.castShadow = true;
    this.lights.directional.shadow.mapSize.width = 1024;
    this.lights.directional.shadow.mapSize.height = 1024;
    this.scene.add(this.lights.directional);
  }

  /**
   * Handle START button click
   */
  onStartButtonClicked() {
    console.log(`START button clicked in scene: ${this.constructor.name}`);
    // Override in derived classes
  }

  /**
   * Update the scene
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Override in derived classes
  }

  /**
   * Clean up the scene
   */
  cleanup() {
    console.log(`Cleaning up scene: ${this.constructor.name}`);

    // Dispose of geometries and materials
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            disposeMaterial(material);
          }
        } else {
          disposeMaterial(object.material);
        }
      }
    });

    // Helper function to dispose of material properties
    function disposeMaterial(material) {
      for (const key in material) {
        const value = material[key];
        if (value && typeof value.dispose === 'function') {
          value.dispose();
        }
      }
      material.dispose();
    }

    // Clear the scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    this.isActive = false;
  }
}
