/**
 * Manages audio playback for the game
 */
export class AudioManager {
  /**
   * Create a new AudioManager
   */
  constructor() {
    // Sound effects collection
    this.sounds = {};

    // Background music
    this.backgroundMusic = null;
    this.backgroundMusicVolume = 0.5;

    // Voice narration
    this.narration = null;
    this.narrationVolume = 1.0;

    // Global settings
    this.masterVolume = 1.0;
    this.soundEffectsVolume = 0.8;
    this.isMuted = false;

    // Preloaded status tracking
    this.preloadedSounds = {};
  }

  /**
   * Preload a sound effect
   * @param {string} id - Unique identifier for the sound
   * @param {string} url - URL to the sound file
   * @returns {Promise} - Resolves when sound is loaded or fails with a timeout
   */
  preloadSound(id, url) {
    return new Promise((resolve, reject) => {
      if (this.preloadedSounds[id]) {
        resolve(this.preloadedSounds[id]);
        return;
      }

      const audio = new Audio();

      // Set a timeout to handle cases where the file doesn't exist or can't be loaded
      const timeoutId = setTimeout(() => {
        console.warn(`Timeout loading sound ${id} from ${url}`);
        // Create a dummy audio element to resolve the promise
        const dummyAudio = new Audio();
        this.preloadedSounds[id] = dummyAudio;
        resolve(dummyAudio);
      }, 3000); // 3 second timeout

      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeoutId);
        this.preloadedSounds[id] = audio;
        resolve(audio);
      }, { once: true });

      audio.addEventListener('error', (error) => {
        clearTimeout(timeoutId);
        console.error(`Error loading sound ${id} from ${url}:`, error);
        // Create a dummy audio element to resolve the promise
        const dummyAudio = new Audio();
        this.preloadedSounds[id] = dummyAudio;
        resolve(dummyAudio);
      });

