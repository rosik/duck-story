/**
 * Manages UI elements for the game
 */
export class UISystem {
  /**
   * Create a new UISystem
   */
  constructor() {
    // UI containers
    this.containers = {
      main: null,
      educational: null,
      feedback: null,
      navigation: null
    };

    // Active UI elements
    this.activeElements = {};

    // Initialize UI containers
    this.initContainers();
  }

  /**
   * Initialize UI containers
   */
  initContainers() {
    // Check if UI overlay exists
    let uiOverlay = document.getElementById('ui-overlay');

    // Create it if it doesn't exist
    if (!uiOverlay) {
      uiOverlay = document.createElement('div');
      uiOverlay.id = 'ui-overlay';
      uiOverlay.style.position = 'absolute';
      uiOverlay.style.top = '0';
      uiOverlay.style.left = '0';
      uiOverlay.style.width = '100%';
      uiOverlay.style.height = '100%';
      uiOverlay.style.pointerEvents = 'none';
      uiOverlay.style.zIndex = '100';
      document.body.appendChild(uiOverlay);
    }

    // Create main container
    this.containers.main = uiOverlay;

    // Create educational container (for numbers, colors, etc.)
    this.containers.educational = document.createElement('div');
    this.containers.educational.id = 'educational-container';
    this.containers.educational.className = 'ui-container';
    this.containers.educational.style.position = 'absolute';
    this.containers.educational.style.top = '20px';
    this.containers.educational.style.left = '20px';
    this.containers.educational.style.pointerEvents = 'none';
    this.containers.main.appendChild(this.containers.educational);

    // Create feedback container (for success/failure messages)
    this.containers.feedback = document.createElement('div');
    this.containers.feedback.id = 'feedback-container';
    this.containers.feedback.className = 'ui-container';
    this.containers.feedback.style.position = 'absolute';
    this.containers.feedback.style.top = '50%';
    this.containers.feedback.style.left = '50%';
    this.containers.feedback.style.transform = 'translate(-50%, -50%)';
    this.containers.feedback.style.pointerEvents = 'none';
    this.containers.main.appendChild(this.containers.feedback);

    // Create navigation container (for scene navigation)
    this.containers.navigation = document.createElement('div');
    this.containers.navigation.id = 'navigation-container';
    this.containers.navigation.className = 'ui-container';
    this.containers.navigation.style.position = 'absolute';
    this.containers.navigation.style.bottom = '20px';
    this.containers.navigation.style.right = '20px';
    this.containers.navigation.style.pointerEvents = 'auto';
    this.containers.main.appendChild(this.containers.navigation);
  }

