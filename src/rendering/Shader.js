/**
 * WebGL shader compilation and management
 * Handles GLSL shader programs, uniforms, and attributes
 */
export class Shader {
    constructor(gl, vertexSource, fragmentSource) {
        this.gl = gl;
        this.program = null;
        this.uniforms = new Map();
        this.attributes = new Map();
        this.vertexSource = vertexSource;
        this.fragmentSource = fragmentSource;

        this.compile();
    }

    /**
     * Compile vertex and fragment shaders and link program
     */
    compile() {
        const gl = this.gl;

        // Compile vertex shader
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, this.vertexSource);
        if (!vertexShader) {
            throw new Error('Failed to compile vertex shader');
        }

        // Compile fragment shader
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, this.fragmentSource);
        if (!fragmentShader) {
            gl.deleteShader(vertexShader);
            throw new Error('Failed to compile fragment shader');
        }

        // Create and link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        // Check linking status
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(this.program);
            gl.deleteProgram(this.program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            throw new Error(`Failed to link shader program: ${error}`);
        }

        // Clean up shaders (they're now part of the program)
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        // Cache uniform and attribute locations
        this.cacheLocations();

        console.log('Shader compiled successfully');
    }

    /**
     * Compile individual shader
     * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @param {string} source - GLSL source code
     * @returns {WebGLShader} Compiled shader
     */
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            console.error(`${shaderType} shader compilation error:`, error);
            console.error('Source:', source);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    /**
     * Cache uniform and attribute locations
     */
    cacheLocations() {
        const gl = this.gl;

        // Cache uniform locations
        const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniform = gl.getActiveUniform(this.program, i);
            const location = gl.getUniformLocation(this.program, uniform.name);
            this.uniforms.set(uniform.name, {
                location,
                type: uniform.type,
                size: uniform.size
            });
        }

        // Cache attribute locations
        const attributeCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < attributeCount; i++) {
            const attribute = gl.getActiveAttrib(this.program, i);
            const location = gl.getAttribLocation(this.program, attribute.name);
            this.attributes.set(attribute.name, {
                location,
                type: attribute.type,
                size: attribute.size
            });
        }
    }

    /**
     * Use this shader program
     */
    use() {
        this.gl.useProgram(this.program);
    }

    /**
     * Set uniform value
     * @param {string} name - Uniform name
     * @param {any} value - Uniform value
     */
    setUniform(name, value) {
        const uniform = this.uniforms.get(name);
        if (!uniform) {
            console.warn(`Uniform '${name}' not found in shader`);
            return;
        }

        const gl = this.gl;
        const location = uniform.location;

        switch (uniform.type) {
            case gl.FLOAT:
                gl.uniform1f(location, value);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2fv(location, value);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3fv(location, value);
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4fv(location, value);
                break;
            case gl.INT:
            case gl.BOOL:
                gl.uniform1i(location, value);
                break;
            case gl.INT_VEC2:
            case gl.BOOL_VEC2:
                gl.uniform2iv(location, value);
                break;
            case gl.INT_VEC3:
            case gl.BOOL_VEC3:
                gl.uniform3iv(location, value);
                break;
            case gl.INT_VEC4:
            case gl.BOOL_VEC4:
                gl.uniform4iv(location, value);
                break;
            case gl.FLOAT_MAT2:
                gl.uniformMatrix2fv(location, false, value);
                break;
            case gl.FLOAT_MAT3:
                gl.uniformMatrix3fv(location, false, value);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(location, false, value);
                break;
            case gl.SAMPLER_2D:
            case gl.SAMPLER_CUBE:
                gl.uniform1i(location, value);
                break;
            default:
                console.warn(`Unsupported uniform type: ${uniform.type}`);
        }
    }

    /**
     * Set multiple uniforms at once
     * @param {Object} uniforms - Object with uniform name-value pairs
     */
    setUniforms(uniforms) {
        for (const [name, value] of Object.entries(uniforms)) {
            this.setUniform(name, value);
        }
    }

    /**
     * Get attribute location
     * @param {string} name - Attribute name
     * @returns {number} Attribute location
     */
    getAttributeLocation(name) {
        const attribute = this.attributes.get(name);
        return attribute ? attribute.location : -1;
    }

    /**
     * Enable vertex attribute
     * @param {string} name - Attribute name
     */
    enableAttribute(name) {
        const location = this.getAttributeLocation(name);
        if (location !== -1) {
            this.gl.enableVertexAttribArray(location);
        }
    }

    /**
     * Disable vertex attribute
     * @param {string} name - Attribute name
     */
    disableAttribute(name) {
        const location = this.getAttributeLocation(name);
        if (location !== -1) {
            this.gl.disableVertexAttribArray(location);
        }
    }

    /**
     * Bind vertex attribute
     * @param {string} name - Attribute name
     * @param {WebGLBuffer} buffer - Vertex buffer
     * @param {number} size - Number of components per vertex
     * @param {number} type - Data type (default: gl.FLOAT)
     * @param {boolean} normalized - Whether to normalize (default: false)
     * @param {number} stride - Stride in bytes (default: 0)
     * @param {number} offset - Offset in bytes (default: 0)
     */
    bindAttribute(name, buffer, size, type = null, normalized = false, stride = 0, offset = 0) {
        const gl = this.gl;
        const location = this.getAttributeLocation(name);

        if (location === -1) {
            console.warn(`Attribute '${name}' not found in shader`);
            return;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(
            location,
            size,
            type || gl.FLOAT,
            normalized,
            stride,
            offset
        );
        gl.enableVertexAttribArray(location);
    }

    /**
     * Check if uniform exists
     * @param {string} name - Uniform name
     * @returns {boolean} Whether uniform exists
     */
    hasUniform(name) {
        return this.uniforms.has(name);
    }

    /**
     * Check if attribute exists
     * @param {string} name - Attribute name
     * @returns {boolean} Whether attribute exists
     */
    hasAttribute(name) {
        return this.attributes.has(name);
    }

    /**
     * Get all uniform names
     * @returns {string[]} Array of uniform names
     */
    getUniformNames() {
        return Array.from(this.uniforms.keys());
    }

    /**
     * Get all attribute names
     * @returns {string[]} Array of attribute names
     */
    getAttributeNames() {
        return Array.from(this.attributes.keys());
    }

    /**
     * Destroy shader program and free resources
     */
    destroy() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
            this.program = null;
        }
        this.uniforms.clear();
        this.attributes.clear();
    }

    /**
     * Create shader from external files
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {string} vertexPath - Path to vertex shader file
     * @param {string} fragmentPath - Path to fragment shader file
     * @returns {Promise<Shader>} Promise that resolves to compiled shader
     */
    static async fromFiles(gl, vertexPath, fragmentPath) {
        try {
            const [vertexResponse, fragmentResponse] = await Promise.all([
                fetch(vertexPath),
                fetch(fragmentPath)
            ]);

            const [vertexSource, fragmentSource] = await Promise.all([
                vertexResponse.text(),
                fragmentResponse.text()
            ]);

            return new Shader(gl, vertexSource, fragmentSource);
        } catch (error) {
            throw new Error(`Failed to load shader files: ${error.message}`);
        }
    }
}

