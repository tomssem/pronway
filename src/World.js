import React from 'react'
import fp from 'lodash/fp';

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

function scaleImageData(imageData, scale, ctx) {
  var scaled = ctx.createImageData(imageData.width * scale, imageData.height * scale);

  for(var row = 0; row < imageData.height; row++) {
    for(var col = 0; col < imageData.width; col++) {
      var sourcePixel = [
        imageData.data[(row * imageData.width + col) * 4 + 0],
        imageData.data[(row * imageData.width + col) * 4 + 1],
        imageData.data[(row * imageData.width + col) * 4 + 2],
        imageData.data[(row * imageData.width + col) * 4 + 3]
      ];
      for(var y = 0; y < scale; y++) {
        var destRow = row * scale + y;
        for(var x = 0; x < scale; x++) {
          var destCol = col * scale + x;
          for(var i = 0; i < 4; i++) {
            scaled.data[(destRow * scaled.width + destCol) * 4 + i] =
              sourcePixel[i];
          }
        }
      }
    }
  }

  return scaled;
}

function byteArrayRenderer(gridHeight, gridWidth, ctx) {
  var buffer = new Uint8ClampedArray(gridWidth * gridHeight * 4);
  var idata = ctx.createImageData(gridWidth, gridHeight);
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

    idata.data.set(buffer);

    // update canvas with new data
    ctx.putImageData(idata, 0, 0);
  }

  return _f;
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

    this.state.population = new Uint8ClampedArray(this.props.height * this.props.width * 4);
    this.state.buffer = new Uint8ClampedArray(this.props.height * this.props.width * 4);
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
        this.transitionPopulation(this.getPopulation(), this.props.height, this.props.width, this.getBuffer());
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
    this.renderer = byteArrayRenderer(this.props.height, this.props.width, this.ctx);
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
