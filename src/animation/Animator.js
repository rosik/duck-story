import { Tween, TweenUtils } from './Tween.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Animation controller for managing multiple tweens and animations
 * Provides high-level animation management and sequencing
 */
export class Animator {
    constructor() {
        // Active animations
        this.tweens = new Map();
        this.sequences = new Map();
        this.groups = new Map();

        // Animation state
        this.isPlaying = true;
        this.timeScale = 1.0;
        this.nextId = 0;

        // Performance
        this.maxConcurrentTweens = 100;
        this.performanceProfile = 'medium';
    }

    /**
     * Update all animations
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.isPlaying) return;

        const scaledDeltaTime = deltaTime * this.timeScale;

        // Update tweens
        for (const [id, tween] of this.tweens) {
            const isActive = tween.update(scaledDeltaTime);

            if (!isActive) {
                this.tweens.delete(id);
                eventBus.emit('animation.tween.complete', { id, tween });
            }
        }

        // Update sequences
        for (const [id, sequence] of this.sequences) {
            const isActive = this.updateSequence(sequence, scaledDeltaTime);

            if (!isActive) {
                this.sequences.delete(id);
                eventBus.emit('animation.sequence.complete', { id, sequence });
            }
        }

        // Emit performance warning if too many concurrent animations
        if (this.tweens.size > this.maxConcurrentTweens) {
            eventBus.emit('animation.performance.warning', {
                activeCount: this.tweens.size,
                maxCount: this.maxConcurrentTweens
            });
        }
    }

    /**
     * Create and start a tween animation
     * @param {Object} target - Target object to animate
     * @param {Object} properties - Properties to animate
     * @param {number} duration - Duration in seconds
     * @param {Object} options - Animation options
     * @returns {string} Animation ID
     */
    to(target, properties, duration, options = {}) {
        const id = this.generateId();
        const tween = TweenUtils.to(target, properties, duration, options);

        this.tweens.set(id, tween);
        tween.start();

        eventBus.emit('animation.tween.started', { id, tween, target });

        return id;
    }

    /**
     * Create and start a from-to tween animation
     * @param {Object} target - Target object to animate
     * @param {Object} fromProperties - Starting properties
     * @param {Object} toProperties - Ending properties
     * @param {number} duration - Duration in seconds
     * @param {Object} options - Animation options
     * @returns {string} Animation ID
     */
    fromTo(target, fromProperties, toProperties, duration, options = {}) {
        const id = this.generateId();
        const tween = TweenUtils.fromTo(target, fromProperties, toProperties, duration, options);

        this.tweens.set(id, tween);
        tween.start();

        eventBus.emit('animation.tween.started', { id, tween, target });

        return id;
    }

    /**
     * Create a delayed callback
     * @param {number} delay - Delay in seconds
     * @param {Function} callback - Callback function
     * @returns {string} Animation ID
     */
    delayedCall(delay, callback) {
        const id = this.generateId();
        const tween = TweenUtils.delayedCall(delay, callback);

        this.tweens.set(id, tween);
        tween.start();

        return id;
    }

    /**
     * Create an animation sequence
     * @param {Array} animations - Array of animation definitions
     * @param {Object} options - Sequence options
     * @returns {string} Sequence ID
     */
    sequence(animations, options = {}) {
        const id = this.generateId();
        const sequence = {
            id,
            animations: [...animations],
            currentIndex: 0,
            currentTween: null,
            isPlaying: false,
            isComplete: false,
            loop: options.loop || false,
            onComplete: options.onComplete || null
        };

        this.sequences.set(id, sequence);
        this.startSequence(sequence);

        eventBus.emit('animation.sequence.started', { id, sequence });

        return id;
    }

    /**
     * Create an animation group (parallel animations)
     * @param {Array} animations - Array of animation definitions
     * @param {Object} options - Group options
     * @returns {string} Group ID
     */
    group(animations, options = {}) {
        const id = this.generateId();
        const tweenIds = [];

        // Start all animations in parallel
        for (const animation of animations) {
            const tweenId = this.createAnimationFromDefinition(animation);
            if (tweenId) {
                tweenIds.push(tweenId);
            }
        }

        const group = {
            id,
            tweenIds,
            onComplete: options.onComplete || null
        };

        this.groups.set(id, group);

        // Monitor group completion
        this.monitorGroupCompletion(group);

        eventBus.emit('animation.group.started', { id, group });

        return id;
    }

