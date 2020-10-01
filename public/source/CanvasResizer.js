//////////////////////////////
// Handles resizing canvases.
//

class CanvasResizer {

    // Initialize object state.
    // Accepts canvas and context.
    constructor(canvas, context, resize) {

        this.canvas = canvas;
        this.context = context;
        this.resize = resize;
    }

    // Begin listening for window resize events.
    start() {

        // Resize and redraw on size.
        window.addEventListener("resize", 
            this.functionResize.bind(this));

        // Call once up front.
        this.functionResize();
    }

    // Update the size of canvas to reflect 
    // its new DOM size to avoid scaling.
    functionResize() {

        // Set the size, for now, from the window size.
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Invoke callback.
        if (this.resize) {

            this.resize(this.context, this.canvas.width, this.canvas.height);
        }
    };
}