export class SceneObject {
    /**
     * Creates a new scene object
     * @param name {string} The name of the object
     * @param modelMatrix {mat4} The transformation from own to parent coordinates
     * @param children {SceneObject[]} The children
     */
    constructor(name, modelMatrix, children) {
        this.name = name;
        this.children = children;
        this.modelMatrix = modelMatrix;
    }

    /**
     * This method maps each child object to an object which stores it and its parent, it performs a pre order traversal
     * through the scene graph.
     * @param currentParent {SceneObject|null}
     * @returns {{parent: SceneObject|null, object: SceneObject}[]}
     */
    unwrapChildren(currentParent = null) {
        return [{
            parent: currentParent,
            object: this
        }].concat(this.children.map(child => child.unwrapChildren(this)).flat());
    }

    update() {

    }

    cloneChildren() {
        return this.children.map(child => child.clone());
    }

    clone() {

    }

    getChildByName(name) {
        const child = this.children.find(child => child.name === name);

        if (child) {
            return child;
        } else {
            return this.children.find(child => child.getChildByName(name) !== undefined);
        }
    }

    removeChildByName(name) {

        const child = this.children.find(child => child.name === name);

        if (child) {
            this.children = this.children.filter(c => c !== child);
            return child;
        } else {
            return this.children.find(child => child.removeChildByName(name) !== undefined);
        }

    }

}