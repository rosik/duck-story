precision mediump float;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_color;

uniform vec3 u_lightDirection;
uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform float u_opacity;
uniform bool u_hasTexture;
uniform sampler2D u_texture;

// Material lighting uniforms
uniform vec3 u_ambient;
uniform vec3 u_diffuse;
uniform vec3 u_specular;
uniform float u_shininess;

// Ground-specific uniforms for circular border
uniform float u_borderRadius;
uniform float u_borderSoftness;
uniform vec3 u_borderColor;

void main() {
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(-u_lightDirection);

    // Calculate diffuse lighting
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Combine ambient and diffuse lighting using material properties
    vec3 ambient = u_ambient * u_ambientColor;
    vec3 diffuseColor = u_diffuse * u_lightColor * diffuse;
    vec3 lighting = ambient + diffuseColor;

    // Base color from vertex color
    vec3 baseColor = v_color;

    // Apply texture if available
    if (u_hasTexture) {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        baseColor *= texColor.rgb;
    }

    // Final color with lighting
    vec3 finalColor = baseColor * lighting;

    // Calculate circular mask using world-space position
    vec2 worldPos = v_position.xz;
    float distanceFromCenter = length(worldPos);

    // Create circular mask with smooth transition
    float maskRadius = u_borderRadius;
    float maskSoftness = u_borderSoftness;

    // Use smoothstep for anti-aliased circular edge
    float mask = 1.0 - smoothstep(maskRadius - maskSoftness, maskRadius, distanceFromCenter);

    // Discard pixels that are completely outside the border
    if (mask < 0.01) {
        discard;
    }

    // Optional: blend with border color at the edges for visual enhancement
    float borderBlend = smoothstep(maskRadius - maskSoftness * 2.0, maskRadius - maskSoftness, distanceFromCenter);
    finalColor = mix(finalColor, u_borderColor, borderBlend * 0.1);

    // Create smooth alpha transition at the border
    float finalAlpha = u_opacity * mask;

    gl_FragColor = vec4(finalColor, finalAlpha);
}
