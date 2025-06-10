/**
 * Game loop management with adaptive performance scaling
 * Maintains consistent frame timing and handles performance optimization
 */
export class GameLoop {
    constructor() {
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        this.accumulator = 0;
        this.maxDeltaTime = 1000 / 20; // Cap at 20 FPS minimum

        // Performance tracking
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.currentFPS = 0;
        this.averageFPS = 60;
        this.fpsHistory = [];
        this.maxFPSHistory = 60;

        // Performance scaling
        this.performanceProfile = 'medium'; // high, medium, low
        this.adaptiveScaling = false;
        this.performanceCheckInterval = 2000; // Check every 2 seconds
        this.lastPerformanceCheck = 0;

        // Callbacks
        this.updateCallback = null;
        this.renderCallback = null;
        this.performanceCallback = null;

        // Bind methods
        this.tick = this.tick.bind(this);
    }

    /**
     * Set the update callback function
     * @param {Function} callback - Function to call for updates (deltaTime)
     */
    setUpdateCallback(callback) {
        this.updateCallback = callback;
    }

    /**
     * Set the render callback function
     * @param {Function} callback - Function to call for rendering
     */
    setRenderCallback(callback) {
        this.renderCallback = callback;
    }

    /**
     * Set the performance callback function
     * @param {Function} callback - Function to call when performance changes (profile, fps)
     */
    setPerformanceCallback(callback) {
        this.performanceCallback = callback;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fpsUpdateTime = this.lastTime;

        console.log('GameLoop started');
        requestAnimationFrame(this.tick);
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        console.log('GameLoop stopped');
    }

    /**
     * Main game loop tick
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    tick(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time
        this.deltaTime = Math.min(currentTime - this.lastTime, this.maxDeltaTime);
        this.lastTime = currentTime;

        // Update FPS tracking
        this.updateFPS(currentTime);

        // Check performance if adaptive scaling is enabled
        if (this.adaptiveScaling && currentTime - this.lastPerformanceCheck > this.performanceCheckInterval) {
            this.checkPerformance(currentTime);
            this.lastPerformanceCheck = currentTime;
        }

        // Fixed timestep update with accumulator
        this.accumulator += this.deltaTime;

        let updateCount = 0;
        const maxUpdates = 5; // Prevent spiral of death

        while (this.accumulator >= this.frameTime && updateCount < maxUpdates) {
            if (this.updateCallback) {
                this.updateCallback(this.frameTime / 1000); // Convert to seconds
            }

            this.accumulator -= this.frameTime;
            updateCount++;
        }

        // Render with interpolation factor
        const interpolation = this.accumulator / this.frameTime;
        if (this.renderCallback) {
            this.renderCallback(interpolation);
        }

        // Continue the loop
        requestAnimationFrame(this.tick);
    }

    /**
     * Update FPS tracking
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        this.frameCount++;

        const elapsed = currentTime - this.fpsUpdateTime;
        if (elapsed >= 1000) { // Update every second
            this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);

            // Add to history
            this.fpsHistory.push(this.currentFPS);
            if (this.fpsHistory.length > this.maxFPSHistory) {
                this.fpsHistory.shift();
            }

            // Calculate average FPS
            this.averageFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;

            // Reset counters
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
    }

    /**
     * Check performance and adjust settings if needed
     * @param {number} currentTime - Current timestamp
     */
    checkPerformance(currentTime) {
        const targetFPS = this.getTargetFPSForProfile();
        const performanceRatio = this.averageFPS / targetFPS;

        let newProfile = this.performanceProfile;

        // Downgrade performance if FPS is too low
        if (performanceRatio < 0.8) {
            if (this.performanceProfile === 'high') {
                newProfile = 'medium';
            } else if (this.performanceProfile === 'medium') {
                newProfile = 'low';
            }
        }
        // Upgrade performance if FPS is consistently high
        else if (performanceRatio > 1.2 && this.fpsHistory.length >= 10) {
            const recentAverage = this.fpsHistory.slice(-10).reduce((sum, fps) => sum + fps, 0) / 10;
            if (recentAverage > targetFPS * 1.2) {
                if (this.performanceProfile === 'low') {
                    newProfile = 'medium';
                } else if (this.performanceProfile === 'medium') {
                    newProfile = 'high';
                }
            }
        }

        // Apply performance profile change
        if (newProfile !== this.performanceProfile) {
            this.setPerformanceProfile(newProfile);
        }
    }

    /**
     * Get target FPS for current performance profile
     * @returns {number} Target FPS
     */
    getTargetFPSForProfile() {
        switch (this.performanceProfile) {
            case 'high': return 60;
            case 'medium': return 30;
            case 'low': return 20;
            default: return 60;
        }
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile (high, medium, low)
     */
    setPerformanceProfile(profile) {
        if (this.performanceProfile === profile) return;

        const oldProfile = this.performanceProfile;
        this.performanceProfile = profile;
        this.targetFPS = this.getTargetFPSForProfile();
        this.frameTime = 1000 / this.targetFPS;

        console.log(`Performance profile changed: ${oldProfile} -> ${profile} (Target FPS: ${this.targetFPS})`);

        if (this.performanceCallback) {
            this.performanceCallback(profile, this.currentFPS);
        }
    }

    /**
     * Enable or disable adaptive performance scaling
     * @param {boolean} enabled - Whether to enable adaptive scaling
     */
    setAdaptiveScaling(enabled) {
        this.adaptiveScaling = enabled;
        console.log(`Adaptive performance scaling: ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current performance statistics
     * @returns {Object} Performance stats
     */
    getPerformanceStats() {
        return {
            currentFPS: this.currentFPS,
            averageFPS: Math.round(this.averageFPS),
            targetFPS: this.targetFPS,
            profile: this.performanceProfile,
            deltaTime: this.deltaTime,
            frameTime: this.frameTime
        };
    }

    /**
     * Reset performance tracking
     */
    resetPerformanceTracking() {
        this.fpsHistory = [];
        this.frameCount = 0;
        this.currentFPS = 0;
        this.averageFPS = 60;
        this.fpsUpdateTime = performance.now();
    }
}
