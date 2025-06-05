import { eventBus } from '../core/EventBus.js';

/**
 * UI Manager for 2D overlay elements
 * Handles UI interactions, animations, and state management
 */
export class UIManager {
    constructor() {
        // UI elements
        this.elements = new Map();
        this.activeElements = [];

        // UI state
        this.isVisible = true;
        this.isInteractive = true;

        // Animation system
        this.animations = new Map();
        this.animationId = 0;

        // Event handlers
        this.boundHandlers = new Map();

        // UI containers
        this.overlay = null;
        this.startButton = null;
        this.loadingScreen = null;
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.setupUIElements();
        this.setupEventListeners();

        console.log('UIManager initialized');
    }

    /**
     * Setup UI elements
     */
    setupUIElements() {
        // Get UI overlay container
        this.overlay = document.getElementById('ui-overlay');
        if (!this.overlay) {
            console.warn('UI overlay container not found');
            return;
        }

        // Get start button
        this.startButton = document.getElementById('startButton');
        if (this.startButton) {
            this.registerElement('startButton', this.startButton, {
                type: 'button',
                interactive: true,
                animations: ['hover', 'click']
            });
        }

        // Get loading screen
        this.loadingScreen = document.getElementById('loadingScreen');
        if (this.loadingScreen) {
            this.registerElement('loadingScreen', this.loadingScreen, {
                type: 'screen',
                interactive: false
            });
        }

        console.log('UI elements setup complete');
    }

    /**
     * Register UI element
     * @param {string} id - Element ID
     * @param {HTMLElement} element - DOM element
     * @param {Object} options - Element options
     */
    registerElement(id, element, options = {}) {
        const elementData = {
            id,
            element,
            type: options.type || 'generic',
            interactive: options.interactive !== undefined ? options.interactive : true,
            visible: options.visible !== undefined ? options.visible : true,
            animations: options.animations || [],
            state: 'normal',
            userData: options.userData || {}
        };

        this.elements.set(id, elementData);

        if (elementData.interactive) {
            this.setupElementInteraction(elementData);
        }

        eventBus.emit('ui.element.registered', { id, element: elementData });
    }