/**
 * Shader library for common shaders
 */
export class ShaderLibrary {
    constructor(gl) {
        this.gl = gl;
        this.shaders = new Map();
    }

    /**
     * Add shader to library
     * @param {string} name - Shader name
     * @param {Shader} shader - Shader instance
     */
    add(name, shader) {
        this.shaders.set(name, shader);
    }

    /**
     * Get shader from library
     * @param {string} name - Shader name
     * @returns {Shader} Shader instance
     */
    get(name) {
        return this.shaders.get(name);
    }

    /**
     * Create and add shader from source
     * @param {string} name - Shader name
     * @param {string} vertexSource - Vertex shader source
     * @param {string} fragmentSource - Fragment shader source
     * @returns {Shader} Created shader
     */
    create(name, vertexSource, fragmentSource) {
        const shader = new Shader(this.gl, vertexSource, fragmentSource);
        this.add(name, shader);
        return shader;
    }

    /**
     * Load and add shader from files
     * @param {string} name - Shader name
     * @param {string} vertexPath - Path to vertex shader
     * @param {string} fragmentPath - Path to fragment shader
     * @returns {Promise<Shader>} Promise that resolves to loaded shader
     */
    async load(name, vertexPath, fragmentPath) {
        const shader = await Shader.fromFiles(this.gl, vertexPath, fragmentPath);
        this.add(name, shader);
        return shader;
    }

    /**
     * Remove shader from library
     * @param {string} name - Shader name
     */
    remove(name) {
        const shader = this.shaders.get(name);
        if (shader) {
            shader.destroy();
            this.shaders.delete(name);
        }
    }

    /**
     * Destroy all shaders
     */
    destroy() {
        for (const shader of this.shaders.values()) {
            shader.destroy();
        }
        this.shaders.clear();
    }
}
