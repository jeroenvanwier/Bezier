function setup() {
	canvas = document.getElementById("mainCanvas");
	gl = canvas.getContext("webgl");
	
	if (glContext === null) {
		alert("WebGL not supported by browser");
	}
	
	//Reset canvas to pure black
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}