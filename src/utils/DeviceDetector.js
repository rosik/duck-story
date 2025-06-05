/**
 * Device detection and capability assessment
 * Determines device type, performance characteristics, and optimal settings
 */
export class DeviceDetector {
    /**
     * Detect device capabilities and characteristics
     * @returns {Object} Device information object
     */
    static detect() {
        const deviceInfo = {
            // Basic device type
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop(),

            // Operating system
            os: this.getOS(),

            // Browser information
            browser: this.getBrowser(),

            // Hardware capabilities
            cores: this.getCPUCores(),
            memory: this.getMemory(),
            pixelRatio: this.getPixelRatio(),

            // Display information
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,

            // Input capabilities
            hasTouch: this.hasTouch(),
            hasKeyboard: this.hasKeyboard(),
            hasMouse: this.hasMouse(),

            // WebGL capabilities
            webglVersion: this.getWebGLVersion(),
            maxTextureSize: this.getMaxTextureSize(),
            maxVertexUniforms: this.getMaxVertexUniforms(),
            maxFragmentUniforms: this.getMaxFragmentUniforms(),

            // Performance classification
            isHighEnd: false,
            isMidRange: false,
            isLowEnd: false,
            isHighEndMobile: false,

            // Connection information
            connectionType: this.getConnectionType(),
            isOnline: navigator.onLine
        };

        // Classify device performance
        this.classifyPerformance(deviceInfo);

        return deviceInfo;
    }