  /**
   * Show a number display (for counting)
   * @param {number} number - Number to display
   * @param {Object} options - Display options
   * @returns {string} - ID of the created element
   */
  showNumber(number, options = {}) {
    const defaultOptions = {
      size: 'large', // 'small', 'medium', 'large'
      color: '#FFFFFF',
      background: 'rgba(0, 0, 0, 0.5)',
      position: 'top-left', // 'top-left', 'top-center', 'top-right', 'center', etc.
      duration: 0, // 0 for permanent, otherwise milliseconds
      animation: 'pop' // 'none', 'pop', 'fade'
    };

    const settings = { ...defaultOptions, ...options };

    // Create element ID
    const id = `number-${Date.now()}`;

    // Create number element
    const numberElement = document.createElement('div');
    numberElement.id = id;
    numberElement.className = `ui-number ui-number-${settings.size}`;
    numberElement.textContent = number.toString();

    // Apply styles
    numberElement.style.color = settings.color;
    numberElement.style.background = settings.background;
    numberElement.style.padding = '10px 20px';
    numberElement.style.borderRadius = '10px';
    numberElement.style.fontFamily = 'Arial, sans-serif';
    numberElement.style.pointerEvents = 'none';
    numberElement.style.position = 'absolute';

    // Apply size
    switch (settings.size) {
      case 'small':
        numberElement.style.fontSize = '24px';
        break;
      case 'medium':
        numberElement.style.fontSize = '36px';
        break;
      case 'large':
        numberElement.style.fontSize = '48px';
        break;
    }

    // Apply position
    switch (settings.position) {
      case 'top-left':
        numberElement.style.top = '20px';
        numberElement.style.left = '20px';
        break;
      case 'top-center':
        numberElement.style.top = '20px';
        numberElement.style.left = '50%';
        numberElement.style.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        numberElement.style.top = '20px';
        numberElement.style.right = '20px';
        break;
      case 'center':
        numberElement.style.top = '50%';
        numberElement.style.left = '50%';
        numberElement.style.transform = 'translate(-50%, -50%)';
        break;
      // Add more positions as needed
    }

    // Apply animation
    if (settings.animation === 'pop') {
      numberElement.style.transition = 'transform 0.3s ease-out';
      numberElement.style.transform = `${numberElement.style.transform} scale(0)`;

      // Force reflow
      void numberElement.offsetWidth;

      // Apply animation
      numberElement.style.transform = numberElement.style.transform.replace('scale(0)', 'scale(1)');
    } else if (settings.animation === 'fade') {
      numberElement.style.transition = 'opacity 0.3s ease-out';
      numberElement.style.opacity = '0';

      // Force reflow
      void numberElement.offsetWidth;

      // Apply animation
      numberElement.style.opacity = '1';
    }

    // Add to educational container
    this.containers.educational.appendChild(numberElement);

    // Store reference
    this.activeElements[id] = numberElement;

    // Auto-remove if duration is set
    if (settings.duration > 0) {
      setTimeout(() => {
        this.hideElement(id);
      }, settings.duration);
    }

    return id;
  }

  /**
   * Show a color name display
   * @param {string} colorName - Name of the color
   * @param {string} colorValue - Hex color value
   * @param {Object} options - Display options
   * @returns {string} - ID of the created element
   */
  showColorName(colorName, colorValue, options = {}) {
    const defaultOptions = {
      size: 'medium', // 'small', 'medium', 'large'
      textColor: '#FFFFFF',
      background: 'rgba(0, 0, 0, 0.5)',
      position: 'top-center', // 'top-left', 'top-center', 'top-right', 'center', etc.
      duration: 0, // 0 for permanent, otherwise milliseconds
      animation: 'fade' // 'none', 'pop', 'fade'
    };

    const settings = { ...defaultOptions, ...options };

    // Create element ID
    const id = `color-${Date.now()}`;

    // Create color element
    const colorElement = document.createElement('div');
    colorElement.id = id;
    colorElement.className = `ui-color ui-color-${settings.size}`;

    // Create color swatch
    const colorSwatch = document.createElement('div');
    colorSwatch.className = 'color-swatch';
    colorSwatch.style.width = '30px';
    colorSwatch.style.height = '30px';
    colorSwatch.style.backgroundColor = colorValue;
    colorSwatch.style.borderRadius = '50%';
    colorSwatch.style.display = 'inline-block';
    colorSwatch.style.marginRight = '10px';
    colorSwatch.style.verticalAlign = 'middle';

    // Create color name
    const colorNameSpan = document.createElement('span');
    colorNameSpan.textContent = colorName;
    colorNameSpan.style.verticalAlign = 'middle';

    // Add elements to container
    colorElement.appendChild(colorSwatch);
    colorElement.appendChild(colorNameSpan);

    // Apply styles
    colorElement.style.color = settings.textColor;
    colorElement.style.background = settings.background;
    colorElement.style.padding = '10px 20px';
    colorElement.style.borderRadius = '10px';
    colorElement.style.fontFamily = 'Arial, sans-serif';
    colorElement.style.pointerEvents = 'none';
    colorElement.style.position = 'absolute';

    // Apply size
    switch (settings.size) {
      case 'small':
        colorElement.style.fontSize = '18px';
        break;
      case 'medium':
        colorElement.style.fontSize = '24px';
        break;
      case 'large':
        colorElement.style.fontSize = '32px';
        break;
    }

    // Apply position
    switch (settings.position) {
      case 'top-left':
        colorElement.style.top = '20px';
        colorElement.style.left = '20px';
        break;
      case 'top-center':
        colorElement.style.top = '20px';
        colorElement.style.left = '50%';
        colorElement.style.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        colorElement.style.top = '20px';
        colorElement.style.right = '20px';
        break;
      case 'center':
        colorElement.style.top = '50%';
        colorElement.style.left = '50%';
        colorElement.style.transform = 'translate(-50%, -50%)';
        break;
      // Add more positions as needed
    }

    // Apply animation
    if (settings.animation === 'pop') {
      colorElement.style.transition = 'transform 0.3s ease-out';
      colorElement.style.transform = `${colorElement.style.transform} scale(0)`;

      // Force reflow
      void colorElement.offsetWidth;

      // Apply animation
      colorElement.style.transform = colorElement.style.transform.replace('scale(0)', 'scale(1)');
    } else if (settings.animation === 'fade') {
      colorElement.style.transition = 'opacity 0.3s ease-out';
      colorElement.style.opacity = '0';

      // Force reflow
      void colorElement.offsetWidth;

      // Apply animation
      colorElement.style.opacity = '1';
    }

    // Add to educational container
    this.containers.educational.appendChild(colorElement);

    // Store reference
    this.activeElements[id] = colorElement;

    // Auto-remove if duration is set
    if (settings.duration > 0) {
      setTimeout(() => {
        this.hideElement(id);
      }, settings.duration);
    }

    return id;
  }

