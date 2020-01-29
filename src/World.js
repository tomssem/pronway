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

const shader = `
uniform highp vec2 inputPixel;
uniform highp vec4 outputFrame;
uniform highp vec2 textureSize;
varying highp vec2 vTextureCoord;//The coordinates of the current pixel
uniform sampler2D uSampler;//The image data

vec2 getUV(vec2 coord) {
	return coord * inputPixel.xy / outputFrame.zw;
}

void color_edges(vec2 textureOffset) {
  vec2 coords = textureOffset * textureSize;
}

void main(void) {
  vec2 uv = getUV(vTextureCoord);
  gl_FragColor = texture2D(uSampler, vTextureCoord);
	if(uv.x <= 0.01) {
		gl_FragColor.r = 1.0;
		gl_FragColor.g = 1.0;
    gl_FragColor.b = 1.0;
	}
  if(uv.y <= 0.005) {
		gl_FragColor.r = 1.0;
		gl_FragColor.g = 1.0;
    gl_FragColor.b = 1.0;
	}
}
`

export class OpenGL extends React.Component {
	constructor(props) {
		super(props);

		this.state = {}

		this.animate = this.animate.bind(this);
		this.draw = this.draw.bind(this);
		this.gameCanvas = React.createElement('div');
		this.width = window.innerWidth;
		this.height = window.innerHeight;
	}

	animate() {
		// start the timer for the next animation loop
		// this is the main render call that makes pixi draw your container and its children.
		requestAnimationFrame(this.animate);

		this.renderer.render(this.stage);
	}

	draw() {

		var logo = new PIXI.Sprite(PIXI.Texture.WHITE);
		logo.tint = 0xffffff; //Change with the color wanted


		var logo = PIXI.Sprite.from("https://image.shutterstock.com/image-photo/beautiful-water-drop-on-dandelion-260nw-789676552.jpg");

		logo.width = 100;
		logo.height = 100;
		logo.y = this.height / 2;
		logo.x = this.width / 2;
		// Make sure the center point of the image is at its center, instead of the default top left
		logo.anchor.set(0.5);

		//Create our Pixi filter using our custom shader code
		var uniforms = {}
		uniforms.textureSize = {
			type:"v2",
			value:[logo.width, logo.height]
		}

		var simpleShader = new PIXI.Filter('',shader);
		//Apply it to our object
		logo.filters = [simpleShader]


		// Add it to the screen
		this.stage.addChild(logo);

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

		this.state = { angle: 0 };

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
		this.setState(prevState => ({ angle: prevState.angle + 1 }));
		this.rAF = requestAnimationFrame(this.updateAnimationState);
	}

	render () {
		return <Animation width={this.props.width} height={this.props.height} angle={this.state.angle} contextRef={this.saveContext} animationRef={this.updateAnimationState} updateRef={this.postUpdate}></Animation>;
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
		return <Canvas width={this.props.width} height={this.props.height} angle={this.props.angle} contextRef={this.props.contextRef} updateRef={this.props.updateRef} />
	}
}

class Canvas extends React.Component {
	constructor(props) {
		super(props);
		this.saveContext = this.saveContext.bind(this);
	}

	saveContext(ctx) {
		this.ctx = ctx;
	}

	componentDidUpdate() {
		this.props.updateRef();
	}

	render() {
		return <PureCanvas width={this.props.width} height={this.props.height} contextRef={this.props.contextRef}></PureCanvas>;
	}
}

class PureCanvas extends React.Component {
	shouldComponentUpdate() { return false; }

	render() {
		return (
			<canvas width={this.props.width} height={this.props.height} 
				ref={node => node ? this.props.contextRef(node.getContext('2d')) : null}
			/>
		)
	}
}