    /**
     * Setup element interaction
     * @param {Object} elementData - Element data
     */
    setupElementInteraction(elementData) {
        const element = elementData.element;

        // Mouse/touch events
        const onPointerEnter = (event) => {
            if (!this.isInteractive) return;

            elementData.state = 'hover';
            this.playElementAnimation(elementData.id, 'hover');

            eventBus.emit('ui.element.hover', {
                id: elementData.id,
                element: elementData,
                originalEvent: event
            });
        };

        const onPointerLeave = (event) => {
            if (!this.isInteractive) return;

            elementData.state = 'normal';
            this.stopElementAnimation(elementData.id, 'hover');

            eventBus.emit('ui.element.leave', {
                id: elementData.id,
                element: elementData,
                originalEvent: event
            });
        };

        const onPointerDown = (event) => {
            if (!this.isInteractive) return;

            elementData.state = 'active';
            this.playElementAnimation(elementData.id, 'click');

            eventBus.emit('ui.element.down', {
                id: elementData.id,
                element: elementData,
                originalEvent: event
            });
        };

        const onPointerUp = (event) => {
            if (!this.isInteractive) return;

            elementData.state = 'hover';
            this.stopElementAnimation(elementData.id, 'click');

            eventBus.emit('ui.element.up', {
                id: elementData.id,
                element: elementData,
                originalEvent: event
            });
        };

        const onClick = (event) => {
            if (!this.isInteractive) return;

            event.preventDefault();

            eventBus.emit('ui.element.click', {
                id: elementData.id,
                element: elementData,
                originalEvent: event
            });

            // Emit specific button events
            if (elementData.id === 'startButton') {
                eventBus.emit('ui.start.clicked', {
                    element: elementData,
                    originalEvent: event
                });
            }
        };

        // Add event listeners
        element.addEventListener('mouseenter', onPointerEnter);
        element.addEventListener('mouseleave', onPointerLeave);
        element.addEventListener('mousedown', onPointerDown);
        element.addEventListener('mouseup', onPointerUp);
        element.addEventListener('click', onClick);

        // Touch events for mobile
        element.addEventListener('touchstart', onPointerDown);
        element.addEventListener('touchend', onPointerUp);

        // Store handlers for cleanup
        this.boundHandlers.set(elementData.id, {
            onPointerEnter,
            onPointerLeave,
            onPointerDown,
            onPointerUp,
            onClick
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for engine events
        eventBus.on('engine.initialized', () => {
            this.hideLoadingScreen();
        });

        eventBus.on('scene.transition.start', () => {
            this.setInteractive(false);
        });

        eventBus.on('scene.transition.complete', () => {
            this.setInteractive(true);
        });

        // Listen for performance changes
        eventBus.on('performance.profile.changed', (data) => {
            this.adjustUIForPerformance(data.profile);
        });
    }

    /**
     * Update UI manager
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update animations
        this.updateAnimations(deltaTime);

        // Update element states
        for (const elementData of this.elements.values()) {
            this.updateElement(elementData, deltaTime);
        }
    }

    /**
     * Update individual element
     * @param {Object} elementData - Element data
     * @param {number} deltaTime - Time since last update
     */
    updateElement(elementData, deltaTime) {
        // Custom element update logic can go here
        // For example, updating progress bars, counters, etc.
    }

    /**
     * Render UI (called by renderer)
     */
    render() {
        // UI is rendered by the browser's DOM renderer
        // This method can be used for custom canvas-based UI elements
    }

    /**
     * Show UI element
     * @param {string} id - Element ID
     * @param {Object} options - Animation options
     */
    showElement(id, options = {}) {
        const elementData = this.elements.get(id);
        if (!elementData) {
            console.warn(`UI element not found: ${id}`);
            return;
        }

        elementData.visible = true;
        elementData.element.style.display = options.display || 'block';

        if (options.animate) {
            this.animateElementIn(id, options);
        }

        eventBus.emit('ui.element.shown', { id, element: elementData });
    }

    /**
     * Hide UI element
     * @param {string} id - Element ID
     * @param {Object} options - Animation options
     */
    hideElement(id, options = {}) {
        const elementData = this.elements.get(id);
        if (!elementData) {
            console.warn(`UI element not found: ${id}`);
            return;
        }

        elementData.visible = false;

        if (options.animate) {
            this.animateElementOut(id, options).then(() => {
                elementData.element.style.display = 'none';
            });
        } else {
            elementData.element.style.display = 'none';
        }

        eventBus.emit('ui.element.hidden', { id, element: elementData });
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.hideElement('loadingScreen', {
                animate: true,
                duration: 500
            });
        }
    }

    /**
     * Show loading screen
     * @param {string} message - Loading message
     */
    showLoadingScreen(message = 'Loading...') {
        if (this.loadingScreen) {
            const messageElement = this.loadingScreen.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }

            this.showElement('loadingScreen', {
                animate: true,
                duration: 300
            });
        }
    }

    /**
     * Set UI interactivity
     * @param {boolean} interactive - Whether UI should be interactive
     */
    setInteractive(interactive) {
        this.isInteractive = interactive;

        // Update pointer events for all interactive elements
        for (const elementData of this.elements.values()) {
            if (elementData.interactive) {
                elementData.element.style.pointerEvents = interactive ? 'auto' : 'none';
            }
        }

        eventBus.emit('ui.interactivity.changed', { interactive });
    }

    /**
     * Set UI visibility
     * @param {boolean} visible - Whether UI should be visible
     */
    setVisible(visible) {
        this.isVisible = visible;

        if (this.overlay) {
            this.overlay.style.display = visible ? 'block' : 'none';
        }

        eventBus.emit('ui.visibility.changed', { visible });
    }

