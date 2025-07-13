import * as THREE from 'three';

/**
 * Manages scenes and transitions between them
 */
export class SceneManager {
  /**
   * Create a new SceneManager
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.scenes = {};
    this.currentScene = null;
    this.previousScene = null;
    this.transitionInProgress = false;
  }

  /**
   * Register a scene with the manager
   * @param {string} name - Unique name for the scene
   * @param {BaseScene} sceneInstance - Instance of a scene
   */
  registerScene(name, sceneInstance) {
    this.scenes[name] = sceneInstance;
    console.log(`Scene registered: ${name}`);
  }

  /**
   * Transition to a different scene
   * @param {string} sceneName - Name of the scene to transition to
   * @param {Object} transitionOptions - Options for the transition
   * @returns {Promise} - Resolves when transition is complete
   */
  async transitionTo(sceneName, transitionOptions = {}) {
    // Check if scene exists
    if (!this.scenes[sceneName]) {
      console.error(`Scene not found: ${sceneName}`);
      return;
    }

    // Check if already in transition
    if (this.transitionInProgress) {
      console.warn('Transition already in progress, ignoring request');
      return;
    }

    console.log(`Transitioning to scene: ${sceneName}`);
    this.transitionInProgress = true;

    // Default transition options
    const options = {
      duration: 1.0,
      fadeOut: true,
      fadeIn: true,
      ...transitionOptions
    };

    // Store previous scene
    this.previousScene = this.currentScene;

    // If we have a current scene, fade it out
    if (this.currentScene && options.fadeOut) {
      await this.fadeOutScene(this.currentScene, options.duration / 2);
    }

    // Initialize the new scene if needed
    const newScene = this.scenes[sceneName];
    if (!newScene.isInitialized) {
      await newScene.init();
    }

    // Switch to new scene
    this.currentScene = newScene;

    // Fade in the new scene
    if (options.fadeIn) {
      await this.fadeInScene(this.currentScene, options.duration / 2);
    }

    // Cleanup previous scene if needed
    if (this.previousScene) {
      // Keep previous scene initialized but not active
      this.previousScene.isActive = false;
    }

    this.transitionInProgress = false;
    console.log(`Transition to ${sceneName} complete`);

    return this.currentScene;
  }

  /**
   * Fade out a scene
   * @param {BaseScene} scene - Scene to fade out
   * @param {number} duration - Duration of fade in seconds
   * @returns {Promise} - Resolves when fade is complete
   */
  fadeOutScene(scene, duration) {
    return new Promise((resolve) => {
      // Simple implementation - could be enhanced with actual visual fade
      setTimeout(() => {
        scene.isActive = false;
        resolve();
      }, duration * 1000);
    });
  }

  /**
   * Fade in a scene
   * @param {BaseScene} scene - Scene to fade in
   * @param {number} duration - Duration of fade in seconds
   * @returns {Promise} - Resolves when fade is complete
   */
  fadeInScene(scene, duration) {
    return new Promise((resolve) => {
      // Simple implementation - could be enhanced with actual visual fade
      scene.isActive = true;
      setTimeout(resolve, duration * 1000);
    });
  }

  /**
   * Update the current scene
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (this.currentScene && this.currentScene.isActive) {
      this.currentScene.update(deltaTime);
    }
  }
}
