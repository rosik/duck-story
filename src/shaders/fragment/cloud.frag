precision mediump float;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_color;

uniform float u_time;
uniform vec3 u_lightDirection;
uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform float u_opacity;

// Simple noise function for cloud texture
float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Smooth noise
float smoothNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal noise
float fractalNoise(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(st * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value;
}

void main() {
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(-u_lightDirection);

    // Calculate diffuse lighting
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Combine ambient and diffuse lighting
    vec3 lighting = u_ambientColor + (u_lightColor * diffuse);

    // Generate cloud texture using noise
    vec2 cloudUV = v_texCoord * 3.0 + u_time * 0.1;
    float cloudDensity = fractalNoise(cloudUV);

    // Create cloud shape with soft edges
    float cloudMask = smoothstep(0.3, 0.7, cloudDensity);

    // Base cloud color (white with slight variation)
    vec3 cloudColor = vec3(0.9 + cloudDensity * 0.1);

    // Apply lighting to cloud color
    vec3 finalColor = cloudColor * lighting;

    // Use cloud mask for alpha blending
    float alpha = cloudMask * u_opacity;

    gl_FragColor = vec4(finalColor, alpha);
}
