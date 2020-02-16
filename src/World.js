import React from 'react'
import fp from 'lodash/fp';
import * as PIXI from 'pixi.js'

function countNeighbourhood(data, startI, startJ, endI, endJ, centreI, centreJ, height, width) {
  // the number of "on" cells in the neighbourhood centred at [centreI, centreJ]
  var neighbourhoodCount = 0;
  for(var i = startI; i < endI; ++i) {
    const rowIndex = i * width * 4;
    for(var j = startJ; j < endJ; ++j) {
      neighbourhoodCount += data[rowIndex + j*4];
    }
  }

  return neighbourhoodCount;
}

function countNeighbours(data, startI, startJ, endI, endJ, centreI, centreJ, height, width) {
  // the number of "on" neighbours of cell [centreI, centreJ]
  return countNeighbourhood(data, startI, startJ, endI, endJ, centreI, centreJ, height, width) - data[centreI * width * 4 + centreJ*4];
}

export function originalRuleNoCopy(data, startI, startJ, endI, endJ, centreI, centreJ, height, width) {

  var neighbourCount = countNeighbours(data, startI, startJ, endI, endJ, centreI, centreJ, height, width);

  const live = data[centreI * width * 4 + centreJ*4];

  if(live && (neighbourCount === 2 || neighbourCount === 3)) {
    return 1;
  } else if (!live && neighbourCount === 3) {
    return 1;
  }
  return 0;
}

function addEdges(_, height, width, target) {
  // top and bottom
  for(var i = 0; i < width; ++i) {
    target[i * 4] = 1;
    target[width * 4 * (height - 1) + (i * 4)] = 1;
  }
  // left and right
  for(i = 0; i < height; ++i) {
    target[i * width * 4] = 1;
    target[(1 + i) * width * 4 - 4] = 1;
  }
}

function applyRuleToPopulation(rule, population, height, width, target) {
  // Mutates second argument with result of applying rule over population
  for(var i = 1; i < height - 1; ++i) {
    for(var j = 1; j < width - 1; ++j) {
      target[i * width * 4 + j * 4] = rule(population, i-1, j-1, i+2, j+2, i, j, height, width);
    }
  }
}

function applyTransitionsToPopulation(transitions, population, height, width, target) {
  transitions.map((f) => f(population, height, width, target));
};

function scaleImageData(originalBuffer, targetBuffer, originalWidth, originalHeight, horizontalScale, verticalScale, ctx) {
  const scaledWidth = originalWidth * horizontalScale;

  for(var row = 0; row < originalHeight; row++) {
    for(var col = 0; col < originalWidth; col++) {
      var sourcePixel = [
        originalBuffer[(row * originalWidth + col) * 4 + 0],
        originalBuffer[(row * originalWidth + col) * 4 + 1],
        originalBuffer[(row * originalWidth + col) * 4 + 2],
        originalBuffer[(row * originalWidth + col) * 4 + 3]
      ];
      for(var y = 0; y < verticalScale; y++) {
        var destRow = (row * horizontalScale + y);
        for(var x = 0; x < horizontalScale; x++) {
          var destIndex = (destRow * scaledWidth + (col * verticalScale + x)) * 4;
          targetBuffer[destIndex] = sourcePixel[0];
          targetBuffer[destIndex + 1] = sourcePixel[1];
          targetBuffer[destIndex + 2] = sourcePixel[2];
          targetBuffer[destIndex + 3] = sourcePixel[3];
        }
      }
    }
  }
}

