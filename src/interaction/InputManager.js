import { eventBus } from '../core/EventBus.js';

/**
 * Input manager for mouse, touch, and keyboard input
 * Normalizes input across different devices and provides unified interface
 */
export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;

        // Input state
        this.mouse = {
            x: 0,
            y: 0,
            normalizedX: 0,
            normalizedY: 0,
            isDown: false,
            button: -1,
            wheel: 0
        };

        this.touch = {
            touches: [],
            isActive: false
        };

        this.keyboard = {
            keys: new Set(),
            modifiers: {
                shift: false,
                ctrl: false,
                alt: false,
                meta: false
            }
        };

        // Device capabilities
        this.hasTouch = 'ontouchstart' in window;
        this.hasMouse = !this.hasTouch; // Assume no mouse on touch devices
        this.hasKeyboard = true;

        // Event listeners
        this.boundEventHandlers = {};

        // Input settings
        this.enabled = true;
        this.preventContextMenu = true;
        this.preventSelection = true;
    }

    /**
     * Initialize input manager
     */
    init() {
        this.setupEventListeners();
        this.setupCanvasProperties();

        console.log('InputManager initialized', {
            hasTouch: this.hasTouch,
            hasMouse: this.hasMouse,
            hasKeyboard: this.hasKeyboard
        });
    }

    /**
     * Setup canvas properties for input
     */
    setupCanvasProperties() {
        if (this.preventSelection) {
            this.canvas.style.userSelect = 'none';
            this.canvas.style.webkitUserSelect = 'none';
            this.canvas.style.mozUserSelect = 'none';
            this.canvas.style.msUserSelect = 'none';
        }

        this.canvas.style.touchAction = 'none'; // Prevent default touch behaviors
        this.canvas.tabIndex = 1; // Make canvas focusable for keyboard events
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse events
        if (this.hasMouse) {
            this.addEventListeners([
                ['mousedown', this.onMouseDown.bind(this)],
                ['mouseup', this.onMouseUp.bind(this)],
                ['mousemove', this.onMouseMove.bind(this)],
                ['wheel', this.onMouseWheel.bind(this)],
                ['contextmenu', this.onContextMenu.bind(this)]
            ]);
        }

        // Touch events
        if (this.hasTouch) {
            this.addEventListeners([
                ['touchstart', this.onTouchStart.bind(this)],
                ['touchend', this.onTouchEnd.bind(this)],
                ['touchmove', this.onTouchMove.bind(this)],
                ['touchcancel', this.onTouchCancel.bind(this)]
            ]);
        }

        // Keyboard events (on window for global capture)
        if (this.hasKeyboard) {
            this.addWindowEventListeners([
                ['keydown', this.onKeyDown.bind(this)],
                ['keyup', this.onKeyUp.bind(this)],
                ['blur', this.onWindowBlur.bind(this)]
            ]);
        }

        // Canvas focus events
        this.addEventListeners([
            ['focus', this.onCanvasFocus.bind(this)],
            ['blur', this.onCanvasBlur.bind(this)]
        ]);
    }

    /**
     * Add event listeners to canvas
     * @param {Array} events - Array of [event, handler] pairs
     */
    addEventListeners(events) {
        for (const [event, handler] of events) {
            this.canvas.addEventListener(event, handler, { passive: false });
            this.boundEventHandlers[event] = handler;
        }
    }

    /**
     * Add event listeners to window
     * @param {Array} events - Array of [event, handler] pairs
     */
    addWindowEventListeners(events) {
        for (const [event, handler] of events) {
            window.addEventListener(event, handler, { passive: false });
            this.boundEventHandlers[`window_${event}`] = handler;
        }
    }

    /**
     * Update input manager (called by game loop)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Reset wheel delta
        this.mouse.wheel = 0;

        // Process any queued input events
        eventBus.processQueue();
    }

    /**
     * Mouse event handlers
     */
    onMouseDown(event) {
        if (!this.enabled) return;

        event.preventDefault();
        this.updateMousePosition(event);

        this.mouse.isDown = true;
        this.mouse.button = event.button;

        eventBus.emit('input.mouse.down', {
            x: this.mouse.x,
            y: this.mouse.y,
            normalizedX: this.mouse.normalizedX,
            normalizedY: this.mouse.normalizedY,
            button: event.button,
            originalEvent: event
        });
    }

    onMouseUp(event) {
        if (!this.enabled) return;

        event.preventDefault();
        this.updateMousePosition(event);

        const wasDown = this.mouse.isDown;
        this.mouse.isDown = false;

        eventBus.emit('input.mouse.up', {
            x: this.mouse.x,
            y: this.mouse.y,
            normalizedX: this.mouse.normalizedX,
            normalizedY: this.mouse.normalizedY,
            button: event.button,
            originalEvent: event
        });

        // Emit click event if mouse was pressed and released
        if (wasDown && this.mouse.button === event.button) {
            eventBus.emit('input.mouse.click', {
                x: this.mouse.x,
                y: this.mouse.y,
                normalizedX: this.mouse.normalizedX,
                normalizedY: this.mouse.normalizedY,
                button: event.button,
                originalEvent: event
            });
        }
    }

    onMouseMove(event) {
        if (!this.enabled) return;

        this.updateMousePosition(event);

        eventBus.emit('input.mouse.move', {
            x: this.mouse.x,
            y: this.mouse.y,
            normalizedX: this.mouse.normalizedX,
            normalizedY: this.mouse.normalizedY,
            isDown: this.mouse.isDown,
            originalEvent: event
        });
    }

    onMouseWheel(event) {
        if (!this.enabled) return;

        event.preventDefault();

        this.mouse.wheel = event.deltaY;

        eventBus.emit('input.mouse.wheel', {
            x: this.mouse.x,
            y: this.mouse.y,
            delta: event.deltaY,
            originalEvent: event
        });
    }

    onContextMenu(event) {
        if (this.preventContextMenu) {
            event.preventDefault();
        }
    }

    /**
     * Touch event handlers
     */
    onTouchStart(event) {
        if (!this.enabled) return;

        event.preventDefault();
        this.updateTouches(event);

        this.touch.isActive = true;

        // Emit touch start for each new touch
        for (const touch of event.changedTouches) {
            const touchData = this.getTouchData(touch);
            eventBus.emit('input.touch.start', touchData);

            // Also emit as mouse down for compatibility
            eventBus.emit('input.mouse.down', {
                x: touchData.x,
                y: touchData.y,
                normalizedX: touchData.normalizedX,
                normalizedY: touchData.normalizedY,
                button: 0,
                originalEvent: event
            });
        }
    }

    onTouchEnd(event) {
        if (!this.enabled) return;

        event.preventDefault();

        // Emit touch end for each ended touch
        for (const touch of event.changedTouches) {
            const touchData = this.getTouchData(touch);
            eventBus.emit('input.touch.end', touchData);

            // Also emit as mouse up and click for compatibility
            eventBus.emit('input.mouse.up', {
                x: touchData.x,
                y: touchData.y,
                normalizedX: touchData.normalizedX,
                normalizedY: touchData.normalizedY,
                button: 0,
                originalEvent: event
            });

            eventBus.emit('input.mouse.click', {
                x: touchData.x,
                y: touchData.y,
                normalizedX: touchData.normalizedX,
                normalizedY: touchData.normalizedY,
                button: 0,
                originalEvent: event
            });
        }

        this.updateTouches(event);

        if (this.touch.touches.length === 0) {
            this.touch.isActive = false;
        }
    }

    onTouchMove(event) {
        if (!this.enabled) return;

        event.preventDefault();
        this.updateTouches(event);

        // Emit touch move for each moved touch
        for (const touch of event.changedTouches) {
            const touchData = this.getTouchData(touch);
            eventBus.emit('input.touch.move', touchData);

            // Also emit as mouse move for compatibility
            eventBus.emit('input.mouse.move', {
                x: touchData.x,
                y: touchData.y,
                normalizedX: touchData.normalizedX,
                normalizedY: touchData.normalizedY,
                isDown: true,
                originalEvent: event
            });
        }
    }

    onTouchCancel(event) {
        if (!this.enabled) return;

        event.preventDefault();

        // Emit touch cancel for each cancelled touch
        for (const touch of event.changedTouches) {
            const touchData = this.getTouchData(touch);
            eventBus.emit('input.touch.cancel', touchData);
        }

        this.updateTouches(event);

        if (this.touch.touches.length === 0) {
            this.touch.isActive = false;
        }
    }

    /**
     * Keyboard event handlers
     */
    onKeyDown(event) {
        if (!this.enabled) return;

        const key = event.code || event.key;

        if (!this.keyboard.keys.has(key)) {
            this.keyboard.keys.add(key);

            // Update modifiers
            this.updateModifiers(event);

            eventBus.emit('input.key.down', {
                key,
                code: event.code,
                keyCode: event.keyCode,
                modifiers: { ...this.keyboard.modifiers },
                originalEvent: event
            });
        }
    }

    onKeyUp(event) {
        if (!this.enabled) return;

        const key = event.code || event.key;

        if (this.keyboard.keys.has(key)) {
            this.keyboard.keys.delete(key);

            // Update modifiers
            this.updateModifiers(event);

            eventBus.emit('input.key.up', {
                key,
                code: event.code,
                keyCode: event.keyCode,
                modifiers: { ...this.keyboard.modifiers },
                originalEvent: event
            });
        }
    }

    onWindowBlur() {
        // Clear all pressed keys when window loses focus
        this.keyboard.keys.clear();
        this.keyboard.modifiers = {
            shift: false,
            ctrl: false,
            alt: false,
            meta: false
        };
    }

    onCanvasFocus() {
        eventBus.emit('input.canvas.focus');
    }

    onCanvasBlur() {
        eventBus.emit('input.canvas.blur');
    }

    /**
     * Update mouse position from event
     * @param {MouseEvent} event - Mouse event
     */
    updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();

        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;

        // Normalize to 0-1 range
        this.mouse.normalizedX = this.mouse.x / rect.width;
        this.mouse.normalizedY = this.mouse.y / rect.height;
    }

    /**
     * Update touch list from event
     * @param {TouchEvent} event - Touch event
     */
    updateTouches(event) {
        this.touch.touches = Array.from(event.touches).map(touch => this.getTouchData(touch));
    }

    /**
     * Get touch data from touch object
     * @param {Touch} touch - Touch object
     * @returns {Object} Touch data
     */
    getTouchData(touch) {
        const rect = this.canvas.getBoundingClientRect();

        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        return {
            id: touch.identifier,
            x,
            y,
            normalizedX: x / rect.width,
            normalizedY: y / rect.height,
            force: touch.force || 1.0,
            radiusX: touch.radiusX || 1,
            radiusY: touch.radiusY || 1
        };
    }

    /**
     * Update keyboard modifiers
     * @param {KeyboardEvent} event - Keyboard event
     */
    updateModifiers(event) {
        this.keyboard.modifiers.shift = event.shiftKey;
        this.keyboard.modifiers.ctrl = event.ctrlKey;
        this.keyboard.modifiers.alt = event.altKey;
        this.keyboard.modifiers.meta = event.metaKey;
    }

    /**
     * Check if key is currently pressed
     * @param {string} key - Key code or key name
     * @returns {boolean} Whether key is pressed
     */
    isKeyPressed(key) {
        return this.keyboard.keys.has(key);
    }

    /**
     * Check if mouse button is currently pressed
     * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
     * @returns {boolean} Whether button is pressed
     */
    isMousePressed(button = 0) {
        return this.mouse.isDown && this.mouse.button === button;
    }

    /**
     * Get current mouse position
     * @returns {Object} Mouse position {x, y, normalizedX, normalizedY}
     */
    getMousePosition() {
        return {
            x: this.mouse.x,
            y: this.mouse.y,
            normalizedX: this.mouse.normalizedX,
            normalizedY: this.mouse.normalizedY
        };
    }

    /**
     * Get current touch positions
     * @returns {Array} Array of touch data objects
     */
    getTouchPositions() {
        return [...this.touch.touches];
    }

    /**
     * Enable or disable input processing
     * @param {boolean} enabled - Whether to enable input
     */
    setEnabled(enabled) {
        this.enabled = enabled;

        if (!enabled) {
            // Clear current input state
            this.mouse.isDown = false;
            this.touch.isActive = false;
            this.touch.touches = [];
            this.keyboard.keys.clear();
        }
    }

    /**
     * Destroy input manager and remove event listeners
     */
    destroy() {
        // Remove canvas event listeners
        for (const [event, handler] of Object.entries(this.boundEventHandlers)) {
            if (event.startsWith('window_')) {
                const windowEvent = event.replace('window_', '');
                window.removeEventListener(windowEvent, handler);
            } else {
                this.canvas.removeEventListener(event, handler);
            }
        }

        this.boundEventHandlers = {};
        this.canvas = null;

        console.log('InputManager destroyed');
    }
}
