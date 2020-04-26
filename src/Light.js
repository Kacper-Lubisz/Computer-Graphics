import {SceneObject} from "./SceneObject";

export class Light extends SceneObject {
    constructor(name, modelMatrix, children, color) {
        super(name, modelMatrix, children);
        this.color = color;
    }
}