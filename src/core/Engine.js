import { eventBus } from './EventBus.js';
import { GameLoop } from './GameLoop.js';
import { StateManager } from './StateManager.js';
import { Renderer } from '../rendering/Renderer.js';
import { InputManager } from '../interaction/InputManager.js';
import { UIManager } from '../interaction/UIManager.js';
import { DeviceDetector } from '../utils/DeviceDetector.js';
import { Scene } from '../scene/Scene.js';
import { SkyGradient } from '../scene/components/SkyGradient.js';
import { GroundPlane } from '../scene/components/GroundPlane.js';
import { CloudSystem } from '../scene/components/CloudSystem.js';
import { Mesh, GeometryGenerator } from '../rendering/Mesh.js';
import { MaterialLibrary } from '../rendering/Material.js';
import { SceneObject } from '../scene/SceneObject.js';
import { Transform } from '../scene/Transform.js';
import { Animator } from '../animation/Animator.js';
import { Tween } from '../animation/Tween.js';
import { modelLoader } from '../rendering/ModelLoader.js';

/**
 * Main engine orchestrator
 * Initializes and coordinates all game systems
 */
export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.isInitialized = false;
        this.isRunning = false;

        // Core systems
        this.gameLoop = new GameLoop();
        this.stateManager = new StateManager();
        this.renderer = null;
        this.inputManager = null;
        this.uiManager = null;
        this.animator = new Animator();

        // Device and performance
        this.deviceInfo = null;
        this.performanceProfile = 'medium';

        // Bind methods
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.onPerformanceChange = this.onPerformanceChange.bind(this);
        this.onResize = this.onResize.bind(this);

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize the engine and all systems
     */
    async init() {
        if (this.isInitialized) {
            console.warn('Engine already initialized');
            return;
        }

        console.log('Initializing 3D Game Engine...');

        try {
            // Detect device capabilities
            this.deviceInfo = DeviceDetector.detect();
            console.log('Device info:', this.deviceInfo);

            // Set initial performance profile based on device
            this.performanceProfile = 'medium'; // this.determineInitialPerformanceProfile();
            console.log('Initial performance profile:', this.performanceProfile);

            // Initialize renderer
            this.renderer = new Renderer(this.canvas);
            await this.renderer.init();

            // Initialize input manager
            this.inputManager = new InputManager(this.canvas);
            this.inputManager.init();

            // Initialize UI manager
            this.uiManager = new UIManager();
            this.uiManager.init();

            // Setup game loop callbacks
            this.gameLoop.setUpdateCallback(this.update);
            this.gameLoop.setRenderCallback(this.render);
            this.gameLoop.setPerformanceCallback(this.onPerformanceChange);

            // Set initial performance profile
            this.gameLoop.setPerformanceProfile(this.performanceProfile);

            // Create and register the start scene
            await this.createStartScene();

            // Setup resize handling
            this.handleResize();

            this.isInitialized = true;
            console.log('Engine initialized successfully');

            // Emit initialization complete event
            eventBus.emit('engine.initialized', {
                deviceInfo: this.deviceInfo,
                performanceProfile: this.performanceProfile
            });

        } catch (error) {
            console.error('Failed to initialize engine:', error);
            throw error;
        }
    }

    /**
     * Start the engine
     */
    start() {
        if (!this.isInitialized) {
            console.error('Engine not initialized. Call init() first.');
            return;
        }

        if (this.isRunning) {
            console.warn('Engine already running');
            return;
        }

        console.log('Starting engine...');

        this.isRunning = true;
        this.gameLoop.start();

        // Change to start scene
        this.stateManager.changeScene('start');

        eventBus.emit('engine.started');
    }

    /**
     * Stop the engine
     */
    stop() {
        if (!this.isRunning) return;

        console.log('Stopping engine...');

        this.isRunning = false;
        this.gameLoop.stop();

        eventBus.emit('engine.stopped');
    }

    /**
     * Update method called by game loop
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update input manager
        if (this.inputManager) {
            this.inputManager.update(deltaTime);
        }

        // Update state manager (which updates current scene)
        if (this.stateManager) {
            this.stateManager.update(deltaTime);
        }

        // Update UI manager
        if (this.uiManager) {
            this.uiManager.update(deltaTime);
        }

        // Update animator
        if (this.animator) {
            this.animator.update(deltaTime);
        }

        // Process queued events
        eventBus.processQueue();
    }

    /**
     * Render method called by game loop
     * @param {number} interpolation - Interpolation factor for smooth rendering
     */
    render(interpolation) {
        if (!this.renderer) return;

        // Get current scene
        const currentScene = this.stateManager.getCurrentScene();
        if (!currentScene) return;

        // Render the scene
        this.renderer.render(currentScene, interpolation);

        // Render UI overlay
        if (this.uiManager) {
            this.uiManager.render();
        }
    }

    /**
     * Handle performance profile changes
     * @param {string} profile - New performance profile
     * @param {number} currentFPS - Current FPS
     */
    onPerformanceChange(profile, currentFPS) {
        this.performanceProfile = profile;

        console.log(`Performance profile changed to: ${profile} (FPS: ${currentFPS})`);

        // Update renderer settings
        if (this.renderer) {
            this.renderer.setPerformanceProfile(profile);
        }

        // Update current scene components
        const currentScene = this.stateManager.getCurrentScene();
        if (currentScene) {
            currentScene.setPerformanceProfile(profile);
        }

        // Emit performance change event
        eventBus.emit('performance.profile.changed', {
            profile,
            currentFPS
        });
    }

    /**
     * Create the start scene with atmospheric 3D elements
     */
    async createStartScene() {
        const startScene = new Scene('start');

        // Add sky gradient
        const sky = new SkyGradient();
        sky.init(this.renderer.gl);
        startScene.addObject(sky);

        // Add ground plane
        const ground = new GroundPlane({
            radius: 100,
            borderSoftness: 10,
            color: [0.3, 0.9, 0.3],
            segments: 50,
        });
        ground.init(this.renderer.gl);
        startScene.addObject(ground);

        // Add cloud system
        const clouds = new CloudSystem({
            cloudCount: 80,
            windSpeed: { x: 0, y: 0, z: 7 },
            groundRadius: 100,
            height: 20,
        });
        clouds.init(this.renderer.gl);
        startScene.addObject(clouds);

        // Setup camera with gentle swaying motion
        startScene.setupStartCamera({
            position: [-90, 50, -110],
            target: [0, 1, 0],
            fov: Math.PI / 5,
            swayAmplitude: 0,
            swaySpeed: 0.1,
        });

        // Register the scene
        this.stateManager.registerScene('start', startScene);

        // Load and add rubber duck model
        try {
            console.log('Loading rubber duck model...');
            const modelData = await modelLoader.loadModel('gltf/Rubber_Duck.gltf');

            // Create geometries from all meshes in the model
            const geometries = GeometryGenerator.createAllFromModel(modelData, {
                scale: [2, 2, 2], // Scale up the model
                center: true,     // Center the model at origin
                flipY: false      // Don't flip Y coordinates
            });

            // Create scene objects for each geometry
            for (let i = 0; i < geometries.length; i++) {
                const geometry = geometries[i];
                const mesh = new Mesh(this.renderer.gl, geometry);

                // Create material based on model material or use default
                let material;
                if (geometry.materialIndex !== null &&
                    modelData.materials &&
                    modelData.materials[geometry.materialIndex]) {

                    const modelMaterial = modelData.materials[geometry.materialIndex];
                    material = MaterialLibrary.createBasic(
                        modelMaterial.color.slice(0, 3), // RGB only
                        modelMaterial.color[3] || 1.0    // Alpha
                    );

                    // Apply texture if available
                    if (modelMaterial.textures.baseColor) {
                        // TODO: Create WebGL texture from model texture data
                        // material.setTexture(webglTexture);
                    }
                } else {
                    // Use default yellow material for rubber duck
                    material = MaterialLibrary.createBasic([1.0, 0.8, 0.2]);
                }

                const modelObject = new SceneObject({
                    name: `rubber_duck_${i}`,
                    mesh: mesh,
                    material: material,
                    transform: new Transform({
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1, 1, 1]
                    })
                });

                startScene.addObject(modelObject);
            }

            console.log('Rubber duck model loaded successfully');

        } catch (error) {
            console.error('Failed to load rubber duck model:', error);

            // Fallback to yellow sphere if model loading fails
            const fallbackGeometry = GeometryGenerator.createSphere(3);
            const fallbackMesh = new Mesh(this.renderer.gl, fallbackGeometry);
            const fallbackMaterial = MaterialLibrary.createBasic([1.0, 0.8, 0.2]); // Yellow
            const fallbackObject = new SceneObject({
                name: 'fallback_sphere',
                mesh: fallbackMesh,
                material: fallbackMaterial,
                transform: new Transform({
                    position: [0, 0, 0]
                })
            });
            startScene.addObject(fallbackObject);
        }

        // console.log('Start scene created', startScene.getAllObjects());
    }

    /**
     * Animate camera to game position with smooth movement
     */
    animateCameraToGamePosition() {
        const currentScene = this.stateManager.getCurrentScene();
        if (!currentScene || !currentScene.camera) {
            console.warn('No camera available for animation');
            return;
        }

        const camera = currentScene.camera;
        const targetPosition = { x: -45, y: 10, z: -55 };
        const targetLookAt = { x: 0, y: 0, z: 0 };
        const animationDuration = 2.5; // 2.5 seconds for smooth movement

        // Disable camera sway during animation
        camera.setSwayEnabled(false);

        // Create position animation object to track intermediate values
        const positionProxy = {
            x: camera.basePosition.x,
            y: camera.basePosition.y,
            z: camera.basePosition.z
        };

        // Create target animation object to track intermediate values
        const targetProxy = {
            x: camera.baseTarget.x,
            y: camera.baseTarget.y,
            z: camera.baseTarget.z
        };

        // Animate camera position
        this.animator.to(positionProxy, targetPosition, animationDuration, {
            easing: Tween.Easing.cubicInOut,
            onUpdate: (target) => {
                // Update camera position during animation
                camera.setPosition(target.x, target.y, target.z);
            },
            onComplete: () => {
                console.log('Camera position animation complete');
                // Re-enable camera sway after animation
                // camera.setSwayEnabled(true);
                // Emit game start event
                eventBus.emit('game.start.requested');
            }
        });

        // Animate camera target (what it's looking at)
        this.animator.to(targetProxy, targetLookAt, animationDuration, {
            easing: Tween.Easing.cubicInOut,
            onUpdate: (target) => {
                // Update camera target during animation
                camera.setTarget(target.x, target.y, target.z);
            }
        });

        console.log(`Camera animation started: moving to position (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
    }

    /**
     * Determine initial performance profile based on device capabilities
     * @returns {string} Performance profile (high, medium, low)
     */
    determineInitialPerformanceProfile() {
        if (!this.deviceInfo) return 'medium';

        // Mobile devices start with medium or low
        if (this.deviceInfo.isMobile) {
            return this.deviceInfo.isHighEndMobile ? 'medium' : 'low';
        }

        // Desktop devices
        if (this.deviceInfo.isHighEnd) {
            return 'high';
        } else if (this.deviceInfo.isMidRange) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onResize);

        // Visibility change (pause when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.isRunning) {
                    this.gameLoop.stop();
                    eventBus.emit('engine.paused');
                }
            } else {
                if (this.isRunning) {
                    this.gameLoop.start();
                    eventBus.emit('engine.resumed');
                }
            }
        });

        // Start button click
        eventBus.on('ui.start.clicked', () => {
            console.log('Start button clicked - initiating smooth camera movement');
            this.animateCameraToGamePosition();
        });

        // Error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            eventBus.emit('engine.error', event.error);
        });

        // WebGL context lost/restored
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost');
            eventBus.emit('webgl.context.lost');
        });

        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            eventBus.emit('webgl.context.restored');
            // Reinitialize renderer
            if (this.renderer) {
                this.renderer.handleContextRestored();
            }
        });
    }

    /**
     * Handle window resize
     */
    onResize() {
        this.handleResize();
    }

    /**
     * Handle canvas and viewport resize
     */
    handleResize() {
        if (!this.canvas) return;

        // Update canvas size
        const rect = this.canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * pixelRatio;
        this.canvas.height = rect.height * pixelRatio;

        // Update renderer viewport
        if (this.renderer) {
            this.renderer.setViewport(this.canvas.width, this.canvas.height);
        }

        // Update camera aspect ratio
        const currentScene = this.stateManager.getCurrentScene();
        if (currentScene && currentScene.camera) {
            currentScene.camera.setAspectRatio(this.canvas.width / this.canvas.height);
        }

        eventBus.emit('engine.resized', {
            width: this.canvas.width,
            height: this.canvas.height,
            pixelRatio
        });
    }

    /**
     * Get engine statistics
     * @returns {Object} Engine stats
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            performanceProfile: this.performanceProfile,
            deviceInfo: this.deviceInfo,
            gameLoop: this.gameLoop ? this.gameLoop.getPerformanceStats() : null,
            renderer: this.renderer ? this.renderer.getStats() : null,
            currentScene: this.stateManager ? this.stateManager.getCurrentSceneId() : null
        };
    }

    /**
     * Cleanup and destroy the engine
     */
    destroy() {
        console.log('Destroying engine...');

        // Stop the game loop
        this.stop();

        // Remove event listeners
        window.removeEventListener('resize', this.onResize);

        // Cleanup systems
        if (this.renderer) {
            this.renderer.destroy();
        }

        if (this.inputManager) {
            this.inputManager.destroy();
        }

        if (this.uiManager) {
            this.uiManager.destroy();
        }

        if (this.animator) {
            this.animator.stopAll();
        }

        // Clear event bus
        eventBus.clear();

        this.isInitialized = false;

        eventBus.emit('engine.destroyed');
    }
}
