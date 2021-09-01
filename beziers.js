class Point {
    
    /* A simpe point class representing and (x,y) value */
    
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    static dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        
        return Math.hypot(dx, dy);
    }
}

class BezierPoint {
    
    /* A point used in defining a Bezier curve.
     * Represents a triple of points:
     *  center: the end point of the incoming curve and start point of the outgoing curve
     *  pIn: the third point in the incoming curve
     *  pOut: the second point in the outgoing curve
     */
    
    static CENTER = Symbol('center');
    static IN = Symbol('in');
    static OUT = Symbol('out');
    static TYPES = [BezierPoint.IN, BezierPoint.CENTER, BezierPoint.OUT];
    
    constructor(x, y, offset = 100) {
        this.center = new Point(x,y);
        this.pIn = new Point(x, y - offset);
        this.pOut = new Point(x, y + offset);
    }
    
    getPoint(type) {
        switch(type) {
            case BezierPoint.CENTER:
                return this.center;
            case BezierPoint.IN:
                return this.pIn;
            case BezierPoint.OUT:
                return this.pOut;
            default:
                return null;
        }
    }
}

/* Global variables for the BezierPoint being dragged,
 * representing which point, which component of the BezierPoint,
 * and the distance at which to maintain the complement point (in case of draggin the IN or OUT point)
 */
draggingPoint = null;
draggingType = null;
draggingComplementDist = 0;

/* Global list of all bezier points in the curve */
const bezierPoints = [];

/* Global gl environment and corresponding program info, used for rendering. Initialized in setup(). */
gl = null;
programInfo = null;

/* Initial setup for the canvas and GL environment, called upon page load */
function setup() {
    const canvas = document.getElementById("mainCanvas");
    
    // Set the resolution of the canvas equal to the size it takes up on the screen
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Set the mouse listeners
    canvas.onmousedown = down;
    canvas.onmousemove = move;
    
    // Set the (global) gl context
    gl = canvas.getContext("webgl");
    
    if (gl === null) {
        alert("WebGL not supported by browser");
    }
    
    // Compile the shaders
    const shaderProgram = initShaders(vsSource, fsSource);
    
    // Set the (global) program info, containing the shaders and the locations of the values within them
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            clientWidth: gl.getUniformLocation(shaderProgram, 'uClientWidth'),
            clientHeight: gl.getUniformLocation(shaderProgram, 'uClientHeight'),
            color: gl.getUniformLocation(shaderProgram, 'uColor')
        }
    };
    
    // Draw the first frame
    draw();
}

/* Correct canvas resolution when page is resized */
function resize() {
    const canvas = document.getElementById("mainCanvas");
    
    // Set the resolution of the canvas equal to the (new) size it takes up on the screen
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Set the GL viewport to be in the new position
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Redraw the scene
    draw();
}

/* Draw a single frame to the canvas. */
function draw() {
    if (gl === null) {
        console.log("Attempt to draw frame before GL was set up.");
        return;
    }
    
    // Draw a black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Set the shaders
    gl.useProgram(programInfo.program);

    // Upload the canvas size to the shaders
    const canvas = document.getElementById("mainCanvas");
    
    gl.uniform1f(programInfo.uniformLocations.clientWidth, canvas.width * 1.0);
    gl.uniform1f(programInfo.uniformLocations.clientHeight, canvas.height * 1.0);

    // Draw the Bezier points and the curve connecting them
    for (i in bezierPoints) {
        drawBezierPoint(bezierPoints[i]);
        if (i > 0) {
            drawBezierCurve(bezierPoints[i-1], bezierPoints[i]);
        }
    }
}

