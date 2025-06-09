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
        const ground = new GroundPlane();
        ground.init(this.renderer.gl);
        startScene.addObject(ground);

        // Add cloud system
        const clouds = new CloudSystem();
        clouds.init(this.renderer.gl);
        startScene.addObject(clouds);

        // Setup camera with gentle swaying motion
        startScene.setupStartCamera();

        // Register the scene
        this.stateManager.registerScene('start', startScene);

        // Add white box at origin after scene is fully initialized
        const boxGeometry = GeometryGenerator.createSphere(3);
        const boxMesh = new Mesh(this.renderer.gl, boxGeometry);
        const whiteMaterial = MaterialLibrary.createBasic([1, 1, 1]);
        const box = new SceneObject({
            name: 'sphere',
            mesh: boxMesh,
            material: whiteMaterial,
            transform: new Transform({
                position: [0, 0, 0]
            })
        });
        startScene.addObject(box);

        // console.log('Start scene created', startScene.getAllObjects());
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
            console.log('Start button clicked');
            // TODO: Transition to game scene
            eventBus.emit('game.start.requested');
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

        // Clear event bus
        eventBus.clear();

        this.isInitialized = false;

        eventBus.emit('engine.destroyed');
    }
}