  /**
   * Show a feedback message
   * @param {string} message - Message to display
   * @param {string} type - Type of message ('success', 'info', 'warning', 'error')
   * @param {Object} options - Display options
   * @returns {string} - ID of the created element
   */
  showFeedback(message, type = 'info', options = {}) {
    const defaultOptions = {
      size: 'medium', // 'small', 'medium', 'large'
      duration: 2000, // milliseconds
      animation: 'fade' // 'none', 'pop', 'fade'
    };

    const settings = { ...defaultOptions, ...options };

    // Create element ID
    const id = `feedback-${Date.now()}`;

    // Create feedback element
    const feedbackElement = document.createElement('div');
    feedbackElement.id = id;
    feedbackElement.className = `ui-feedback ui-feedback-${type} ui-feedback-${settings.size}`;
    feedbackElement.textContent = message;

    // Apply styles
    feedbackElement.style.padding = '15px 30px';
    feedbackElement.style.borderRadius = '10px';
    feedbackElement.style.fontFamily = 'Arial, sans-serif';
    feedbackElement.style.pointerEvents = 'none';
    feedbackElement.style.textAlign = 'center';

    // Apply type-specific styles
    switch (type) {
      case 'success':
        feedbackElement.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
        feedbackElement.style.color = '#FFFFFF';
        break;
      case 'info':
        feedbackElement.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
        feedbackElement.style.color = '#FFFFFF';
        break;
      case 'warning':
        feedbackElement.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
        feedbackElement.style.color = '#FFFFFF';
        break;
      case 'error':
        feedbackElement.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
        feedbackElement.style.color = '#FFFFFF';
        break;
    }

    // Apply size
    switch (settings.size) {
      case 'small':
        feedbackElement.style.fontSize = '16px';
        break;
      case 'medium':
        feedbackElement.style.fontSize = '24px';
        break;
      case 'large':
        feedbackElement.style.fontSize = '32px';
        break;
    }

    // Apply animation
    if (settings.animation === 'pop') {
      feedbackElement.style.transition = 'transform 0.3s ease-out';
      feedbackElement.style.transform = 'scale(0)';

      // Force reflow
      void feedbackElement.offsetWidth;

      // Apply animation
      feedbackElement.style.transform = 'scale(1)';
    } else if (settings.animation === 'fade') {
      feedbackElement.style.transition = 'opacity 0.3s ease-out';
      feedbackElement.style.opacity = '0';

      // Force reflow
      void feedbackElement.offsetWidth;

      // Apply animation
      feedbackElement.style.opacity = '1';
    }

    // Add to feedback container
    this.containers.feedback.appendChild(feedbackElement);

    // Store reference
    this.activeElements[id] = feedbackElement;

    // Auto-remove after duration
    if (settings.duration > 0) {
      setTimeout(() => {
        this.hideElement(id);
      }, settings.duration);
    }

    return id;
  }

