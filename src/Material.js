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

        this.albedoMap = albedoMapPath ? loadTexture(gl, path.resolve("res/textures/", albedoMapPath)) : null;
        this.normalMap = normalMapPath ? loadTexture(gl, path.resolve("res/textures/", normalMapPath)) : null;
        this.metalnessMap = metalnessMapPath ? loadTexture(gl, path.resolve("res/textures/", metalnessMapPath)) : null;
        this.roughnessMap = roughnessMapPath ? loadTexture(gl, path.resolve("res/textures/", roughnessMapPath)) : null;
    }
}