    /**
     * Play element animation
     * @param {string} id - Element ID
     * @param {string} animationType - Animation type
     */
    playElementAnimation(id, animationType) {
        const elementData = this.elements.get(id);
        if (!elementData || !elementData.animations.includes(animationType)) {
            return;
        }

        const element = elementData.element;

        switch (animationType) {
            case 'hover':
                element.style.transform = 'scale(1.05)';
                element.style.transition = 'transform 0.2s ease';
                break;

            case 'click':
                element.style.transform = 'scale(0.95)';
                element.style.transition = 'transform 0.1s ease';
                break;
        }
    }

    /**
     * Stop element animation
     * @param {string} id - Element ID
     * @param {string} animationType - Animation type
     */
    stopElementAnimation(id, animationType) {
        const elementData = this.elements.get(id);
        if (!elementData) return;

        const element = elementData.element;

        switch (animationType) {
            case 'hover':
            case 'click':
                element.style.transform = 'scale(1)';
                break;
        }
    }

    /**
     * Animate element in
     * @param {string} id - Element ID
     * @param {Object} options - Animation options
     * @returns {Promise} Animation promise
     */
    animateElementIn(id, options = {}) {
        const elementData = this.elements.get(id);
        if (!elementData) return Promise.resolve();

        const element = elementData.element;
        const duration = options.duration || 300;

        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.transform = 'scale(0.8)';
            element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;

            // Trigger animation
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';

                setTimeout(resolve, duration);
            });
        });
    }

    /**
     * Animate element out
     * @param {string} id - Element ID
     * @param {Object} options - Animation options
     * @returns {Promise} Animation promise
     */
    animateElementOut(id, options = {}) {
        const elementData = this.elements.get(id);
        if (!elementData) return Promise.resolve();

        const element = elementData.element;
        const duration = options.duration || 300;

        return new Promise((resolve) => {
            element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
            element.style.opacity = '0';
            element.style.transform = 'scale(0.8)';

            setTimeout(resolve, duration);
        });
    }

    /**
     * Update animations
     * @param {number} deltaTime - Time since last update
     */
    updateAnimations(deltaTime) {
        // Update custom animations here
        for (const [id, animation] of this.animations) {
            if (animation.update) {
                animation.update(deltaTime);

                if (animation.isComplete()) {
                    this.animations.delete(id);
                }
            }
        }
    }

    /**
     * Adjust UI for performance profile
     * @param {string} profile - Performance profile
     */
    adjustUIForPerformance(profile) {
        const reduceAnimations = profile === 'low';

        for (const elementData of this.elements.values()) {
            const element = elementData.element;

            if (reduceAnimations) {
                // Disable transitions for better performance
                element.style.transition = 'none';
            } else {
                // Re-enable transitions
                element.style.transition = '';
            }
        }
    }

    /**
     * Create notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     */
    showNotification(message, options = {}) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;

        // Style notification
        Object.assign(notification.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '5px',
            fontSize: '14px',
            zIndex: '1000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });

        this.overlay.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });

        // Auto-hide after duration
        const duration = options.duration || 3000;
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * Get UI statistics
     * @returns {Object} UI statistics
     */
    getStats() {
        return {
            elementCount: this.elements.size,
            activeAnimations: this.animations.size,
            isVisible: this.isVisible,
            isInteractive: this.isInteractive
        };
    }

    /**
     * Destroy UI manager
     */
    destroy() {
        // Remove event listeners
        for (const [id, handlers] of this.boundHandlers) {
            const elementData = this.elements.get(id);
            if (elementData) {
                const element = elementData.element;

                element.removeEventListener('mouseenter', handlers.onPointerEnter);
                element.removeEventListener('mouseleave', handlers.onPointerLeave);
                element.removeEventListener('mousedown', handlers.onPointerDown);
                element.removeEventListener('mouseup', handlers.onPointerUp);
                element.removeEventListener('click', handlers.onClick);
                element.removeEventListener('touchstart', handlers.onPointerDown);
                element.removeEventListener('touchend', handlers.onPointerUp);
            }
        }

        // Clear data
        this.elements.clear();
        this.animations.clear();
        this.boundHandlers.clear();

        console.log('UIManager destroyed');
    }
}
