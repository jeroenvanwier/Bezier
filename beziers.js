function draw() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.useProgram(programInfo.program);
    
    const canvas = document.getElementById("mainCanvas");
    
    gl.uniform1f(programInfo.uniformLocations.clientWidth, canvas.width * 1.0);
    gl.uniform1f(programInfo.uniformLocations.clientHeight, canvas.height * 1.0);
    
    for (let i = 0; i < bezierPoints.length; i++) {
        drawBezierPoint(bezierPoints[i]);
        if (i > 0) {
            drawBezierCurve(bezierPoints[i-1], bezierPoints[i]);
        }
    }
}

function drawBezierCurve(a, b) {
    const points = [a.center.x, a.center.y];
    const i_max = 100;
    const p1 = a.center;
    const p2 = a.pOut;
    const p3 = b.pIn;
    const p4 = b.center;
    for (let i = 1; i < 100; i++) {
        t = i / i_max;
        x = (1.0-t)*(1.0-t)*(1.0-t)*p1.x + 3*t*(1.0-t)*(1.0-t)*p2.x + 3*t*t*(1.0-t)*p3.x + t*t*t*p4.x;
        y = (1.0-t)*(1.0-t)*(1.0-t)*p1.y + 3*t*(1.0-t)*(1.0-t)*p2.y + 3*t*t*(1.0-t)*p3.y + t*t*t*p4.y;
        points.push(x, y);
    }
    points.push(p4.x, p4.y);
    const int_points = points.map(x => parseInt(x));
    drawLine(int_points);
}

function drawBezierPoint(bezierPoint) {
    drawCircleByPoint(bezierPoint.center);
    drawCircleByPoint(bezierPoint.pIn);
    drawCircleByPoint(bezierPoint.pOut);
    drawLineByPoints(bezierPoint.pIn, bezierPoint.center);
    drawLineByPoints(bezierPoint.pOut, bezierPoint.center);
}

function drawCircleByPoint(point, r = 10) {
    drawCircle(point.x, point.y, r);
}

function drawLineByPoints(a, b) {
    drawLine([a.x, a.y, b.x, b.y])
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
        const x = e.offsetX;
        const y = e.offsetY;
    
        processClick(x, y);
    }
}

function down(e) {
    if (e.buttons & 1 === 1) {
        const x = e.offsetX;
        const y = e.offsetY;
        
        closestPoint = null;
        pointType = 0; // 0: center, 1: pIn, 2: pOut
        distToClosest = 0;
        for (let i = 0; i < bezierPoints.length; i++) {
            p = bezierPoints[i].center;
            d = distSq(x, y, p.x, p.y);
            if (closestPoint === null || d < distToClosest) {
                closestPoint = bezierPoints[i];
                distToClosest = d;
                pointType = 0;
            }
            p = bezierPoints[i].pIn;
            d = distSq(x, y, p.x, p.y);
            if (d < distToClosest) {
                closestPoint = bezierPoints[i];
                distToClosest = d;
                pointType = 1;
            }
            p = bezierPoints[i].pOut;
            d = distSq(x, y, p.x, p.y);
            if (d < distToClosest) {
                closestPoint = bezierPoints[i];
                distToClosest = d;
                pointType = 2;
            }
        }
        
        if (closestPoint === null || distToClosest > 500) {
            const newPoint = newBezierPoint(x, y);
            bezierPoints.push(newPoint);
            draggingPoint = newPoint;
            draggingType = 0;
        } else {
            draggingPoint = closestPoint;
            draggingType = pointType;
            if (draggingType != 0) {
                pComplement = (draggingType === 1) ? draggingPoint.pOut : draggingPoint.pIn;
                draggingComplementDist = Math.sqrt(distSq(pComplement.x, pComplement.y, draggingPoint.center.x, draggingPoint.center.y));
            }
        }
        
        processClick(x, y);
    }
}

function newBezierPoint(x, y) {
    const offset = 150;
    return {center:{x: x, y: y}, pIn:{x:x, y:y-offset}, pOut:{x:x, y:y+offset}};
}

draggingPoint = null;
draggingType = 0; // 0: center, 1: pIn, 2: pOut
draggingComplementDist = 0;

function processClick(x, y) {
    if (draggingPoint === null) {
        return;
    }
    
    if (draggingType === 0) {
        dxIn = draggingPoint.pIn.x - draggingPoint.center.x;
        dyIn = draggingPoint.pIn.y - draggingPoint.center.y;
        dxOut = draggingPoint.pOut.x - draggingPoint.center.x;
        dyOut = draggingPoint.pOut.y - draggingPoint.center.y;
        draggingPoint.center.x = x;
        draggingPoint.center.y = y;
        draggingPoint.pIn.x = x + dxIn;
        draggingPoint.pIn.y = y + dyIn;
        draggingPoint.pOut.x = x + dxOut;
        draggingPoint.pOut.y = y + dyOut;
    } else {
        p = (draggingType === 1) ? draggingPoint.pIn : draggingPoint.pOut;
        pComplement = (draggingType === 1) ? draggingPoint.pOut : draggingPoint.pIn;
        p.x = x;
        p.y = y;
        dx = p.x - draggingPoint.center.x;
        dy = p.y - draggingPoint.center.y;
        pDist = Math.sqrt(distSq(0, 0, dx, dy));
        pComplement.x = draggingPoint.center.x - (dx / pDist) * draggingComplementDist;
        pComplement.y = draggingPoint.center.y - (dy / pDist) * draggingComplementDist;
    }
    
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

function resize() {
    const canvas = document.getElementById("mainCanvas");
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    draw();
}

function setup() {
    const canvas = document.getElementById("mainCanvas");
    
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    canvas.onmousedown = down;
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