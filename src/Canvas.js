export class Canvas {
    constructor(width, height) {

        this.width = width;
        this.height = height;

        this.canvas = document.querySelector("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);

        this.canvas.addEventListener("click", () => {
            this.canvas.requestPointerLock();
        });

        this.glContext = this.canvas.getContext("webgl");

        this.loadingMessage = document.querySelector("#loadingMessage");
        this.isLoading = true;
    }

    set isLoading(value) {
        this.canvas.style.display = value ? "none" : "block";
        this.loadingMessage.style.display = value ? "block" : "none";
    }

    getGlContext() {
        if (this.glContext === null) {
            alert("Unrecoverable Error. Unable to initialize WebGL. Your browser or machine may not support it.");
        }
        return this.glContext;
    }

}