      audio.src = url;
      audio.load();
    });
  }

  /**
   * Preload multiple sounds
   * @param {Object} soundMap - Map of sound IDs to URLs
   * @returns {Promise} - Resolves when all sounds are loaded or failed with timeout
   */
  async preloadSounds(soundMap) {
    const promises = [];

    for (const [id, url] of Object.entries(soundMap)) {
      promises.push(this.preloadSound(id, url).catch(error => {
        console.warn(`Failed to load sound ${id} from ${url}:`, error);
        // Return a dummy audio element to allow Promise.all to resolve
        return new Audio();
      }));
    }

    try {
      await Promise.all(promises);
      console.log('All sounds preloaded successfully');
    } catch (error) {
      console.error('Error preloading sounds:', error);
    }
  }

  /**
   * Play a sound effect
   * @param {string} id - ID of the sound to play
   * @param {Object} options - Playback options
   * @returns {HTMLAudioElement|null} - The audio element or null if sound not found
   */
  playSound(id, options = {}) {
    if (this.isMuted) return null;

    const sound = this.preloadedSounds[id];
    if (!sound) {
      console.warn(`Sound not found: ${id}`);
      return null;
    }

    try {
      // Clone the audio element for overlapping sounds
      const audioInstance = sound.cloneNode();

      // Apply options
      const defaultOptions = {
        volume: this.soundEffectsVolume,
        loop: false,
        rate: 1.0
      };

      const settings = { ...defaultOptions, ...options };

      // Apply settings
      audioInstance.volume = settings.volume * this.masterVolume;
      audioInstance.loop = settings.loop;
      audioInstance.playbackRate = settings.rate;

      // Play the sound
      audioInstance.play().catch(error => {
        console.error(`Error playing sound ${id}:`, error);
      });

      // Store reference if looping
      if (settings.loop) {
        this.sounds[id] = audioInstance;
      }

      return audioInstance;
    } catch (error) {
      console.error(`Error playing sound ${id}:`, error);
      return null;
    }
  }

  /**
   * Stop a sound effect
   * @param {string} id - ID of the sound to stop
   */
  stopSound(id) {
    if (this.sounds[id]) {
      try {
        this.sounds[id].pause();
        this.sounds[id].currentTime = 0;
        delete this.sounds[id];
      } catch (error) {
        console.error(`Error stopping sound ${id}:`, error);
      }
    }
  }

  /**
   * Play background music
   * @param {string} id - ID of the music to play
   * @param {Object} options - Playback options
   */
  playBackgroundMusic(id, options = {}) {
    if (this.isMuted) return;

    // Stop current background music if playing
    this.stopBackgroundMusic();

    const music = this.preloadedSounds[id];
    if (!music) {
      console.warn(`Background music not found: ${id}`);
      return;
    }

    try {
      // Apply options
      const defaultOptions = {
        volume: this.backgroundMusicVolume,
        fadeIn: true,
        fadeInDuration: 2.0
      };

      const settings = { ...defaultOptions, ...options };

      // Setup music
      this.backgroundMusic = music.cloneNode();
      this.backgroundMusic.loop = true;

      // Apply volume
      if (settings.fadeIn) {
        this.backgroundMusic.volume = 0;
        this.fadeInAudio(this.backgroundMusic, settings.volume * this.masterVolume, settings.fadeInDuration);
      } else {
        this.backgroundMusic.volume = settings.volume * this.masterVolume;
      }

      // Play music
      this.backgroundMusic.play().catch(error => {
        console.error(`Error playing background music ${id}:`, error);
      });
    } catch (error) {
      console.error(`Error playing background music ${id}:`, error);
    }
  }

  /**
   * Stop background music
   * @param {Object} options - Stop options
   */
  stopBackgroundMusic(options = {}) {
    if (!this.backgroundMusic) return;

    try {
      const defaultOptions = {
        fadeOut: true,
        fadeOutDuration: 2.0
      };

      const settings = { ...defaultOptions, ...options };

      if (settings.fadeOut) {
        this.fadeOutAudio(this.backgroundMusic, settings.fadeOutDuration, () => {
          this.backgroundMusic.pause();
          this.backgroundMusic.currentTime = 0;
          this.backgroundMusic = null;
        });
      } else {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic = null;
      }
    } catch (error) {
      console.error('Error stopping background music:', error);
      this.backgroundMusic = null;
    }
  }

  /**
   * Play voice narration
   * @param {string} id - ID of the narration to play
   * @param {Function} onComplete - Callback when narration completes
   */
  playNarration(id, onComplete = null) {
    if (this.isMuted) {
      if (onComplete) onComplete();
      return;
    }

    // Stop current narration if playing
    this.stopNarration();

    const narration = this.preloadedSounds[id];
    if (!narration) {
      console.warn(`Narration not found: ${id}`);
      if (onComplete) onComplete();
      return;
    }

    try {
      // Setup narration
      this.narration = narration.cloneNode();
      this.narration.volume = this.narrationVolume * this.masterVolume;

      // Add completion callback
      if (onComplete) {
        this.narration.addEventListener('ended', onComplete, { once: true });
      }

      // Play narration
      this.narration.play().catch(error => {
        console.error(`Error playing narration ${id}:`, error);
        if (onComplete) onComplete();
      });
    } catch (error) {
      console.error(`Error playing narration ${id}:`, error);
      if (onComplete) onComplete();
    }
  }

  /**
   * Stop current narration
   */
  stopNarration() {
    if (!this.narration) return;

    try {
      this.narration.pause();
      this.narration.currentTime = 0;
      this.narration = null;
    } catch (error) {
      console.error('Error stopping narration:', error);
      this.narration = null;
    }
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    // Update currently playing sounds
    this.updateAllVolumes();
  }

  /**
   * Set sound effects volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setSoundEffectsVolume(volume) {
    this.soundEffectsVolume = Math.max(0, Math.min(1, volume));

    // Update currently playing sound effects
    this.updateAllVolumes();
  }

  /**
   * Set background music volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setBackgroundMusicVolume(volume) {
    this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));

    // Update background music volume
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.backgroundMusicVolume * this.masterVolume;
    }
  }

  /**
   * Set narration volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setNarrationVolume(volume) {
    this.narrationVolume = Math.max(0, Math.min(1, volume));

    // Update narration volume
    if (this.narration) {
      this.narration.volume = this.narrationVolume * this.masterVolume;
    }
  }

  /**
   * Mute all audio
   */
  mute() {
    this.isMuted = true;

    // Store current volumes
    this._previousMasterVolume = this.masterVolume;

    // Set volume to 0 for all playing audio
    this.masterVolume = 0;
    this.updateAllVolumes();
  }

  /**
   * Unmute all audio
   */
  unmute() {
    this.isMuted = false;

    // Restore previous volume
    if (this._previousMasterVolume !== undefined) {
      this.masterVolume = this._previousMasterVolume;
    } else {
      this.masterVolume = 1.0;
    }

    // Update all volumes
    this.updateAllVolumes();
  }

  /**
   * Update volumes for all currently playing audio
   */
  updateAllVolumes() {
    try {
      // Update sound effects
      for (const sound of Object.values(this.sounds)) {
        sound.volume = this.soundEffectsVolume * this.masterVolume;
      }

      // Update background music
      if (this.backgroundMusic) {
        this.backgroundMusic.volume = this.backgroundMusicVolume * this.masterVolume;
      }

      // Update narration
      if (this.narration) {
        this.narration.volume = this.narrationVolume * this.masterVolume;
      }
    } catch (error) {
      console.error('Error updating volumes:', error);
    }
  }

  /**
   * Fade in audio element
   * @param {HTMLAudioElement} audio - Audio element to fade
   * @param {number} targetVolume - Target volume
   * @param {number} duration - Fade duration in seconds
   */
  fadeInAudio(audio, targetVolume, duration) {
    try {
      const startTime = performance.now();
      const startVolume = audio.volume;

      const fadeStep = () => {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        const t = Math.min(elapsed / duration, 1);

        // Apply volume
        audio.volume = startVolume + (targetVolume - startVolume) * t;

        // Continue fading if not complete
        if (t < 1) {
          requestAnimationFrame(fadeStep);
        }
      };

      requestAnimationFrame(fadeStep);
    } catch (error) {
      console.error('Error fading in audio:', error);
    }
  }

  /**
   * Fade out audio element
   * @param {HTMLAudioElement} audio - Audio element to fade
   * @param {number} duration - Fade duration in seconds
   * @param {Function} onComplete - Callback when fade completes
   */
  fadeOutAudio(audio, duration, onComplete) {
    try {
      const startTime = performance.now();
      const startVolume = audio.volume;

      const fadeStep = () => {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        const t = Math.min(elapsed / duration, 1);

        // Apply volume
        audio.volume = startVolume * (1 - t);

        // Continue fading if not complete
        if (t < 1) {
          requestAnimationFrame(fadeStep);
        } else if (onComplete) {
          onComplete();
        }
      };

      requestAnimationFrame(fadeStep);
    } catch (error) {
      console.error('Error fading out audio:', error);
      if (onComplete) onComplete();
    }
  }
}
