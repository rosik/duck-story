import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Asset loader utility for the game
 */
export class AssetLoader {
  /**
   * Create a new AssetLoader
   */
  constructor() {
    // Loaders
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();

    // Cache for loaded assets
    this.cache = {
      textures: {},
      models: {},
      sounds: {}
    };

    // Loading managers
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoadingManager();
  }

  /**
   * Setup loading manager
   */
  setupLoadingManager() {
    this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
      console.log(`Started loading: ${url} (${itemsLoaded}/${itemsTotal})`);
    };

    this.loadingManager.onLoad = () => {
      console.log('Loading complete!');
    };

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
    };

    this.loadingManager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };

    // Set loading manager for loaders
    this.textureLoader.manager = this.loadingManager;
    this.gltfLoader.manager = this.loadingManager;
  }

  /**
   * Load a texture
   * @param {string} url - URL of the texture
   * @param {Object} options - Loading options
   * @returns {Promise<THREE.Texture>} - The loaded texture
   */
  loadTexture(url, options = {}) {
    // Check cache
    if (this.cache.textures[url]) {
      return Promise.resolve(this.cache.textures[url]);
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Apply options
          if (options.repeat) {
            texture.repeat.set(options.repeat.x || 1, options.repeat.y || 1);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
          }

          if (options.flipY !== undefined) {
            texture.flipY = options.flipY;
          }

          // Cache and resolve
          this.cache.textures[url] = texture;
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Error loading texture: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load a GLTF model
   * @param {string} url - URL of the model
   * @returns {Promise<THREE.Group>} - The loaded model
   */
  loadModel(url) {
    // Check cache
    if (this.cache.models[url]) {
      // Clone the cached model to avoid modifying the original
      const clone = this.cache.models[url].clone();
      return Promise.resolve(clone);
    }

    return new Promise((resolve, reject) => {
      // Check if the file exists first
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Model file not found (${response.status})`);
          }

          // If the file exists, load it with GLTFLoader
          this.gltfLoader.load(
            url,
            (gltf) => {
              const model = gltf.scene;

              // Cache the original model
              this.cache.models[url] = model.clone();

              resolve(model);
            },
            (xhr) => {
              console.log(`${url}: ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`);
            },
            (error) => {
              console.error(`Error loading model: ${url}`, error);
              reject(error);
            }
          );
        })
        .catch(error => {
          console.warn(`Error loading model: ${url}`, error);
          reject(error);
        });
    });
  }

  /**
   * Preload a sound
   * @param {string} id - Unique identifier for the sound
   * @param {string} url - URL of the sound file
   * @returns {Promise<HTMLAudioElement>} - The loaded audio element
   */
  preloadSound(id, url) {
    // Check cache
    if (this.cache.sounds[id]) {
      return Promise.resolve(this.cache.sounds[id]);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();

      audio.addEventListener('canplaythrough', () => {
        this.cache.sounds[id] = audio;
        resolve(audio);
      }, { once: true });

      audio.addEventListener('error', (error) => {
        console.error(`Error loading sound ${id} from ${url}:`, error);
        reject(error);
      });

      audio.src = url;
      audio.load();
    });
  }

  /**
   * Preload multiple sounds
   * @param {Object} soundMap - Map of sound IDs to URLs
   * @returns {Promise} - Resolves when all sounds are loaded
   */
  async preloadSounds(soundMap) {
    const promises = [];

    for (const [id, url] of Object.entries(soundMap)) {
      promises.push(this.preloadSound(id, url));
    }

    return Promise.all(promises);
  }

  /**
   * Get a cached sound
   * @param {string} id - ID of the sound
   * @returns {HTMLAudioElement|null} - The audio element or null if not found
   */
  getSound(id) {
    return this.cache.sounds[id] || null;
  }

  /**
   * Clear cache
   * @param {string} type - Type of cache to clear ('textures', 'models', 'sounds', 'all')
   */
  clearCache(type = 'all') {
    if (type === 'all' || type === 'textures') {
      for (const texture of Object.values(this.cache.textures)) {
        texture.dispose();
      }
      this.cache.textures = {};
    }

    if (type === 'all' || type === 'models') {
      this.cache.models = {};
    }

    if (type === 'all' || type === 'sounds') {
      this.cache.sounds = {};
    }
  }
}
