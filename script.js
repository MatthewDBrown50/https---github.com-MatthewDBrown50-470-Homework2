const vertexShaderSource = `
    attribute vec2 aPosition;
    uniform mat2 uRotationMatrix;
    uniform vec2 uCenter;  

    void main() {
        vec2 translatedPosition = aPosition - uCenter;

        vec2 rotatedPosition = uRotationMatrix * translatedPosition;

        vec2 finalPosition = rotatedPosition + uCenter;

        gl_Position = vec4(finalPosition, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
        gl_FragColor = uColor;
    }
`;

const quadVertexShaderSource = `
    attribute vec2 aPosition;
    varying vec2 vTexcoord;

    void main() {
        vTexcoord = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const quadFragmentShaderSource = `
    precision mediump float;
    uniform sampler2D uTexture;
    varying vec2 vTexcoord;

    void main() {
        gl_FragColor = texture2D(uTexture, vTexcoord);
    }
`;

const canvas = document.querySelector('#c');
const canvasSize = 2;
const gl = canvas.getContext('webgl');
let isRotating = false;
let startTime = null;
let rotationAngle = 0;
let lastRotationAngle = null;
const rotationSpeed = 2* Math.PI / 2000;
let rotationDirection = 1;
let vertexBuffer = null;
const shaderProgram = initializeWebGL();
const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aPosition");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, canvasSize, gl.FLOAT, false, 0, 0);
const uColorLocation = gl.getUniformLocation(shaderProgram, 'uColor');
gl.uniform4f(uColorLocation, 0.04, 0.6, 1.0, 1.0);  // Set color to white for instance
gl.viewport(0, 0, canvas.width, canvas.height);

const framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

const uRotationMatrixLocation = gl.getUniformLocation(shaderProgram, 'uRotationMatrix');

function initializeQuadProgram() {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, quadVertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, quadFragmentShaderSource);
    return createProgram(gl, vertexShader, fragmentShader);
}

const quadProgram = initializeQuadProgram();
const quadPositionAttributeLocation = gl.getAttribLocation(quadProgram, "aPosition");


function initializeWebGL() {
    // Compile and link shaders (assuming you have utility functions for this)
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);  

    return program;
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

function drawSquare(vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const cosA = Math.cos(rotationAngle);
    const sinA = Math.sin(rotationAngle);
    const rotationMatrix = [
        cosA, sinA,
        -sinA, cosA
    ];

    // Compute the center of the current square
    const centerX = (vertices[0] + vertices[4]) / 2;
    const centerY = (vertices[1] + vertices[5]) / 2;

    gl.uniformMatrix2fv(uRotationMatrixLocation, false, rotationMatrix);
    gl.uniform2f(gl.getUniformLocation(shaderProgram, 'uCenter'), centerX, centerY);  // Set the center of the current square

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

function drawCarpet(x, y, size, iterations) {
    const newSize = size / 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const newX = x + i * newSize;
            const newY = y + j * newSize;

            // If it's the center square
            if (i === 1 && j === 1) {
                // Draw the center square
                const vertices = [
                    newX, newY,
                    newX + newSize, newY,
                    newX + newSize, newY + newSize,

                    newX, newY,
                    newX + newSize, newY + newSize,
                    newX, newY + newSize,
                ];
                drawSquare(vertices);
            }
            // If not in the center and iterations remain
            else if (iterations > 1) {
                drawCarpet(newX, newY, newSize, iterations - 1);
            }
        }
    }
}



function animate() {
    if (isRotating) {
        let currentTime = Date.now();
        rotationAngle += rotationSpeed * rotationDirection * (currentTime - (startTime || currentTime));
        startTime = currentTime;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black
        gl.clear(gl.COLOR_BUFFER_BIT);
        drawCarpet(-1, -1, canvasSize, slider.value); // Assuming slider.value is your recursion depth
        requestAnimationFrame(animate);
    }
}

// Initial drawing
gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black
gl.clear(gl.COLOR_BUFFER_BIT);
drawCarpet(-1, -1, canvasSize, 1);

// Event Listeners
let slider = document.getElementById('stepSlider');
let rotateButton = document.getElementById('rotateButton');
let container = document.getElementById('container');

rotateButton.addEventListener('click', function(event) {
    event.stopPropagation();
    if (!isRotating) {
        startTime = Date.now();
    }
    isRotating = !isRotating;
    animate();
});

slider.addEventListener('click', function(event) {
    event.stopPropagation();
    document.getElementById('numSteps').innerHTML = slider.value;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawCarpet(-1, -1, canvasSize, slider.value);
    event.stopPropagation();
});

container.addEventListener('click', function(event) {
    if (isRotating) {
        rotationDirection *= -1;
    }
});
