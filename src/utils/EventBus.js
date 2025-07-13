/**
 * Event bus for game-wide communication
 */
export class EventBus {
  /**
   * Create a new EventBus
   */
  constructor() {
    this.listeners = {};
  }

  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} context - Context for the callback
   */
  on(event, callback, context = null) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push({
      callback,
      context
    });
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} context - Context for the callback
   */
  off(event, callback, context = null) {
    if (!this.listeners[event]) {
      return;
    }

    this.listeners[event] = this.listeners[event].filter(listener => {
      return listener.callback !== callback || listener.context !== context;
    });

    // Clean up empty event arrays
    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to listeners
   */
  emit(event, ...args) {
    if (!this.listeners[event]) {
      return;
    }

    // Create a copy of the listeners array to avoid issues if listeners are added/removed during emission
    const listeners = [...this.listeners[event]];

    for (const listener of listeners) {
      if (listener.context) {
        listener.callback.apply(listener.context, args);
      } else {
        listener.callback(...args);
      }
    }
  }

  /**
   * Add a one-time event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} context - Context for the callback
   */
  once(event, callback, context = null) {
    const onceCallback = (...args) => {
      this.off(event, onceCallback, context);
      if (context) {
        callback.apply(context, args);
      } else {
        callback(...args);
      }
    };

    this.on(event, onceCallback, context);
  }

  /**
   * Check if an event has listeners
   * @param {string} event - Event name
   * @returns {boolean} - True if the event has listeners
   */
  hasListeners(event) {
    return !!this.listeners[event] && this.listeners[event].length > 0;
  }

  /**
   * Get the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} - Number of listeners
   */
  listenerCount(event) {
    return this.listeners[event] ? this.listeners[event].length : 0;
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional, if not provided, all listeners are removed)
   */
  removeAllListeners(event = null) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

// Create a singleton instance
const eventBus = new EventBus();

export default eventBus;
