/**
 * Global event communication system
 * Provides publish/subscribe pattern for decoupled component communication
 */
export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - The event type to listen for
     * @param {Function} callback - The callback function to execute
     * @param {Object} context - Optional context for the callback
     * @returns {Function} Unsubscribe function
     */
    on(eventType, callback, context = null) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }

        const listener = { callback, context };
        this.listeners.get(eventType).push(listener);

        // Return unsubscribe function
        return () => this.off(eventType, callback, context);
    }

    /**
     * Subscribe to an event that will only fire once
     * @param {string} eventType - The event type to listen for
     * @param {Function} callback - The callback function to execute
     * @param {Object} context - Optional context for the callback
     * @returns {Function} Unsubscribe function
     */
    once(eventType, callback, context = null) {
        const unsubscribe = this.on(eventType, (...args) => {
            unsubscribe();
            callback.apply(context, args);
        }, context);
        return unsubscribe;
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventType - The event type
     * @param {Function} callback - The callback function to remove
     * @param {Object} context - Optional context that was used when subscribing
     */
    off(eventType, callback, context = null) {
        if (!this.listeners.has(eventType)) return;

        const listeners = this.listeners.get(eventType);
        const index = listeners.findIndex(listener =>
            listener.callback === callback && listener.context === context
        );

        if (index !== -1) {
            listeners.splice(index, 1);
        }

        // Clean up empty listener arrays
        if (listeners.length === 0) {
            this.listeners.delete(eventType);
        }
    }

    /**
     * Emit an event immediately
     * @param {string} eventType - The event type to emit
     * @param {...any} args - Arguments to pass to listeners
     */
    emit(eventType, ...args) {
        if (!this.listeners.has(eventType)) return;

        const listeners = this.listeners.get(eventType).slice(); // Copy to avoid modification during iteration

        for (const listener of listeners) {
            try {
                listener.callback.apply(listener.context, args);
            } catch (error) {
                console.error(`Error in event listener for '${eventType}':`, error);
            }
        }
    }

    /**
     * Queue an event to be processed later
     * @param {string} eventType - The event type to emit
     * @param {...any} args - Arguments to pass to listeners
     */
    queue(eventType, ...args) {
        this.eventQueue.push({ eventType, args });
    }

    /**
     * Process all queued events
     */
    processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.emit(event.eventType, ...event.args);
        }

        this.isProcessing = false;
    }

    /**
     * Clear all listeners for a specific event type or all events
     * @param {string} eventType - Optional event type to clear (clears all if not provided)
     */
    clear(eventType = null) {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get the number of listeners for an event type
     * @param {string} eventType - The event type
     * @returns {number} Number of listeners
     */
    listenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).length : 0;
    }

    /**
     * Get all registered event types
     * @returns {string[]} Array of event types
     */
    getEventTypes() {
        return Array.from(this.listeners.keys());
    }
}

// Create global instance
export const eventBus = new EventBus();
