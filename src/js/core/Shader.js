import GlslCanvas from 'glslCanvas';
import { subscribeInteractiveDom } from '../tools/interactiveDom';
import MediaCapture from '../tools/mediaCapture';
import MenuItem from '../ui/MenuItem';
// 3er Parties
import { saveAs } from '../vendor/FileSaver.min.js';

var CONTROLS_CLASSNAME = 'ge_control';

export default class Shader {
    constructor (main) {
        this.options = main.options;

        // DOM CONTAINER
        this.el = document.createElement('div');
        this.el.setAttribute('class', 'ge_canvas_container');

        // CREATE AND START GLSLCANVAS
        this.el_canvas = document.createElement('canvas');
        this.el_canvas.setAttribute('class', 'ge_canvas');
        this.el_canvas.setAttribute('width', this.options.canvas_width || this.options.canvas_size || '250');
        this.el_canvas.setAttribute('height', this.options.canvas_height || this.options.canvas_size || '250');
        this.el_canvas.setAttribute('data-fragment', this.options.frag);
        this.el.appendChild(this.el_canvas);
        let glslcanvas = new GlslCanvas(this.el_canvas, { premultipliedAlpha: false, preserveDrawingBuffer: true, backgroundColor: 'rgba(1,1,1,1)' });
        this.canvas = glslcanvas;
        if (this.options.imgs.length > 0) {
            for (let i in this.options.imgs) {
                this.canvas.setUniform('u_tex' + i, this.options.imgs[i]);
            }
        }

        // Media Capture
        this.media_capture = new MediaCapture();
        this.media_capture.setCanvas(this.el_canvas);
        this.canvas.on('render', () => {
            this.media_capture.completeScreenshot();
        })

        // CONTROLS 
        this.control_pannel = document.createElement('ul');
        this.control_pannel.className = CONTROLS_CLASSNAME;
        this.el.appendChild(this.control_pannel);
        this.controls = {};
        this.controls.playPause = new MenuItem(this.control_pannel, 'ge_control_element', '&#9616;&nbsp;&#9612;', (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (glslcanvas.paused) {
                glslcanvas.play();
                this.controls.playPause.name = '&#9616;&nbsp;&#9612;';//'Pause';
            } else {
                glslcanvas.pause();
                this.controls.playPause.name = '&nbsp;&#9654;&nbsp;';//'Play';
            }
        });

        this.isCapturing = false;
        let rec = new MenuItem(this.control_pannel, 'ge_control_element', '&#11044;', (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (this.isCapturing) {
                this.stopVideoCapture();
            } else {
                this.startVideoCapture();
            }
        });
        this.controls.rec = rec;
        this.controls.rec.button.style.color = 'red';
        this.controls.rec.button.style.transform = 'translate(0px,-2px)';
        
        this.el_control = this.el.getElementsByClassName(CONTROLS_CLASSNAME)[0];
        this.el_control.addEventListener('mouseenter', (event) => { this.showControls(); });
        this.el_control.addEventListener('mouseleave', (event) => { this.hideControls(); });
        this.el_canvas.addEventListener('mousemove', (event) => {
            if (event.offsetY>this.el_canvas.clientHeight*.66) {
                this.showControls();
            }
            else {
                this.hideControls();
            } 
        })
        this.hideControls();
        
        // ========== EVENTS
        // Draggable/resizable/snappable
        if (main.options.canvas_draggable || main.options.canvas_resizable || main.options.canvas_snapable) {
            subscribeInteractiveDom(this.el, { 
                                                move: main.options.canvas_draggable,
                                                resize: main.options.canvas_resizable,
                                                snap: main.options.canvas_snapable 
                                            });

            if (main.options.canvas_size === 'halfscreen') {
                this.el.snapRight();
            }

            this.el.on('move', (event) => {
                event.el.style.width = event.el.clientWidth+'px';
                event.el.style.height = event.el.clientHeight+'px';
            })
            this.el.on('resize', (event) => {
                glslcanvas.canvas.style.width = event.el.clientWidth+'px';
                glslcanvas.canvas.style.height = event.el.clientHeight+'px';
                glslcanvas.resize();
            })
        }

        // If there is a menu offset the editor to come after it
        if (main.menu) {
            this.el.style.top = (main.menu.el.clientHeight || main.menu.el.offsetHeight || main.menu.el.scrollHeight) + "px";
        }

        // Add all this to the main container
        // glslcanvas.canvas.style.width = this.el.clientWidth+'px';
        // glslcanvas.canvas.style.height = this.el.clientHeight+'px';
        // glslcanvas.resize();
        main.container.appendChild(this.el);
    }

    hideControls () {
        if (this.el_control.className === CONTROLS_CLASSNAME) {
            this.el_control.className = CONTROLS_CLASSNAME+' '+CONTROLS_CLASSNAME+'_hidden';
        }
    }

    showControls () {
        if (this.el_control.className === CONTROLS_CLASSNAME+' '+CONTROLS_CLASSNAME+'_hidden') {
            this.el_control.className = CONTROLS_CLASSNAME;
        }
    }

    requestRedraw() {
        this.canvas.forceRender = true;
        this.canvas.render();
    }

    screenshot () {
        this.requestRedraw();
        return this.media_capture.screenshot();
    }

    startVideoCapture () {
        this.requestRedraw();
        if (this.media_capture.startVideoCapture()) {
            this.isCapturing = true;
            this.controls.rec.name = '&#9726;';
            this.controls.rec.button.style.color = 'white';
        }
    }

    stopVideoCapture () {
        if (this.isCapturing) {
            this.isCapturing = false;
            this.controls.rec.button.style.color = 'red';
            this.controls.rec.name = '&#11044;';
            this.controls.rec.button.style.transform = 'translate(0px,-2px)';
            this.media_capture.stopVideoCapture().then((video) => {
                saveAs(video.blob, `tangram-video-${+new Date()}.webm`);
            });
        }
    }
}
