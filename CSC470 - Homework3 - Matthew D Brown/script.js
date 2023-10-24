const vertexShaderSource = `
    attribute vec4 aPosition;
    uniform mat4 uModelMatrix;
    uniform mat4 uViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
    }
`;


const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
        gl_FragColor = uColor;
    }
`;

function createShaderProgram(gl, vSource, fSource) {
    function compileAndAttachShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
    }

    const program = gl.createProgram();
    compileAndAttachShader(gl.VERTEX_SHADER, vSource);
    compileAndAttachShader(gl.FRAGMENT_SHADER, fSource);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program:', gl.getProgramInfoLog(program));
    }
    
    return program;
}

const canvas = document.querySelector('#c');
const gl = canvas.getContext('webgl');
const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
const vertexBuffer = gl.createBuffer();

const uModelMatrixLocation = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
const uViewMatrixLocation = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
const uProjectionMatrixLocation = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');

let modelMatrix = mat4.create();
let viewMatrix = mat4.create();
let projectionMatrix = mat4.create();

const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aPosition");
const uRotationMatrixLocation = gl.getUniformLocation(shaderProgram, 'uRotationMatrix');
const uColorLocation = gl.getUniformLocation(shaderProgram, 'uColor');

let slider = document.getElementById('stepSlider');
let xSlider = document.getElementById('xRotationSlider');
let ySlider = document.getElementById('yRotationSlider');
let zSlider = document.getElementById('zRotationSlider');
let rotateButton = document.getElementById('rotateButton');
let container = document.getElementById('container');

const state = {
    canvasSize: 2,
    xRotationSpeed: 0,
    yRotationSpeed: 0,
    zRotationSpeed: 0,
    xRotationAngle: 0,
    yRotationAngle: 0,
    zRotationAngle: 0,
    isRotating: false,
    rotationDirection: 1,
    rotationAngle: 0,
    startTime: null,
}

gl.useProgram(shaderProgram);
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, state.canvasSize, gl.FLOAT, false, 0, 0);
gl.uniform4f(uColorLocation, 0.04, 0.6, 1.0, 1.0); 
gl.viewport(0, 0, canvas.width, canvas.height);
gl.enable(gl.DEPTH_TEST);

function createCubeVertices(x, y, z, size) {
    const d = size / 2;
    return [
        // Front face
        x-d, y-d, z+d,  x+d, y-d, z+d,  x+d, y+d, z+d,
        x-d, y-d, z+d,  x+d, y+d, z+d,  x-d, y+d, z+d,

        // Back face
        x-d, y-d, z-d,  x+d, y-d, z-d,  x+d, y+d, z-d,
        x-d, y-d, z-d,  x+d, y+d, z-d,  x-d, y+d, z-d,

        // Top face
        x-d, y+d, z+d,  x+d, y+d, z+d,  x+d, y+d, z-d,
        x-d, y+d, z+d,  x+d, y+d, z-d,  x-d, y+d, z-d,

        // Bottom face
        x-d, y-d, z+d,  x+d, y-d, z+d,  x+d, y-d, z-d,
        x-d, y-d, z+d,  x+d, y-d, z-d,  x-d, y-d, z-d,

        // Right face
        x+d, y-d, z+d,  x+d, y-d, z-d,  x+d, y+d, z-d,
        x+d, y-d, z+d,  x+d, y+d, z-d,  x+d, y+d, z+d,

        // Left face
        x-d, y-d, z+d,  x-d, y-d, z-d,  x-d, y+d, z-d,
        x-d, y-d, z+d,  x-d, y+d, z-d,  x-d, y+d, z+d
    ];
}

function drawCube(vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Extracting the coordinates of the front bottom left vertex
    const x1 = Math.round(vertices[0] * 10000) / 10000;
    const y1 = Math.round(vertices[1] * 10000) / 10000;
    const z1 = Math.round(vertices[2] * 10000) / 10000;

    // Extracting the coordinates of the back top right vertex
    const x2 = Math.round(vertices[24] * 10000) / 10000;
    const y2 = Math.round(vertices[25] * 10000) / 10000;
    const z2 = Math.round(vertices[26] * 10000) / 10000;

    // Calculate the center by averaging the coordinates of these two vertices
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const centerZ = (z1 + z2) / 2;

    mat4.identity(modelMatrix);  // Reset the model matrix to identity

    // Rotate the cube at its center
    mat4.translate(modelMatrix, modelMatrix, [centerX, centerY, centerZ]);
    mat4.rotateX(modelMatrix, modelMatrix, state.xRotationAngle);
    mat4.rotateY(modelMatrix, modelMatrix, state.yRotationAngle);
    mat4.rotateZ(modelMatrix, modelMatrix, state.zRotationAngle);
    mat4.translate(modelMatrix, modelMatrix, [-centerX, -centerY, -centerZ]);

    // Send matrices to the GPU
    gl.uniformMatrix4fv(uModelMatrixLocation, false, modelMatrix);
    gl.uniformMatrix4fv(uViewMatrixLocation, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrixLocation, false, projectionMatrix);

    // Draw the cube
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

function drawCarpet(x, y, size, iterations) {
    const newSize = size / 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const newX = x + i * newSize;
            const newY = y + j * newSize;

            // If it's the center square
            if (i === 1 && j === 1) {
                // Draw the center cube
                const vertices = createCubeVertices(newX + newSize/2, newY + newSize/2, newSize/2, newSize);
                drawCube(vertices);
            }
            // If not in the center and iterations remain
            else if (iterations > 1) {
                drawCarpet(newX, newY, newSize, iterations - 1);
            }
        }
    }
}

function animate() {
    // Clear the canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update the rotation angles based on the rotation speeds
    state.xRotationAngle += (state.xRotationSpeed / 200);
    state.yRotationAngle += (state.yRotationSpeed / 200);
    state.zRotationAngle += (state.zRotationSpeed / 200);

    drawCarpet(-1, -1, state.canvasSize, slider.value);
    
    // Request next frame
    requestAnimationFrame(animate);
}

function onSliderClick(event) {
    event.stopPropagation();
    document.getElementById('numSteps').innerHTML = slider.value;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawCarpet(-1, -1, state.canvasSize, slider.value);
    event.stopPropagation();
}

function redraw() {
    // Update the rotation speeds from the sliders
    state.xRotationSpeed = parseFloat(document.getElementById('xRotationSlider').value);
    state.yRotationSpeed = parseFloat(document.getElementById('yRotationSlider').value);
    state.zRotationSpeed = parseFloat(document.getElementById('zRotationSlider').value);
}

// Event Listeners
xSlider.addEventListener('input', function(){
    document.getElementById('xRotationValue').innerHTML = xSlider.value;
    redraw();
});
ySlider.addEventListener('input', function(){
    document.getElementById('yRotationValue').innerHTML = ySlider.value;
    redraw();
});
zSlider.addEventListener('input', function(){
    document.getElementById('zRotationValue').innerHTML = zSlider.value;
    redraw();
});
slider.addEventListener('click', onSliderClick);

// Begin animation
animate();