function byteArrayRenderer(canvasHeight, canvasWidth, gridHeight, gridWidth, ctx) {
  var horizontalScale = canvasWidth / gridWidth;
  var verticalScale = canvasHeight / gridHeight;
  var buffer = new Uint8ClampedArray(gridWidth * gridHeight * 4);
  var imageData = ctx.createImageData(canvasWidth, canvasHeight);
  function convert(baseIndex, population) {
    if(population[baseIndex]) {
      // turn on to coral
      buffer[baseIndex] = 255;
      buffer[baseIndex + 1] = 127;
      buffer[baseIndex + 2] = 80;
      buffer[baseIndex + 3] = 255;
    } else {
      // turn off to complement of coral
      buffer[baseIndex] = 79;
      buffer[baseIndex + 1] = 208;
      buffer[baseIndex + 2] = 255;
      buffer[baseIndex + 3] = 255;
    }
  }
  const length = gridWidth * gridWidth;
  function _f(population) {
    for(var i = 0; i < length; ++i) {
      convert(4*i, population);
    }

    scaleImageData(buffer, imageData.data, gridWidth, gridHeight, horizontalScale, verticalScale, ctx);
    // imageData.data.set(scaledBuffer);

    // update canvas with new data
    ctx.putImageData(imageData, 0, 0);
  }

  return _f;
}

const BLUR_BOX_SHADER = `
precision highp float;

uniform highp float width;
uniform highp float height;

uniform highp vec2 inputPixel;
uniform highp vec4 outputFrame;

varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;

vec2 fromUV(vec2 uv) {
  return uv * outputFrame.zw / inputPixel.xy;
}

vec2 getUV(vec2 coord) {
  return coord * inputPixel.xy / outputFrame.zw;
}

void drawBorder(vec2 pixelPos) {
  if(pixelPos.x <= 1.0 / width || pixelPos.x >= 1.0 - (1.0 / width)) {
    gl_FragColor.r = 1.0;
    gl_FragColor.g = 0.0;
    gl_FragColor.b = 0.0;
  }

  if(pixelPos.y <= 1.0 / height || pixelPos.y >= 1.0 - (1.0 / height)) {
    gl_FragColor.r = 1.0;
    gl_FragColor.g = 0.0;
    gl_FragColor.b = 0.0;
  }
}

void blur(vec2 pixelPos) {
  if(!(pixelPos.x <= 1.0 / width || pixelPos.x >= 1.0 - (1.0 / width))
        && !(pixelPos.y <= 1.0 / height || pixelPos.y >= 1.0 - (1.0 / height))) {
    vec4 sum = vec4(0.0, 0.0, 0.0, 0.0);
    float up = pixelPos.y - (1.0 / height)* outputFrame.w / inputPixel.y;
    float down = pixelPos.y + (1.0 / height)* outputFrame.w / inputPixel.y;
    float left = pixelPos.x - (1.0 / width)* outputFrame.z / inputPixel.x;
    float right = pixelPos.x + (1.0 / width)* outputFrame.z / inputPixel.x;

    float pixelUp = pixelPos.y - (1.0 / height);
    float pixelDown = pixelPos.y + (1.0 / height);
    float pixelLeft = pixelPos.x - (1.0 / width);
    float pixelRight = pixelPos.x + (1.0 / width);

    sum += texture2D(uSampler, fromUV(pixelPos));
    sum += texture2D(uSampler, fromUV(vec2(pixelPos.x, pixelUp)));   // north
    sum += texture2D(uSampler, fromUV(vec2(pixelPos.x, pixelDown)));   // south
    sum += texture2D(uSampler, fromUV(vec2(pixelLeft, pixelPos.y)));   // west
    sum += texture2D(uSampler, fromUV(vec2(pixelRight, pixelPos.y)));   // east
    sum += texture2D(uSampler, fromUV(vec2(pixelLeft, pixelUp)));   // north-west
    sum += texture2D(uSampler, fromUV(vec2(pixelRight, pixelUp)));   // north-east
    sum += texture2D(uSampler, fromUV(vec2(pixelLeft, pixelDown)));   // south-west
    sum += texture2D(uSampler, fromUV(vec2(pixelRight, pixelDown)));   // south-east

    gl_FragColor = sum / 9.0;
  }
}

void main(void) {
  vec2 uv = getUV(vTextureCoord);
  // gl_FragColor = texture2D(uSampler, vTextureCoord);

  drawBorder(uv);

  blur(uv);
}
`

