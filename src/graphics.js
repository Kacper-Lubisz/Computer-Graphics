window.addEventListener("DOMContentLoaded", async () => {


    const scene = await loadOBJ("models/livingroom.obj");
    addAnimationsToLivingRoom(scene);

    scene.objects.forEach(object => { // process and load the mesh into gl buffers



    });

});


function addAnimationsToLivingRoom(scene) {

    const root = scene.objectMap["root"];

    const fan = scene.objectMap["Ceiling_Fan_Fan"];
    const blade = scene.objectMap["Fan_Blade_Blade"];

    const fanSpeed = 3; // revolutions per second
    const bladeNumber = 6;
    Array(bladeNumber).fill(0).map(_ => ({__proto__: blade})).forEach((current, index) => {

        current.name = `${blade.name} ${index}`;
        current.bladeOffset = index * Math.PI * 2 / bladeNumber;

        current.modelMatrix = mat4.clone(current.modelMatrix);
        mat4.rotateY(current.modelMatrix, current.modelMatrix, current.bladeOffset);

        current.tempParentMatrix = mat4.create();
        current.tempCurrentMatrix = mat4.create();

        fan.children.push(current);

    });

    const baseFanMatrix = mat4.clone(fan.modelMatrix);

    fan.updateAnimation = () => {

        const time = new Date().getTime() / 1000;

        mat4.copy(fan.modelMatrix, baseFanMatrix);
        mat4.rotateY(fan.modelMatrix, fan.modelMatrix, time * fanSpeed);

    };

    // remove the blade as the child of the root
    // clone several versions of the blade and add each one as a child of the fan
    root.children.splice(root.children.findIndex(child => child.name === "Fan Blade"), 1);

}

function drawObjectSubGraph(gl, scene, shader, object, parentModelMatrix) {

    if (object.updateAnimation) {
        object.updateAnimation();
    }

    mat4.copy(object.tempParentMatrix, parentModelMatrix);
    mat4.mul(object.tempCurrentMatrix, object.tempParentMatrix, object.modelMatrix);

    if (object.name !== "root") {// render current object

        gl.uniformMatrix4fv(shader.uniformLocations.modelMatrix, false, object.tempCurrentMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, object.positionBuffer);
        gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribLocations.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, object.normalBuffer);
        gl.vertexAttribPointer(shader.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribLocations.normal);

        gl.bindBuffer(gl.ARRAY_BUFFER, object.uvBuffer);
        gl.vertexAttribPointer(shader.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribLocations.texCoord);

        Object.getOwnPropertyNames(object.faces).forEach((materialName, index) => {

            const faces = object.faces[materialName];
            const material = scene.materials[materialName];

            gl.uniform1f(shader.uniformLocations.metalness, material.metalness ? material.metalness : 0);
            gl.uniform3fv(shader.uniformLocations.albedo, material.albedo ? material.albedo : [1, 1, 1]);
            gl.uniform1i(shader.uniformLocations.useAlbedoMap, material.albedoMap ? 1 : 0);
            gl.uniform1f(shader.uniformLocations.roughness, material.roughness ? material.roughness : 0.8);
            gl.uniform1i(shader.uniformLocations.useRoughnessMap, material.roughnessMap ? 1 : 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, material.albedoMap ? material.albedoMap : null);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, material.normalMap ? material.normalMap : null);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, material.roughnessMap ? material.roughnessMap : null);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faces.indexBuffer);

            gl.drawElements(
                gl.TRIANGLES,
                faces.indexArray.length,
                gl.UNSIGNED_SHORT,
                0
            );

        });

    }

    object.children.forEach(child => {

        drawObjectSubGraph(gl, scene, shader, child, object.tempCurrentMatrix);

    });

}