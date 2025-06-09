/**
 * Material properties for 3D objects
 * Manages surface properties, textures, and shader parameters
 */
export class Material {
    constructor(options = {}) {
        // Basic material properties
        this.color = options.color || [1.0, 1.0, 1.0];
        this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
        this.transparent = options.transparent || this.opacity < 1.0;

        // Lighting properties
        this.ambient = options.ambient || [0.2, 0.2, 0.2];
        this.diffuse = options.diffuse || [0.8, 0.8, 0.8];
        this.specular = options.specular || [0.0, 0.0, 0.0];
        this.shininess = options.shininess || 32.0;

        // Texture properties
        this.texture = options.texture || null;
        this.hasTexture = !!this.texture;

        // Shader properties
        this.shader = options.shader || null;
        this.uniforms = new Map();

        // Rendering properties
        this.wireframe = options.wireframe || false;
        this.doubleSided = options.doubleSided || false;
        this.depthTest = options.depthTest !== undefined ? options.depthTest : true;
        this.depthWrite = options.depthWrite !== undefined ? options.depthWrite : true;

        // Blending properties
        this.blending = options.blending || 'normal';
        this.blendSrc = options.blendSrc || null;
        this.blendDst = options.blendDst || null;

        // Initialize default uniforms
        this.updateUniforms();
    }

    /**
     * Set material color
     * @param {number[]|string} color - RGB array [r,g,b] or hex string
     */
    setColor(color) {
        if (typeof color === 'string') {
            this.color = this.hexToRgb(color);
        } else {
            this.color = [...color];
        }
        this.updateUniforms();
    }

    /**
     * Set material opacity
     * @param {number} opacity - Opacity value (0-1)
     */
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.transparent = this.opacity < 1.0;
        this.updateUniforms();
    }

    /**
     * Set material texture
     * @param {WebGLTexture} texture - WebGL texture
     */
    setTexture(texture) {
        this.texture = texture;
        this.hasTexture = !!texture;
        this.updateUniforms();
    }

    /**
     * Set custom uniform value
     * @param {string} name - Uniform name
     * @param {any} value - Uniform value
     */
    setUniform(name, value) {
        this.uniforms.set(name, value);
    }

    /**
     * Get uniform value
     * @param {string} name - Uniform name
     * @returns {any} Uniform value
     */
    getUniform(name) {
        return this.uniforms.get(name);
    }

    /**
     * Update material uniforms
     */
    updateUniforms() {
        this.uniforms.set('u_color', this.color);
        this.uniforms.set('u_opacity', this.opacity);
        this.uniforms.set('u_hasTexture', this.hasTexture);
        this.uniforms.set('u_ambient', this.ambient);
        this.uniforms.set('u_diffuse', this.diffuse);
        this.uniforms.set('u_specular', this.specular);
        this.uniforms.set('u_shininess', this.shininess);

        if (this.texture) {
            this.uniforms.set('u_texture', 0); // Texture unit 0
        }
    }

    /**
     * Apply material to WebGL context
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {Shader} shader - Shader to apply uniforms to
     */
    apply(gl, shader) {
        // Set blending mode
        if (this.transparent) {
            gl.enable(gl.BLEND);
            this.setBlendMode(gl);
        } else {
            gl.disable(gl.BLEND);
        }

        // Set depth testing
        if (this.depthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }

        // Set depth writing
        gl.depthMask(this.depthWrite);

        // Set face culling
        if (this.doubleSided) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        }

        // Bind texture if available
        if (this.texture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
        }

        // Apply uniforms to shader (only if they exist in the shader)
        for (const [name, value] of this.uniforms) {
            if (shader.hasUniform(name)) {
                shader.setUniform(name, value);
            }
        }
    }

    /**
     * Set WebGL blend mode
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    setBlendMode(gl) {
        switch (this.blending) {
            case 'normal':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                break;
            case 'additive':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                break;
            case 'multiply':
                gl.blendFunc(gl.DST_COLOR, gl.ZERO);
                break;
            case 'screen':
                gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE);
                break;
            case 'custom':
                if (this.blendSrc && this.blendDst) {
                    gl.blendFunc(this.blendSrc, this.blendDst);
                }
                break;
            default:
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
    }

    /**
     * Convert hex color to RGB array
     * @param {string} hex - Hex color string (#RRGGBB)
     * @returns {number[]} RGB array [r,g,b] (0-1 range)
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    }

    /**
     * Clone this material
     * @returns {Material} Cloned material
     */
    clone() {
        const cloned = new Material({
            color: [...this.color],
            opacity: this.opacity,
            transparent: this.transparent,
            ambient: [...this.ambient],
            diffuse: [...this.diffuse],
            specular: [...this.specular],
            shininess: this.shininess,
            texture: this.texture,
            shader: this.shader,
            wireframe: this.wireframe,
            doubleSided: this.doubleSided,
            depthTest: this.depthTest,
            depthWrite: this.depthWrite,
            blending: this.blending,
            blendSrc: this.blendSrc,
            blendDst: this.blendDst
        });

        // Copy custom uniforms
        for (const [name, value] of this.uniforms) {
            cloned.setUniform(name, value);
        }

        return cloned;
    }

    /**
     * Dispose of material resources
     */
    dispose() {
        // Note: We don't dispose of textures here as they might be shared
        // Texture disposal should be handled by a texture manager
        this.texture = null;
        this.shader = null;
        this.uniforms.clear();
    }
}

/**
 * Predefined material types
 */
export class MaterialLibrary {
    /**
     * Create basic diffuse material
     * @param {number[]|string} color - Material color
     * @param {number} opacity - Material opacity
     * @returns {Material} Basic material
     */
    static createBasic(color = [1, 1, 1], opacity = 1.0) {
        return new Material({
            color,
            opacity,
            ambient: [0.2, 0.2, 0.2],
            diffuse: [0.8, 0.8, 0.8]
        });
    }

    /**
     * Create sky gradient material
     * @returns {Material} Sky material
     */
    static createSky() {
        return new Material({
            color: [1, 1, 1],
            opacity: 1.0,
            depthTest: false,
            depthWrite: false
        });
    }

    /**
     * Create cloud material
     * @param {number} opacity - Cloud opacity
     * @returns {Material} Cloud material
     */
    static createCloud(opacity = 0.8) {
        return new Material({
            color: [1, 1, 1],
            opacity,
            transparent: true,
            blending: 'normal',
            doubleSided: true,
            depthWrite: false
        });
    }

    /**
     * Create ground material
     * @param {number[]|string} color - Ground color
     * @returns {Material} Ground material
     */
    static createGround(color = [0.2, 0.8, 0.2]) {
        return new Material({
            color,
            opacity: 1.0,
            ambient: [0.3, 0.3, 0.3],
            diffuse: [0.7, 0.7, 0.7]
        });
    }

    /**
     * Create wireframe material
     * @param {number[]|string} color - Wireframe color
     * @returns {Material} Wireframe material
     */
    static createWireframe(color = [1, 1, 1]) {
        return new Material({
            color,
            opacity: 1.0,
            wireframe: true,
            depthTest: true
        });
    }

    /**
     * Create transparent material
     * @param {number[]|string} color - Material color
     * @param {number} opacity - Material opacity
     * @returns {Material} Transparent material
     */
    static createTransparent(color = [1, 1, 1], opacity = 0.5) {
        return new Material({
            color,
            opacity,
            transparent: true,
            blending: 'normal',
            depthWrite: false
        });
    }
}
