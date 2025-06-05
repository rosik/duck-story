import { eventBus } from './EventBus.js';

/**
 * Game state management and scene transitions
 * Handles current scene, story state, and state persistence
 */
export class StateManager {
    constructor() {
        this.currentScene = null;
        this.scenes = new Map();
        this.storyState = new Map();
        this.gameState = {
            currentSceneId: null,
            playerData: {},
            settings: {
                volume: 1.0,
                quality: 'auto'
            }
        };

        // Transition state
        this.isTransitioning = false;
        this.transitionDuration = 1000; // 1 second default
        this.transitionStartTime = 0;

        // State persistence
        this.autoSave = true;
        this.saveKey = 'gameFramework_save';

        // Bind methods
        this.update = this.update.bind(this);

        // Load saved state
        this.loadState();
    }

    /**
     * Register a scene
     * @param {string} sceneId - Unique scene identifier
     * @param {Scene} scene - Scene instance
     */
    registerScene(sceneId, scene) {
        this.scenes.set(sceneId, scene);
        console.log(`Scene registered: ${sceneId}`);
    }

    /**
     * Unregister a scene
     * @param {string} sceneId - Scene identifier to remove
     */
    unregisterScene(sceneId) {
        if (this.scenes.has(sceneId)) {
            this.scenes.delete(sceneId);
            console.log(`Scene unregistered: ${sceneId}`);
        }
    }

    /**
     * Change to a different scene
     * @param {string} sceneId - Target scene identifier
     * @param {Object} transitionOptions - Transition configuration
     */
    async changeScene(sceneId, transitionOptions = {}) {
        if (this.isTransitioning) {
            console.warn('Scene transition already in progress');
            return;
        }

        if (!this.scenes.has(sceneId)) {
            console.error(`Scene not found: ${sceneId}`);
            return;
        }

        const targetScene = this.scenes.get(sceneId);
        const previousScene = this.currentScene;
        const previousSceneId = this.gameState.currentSceneId;

        // Start transition
        this.isTransitioning = true;
        this.transitionStartTime = performance.now();
        this.transitionDuration = transitionOptions.duration || this.transitionDuration;

        // Emit transition start event
        eventBus.emit('scene.transition.start', {
            from: previousSceneId,
            to: sceneId,
            duration: this.transitionDuration
        });

        try {
            // Exit current scene
            if (previousScene && typeof previousScene.onExit === 'function') {
                await previousScene.onExit();
            }

            // Update state
            this.currentScene = targetScene;
            this.gameState.currentSceneId = sceneId;

            // Initialize new scene
            if (typeof targetScene.onEnter === 'function') {
                await targetScene.onEnter();
            }

            // Auto-save if enabled
            if (this.autoSave) {
                this.saveState();
            }

            // Emit scene change event
            eventBus.emit('scene.changed', {
                from: previousSceneId,
                to: sceneId,
                scene: targetScene
            });

            console.log(`Scene changed: ${previousSceneId} -> ${sceneId}`);

        } catch (error) {
            console.error('Error during scene transition:', error);
            this.isTransitioning = false;
            return;
        }

        // Wait for transition duration
        setTimeout(() => {
            this.isTransitioning = false;
            eventBus.emit('scene.transition.complete', {
                from: previousSceneId,
                to: sceneId,
                scene: targetScene
            });
        }, this.transitionDuration);
    }

    /**
     * Get current scene
     * @returns {Scene|null} Current scene instance
     */
    getCurrentScene() {
        return this.currentScene;
    }

    /**
     * Get current scene ID
     * @returns {string|null} Current scene identifier
     */
    getCurrentSceneId() {
        return this.gameState.currentSceneId;
    }

    /**
     * Set a story flag
     * @param {string} key - Flag name
     * @param {any} value - Flag value
     */
    setFlag(key, value) {
        const oldValue = this.storyState.get(key);
        this.storyState.set(key, value);

        eventBus.emit('story.flag.changed', {
            key,
            oldValue,
            newValue: value
        });

        if (this.autoSave) {
            this.saveState();
        }
    }

    /**
     * Get a story flag
     * @param {string} key - Flag name
     * @param {any} defaultValue - Default value if flag doesn't exist
     * @returns {any} Flag value
     */
    getFlag(key, defaultValue = null) {
        return this.storyState.has(key) ? this.storyState.get(key) : defaultValue;
    }