const SIMPLE_FRAGMENT = `
precision mediump float;

void main(void) {
    gl_FragColor = vec4(0.9, 0.3, 0.6, 1.0);
}
`

const SIMPLE_VERTEX = `
attribute vec3 Position;

uniform mat4 u_ModelView;
uniform mat4 u_Persp;

void main(void) {
    gl_Position = u_Persp * u_ModelView * vec4(Position, 1.0);
}
`

export class WorldGL extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.saveContext = this.saveContext.bind(this);
    this.updateAnimationState = this.updateAnimationState.bind(this);
    this.postUpdate = this.postUpdate.bind(this);
  }

  getShader(gl, source) {
    var shader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  initShaders(gl) {
    var fragmentShader = this.getShader(gl, BLUR_BOX_SHADER);
    console.log(fragmentShader);

    var shader_prog = gl.createProgram();
    gl.attachShader(shader_prog, fragmentShader);
    gl.linkProgram(shader_prog);

    if (!gl.getProgramParameter(shader_prog, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
    }

    var err = gl.useProgram(shader_prog);
    console.log(err);

    shader_prog.positionLocation = gl.getAttribLocation(shader_prog, "Position");
    gl.enableVertexAttribArray(shader_prog.positionLocation);

    shader_prog.u_PerspLocation = gl.getUniformLocation(shader_prog, "u_Persp");
    shader_prog.u_ModelViewLocation = gl.getUniformLocation(shader_prog, "u_ModelView");
  }

  initGL(gl) {
    try {
      gl.viewportWidth = this.props.width;
      gl.viewportHeight = this.props.height;
    } catch (e) {
      console.log("Error in intiGL: " + e);
    }
    if (!gl) {
      alert("WebGL is not avaiable on your browser!");
    }
  }

  saveContext(gl) {
    this.initGL(gl);
        initShaders();
        initBuffers();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        drawScene();
  }

  postUpdate() {
    this.renderer(this.state.population);
  }

  updateAnimationState() {
    this.rAF = requestAnimationFrame(this.updateAnimationState);
  }

  render() {
    return <Animation width={this.props.width} height={this.props.height} contextRef={this.saveContext} animationRef={this.updateAnimationState} updateRef={this.postUpdate} contextType="webgl"></Animation>;
  }
}

export class OpenGL extends React.Component {
  constructor(props) {
    super(props);

    this.state = {}

    this.animate = this.animate.bind(this);
    this.draw = this.draw.bind(this);
    this.gameCanvas = React.createElement('div');
    this.width = 800;
    this.height = 600;

    this.num_frames = 0;
  }

  animate() {
    // start the timer for the next animation loop
    // this is the main render call that makes pixi draw your container and its children.
    this.num_frames += 1;
    this.renderer.render(this.stage);

    console.log(this.renderer.extract.pixels());

    if(this.num_frames < 4) {
      requestAnimationFrame(this.animate);
    }
  }

  draw() {

    this.logo = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.logo.tint = 0xffffff; //Change with the color wanted


    this.logo = PIXI.Sprite.from("https://image.shutterstock.com/image-photo/beautiful-water-drop-on-dandelion-260nw-789676552.jpg");

    this.logo.width = 800;
    this.logo.height = 600;
    this.logo.y = this.height / 2;
    this.logo.x = this.width / 2;
    // Make sure the center point of the image is at its center, instead of the default top left
    this.logo.anchor.set(0.5);

    //Create our Pixi filter using our custom shader code

    var simpleShader = new PIXI.Filter('',BLUR_BOX_SHADER);
    simpleShader.uniforms.width = this.logo.width;
    simpleShader.uniforms.height = this.logo.height;
    //Apply it to our object
    this.logo.filters = [simpleShader]


    // Add it to the screen
    this.stage.addChild(this.logo);

    requestAnimationFrame(this.animate);
  }

  /**
   * After mounting, add the Pixi Renderer to the div and start the Application.
   */
  componentDidMount() {
    this.renderer = PIXI.autoDetectRenderer({width: this.width, height: this.height})
    this.stage = new PIXI.Container();

    this.gameCanvas.appendChild(this.renderer.view);

    this.draw();
  }

  /**
   * Simply render the div that will contain the Pixi Renderer.
   */
  render() {
    let component = this;
    return (
      <div ref={(thisDiv) => {component.gameCanvas = thisDiv}} />
    );
  }
}


export class World extends React.Component {
  constructor(props) {
    super(props);

    this.saveContext = this.saveContext.bind(this);
    this.updateAnimationState = this.updateAnimationState.bind(this);
    this.postUpdate = this.postUpdate.bind(this);

    this.delay = 1000 / props.FPS;

    this.state = {};

    this.state.then = Date.now()
    this.state.now = this.state.then;

    this.state.cellsToProcess = [];

    this.state.population = new Uint8ClampedArray(this.props.worldHeight * this.props.worldWidth * 4);
    this.state.buffer = new Uint8ClampedArray(this.props.worldHeight * this.props.worldWidth * 4);
    this.transitionPopulation = fp.curry(applyTransitionsToPopulation)([fp.curry(applyRuleToPopulation)(originalRuleNoCopy), addEdges]);
  }

  getPopulation() {
    return this.state.population;
  }

  getBuffer() {
    return this.state.buffer
  }

  mapBuffer() {
    var temp = this.state.buffer;
    this.setState({buffer: this.state.population});
    this.setState({population: temp});
  }

  update() {
    if(!this.state.done) {
      this.setState({now: Date.now()});

      if (this.state.now - this.state.then > this.delay) {
        // create new population
        this.transitionPopulation(this.getPopulation(), this.props.worldHeight, this.props.worldWidth, this.getBuffer());
        this.mapBuffer();
        this.setState({then: this.state.now});
      }
    }
  }

  postUpdate() {
    this.renderer(this.state.population);
  }

  saveContext(ctx) {
    this.ctx = ctx;
    this.ctx.fillstyle = "DarkBlue";
    this.renderer = byteArrayRenderer(this.props.height, this.props.width, this.props.worldHeight, this.props.worldWidth, this.ctx);
  }

  updateAnimationState() {
    this.update();
    this.rAF = requestAnimationFrame(this.updateAnimationState);
  }

  render () {
    return <Animation width={this.props.width} height={this.props.height} contextRef={this.saveContext} animationRef={this.updateAnimationState} updateRef={this.postUpdate}></Animation>;
  }
}

export class Animation extends React.Component {
  componentDidMount() {
    this.rAF = requestAnimationFrame(this.props.animationRef);
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.rAF);
  }

  render() {
    return <Canvas width={this.props.width} height={this.props.height} contextRef={this.props.contextRef} updateRef={this.props.updateRef} contextType={this.props.contextType}/>
  }
}

class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.saveContext = this.saveContext.bind(this);

    this._contextType = this.props.contextType || "2d";
    console.log(this._contextType);
  }

  saveContext(ctx) {
    this.ctx = ctx;
  }

  componentDidUpdate() {
    this.props.updateRef();
  }

  render() {
    return <PureCanvas width={this.props.width} height={this.props.height} contextRef={this.props.contextRef} contextType={this._contextType}></PureCanvas>;
  }
}

class PureCanvas extends React.Component {
  shouldComponentUpdate() { return false; }

  render() {
    return (
      <canvas width={this.props.width} height={this.props.height} 
        ref={node => node ? this.props.contextRef(node.getContext(this.props.contextType)) : null}
      />
    )
  }
}