    /**
     * Pause animation by ID
     * @param {string} id - Animation ID
     */
    pause(id) {
        const tween = this.tweens.get(id);
        if (tween) {
            tween.pause();
            eventBus.emit('animation.paused', { id, tween });
        }

        const sequence = this.sequences.get(id);
        if (sequence) {
            sequence.isPlaying = false;
            if (sequence.currentTween) {
                sequence.currentTween.pause();
            }
            eventBus.emit('animation.sequence.paused', { id, sequence });
        }
    }

    /**
     * Resume animation by ID
     * @param {string} id - Animation ID
     */
    resume(id) {
        const tween = this.tweens.get(id);
        if (tween) {
            tween.resume();
            eventBus.emit('animation.resumed', { id, tween });
        }

        const sequence = this.sequences.get(id);
        if (sequence) {
            sequence.isPlaying = true;
            if (sequence.currentTween) {
                sequence.currentTween.resume();
            }
            eventBus.emit('animation.sequence.resumed', { id, sequence });
        }
    }

    /**
     * Stop animation by ID
     * @param {string} id - Animation ID
     */
    stop(id) {
        const tween = this.tweens.get(id);
        if (tween) {
            tween.stop();
            this.tweens.delete(id);
            eventBus.emit('animation.stopped', { id, tween });
        }

        const sequence = this.sequences.get(id);
        if (sequence) {
            if (sequence.currentTween) {
                sequence.currentTween.stop();
            }
            this.sequences.delete(id);
            eventBus.emit('animation.sequence.stopped', { id, sequence });
        }

        const group = this.groups.get(id);
        if (group) {
            for (const tweenId of group.tweenIds) {
                this.stop(tweenId);
            }
            this.groups.delete(id);
            eventBus.emit('animation.group.stopped', { id, group });
        }
    }

    /**
     * Pause all animations
     */
    pauseAll() {
        this.isPlaying = false;
        eventBus.emit('animation.all.paused');
    }

    /**
     * Resume all animations
     */
    resumeAll() {
        this.isPlaying = true;
        eventBus.emit('animation.all.resumed');
    }

    /**
     * Stop all animations
     */
    stopAll() {
        for (const id of this.tweens.keys()) {
            this.stop(id);
        }

        for (const id of this.sequences.keys()) {
            this.stop(id);
        }

        for (const id of this.groups.keys()) {
            this.stop(id);
        }

        eventBus.emit('animation.all.stopped');
    }