  /**
   * Create a navigation button
   * @param {string} text - Button text
   * @param {Function} onClick - Click handler
   * @param {Object} options - Button options
   * @returns {string} - ID of the created element
   */
  createButton(text, onClick, options = {}) {
    const defaultOptions = {
      size: 'medium', // 'small', 'medium', 'large'
      type: 'primary', // 'primary', 'secondary', 'success', 'danger'
      position: 'bottom-right', // 'bottom-left', 'bottom-center', 'bottom-right', etc.
      disabled: false
    };

    const settings = { ...defaultOptions, ...options };

    // Create element ID
    const id = `button-${Date.now()}`;

    // Create button element
    const buttonElement = document.createElement('button');
    buttonElement.id = id;
    buttonElement.className = `ui-button ui-button-${settings.type} ui-button-${settings.size}`;
    buttonElement.textContent = text;
    buttonElement.disabled = settings.disabled;

    // Apply styles
    buttonElement.style.padding = '10px 20px';
    buttonElement.style.borderRadius = '8px';
    buttonElement.style.fontFamily = 'Arial, sans-serif';
    buttonElement.style.cursor = settings.disabled ? 'default' : 'pointer';
    buttonElement.style.pointerEvents = 'auto';
    buttonElement.style.transition = 'all 0.3s ease';
    buttonElement.style.position = 'relative';
    buttonElement.style.margin = '5px';

    // Apply type-specific styles
    switch (settings.type) {
      case 'primary':
        buttonElement.style.backgroundColor = 'rgba(33, 150, 243, 0.9)';
        buttonElement.style.color = '#FFFFFF';
        buttonElement.style.border = '2px solid #1976D2';
        break;
      case 'secondary':
        buttonElement.style.backgroundColor = 'rgba(117, 117, 117, 0.9)';
        buttonElement.style.color = '#FFFFFF';
        buttonElement.style.border = '2px solid #616161';
        break;
      case 'success':
        buttonElement.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
        buttonElement.style.color = '#FFFFFF';
        buttonElement.style.border = '2px solid #388E3C';
        break;
      case 'danger':
        buttonElement.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
        buttonElement.style.color = '#FFFFFF';
        buttonElement.style.border = '2px solid #D32F2F';
        break;
    }

    // Apply size
    switch (settings.size) {
      case 'small':
        buttonElement.style.fontSize = '14px';
        break;
      case 'medium':
        buttonElement.style.fontSize = '18px';
        break;
      case 'large':
        buttonElement.style.fontSize = '24px';
        break;
    }

    // Apply disabled state
    if (settings.disabled) {
      buttonElement.style.opacity = '0.5';
      buttonElement.style.cursor = 'not-allowed';
    }

    // Add hover effect
    buttonElement.addEventListener('mouseenter', () => {
      if (!settings.disabled) {
        buttonElement.style.transform = 'scale(1.05)';
        buttonElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
      }
    });

    buttonElement.addEventListener('mouseleave', () => {
      if (!settings.disabled) {
        buttonElement.style.transform = 'scale(1)';
        buttonElement.style.boxShadow = 'none';
      }
    });

    // Add click handler
    buttonElement.addEventListener('click', (event) => {
      if (!settings.disabled && onClick) {
        onClick(event);
      }
    });

    // Add to navigation container
    this.containers.navigation.appendChild(buttonElement);

    // Store reference
    this.activeElements[id] = buttonElement;

    return id;
  }

