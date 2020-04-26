import {loadTexture} from "./glUtils";
import path from "path";

export class Material {

    constructor(
        gl,
        {
            name,
            albedo,
            metalness,
            roughness,
            albedoMapPath,
            normalMapPath,
            metalnessMapPath,
            roughnessMapPath,
        }
    ) {
        this.name = name;

        this.albedo = albedo;
        this.metalness = metalness;
        this.roughness = roughness;

        this.albedoMapPath = albedoMapPath;
        this.metalnessMapPath = metalnessMapPath;
        this.roughnessMapPath = roughnessMapPath;


        if (albedoMapPath) {
            this.albedoMap = loadTexture(gl, path.resolve("res/textures/", albedoMapPath));
        }
        if (normalMapPath) {
            this.normalMap = loadTexture(gl, path.resolve("res/textures/", normalMapPath));
        }
        if (metalnessMapPath) {
            this.metalnessMap = loadTexture(gl, path.resolve("res/textures/", metalnessMapPath));
        }
        if (roughnessMapPath) {
            this.roughnessMap = loadTexture(gl, path.resolve("res/textures/", roughnessMapPath));
        }
    }
}