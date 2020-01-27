import React from 'react'

export function originalRule(cell) {
  // cell is a 3 by 3 cell
  // return 1 if centre square survives, 0 otherwise
  const live = cell[1][1];
  var neighbourCount = 0;
  for(var i = 0; i < 3; ++i) {
    for(var j = 0; j < 3; ++j) {
      if(i !== 1 || j !== 1) {
        neighbourCount += cell[i][j];
      }
    }
  }

  if(live && (neighbourCount === 2 || neighbourCount === 3)) {
    return 1;
  } else if (!live && neighbourCount === 3) {
    return 1;
  }
  return 0;
}

export function originalRuleNoCopy(data, startI, startJ, endI, endJ, centreI, centreJ, height, width) {
  var neighbourCount = 0;
  for(var i = startI; i < endI; ++i) {
    for(var j = startJ; j < endJ; ++j) {
      if(i !== centreI || j !== centreJ) {
        neighbourCount += data[i * width * 4 + j*4]
      }
    }
  }

  const live = data[centreI * width * 4 + centreJ*4];

  if(live && (neighbourCount === 2 || neighbourCount === 3)) {
    return 1;
  } else if (!live && neighbourCount === 3) {
    return 1;
  }
  return 0;
}

function addEdges(target, height, width) {
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

function createPopulationTransitioner(cellTransitioner) {
  function transitionPopulation(population, target, height, width) {
    // immutable
    // handle centre cells
    for(var i = 1; i < height - 1; ++i) {
      for(var j = 1; j < width - 1; ++j) {
        target[i * width * 4 + j * 4] = cellTransitioner(population, i-1, j-1, i+2, j+2, i, j, height, width);
      }
    }

    // just make edges alive for now
    addEdges(target, height, width);

    return target;
  }

  return transitionPopulation
}

function differentIndices(x, y) {
  // get the indices of the elements in 2d arrays x and y that are different
  // returns a list of tuples
  return x.map((row, i) => row.map((element, j) => element == y[i][j] ? null : [i, j])).flat().filter(x => x)
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
  function convert(i, j, population) {
    if(population[i * gridWidth * 4 + j*4]) {
      // turn on to coral
      buffer[i * gridWidth * 4 + j*4] = 255;
      buffer[i * gridWidth * 4 + j*4 + 1] = 127;
      buffer[i * gridWidth * 4 + j*4 + 2] = 80;
      buffer[i * gridWidth * 4 + j*4 + 3] = 255;
    } else {
      // turn off to complement of coral
      buffer[i * gridWidth * 4 + j*4] = 79;
      buffer[i * gridWidth * 4 + j*4 + 1] = 208;
      buffer[i * gridWidth * 4 + j*4 + 2] = 255;
      buffer[i * gridWidth * 4 + j*4 + 3] = 255;
    }
  }
  function _f(population) {
    for(var i = 0; i < gridHeight; ++i) {
      for(var j = 0; j < gridWidth; ++j) {
        convert(i, j, population);
      }
    }

    idata.data.set(buffer);

    // update canvas with new data
    // ctx.scale(3, 3);
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
    this.transitionPopulation = createPopulationTransitioner(originalRuleNoCopy);
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
        var newPopulation = this.transitionPopulation(this.getPopulation(), this.getBuffer(), this.props.height, this.props.width);
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
  constructor(props) {
    super(props);

    this.transitionPopulation = createPopulationTransitioner(originalRuleNoCopy);
  }

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
