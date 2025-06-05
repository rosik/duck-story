/**
 * Tween interpolation utilities with various easing functions
 * Provides smooth animations between values
 */
export class Tween {
    constructor(target, properties, duration, options = {}) {
        this.target = target;
        this.properties = properties;
        this.duration = duration;

        // Options
        this.easing = options.easing || Tween.Easing.linear;
        this.delay = options.delay || 0;
        this.repeat = options.repeat || 0;
        this.yoyo = options.yoyo || false;
        this.onStart = options.onStart || null;
        this.onUpdate = options.onUpdate || null;
        this.onComplete = options.onComplete || null;

        // State
        this.isPlaying = false;
        this.isPaused = false;
        this.isComplete = false;
        this.currentTime = 0;
        this.delayTime = 0;
        this.repeatCount = 0;
        this.isReversed = false;

        // Store initial values
        this.startValues = {};
        this.endValues = {};
        this.deltaValues = {};

        this.setupValues();
    }

    /**
     * Setup start and end values
     */
    setupValues() {
        for (const property in this.properties) {
            this.startValues[property] = this.getPropertyValue(this.target, property);
            this.endValues[property] = this.properties[property];
            this.deltaValues[property] = this.endValues[property] - this.startValues[property];
        }
    }

    /**
     * Get property value from target object
     * @param {Object} target - Target object
     * @param {string} property - Property path (supports nested properties)
     * @returns {number} Property value
     */
    getPropertyValue(target, property) {
        const path = property.split('.');
        let value = target;

        for (const key of path) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return 0;
            }
        }

        return typeof value === 'number' ? value : 0;
    }

    /**
     * Set property value on target object
     * @param {Object} target - Target object
     * @param {string} property - Property path
     * @param {number} value - Value to set
     */
    setPropertyValue(target, property, value) {
        const path = property.split('.');
        const lastKey = path.pop();
        let obj = target;

        for (const key of path) {
            if (obj && typeof obj === 'object' && key in obj) {
                obj = obj[key];
            } else {
                return;
            }
        }

        if (obj && typeof obj === 'object') {
            obj[lastKey] = value;
        }
    }

    /**
     * Start the tween
     * @returns {Tween} This tween for chaining
     */
    start() {
        this.isPlaying = true;
        this.isPaused = false;
        this.isComplete = false;
        this.currentTime = 0;
        this.delayTime = 0;
        this.repeatCount = 0;
        this.isReversed = false;

        // Reset to start values
        this.setupValues();

        if (this.onStart) {
            this.onStart(this.target);
        }

        return this;
    }

    /**
     * Stop the tween
     * @returns {Tween} This tween for chaining
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.isComplete = true;

        return this;
    }

    /**
     * Pause the tween
     * @returns {Tween} This tween for chaining
     */
    pause() {
        this.isPaused = true;
        return this;
    }

    /**
     * Resume the tween
     * @returns {Tween} This tween for chaining
     */
    resume() {
        this.isPaused = false;
        return this;
    }

    /**
     * Update the tween
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} Whether tween is still active
     */
    update(deltaTime) {
        if (!this.isPlaying || this.isPaused || this.isComplete) {
            return !this.isComplete;
        }

        // Handle delay
        if (this.delayTime < this.delay) {
            this.delayTime += deltaTime;
            return true;
        }

        // Update time
        this.currentTime += deltaTime;

        // Calculate progress (0-1)
        let progress = Math.min(this.currentTime / this.duration, 1);

        // Apply easing
        const easedProgress = this.easing(progress);

        // Update properties
        this.updateProperties(easedProgress);

        // Call update callback
        if (this.onUpdate) {
            this.onUpdate(this.target, easedProgress);
        }

        // Check if complete
        if (progress >= 1) {
            this.handleComplete();
        }

        return !this.isComplete;
    }

    /**
     * Update target properties based on progress
     * @param {number} progress - Eased progress (0-1)
     */
    updateProperties(progress) {
        const actualProgress = this.isReversed ? 1 - progress : progress;

        for (const property in this.properties) {
            const startValue = this.isReversed ? this.endValues[property] : this.startValues[property];
            const deltaValue = this.isReversed ? -this.deltaValues[property] : this.deltaValues[property];
            const currentValue = startValue + deltaValue * actualProgress;

            this.setPropertyValue(this.target, property, currentValue);
        }
    }

    /**
     * Handle tween completion
     */
    handleComplete() {
        // Handle yoyo
        if (this.yoyo && !this.isReversed) {
            this.isReversed = true;
            this.currentTime = 0;
            return;
        }

        // Handle repeat
        if (this.repeatCount < this.repeat) {
            this.repeatCount++;
            this.currentTime = 0;
            this.isReversed = false;
            return;
        }

        // Tween is complete
        this.isComplete = true;
        this.isPlaying = false;

        if (this.onComplete) {
            this.onComplete(this.target);
        }
    }

    /**
     * Set easing function
     * @param {Function} easing - Easing function
     * @returns {Tween} This tween for chaining
     */
    setEasing(easing) {
        this.easing = easing;
        return this;
    }

    /**
     * Set delay
     * @param {number} delay - Delay in seconds
     * @returns {Tween} This tween for chaining
     */
    setDelay(delay) {
        this.delay = delay;
        return this;
    }

    /**
     * Set repeat count
     * @param {number} repeat - Number of repeats
     * @returns {Tween} This tween for chaining
     */
    setRepeat(repeat) {
        this.repeat = repeat;
        return this;
    }

    /**
     * Set yoyo mode
     * @param {boolean} yoyo - Whether to yoyo
     * @returns {Tween} This tween for chaining
     */
    setYoyo(yoyo) {
        this.yoyo = yoyo;
        return this;
    }

    /**
     * Set callbacks
     * @param {Object} callbacks - Callback functions
     * @returns {Tween} This tween for chaining
     */
    setCallbacks(callbacks) {
        if (callbacks.onStart) this.onStart = callbacks.onStart;
        if (callbacks.onUpdate) this.onUpdate = callbacks.onUpdate;
        if (callbacks.onComplete) this.onComplete = callbacks.onComplete;
        return this;
    }
}