    /**
     * Check if a story flag exists
     * @param {string} key - Flag name
     * @returns {boolean} Whether the flag exists
     */
    hasFlag(key) {
        return this.storyState.has(key);
    }

    /**
     * Remove a story flag
     * @param {string} key - Flag name
     */
    removeFlag(key) {
        if (this.storyState.has(key)) {
            const oldValue = this.storyState.get(key);
            this.storyState.delete(key);

            eventBus.emit('story.flag.removed', {
                key,
                oldValue
            });

            if (this.autoSave) {
                this.saveState();
            }
        }
    }

    /**
     * Set player data
     * @param {string} key - Data key
     * @param {any} value - Data value
     */
    setPlayerData(key, value) {
        this.gameState.playerData[key] = value;

        eventBus.emit('player.data.changed', {
            key,
            value
        });

        if (this.autoSave) {
            this.saveState();
        }
    }

    /**
     * Get player data
     * @param {string} key - Data key
     * @param {any} defaultValue - Default value
     * @returns {any} Player data value
     */
    getPlayerData(key, defaultValue = null) {
        return this.gameState.playerData.hasOwnProperty(key)
            ? this.gameState.playerData[key]
            : defaultValue;
    }

    /**
     * Update method called by game loop
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update current scene
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            this.currentScene.update(deltaTime);
        }

        // Handle transition effects
        if (this.isTransitioning) {
            const elapsed = performance.now() - this.transitionStartTime;
            const progress = Math.min(elapsed / this.transitionDuration, 1.0);

            eventBus.emit('scene.transition.progress', {
                progress,
                elapsed,
                duration: this.transitionDuration
            });
        }
    }

    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            const saveData = {
                gameState: this.gameState,
                storyState: Array.from(this.storyState.entries()),
                timestamp: Date.now(),
                version: '1.0.0'
            };

            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            eventBus.emit('game.saved', saveData);

        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (!savedData) return;

            const saveData = JSON.parse(savedData);

            // Restore game state
            this.gameState = { ...this.gameState, ...saveData.gameState };

            // Restore story state
            if (saveData.storyState) {
                this.storyState = new Map(saveData.storyState);
            }

            eventBus.emit('game.loaded', saveData);
            console.log('Game state loaded from save');

        } catch (error) {
            console.error('Failed to load game state:', error);
        }
    }

    /**
     * Clear saved state
     */
    clearSave() {
        try {
            localStorage.removeItem(this.saveKey);
            this.storyState.clear();
            this.gameState = {
                currentSceneId: null,
                playerData: {},
                settings: {
                    volume: 1.0,
                    quality: 'auto'
                }
            };

            eventBus.emit('game.save.cleared');
            console.log('Save data cleared');

        } catch (error) {
            console.error('Failed to clear save data:', error);
        }
    }

    /**
     * Export save data
     * @returns {string} JSON string of save data
     */
    exportSave() {
        const saveData = {
            gameState: this.gameState,
            storyState: Array.from(this.storyState.entries()),
            timestamp: Date.now(),
            version: '1.0.0'
        };

        return JSON.stringify(saveData, null, 2);
    }

    /**
     * Import save data
     * @param {string} saveDataJson - JSON string of save data
     */
    importSave(saveDataJson) {
        try {
            const saveData = JSON.parse(saveDataJson);

            this.gameState = { ...this.gameState, ...saveData.gameState };
            this.storyState = new Map(saveData.storyState || []);

            this.saveState(); // Save to localStorage
            eventBus.emit('game.imported', saveData);

            console.log('Save data imported successfully');

        } catch (error) {
            console.error('Failed to import save data:', error);
            throw error;
        }
    }

    /**
     * Get transition progress (0-1)
     * @returns {number} Transition progress
     */
    getTransitionProgress() {
        if (!this.isTransitioning) return 0;

        const elapsed = performance.now() - this.transitionStartTime;
        return Math.min(elapsed / this.transitionDuration, 1.0);
    }

    /**
     * Check if currently transitioning
     * @returns {boolean} Whether a transition is in progress
     */
    isInTransition() {
        return this.isTransitioning;
    }
}