  /**
   * Show a cause and effect explanation
   * @param {string} cause - Cause text
   * @param {string} effect - Effect text
   * @param {Object} options - Display options
   * @returns {string} - ID of the created element
   */
  showCauseEffect(cause, effect, options = {}) {
    const defaultOptions = {
      position: 'bottom-left',
      duration: 0, // 0 for permanent, otherwise milliseconds
      animation: 'fade' // 'none', 'pop', 'fade'
    };

    const settings = { ...defaultOptions, ...options };

    // Create element ID
    const id = `cause-effect-${Date.now()}`;

    // Create container element
    const containerElement = document.createElement('div');
    containerElement.id = id;
    containerElement.className = 'ui-cause-effect';

    // Apply styles
    containerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    containerElement.style.color = '#FFFFFF';
    containerElement.style.padding = '15px';
    containerElement.style.borderRadius = '10px';
    containerElement.style.fontFamily = 'Arial, sans-serif';
    containerElement.style.pointerEvents = 'none';
    containerElement.style.position = 'absolute';
    containerElement.style.maxWidth = '300px';

    // Apply position
    switch (settings.position) {
      case 'bottom-left':
        containerElement.style.bottom = '20px';
        containerElement.style.left = '20px';
        break;
      case 'bottom-center':
        containerElement.style.bottom = '20px';
        containerElement.style.left = '50%';
        containerElement.style.transform = 'translateX(-50%)';
        break;
      case 'bottom-right':
        containerElement.style.bottom = '20px';
        containerElement.style.right = '20px';
        break;
      // Add more positions as needed
    }

    // Create cause element
    const causeElement = document.createElement('div');
    causeElement.className = 'cause';
    causeElement.innerHTML = `<strong>When:</strong> ${cause}`;
    causeElement.style.marginBottom = '10px';

    // Create effect element
    const effectElement = document.createElement('div');
    effectElement.className = 'effect';
    effectElement.innerHTML = `<strong>Then:</strong> ${effect}`;

    // Add elements to container
    containerElement.appendChild(causeElement);
    containerElement.appendChild(effectElement);

    // Apply animation
    if (settings.animation === 'pop') {
      containerElement.style.transition = 'transform 0.3s ease-out';
      containerElement.style.transform = `${containerElement.style.transform || ''} scale(0)`;

      // Force reflow
      void containerElement.offsetWidth;

      // Apply animation
      containerElement.style.transform = containerElement.style.transform.replace('scale(0)', 'scale(1)');
    } else if (settings.animation === 'fade') {
      containerElement.style.transition = 'opacity 0.3s ease-out';
      containerElement.style.opacity = '0';

      // Force reflow
      void containerElement.offsetWidth;

      // Apply animation
      containerElement.style.opacity = '1';
    }

    // Add to educational container
    this.containers.educational.appendChild(containerElement);

    // Store reference
    this.activeElements[id] = containerElement;

    // Auto-remove if duration is set
    if (settings.duration > 0) {
      setTimeout(() => {
        this.hideElement(id);
      }, settings.duration);
    }

    return id;
  }

  /**
   * Hide a UI element
   * @param {string} id - ID of the element to hide
   * @param {Object} options - Hide options
   */
  hideElement(id, options = {}) {
    const element = this.activeElements[id];
    if (!element) return;

    const defaultOptions = {
      animation: 'fade', // 'none', 'pop', 'fade'
      duration: 300 // milliseconds
    };

    const settings = { ...defaultOptions, ...options };

    // Apply animation
    if (settings.animation === 'pop') {
      element.style.transition = `transform ${settings.duration / 1000}s ease-in`;
      element.style.transform = `${element.style.transform || ''} scale(0)`;
    } else if (settings.animation === 'fade') {
      element.style.transition = `opacity ${settings.duration / 1000}s ease-in`;
      element.style.opacity = '0';
    }

    // Remove after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      delete this.activeElements[id];
    }, settings.duration);
  }

  /**
   * Clear all UI elements
   * @param {string} container - Container to clear ('all', 'educational', 'feedback', 'navigation')
   * @param {Object} options - Clear options
   */
  clearElements(container = 'all', options = {}) {
    const defaultOptions = {
      animation: 'fade', // 'none', 'pop', 'fade'
      duration: 300 // milliseconds
    };

    const settings = { ...defaultOptions, ...options };

    // Get elements to clear
    let elementsToRemove = [];

    if (container === 'all') {
      elementsToRemove = Object.keys(this.activeElements);
    } else {
      // Filter elements by container
      for (const [id, element] of Object.entries(this.activeElements)) {
        if (element.parentNode === this.containers[container]) {
          elementsToRemove.push(id);
        }
      }
    }

    // Hide each element
    for (const id of elementsToRemove) {
      this.hideElement(id, settings);
    }
  }
}
