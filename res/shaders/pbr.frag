precision mediump float;

#define PI 3.1415926538
#define EPSILON 0.000001

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec4 vPosition;

uniform sampler2D uNormalMap;

uniform vec3 uCameraPosition;

uniform bool uUseAlbedoMap;
uniform vec3 uAlbedo;
uniform sampler2D uAlbedoMap;

uniform bool uUseRoughnessMap;
uniform float uRoughness;
uniform sampler2D uRoughnessMap;

uniform bool uUseMetalnessMap;
uniform float uMetalness;
uniform sampler2D uMetalnessMap;

//uniform vec3 uLightPositions[25];
//uniform vec3 uLightColors[25];

uniform samplerCube uSkyMap;

vec3 fresnelSchlick(vec3 h, vec3 v, vec3 baseReflectivity) {
    float hDotV = dot(h, v);
    return baseReflectivity + (1.0 - baseReflectivity) * pow(1.0 - hDotV, 5.0);
}

float distributionGGX(vec3 n, vec3 h, float roughness){ // GGX NDF
    float r2 = pow(roughness, 2.0);
    float nDotH = max(dot(n, h), EPSILON);
    return r2 / (PI * pow(pow(nDotH, 2.0) * (r2 - 1.0) + 1.0, 2.0));
}

float schlickGeometry(vec3 n, vec3 v, float roughness){
    float nDotv = max(dot(n, v), EPSILON);
    return nDotv / (nDotv * (1.0 - roughness) + roughness);
}

float geometrySmith(vec3 n, vec3 v, vec3 l, float roughness){
    return schlickGeometry(n, v, roughness) * schlickGeometry(n, l, roughness);
}

void main() {

    vec3 normal = normalize(vNormal);//texture2D(uNormalMap, vTexCoord).rgb;

    vec3 albedo;
    if (uUseAlbedoMap){
        albedo = texture2D(uAlbedoMap, vTexCoord).rgb;
        albedo = pow(albedo, vec3(2.2));
        // gamma correct, ideally this should be done during loading to save flops
    } else {
        albedo = uAlbedo;
    }

    float roughness;
    if (uUseRoughnessMap){
        roughness = texture2D(uRoughnessMap, vTexCoord).x;
    } else {
        roughness = uRoughness;
    }

    vec3 metalness;
    if (uUseMetalnessMap){
        metalness = texture2D(uMetalnessMap, vTexCoord).rgb;
    } else {
        metalness = uAlbedo;
    }

    vec3 uLightPositions[25];
    vec3 uLightColors[25];

    uLightPositions[0] = vec3(0.964312, 1.3, 0.0);
    uLightPositions[1] = vec3(0.0, 1.3, 0.0);

    uLightColors[0] = vec3(.8, .5, .5) * 25.0;
    uLightColors[1] = vec3(.8, .2, 0.2);

    vec3 v = normalize(uCameraPosition - vPosition.xyz);// vector to the camera, the view vector

    vec3 baseReflec = mix(vec3(0.04), albedo, metalness);

    vec3 luminance = vec3(0.04) * albedo;// start as ambient light

    for (int i = 0; i < 1; i ++){ // for each light

        vec3 lightPosition = uLightPositions[i];
        vec3 lightColor = uLightColors[i];

        vec3 L = vPosition.xyz - lightPosition;// vector to the light
        vec3 l = normalize(L);// vector to the light

        vec3 h = normalize(v - l);

        float distance = length(L);
        vec3 radiance = lightColor / (distance * distance);
        vec3 brightness = radiance * max(-dot(normal, l), 0.0);

        vec3 F = fresnelSchlick(normal, v, baseReflec);
        float D = distributionGGX(normal, h, roughness);
        float G = geometrySmith(normal, v, l, roughness);

        vec3 specular = D * G * F;
        specular /= 4.0 * max(dot(normal, v), EPSILON) * max(dot(normal, l), EPSILON);

        vec3 diffuse = (vec3(1.0) - F) * (1.0 - uMetalness);

        luminance += (diffuse * albedo / PI + specular) * brightness;

    }

    vec3 color = luminance / (luminance + vec3(1.0));//tone map

    color = pow(color, vec3(1.0 / 2.2));

    //final color
    gl_FragColor = vec4(color, 1.0);
    //    gl_FragColor = vec4(albedo, 1.0);
//    gl_FragColor = vec4(textureCube(uSkyMap, vPosition.xyz).xyz, 1.0);

}