/**
 * Easing functions
 */
Tween.Easing = {
    /**
     * Linear easing (no acceleration)
     */
    linear: (t) => t,

    /**
     * Quadratic easing functions
     */
    quadIn: (t) => t * t,
    quadOut: (t) => t * (2 - t),
    quadInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    /**
     * Cubic easing functions
     */
    cubicIn: (t) => t * t * t,
    cubicOut: (t) => (--t) * t * t + 1,
    cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    /**
     * Quartic easing functions
     */
    quartIn: (t) => t * t * t * t,
    quartOut: (t) => 1 - (--t) * t * t * t,
    quartInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

    /**
     * Quintic easing functions
     */
    quintIn: (t) => t * t * t * t * t,
    quintOut: (t) => 1 + (--t) * t * t * t * t,
    quintInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

    /**
     * Sine easing functions
     */
    sineIn: (t) => 1 - Math.cos(t * Math.PI / 2),
    sineOut: (t) => Math.sin(t * Math.PI / 2),
    sineInOut: (t) => (1 - Math.cos(Math.PI * t)) / 2,

    /**
     * Exponential easing functions
     */
    expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    expoInOut: (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    },

    /**
     * Circular easing functions
     */
    circIn: (t) => 1 - Math.sqrt(1 - t * t),
    circOut: (t) => Math.sqrt(1 - (t - 1) * (t - 1)),
    circInOut: (t) => {
        if (t < 0.5) return (1 - Math.sqrt(1 - 4 * t * t)) / 2;
        return (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
    },

    /**
     * Back easing functions (overshoot)
     */
    backIn: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    },
    backOut: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    backInOut: (t) => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        if (t < 0.5) {
            return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
        }
        return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },

    /**
     * Elastic easing functions (spring)
     */
    elasticIn: (t) => {
        const c4 = (2 * Math.PI) / 3;
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    elasticOut: (t) => {
        const c4 = (2 * Math.PI) / 3;
        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    elasticInOut: (t) => {
        const c5 = (2 * Math.PI) / 4.5;
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) {
            return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
        }
        return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },

    /**
     * Bounce easing functions
     */
    bounceIn: (t) => 1 - Tween.Easing.bounceOut(1 - t),
    bounceOut: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },
    bounceInOut: (t) => {
        if (t < 0.5) {
            return (1 - Tween.Easing.bounceOut(1 - 2 * t)) / 2;
        }
        return (1 + Tween.Easing.bounceOut(2 * t - 1)) / 2;
    }
};

/**
 * Tween utility functions
 */
export class TweenUtils {
    /**
     * Create a simple tween
     * @param {Object} target - Target object
     * @param {Object} properties - Properties to animate
     * @param {number} duration - Duration in seconds
     * @param {Object} options - Tween options
     * @returns {Tween} Created tween
     */
    static to(target, properties, duration, options = {}) {
        return new Tween(target, properties, duration, options);
    }

    /**
     * Create a tween from current values to specified values
     * @param {Object} target - Target object
     * @param {Object} fromProperties - Starting properties
     * @param {Object} toProperties - Ending properties
     * @param {number} duration - Duration in seconds
     * @param {Object} options - Tween options
     * @returns {Tween} Created tween
     */
    static fromTo(target, fromProperties, toProperties, duration, options = {}) {
        // Set starting values
        for (const property in fromProperties) {
            const tween = new Tween(target, {}, 0);
            tween.setPropertyValue(target, property, fromProperties[property]);
        }

        return new Tween(target, toProperties, duration, options);
    }

    /**
     * Create a delayed tween
     * @param {number} delay - Delay in seconds
     * @param {Function} callback - Callback to execute after delay
     * @returns {Tween} Created tween
     */
    static delayedCall(delay, callback) {
        const dummyTarget = {};
        return new Tween(dummyTarget, {}, 0, {
            delay,
            onComplete: callback
        });
    }
}