/* Draw a bezier curve between BezierPoint a and b */
function drawBezierCurve(a, b) {
    // List of points on the line, starting at the center of a
    const points = [a.center.x, a.center.y];
    // Number of segments in which to draw the curve
    const NUM_SEGMENTS = 100;
    // The four points defining a cubic Bezier curve
    const p1 = a.center;
    const p2 = a.pOut;
    const p3 = b.pIn;
    const p4 = b.center;
    
    for (let i = 1; i < 100; i++) {
        // The [0,1] value describing where on the curve we are
        t = i / NUM_SEGMENTS;
        // The formulas defining a cubic bezier curve
        x = (1.0-t)*(1.0-t)*(1.0-t)*p1.x + 3*t*(1.0-t)*(1.0-t)*p2.x + 3*t*t*(1.0-t)*p3.x + t*t*t*p4.x;
        y = (1.0-t)*(1.0-t)*(1.0-t)*p1.y + 3*t*(1.0-t)*(1.0-t)*p2.y + 3*t*t*(1.0-t)*p3.y + t*t*t*p4.y;
        points.push(x, y);
    }
    // Add the center of b as the end point
    points.push(p4.x, p4.y);
    const iPoints = points.map(x => parseInt(x));
    // Pick a color alternating red, green, blue
    let color = [0.2, 0.2, 0.2, 1.0];
    color[bezierPoints.indexOf(a) % 3] = 1.0
    drawLine(iPoints, color);
}

/* Draws a BezierPoint to the GL contextual
 * Draws a circle for each of the three points and lines from IN/OUT to CENTER
 */
function drawBezierPoint(bezierPoint) {
    drawCircle(bezierPoint.center);
    drawCircle(bezierPoint.pIn);
    drawCircle(bezierPoint.pOut);
    drawLineSegment(bezierPoint.pIn, bezierPoint.center);
    drawLineSegment(bezierPoint.pOut, bezierPoint.center);
}

/* Draw a straight line from Point a to b */
function drawLineSegment(a, b) {
    drawLine([a.x, a.y, b.x, b.y])
}

/* Draw a circle of radius r (in pixels) around Point p */
function drawCircle(p, r = 10) {
    const circlePositions = [];
    for (let i = 0; i < 180; i++) {
        circlePositions.push(p.x + r * Math.cos(i * Math.PI * 2 / 180), p.y + r * Math.sin(i * Math.PI * 2 / 180));
    }
    drawLine(circlePositions);
}

/* Draw a (not necesarily straight) line given by a series of points.
 * Optionally allows for a color given as rgba value in [0.0, 1.0] range.
 * Positions should be an array of alternating x and y values as integers.
 * For example: drawLine([0, 0, 100, 100, 100, 0, 0, 0]) draws a line from (0,0) to (100, 100) to (100, 0) to (0, 0).
 */
function drawLine(positions, color = [0.5, 0.5, 0.5, 1.0]) {
    if (positions.length <= 2) {
        return;
    }
    
    // Set the color
    gl.uniform4fv(programInfo.uniformLocations.color, new Float32Array(color));
    
    // Set the shader to read 2 values of type FLOAT at a time from the buffer
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    
    // Upload the line to the buffer
    const buffers = initBuffers(positions);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    
    // Draw the buffer as a line
    const vertexCount = positions.length / 2;
    gl.drawArrays(gl.LINE_STRIP, offset, vertexCount);
}

/* Creates a GL buffer for the given list of positions */
function initBuffers(positions) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    return {
        position: positionBuffer
    }
}

/* Listener for mouse movement */
function move(e) {
    // Check if left mouse button is pressed
    if (e.buttons & 1 === 1) {
        // Find (x,y) location relative to canvas origin
        const x = e.offsetX;
        const y = e.offsetY;
        
        // Process dragging to this location
        processClick(x, y);
    }
}