    /**
     * Set global time scale
     * @param {number} scale - Time scale multiplier
     */
    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
        eventBus.emit('animation.timescale.changed', { timeScale: this.timeScale });
    }

    /**
     * Set performance profile
     * @param {string} profile - Performance profile (high, medium, low)
     */
    setPerformanceProfile(profile) {
        this.performanceProfile = profile;

        switch (profile) {
            case 'high':
                this.maxConcurrentTweens = 100;
                break;
            case 'medium':
                this.maxConcurrentTweens = 50;
                break;
            case 'low':
                this.maxConcurrentTweens = 25;
                break;
        }

        // Stop excess animations if over limit
        if (this.tweens.size > this.maxConcurrentTweens) {
            const tweensToStop = Array.from(this.tweens.keys()).slice(this.maxConcurrentTweens);
            for (const id of tweensToStop) {
                this.stop(id);
            }
        }
    }

    /**
     * Generate unique animation ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `anim_${this.nextId++}`;
    }

    /**
     * Start a sequence
     * @param {Object} sequence - Sequence object
     */
    startSequence(sequence) {
        sequence.isPlaying = true;
        sequence.currentIndex = 0;
        this.playNextInSequence(sequence);
    }

    /**
     * Play next animation in sequence
     * @param {Object} sequence - Sequence object
     */
    playNextInSequence(sequence) {
        if (sequence.currentIndex >= sequence.animations.length) {
            if (sequence.loop) {
                sequence.currentIndex = 0;
            } else {
                sequence.isComplete = true;
                if (sequence.onComplete) {
                    sequence.onComplete();
                }
                return;
            }
        }

        const animationDef = sequence.animations[sequence.currentIndex];
        sequence.currentTween = this.createTweenFromDefinition(animationDef);

        if (sequence.currentTween) {
            // Set completion callback to advance sequence
            const originalOnComplete = sequence.currentTween.onComplete;
            sequence.currentTween.onComplete = (target) => {
                if (originalOnComplete) {
                    originalOnComplete(target);
                }
                sequence.currentIndex++;
                this.playNextInSequence(sequence);
            };

            sequence.currentTween.start();
        }
    }

    /**
     * Update sequence
     * @param {Object} sequence - Sequence object
     * @param {number} deltaTime - Time delta
     * @returns {boolean} Whether sequence is still active
     */
    updateSequence(sequence, deltaTime) {
        if (!sequence.isPlaying || sequence.isComplete) {
            return !sequence.isComplete;
        }

        if (sequence.currentTween) {
            const isActive = sequence.currentTween.update(deltaTime);
            if (!isActive) {
                sequence.currentTween = null;
            }
        }

        return !sequence.isComplete;
    }

    /**
     * Create tween from animation definition
     * @param {Object} animationDef - Animation definition
     * @returns {Tween} Created tween
     */
    createTweenFromDefinition(animationDef) {
        const { target, properties, duration, options = {} } = animationDef;

        if (animationDef.from) {
            return TweenUtils.fromTo(target, animationDef.from, properties, duration, options);
        } else {
            return TweenUtils.to(target, properties, duration, options);
        }
    }

    /**
     * Create animation from definition and add to animator
     * @param {Object} animationDef - Animation definition
     * @returns {string} Animation ID
     */
    createAnimationFromDefinition(animationDef) {
        const { target, properties, duration, options = {} } = animationDef;

        if (animationDef.from) {
            return this.fromTo(target, animationDef.from, properties, duration, options);
        } else {
            return this.to(target, properties, duration, options);
        }
    }

    /**
     * Monitor group completion
     * @param {Object} group - Group object
     */
    monitorGroupCompletion(group) {
        const checkCompletion = () => {
            const activeTweens = group.tweenIds.filter(id => this.tweens.has(id));

            if (activeTweens.length === 0) {
                // All tweens complete
                this.groups.delete(group.id);

                if (group.onComplete) {
                    group.onComplete();
                }

                eventBus.emit('animation.group.complete', { id: group.id, group });
            } else {
                // Check again next frame
                requestAnimationFrame(checkCompletion);
            }
        };

        requestAnimationFrame(checkCompletion);
    }

    /**
     * Get animation statistics
     * @returns {Object} Animation statistics
     */
    getStats() {
        return {
            activeTweens: this.tweens.size,
            activeSequences: this.sequences.size,
            activeGroups: this.groups.size,
            maxConcurrentTweens: this.maxConcurrentTweens,
            timeScale: this.timeScale,
            isPlaying: this.isPlaying,
            performanceProfile: this.performanceProfile
        };
    }

    /**
     * Create common animation presets
     */
    static createPresets() {
        return {
            /**
             * Fade in animation
             */
            fadeIn: (target, duration = 1, options = {}) => ({
                target,
                from: { opacity: 0 },
                properties: { opacity: 1 },
                duration,
                options: { easing: Tween.Easing.sineOut, ...options }
            }),

            /**
             * Fade out animation
             */
            fadeOut: (target, duration = 1, options = {}) => ({
                target,
                properties: { opacity: 0 },
                duration,
                options: { easing: Tween.Easing.sineIn, ...options }
            }),

            /**
             * Scale up animation
             */
            scaleUp: (target, duration = 0.5, options = {}) => ({
                target,
                from: { 'scale.x': 0, 'scale.y': 0, 'scale.z': 0 },
                properties: { 'scale.x': 1, 'scale.y': 1, 'scale.z': 1 },
                duration,
                options: { easing: Tween.Easing.backOut, ...options }
            }),

            /**
             * Scale down animation
             */
            scaleDown: (target, duration = 0.5, options = {}) => ({
                target,
                properties: { 'scale.x': 0, 'scale.y': 0, 'scale.z': 0 },
                duration,
                options: { easing: Tween.Easing.backIn, ...options }
            }),

            /**
             * Slide in from left
             */
            slideInLeft: (target, distance = 100, duration = 1, options = {}) => ({
                target,
                from: { 'position.x': target.position.x - distance },
                properties: { 'position.x': target.position.x },
                duration,
                options: { easing: Tween.Easing.cubicOut, ...options }
            }),

            /**
             * Bounce animation
             */
            bounce: (target, height = 1, duration = 1, options = {}) => ({
                target,
                properties: { 'position.y': target.position.y + height },
                duration: duration / 2,
                options: {
                    easing: Tween.Easing.bounceOut,
                    yoyo: true,
                    ...options
                }
            }),

            /**
             * Rotation animation
             */
            rotate: (target, angle = Math.PI * 2, duration = 2, options = {}) => ({
                target,
                properties: { 'rotation.y': target.rotation.y + angle },
                duration,
                options: { easing: Tween.Easing.linear, ...options }
            })
        };
    }
}
