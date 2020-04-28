import {SceneObject} from "./SceneObject";
import {mat4} from "gl-matrix";

export class Light extends SceneObject {
    constructor(name, modelMatrix, children, color) {
        super(name, modelMatrix, children);
        this.color = color;
    }

    clone() {
        return new Light(`${name} clone`, mat4.clone(this.modelMatrix), this.cloneChildren(), this.color);
    }
}