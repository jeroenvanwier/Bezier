function draw() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.useProgram(programInfo.program);
    
    gl.uniform1f(programInfo.uniformLocations.clientWidth, document.body.clientWidth * 1.0);
    gl.uniform1f(programInfo.uniformLocations.clientHeight, document.body.clientHeight * 1.0);
    
    for (let i = 0; i < bezierPoints.length; i++) {
        point = bezierPoints[i];
        drawCircle(point.x, point.y, 10);
    }
}

function drawCircle(x, y, r) {
    const circlePositions = [];
    for (let i = 0; i < 180; i++) {
        circlePositions.push(x + r * Math.cos(i * Math.PI * 2 / 180), y + r * Math.sin(i * Math.PI * 2 / 180));
    }
    drawLine(circlePositions);
}

function drawLine(positions) {
    if (positions.length <= 2) {
        return;
    }
        
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    
    const buffers = initBuffers(positions);
    
    const vertexCount = positions.length / 2;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    
    gl.drawArrays(gl.LINE_STRIP, offset, vertexCount);
}

function click(e) {
    if (e.buttons & 1 === 1) {
        const x = e.clientX;
        const y = e.clientY;
    
        processClick(x, y);
    }
}

function processClick(x, y) {
    bezierPoints.push({x: x, y: y});
    
    draw();
}

function distSq(x1, y1, x2, y2) {
    const xd = x1 - x2;
    const yd = y1 - y2;
    return xd * xd + yd * yd;
}

bezierPoints = [];
gl = null;
programInfo = null;

//Vertex Shader (find place)
const vsSource = `
    attribute vec4 aVertexPosition;

    uniform float uClientWidth;
    uniform float uClientHeight;

    void main() {
        float x = -1.0 + (2.0 * aVertexPosition[0] / uClientWidth);
        float y = 1.0 - (2.0 * aVertexPosition[1] / uClientHeight);
        gl_Position = vec4(x, y, aVertexPosition.z, aVertexPosition.w);
    }
`;

//Fragment Shader (find color)
const fsSource = `
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;

function setup() {
    const canvas = document.getElementById("mainCanvas");
    
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    
    canvas.onmousedown = click;
    canvas.onmousemove = click;
    
    gl = canvas.getContext("webgl");
    
    if (gl === null) {
        alert("WebGL not supported by browser");
    }
    
    //Reset canvas to pure black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    const shaderProgram = initShaders(gl, vsSource, fsSource);
    
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            clientWidth: gl.getUniformLocation(shaderProgram, 'uClientWidth'),
            clientHeight: gl.getUniformLocation(shaderProgram, 'uClientHeight')
        }
    };
    
    draw();
}

function initShaders(gl, vsSource, fsSource) {
    const vsS = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fsS = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vsS);
    gl.attachShader(shaderProgram, fsS);
    gl.linkProgram(shaderProgram);
    
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

function initBuffers(positions) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    return {
        position: positionBuffer
    }
}