/* Listener for mouse click down */
function down(e) {
    // Check if left mouse button was pressed
    if (e.buttons & 1 === 1) {
        // Find (x,y) location relative to canvas origin
        const x = e.offsetX;
        const y = e.offsetY;
        const clickPoint = new Point(x,y);
        
        // Find Point in BezierPoint that is closest to the click
        let closestPoint = null;
        let pointType = null;
        let distToClosest = 0;
        for (let i in bezierPoints) {
            let bezierPoint = bezierPoints[i];
            for (let j in BezierPoint.TYPES) {
                type = BezierPoint.TYPES[j];
                p = bezierPoint.getPoint(type);
                d = Point.dist(clickPoint, p);
                if (closestPoint === null || d < distToClosest) {
                    closestPoint = bezierPoint;
                    distToClosest = d;
                    pointType = type;
                }
            }
        }
        
        if (closestPoint === null || distToClosest > 25) {
            // If no point was found within 25 pixels of the click, add a new BezierPoint to the curve
            const newPoint = new BezierPoint(x, y);
            bezierPoints.push(newPoint);
            // Start dragging the new point
            draggingPoint = newPoint;
            draggingType = BezierPoint.CENTER;
        } else {
            // If a point was found within 25 pixels of the click, start dragging it
            draggingPoint = closestPoint;
            draggingType = pointType;
            if (draggingType != BezierPoint.CENTER) {
                const pComplement = (draggingType === BezierPoint.IN) ? draggingPoint.pOut : draggingPoint.pIn;
                draggingComplementDist = Point.dist(pComplement, draggingPoint.center);
            }
        }
        
        // Process dragging to the click location
        processClick(x, y);
    }
}

/* Processes the dragging of points to a given (x, y) location.
 * The point being dragged is stored globally
 */
function processClick(x, y) {
    if (draggingPoint === null) {
        return;
    }
    
    if (draggingType === BezierPoint.CENTER) {
        // If dragging a CENTER point, maintain the IN and OUT points relative to the CENTER point
        const dxIn = draggingPoint.pIn.x - draggingPoint.center.x;
        const dyIn = draggingPoint.pIn.y - draggingPoint.center.y;
        const dxOut = draggingPoint.pOut.x - draggingPoint.center.x;
        const dyOut = draggingPoint.pOut.y - draggingPoint.center.y;
        draggingPoint.center.x = x;
        draggingPoint.center.y = y;
        draggingPoint.pIn.x = x + dxIn;
        draggingPoint.pIn.y = y + dyIn;
        draggingPoint.pOut.x = x + dxOut;
        draggingPoint.pOut.y = y + dyOut;
    } else {
        /* If an IN or OUT point is being dragged, maintain the complementary point
         * at the same distance from the CENTER point that it was before,
         * but exactly opposite in direction from CENTER as the point being dragged.
         * This ensures the final curve can be defined with as much freedom possible,
         * but remains smooth */
        const p = draggingPoint.getPoint(draggingType);
        const pComplement = (draggingType === BezierPoint.IN) ? draggingPoint.pOut : draggingPoint.pIn;
        p.x = x;
        p.y = y;
        const dx = p.x - draggingPoint.center.x;
        const dy = p.y - draggingPoint.center.y;
        const pDist = Point.dist(p, draggingPoint.center);
        pComplement.x = draggingPoint.center.x - (dx / pDist) * draggingComplementDist;
        pComplement.y = draggingPoint.center.y - (dy / pDist) * draggingComplementDist;
    }
    
    // Redraw the scene
    draw();
}

/*
 * Vertex Shader:
 * Translates an (x,y) pixel coordinate into [-1.0, 1.0]^2 plane used by OpenGL
 *
 * aVertexPosition: the (x,y) pixel coordinate
 *
 * uClientWidth: the uniform value of the width of the canvas (in pixels)
 * uClientHeight: the uniform value of the height of the canvas (in pixels)
 */
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

/*
 * Fragment Shader:
 * Determines the color of a drawn pixel.
 *
 * Always returns solid whiteSpace
 */ 
const fsSource = `
    precision mediump float;
    uniform vec4 uColor;
    
    void main() {
        gl_FragColor = uColor;
    }
`;

/* Initialize the vertex and fragment shaders and link them to the program */
function initShaders(vsSource, fsSource) {
    const vsS = loadShader(gl.VERTEX_SHADER, vsSource);
    const fsS = loadShader(gl.FRAGMENT_SHADER, fsSource);
    
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

/* Create and compile a shader of the given type using the given source code */
function loadShader(type, source) {
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