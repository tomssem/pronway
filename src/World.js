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

export function originalRuleNoCopy(data, startI, startJ, endI, endJ, centreI, centreJ) {
  var neighbourCount = 0;
  for(var i = startI; i < endI; ++i) {
    for(var j = startJ; j < endJ; ++j) {
      if(i !== centreI || j !== centreJ) {
        neighbourCount += data[i][j]
      }
    }
  }

  const live = data[centreI][centreJ];

  if(live && (neighbourCount === 2 || neighbourCount === 3)) {
    return 1;
  } else if (!live && neighbourCount === 3) {
    return 1;
  }
  return 0;
}

function addEdges(target) {
  if(target.length > 0) {
    // top and bottom
    target[0] = target[0].map(x => 1);

    target[target.length-1] = target[target.length - 1].map(x => 1);

    if(target[0].length > 1) {
      target.map(row => {
        row[0] = 1;
        row[target[0].length - 1] = 1;
      });
    }
  }
}

function createPopulationTransitioner(cellTransitioner) {
  function transitionPopulation(population, target, valueGetter=(x=>x), valueSetter=((...args) => args[0] = args[1])) {
    // immutable
    // handle centre cells
    for(var i = 1; i < population.length - 1; ++i) {
      for(var j = 1; j < population[i].length - 1; ++j) {
        target[i][j] = cellTransitioner(population, i-1, j-1, i+2, j+2, i, j);
      }
    }

    // just make edges alive for now
    addEdges(target);

    return target;
  }

  return transitionPopulation
}

class Cell extends React.Component {
  constructor (props) {
    super(props);
    this.state = {alive: 0};
  }

  kill() {
    this.setState({alive: 0});
  }

  bringToLife() {
    this.setState({alive: 1});
  }

  isAlive() {
    return this.state.alive;
  }

  getColor() {
    return this.props.alive === 1 ? "FloralWhite" : "DarkBlue";
  }

  render () {
    return <td style={{background:this.getColor(), width:this.props.width, height:this.props.height}} />
  };
}

export class World extends React.Component {
  constructor(props) {
    super(props);
    const renderWidth = window.innerWidth;
    const renderHeight = window.innerHeight;

    this.saveContext = this.saveContext.bind(this);
    this.updateAnimationState = this.updateAnimationState.bind(this);
    this.postUpdate = this.postUpdate.bind(this);

    this.gridWidth = renderWidth / this.props.width;
    this.gridHeight = renderHeight / this.props.height;

    this.delay = 1000 / props.FPS;

    this.state = { angle: 0 };

    this.state.then = Date.now()
    this.state.now = this.state.then;

    this.state.cellsToProcess = [];

    this.state.population = [...Array(this.props.height)].map(
      _ => [...Array(this.props.width)].map(
        _ => {return 0}));
    this.state.buffer = [...Array(this.props.height)].map(
      _ => [...Array(this.props.width)].map(
        _ => {return 0}));
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
        var newPopulation = this.transitionPopulation(this.getPopulation(), this.getBuffer());
        this.mapBuffer();
        this.setState({then: this.state.now});
      }
    }
  }

  postUpdate() {
    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.translate(width/2, height/2 );
    this.ctx.rotate(this.state.angle * Math.PI / 180);
    this.ctx.fillStyle = '#4397AC';
    this.ctx.fillRect(-width/4, -height/4, width/2, height/2);
    this.ctx.restore();
  }
  
  saveContext(ctx) {
    this.ctx = ctx;
  }

  updateAnimationState() {
    this.update();
    this.setState(prevState => ({ angle: prevState.angle + 1 }));
    this.rAF = requestAnimationFrame(this.updateAnimationState);
  }

  render () {
    return <Animation angle={this.state.angle} contextRef={this.saveContext} animationRef={this.updateAnimationState} updateRef={this.postUpdate}></Animation>;
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
    return <Canvas angle={this.props.angle} contextRef={this.props.contextRef} updateRef={this.props.updateRef} />
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
    return <PureCanvas contextRef={this.props.contextRef}></PureCanvas>;
  }
}

class PureCanvas extends React.Component {
  shouldComponentUpdate() { return false; }
  
  render() {
    return (
      <canvas width="300" height="300" 
        ref={node => node ? this.props.contextRef(node.getContext('2d')) : null}
      />
    )
  }
}