    /**
     * Check if device is mobile
     */
    static isMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'mobile', 'android', 'iphone', 'ipod', 'blackberry',
            'windows phone', 'opera mini', 'iemobile'
        ];

        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               (window.innerWidth <= 768 && this.hasTouch());
    }

    /**
     * Check if device is tablet
     */
    static isTablet() {
        const userAgent = navigator.userAgent.toLowerCase();
        const tabletKeywords = ['ipad', 'tablet', 'kindle', 'playbook', 'silk'];

        return tabletKeywords.some(keyword => userAgent.includes(keyword)) ||
               (window.innerWidth > 768 && window.innerWidth <= 1024 && this.hasTouch());
    }

    /**
     * Check if device is desktop
     */
    static isDesktop() {
        return !this.isMobile() && !this.isTablet();
    }

    /**
     * Get operating system
     */
    static getOS() {
        const userAgent = navigator.userAgent;

        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';

        return 'Unknown';
    }

    /**
     * Get browser information
     */
    static getBrowser() {
        const userAgent = navigator.userAgent;

        if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';

        return 'Unknown';
    }

    /**
     * Get CPU core count (estimate)
     */
    static getCPUCores() {
        return navigator.hardwareConcurrency || 4;
    }

    /**
     * Get device memory (if available)
     */
    static getMemory() {
        // Chrome-specific API
        if (navigator.deviceMemory) {
            return navigator.deviceMemory;
        }

        // Estimate based on device type
        if (this.isMobile()) {
            return 2; // Assume 2GB for mobile
        } else {
            return 8; // Assume 8GB for desktop
        }
    }

    /**
     * Get pixel ratio
     */
    static getPixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * Check for touch support
     */
    static hasTouch() {
        return 'ontouchstart' in window ||
               navigator.maxTouchPoints > 0 ||
               navigator.msMaxTouchPoints > 0;
    }

    /**
     * Check for keyboard support
     */
    static hasKeyboard() {
        // Assume desktop has keyboard, mobile might not
        return this.isDesktop() || this.isTablet();
    }

    /**
     * Check for mouse support
     */
    static hasMouse() {
        // Assume desktop has mouse, mobile/tablet might not
        return this.isDesktop();
    }

    /**
     * Get WebGL version
     */
    static getWebGLVersion() {
        const canvas = document.createElement('canvas');

        // Try WebGL 2.0 first
        let gl = canvas.getContext('webgl2');
        if (gl) return 2;

        // Fall back to WebGL 1.0
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) return 1;

        return 0; // No WebGL support
    }

    /**
     * Get maximum texture size
     */
    static getMaxTextureSize() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return 0;

        return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }

    /**
     * Get maximum vertex uniforms
     */
    static getMaxVertexUniforms() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return 0;

        return gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    }

    /**
     * Get maximum fragment uniforms
     */
    static getMaxFragmentUniforms() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return 0;

        return gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    }

    /**
     * Get connection type
     */
    static getConnectionType() {
        if (navigator.connection) {
            return navigator.connection.effectiveType || 'unknown';
        }
        return 'unknown';
    }

    /**
     * Classify device performance
     */
    static classifyPerformance(deviceInfo) {
        let score = 0;

        // CPU cores contribution (0-30 points)
        score += Math.min(deviceInfo.cores * 5, 30);

        // Memory contribution (0-25 points)
        score += Math.min(deviceInfo.memory * 3, 25);

        // WebGL version contribution (0-20 points)
        if (deviceInfo.webglVersion === 2) score += 20;
        else if (deviceInfo.webglVersion === 1) score += 10;

        // Texture size contribution (0-15 points)
        if (deviceInfo.maxTextureSize >= 4096) score += 15;
        else if (deviceInfo.maxTextureSize >= 2048) score += 10;
        else if (deviceInfo.maxTextureSize >= 1024) score += 5;

        // Device type penalty/bonus (0-10 points)
        if (deviceInfo.isDesktop) score += 10;
        else if (deviceInfo.isTablet) score += 5;
        else if (deviceInfo.isMobile) score -= 5;

        // Pixel ratio consideration
        if (deviceInfo.pixelRatio > 2) score -= 5; // High DPI is more demanding

        // Browser-specific adjustments
        if (deviceInfo.browser === 'Chrome') score += 5;
        else if (deviceInfo.browser === 'Firefox') score += 3;
        else if (deviceInfo.browser === 'Safari') score += 2;

        // Connection type consideration
        if (deviceInfo.connectionType === 'slow-2g' || deviceInfo.connectionType === '2g') {
            score -= 10;
        } else if (deviceInfo.connectionType === '3g') {
            score -= 5;
        }

        // Classify based on score
        if (score >= 70) {
            deviceInfo.isHighEnd = true;
        } else if (score >= 40) {
            deviceInfo.isMidRange = true;
        } else {
            deviceInfo.isLowEnd = true;
        }

        // Special case for high-end mobile devices
        if (deviceInfo.isMobile && score >= 50) {
            deviceInfo.isHighEndMobile = true;
        }

        deviceInfo.performanceScore = score;
    }

    /**
     * Get recommended performance profile
     */
    static getRecommendedProfile(deviceInfo = null) {
        if (!deviceInfo) {
            deviceInfo = this.detect();
        }

        if (deviceInfo.isHighEnd) return 'high';
        if (deviceInfo.isMidRange || deviceInfo.isHighEndMobile) return 'medium';
        return 'low';
    }

    /**
     * Get recommended settings for device
     */
    static getRecommendedSettings(deviceInfo = null) {
        if (!deviceInfo) {
            deviceInfo = this.detect();
        }

        const profile = this.getRecommendedProfile(deviceInfo);

        const settings = {
            profile,
            targetFPS: profile === 'high' ? 60 : profile === 'medium' ? 30 : 20,
            maxCloudCount: profile === 'high' ? 50 : profile === 'medium' ? 25 : 10,
            shadowQuality: profile === 'high' ? 'high' : profile === 'medium' ? 'medium' : 'low',
            textureQuality: profile === 'high' ? 'high' : profile === 'medium' ? 'medium' : 'low',
            antialiasing: profile === 'high',
            particleEffects: profile !== 'low',
            complexShaders: profile === 'high',
            adaptiveQuality: true
        };

        // Mobile-specific adjustments
        if (deviceInfo.isMobile) {
            settings.maxCloudCount = Math.floor(settings.maxCloudCount * 0.7);
            settings.antialiasing = false;
            settings.shadowQuality = 'low';
        }

        // High DPI adjustments
        if (deviceInfo.pixelRatio > 2) {
            settings.targetFPS = Math.max(20, settings.targetFPS - 10);
            settings.maxCloudCount = Math.floor(settings.maxCloudCount * 0.8);
        }

        return settings;
    }

    /**
     * Monitor performance and suggest adjustments
     */
    static createPerformanceMonitor() {
        let frameCount = 0;
        let lastTime = performance.now();
        let fps = 60;

        return {
            update() {
                frameCount++;
                const currentTime = performance.now();

                if (currentTime - lastTime >= 1000) {
                    fps = frameCount;
                    frameCount = 0;
                    lastTime = currentTime;
                }

                return fps;
            },

            getFPS() {
                return fps;
            },

            shouldDowngrade(targetFPS = 30) {
                return fps < targetFPS * 0.8;
            },

            shouldUpgrade(targetFPS = 60) {
                return fps > targetFPS * 1.2;
            }
        };
    }
}
