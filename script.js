// ----------------------------------------
// Shaders
// ----------------------------------------

const vertexShaderSource = `
    attribute vec2 aPosition;
    uniform float uRotation; // The rotation uniform
    uniform vec2 uCenter; // The center of rotation for the current square
    void main() {
        float cosRot = cos(uRotation);
        float sinRot = sin(uRotation);
        
        // Translate the vertex to make uCenter the origin, then rotate and translate back
        vec2 rotatedPosition = vec2(
            (aPosition.x - uCenter.x) * cosRot - (aPosition.y - uCenter.y) * sinRot + uCenter.x,
            (aPosition.x - uCenter.x) * sinRot + (aPosition.y - uCenter.y) * cosRot + uCenter.y
        );
        
        gl_Position = vec4(rotatedPosition, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 uColor;

    void main() {
        gl_FragColor = uColor;
    }
`;

// ----------------------------------------
// Functions
// ----------------------------------------

function getSquareVertices(center, diameter) {
    return [
        center[0] - diameter / 2, center[1] + diameter / 2,
        center[0] + diameter / 2, center[1] + diameter / 2,
        center[0] - diameter / 2, center[1] - diameter / 2,
        center[0] + diameter / 2, center[1] - diameter / 2,
        center[0] - diameter / 2, center[1] - diameter / 2,
        center[0] + diameter / 2, center[1] + diameter / 2,
    ];
}

function drawSierpinski(center, diameter, steps) {
    let vertices = [];
    
    if (steps === 0) {
        return vertices;
    }

    const newDiameter = diameter / 3;

    // Generate vertices for the center square
    const centralSquareCenter = [center[0], center[1]];
    vertices = getSquareVertices(centralSquareCenter, newDiameter);

    const outerSquareCenters = [
        [center[0] - newDiameter, center[1] + newDiameter],
        [center[0], center[1] + newDiameter],
        [center[0] + newDiameter, center[1] + newDiameter],
        [center[0] - newDiameter, center[1]],
        [center[0] + newDiameter, center[1]],
        [center[0] - newDiameter, center[1] - newDiameter],
        [center[0], center[1] - newDiameter],
        [center[0] + newDiameter, center[1] - newDiameter]
    ];

    for (const newCenter of outerSquareCenters) {
        vertices = vertices.concat(drawSierpinski(newCenter, newDiameter, steps - 1));
    }

    return vertices;
}

function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`An error occurred compiling the shader: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initializeWebGL() {
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);    

    // Link the vertex and fragment shaders into a shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Failed to setup the shader program:', gl.getProgramInfoLog(shaderProgram));
        return null;
    }    

    // Establish the vertex buffer
    vertexBuffer = gl.createBuffer();    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Use the shader program
    gl.useProgram(shaderProgram);

    // Set color for all vertices
    const uColorLocation = gl.getUniformLocation(shaderProgram, 'uColor');
    gl.uniform4fv(uColorLocation, [0.2, 0.6, 0.9, 1.0]);

    // Enable the attribute array
    const aPositionLocation = gl.getAttribLocation(shaderProgram, 'aPosition');
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);  
    
    return shaderProgram;
}

function drawSquare(vertices, center) {
    // Set the rotation in the shader
    if (lastRotationAngle !== rotationAngle) {        
        gl.uniform1f(uRotationLocation, rotationAngle);
        lastRotationAngle = rotationAngle;
    }

    // Set the center of the current square in the shader    
    gl.uniform2fv(uCenterLocation, center);

    // Update the vertex buffer data
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
     
    // Draw the square
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

function drawCarpet(numberOfSteps){
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const initialSquareLength = 2.0;
    const initialSquareCenter = [0, 0];
    const vertices = drawSierpinski(initialSquareCenter, initialSquareLength, numberOfSteps);

    const verticesPerSquare = 6;

    for (let i = 0; i < vertices.length; i += verticesPerSquare * 2) {
        const squareVertices = vertices.slice(i, i + verticesPerSquare * 2);
        
        // Find center for current square
        let centerX = 0, centerY = 0;
        for (let j = 0; j < squareVertices.length; j += 2) {
            centerX += squareVertices[j];
            centerY += squareVertices[j + 1];
        }
        centerX /= verticesPerSquare;
        centerY /= verticesPerSquare;

        drawSquare(squareVertices, [centerX, centerY]);
    }
}

function animate() {
    if (isRotating) {
        rotationAngle += rotationSpeed * rotationDirection;
        drawCarpet(slider.value);
        requestAnimationFrame(animate);
    }
}

// ----------------------------------------
// Globals
// ----------------------------------------

const canvas = document.querySelector('#c');
const gl = canvas.getContext('webgl');
let isRotating = false; 
let startTime = null; 
let rotationAngle = 0;
let lastRotationAngle = null;
const rotationSpeed = 0.01;
let rotationDirection = 1;
let vertexBuffer = null;
const shaderProgram = initializeWebGL();
const uCenterLocation = gl.getUniformLocation(shaderProgram, 'uCenter');
const uRotationLocation = gl.getUniformLocation(shaderProgram, 'uRotation');

// ----------------------------------------
// Draw
// ----------------------------------------

drawCarpet(1);

// ----------------------------------------
// Event Listeners
// ----------------------------------------

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
    event.stopPropagation();  // Prevent the click event from bubbling up
    document.getElementById('numSteps').innerHTML = slider.value;
    drawCarpet(slider.value);
    event.stopPropagation(); // Prevent propagation
});

container.addEventListener('click', function(event) {
    if (isRotating) {
        rotationDirection *= -1; // Reverse the rotation direction
    }
});
