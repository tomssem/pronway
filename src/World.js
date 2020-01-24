import React from 'react'
import Table from 'react-table'
import assert from 'assert'

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
        console.log(i + " " + j + " " + endI + " " + endJ);
        neighbourCount += data[i][j]
      }
    }
  }

  if(neighbourCount > 0) {
    console.log("lives: " + neighbourCount);
  }

  const live = data[centreI][centreJ];

  if(live && (neighbourCount === 2 || neighbourCount === 3)) {
    return 1;
  } else if (!live && neighbourCount === 3) {
    return 1;
  }
  return 0;
}

function createPopulationTransitioner(cellTransitioner) {
  function transitionPopulation(population, target, valueGetter=(x=>x), valueSetter=((...args) => args[0] = args[1])) {
    // immutable
    // handle centre cells
    for(var i = 1; i < population.length - 1; ++i) {
      for(var j = 1; j < population[i].length - 1; ++j) {
        console.log(i + " " + j);
        target[i][j] = cellTransitioner(population, i-1, j-1, i+2, j+2, i, j);
      }
    }

    // just make edges alive for now
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
    // return  <Rectangle width={this.props.width} height={this.props.height} fill={{color:this.getColor()}} />
    return <td style={{background:this.getColor(), width:this.props.width, height:this.props.height}} />
  };
}

export class World extends React.Component {
  constructor(props) {
    super(props);
    const renderWidth = window.innerWidth;
    const renderHeight = window.innerHeight;
    this.gridWidth = renderWidth / this.props.width;
    this.gridHeight = renderHeight / this.props.height;

    this.delay = 1000 / props.FPS;

    this.state = {};

    this.state.then = Date.now()
    this.state.now = this.state.then;

    this.state.population = [...Array(this.props.height)].map(
      _ => [...Array(this.props.width)].map(
        _ => {return 0}));
    this.state.buffer = [...Array(this.props.height)].map(
      _ => [...Array(this.props.width)].map(
        _ => {return 0}));
    this.transitionPopulation = createPopulationTransitioner(originalRuleNoCopy);
  }

  componentDidMount() {
    this.animationID = window.requestAnimationFrame(() => this.update());
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

  setPopulation(population) {
    this.setState((state, props) => {
      assert(population.length === state.population.length);
      population.forEach((row, i) => assert(row.length === state.population[i].length));
      state.population = population;
    });
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

      this.animationID = window.requestAnimationFrame(() => this.update());
    }
  }

  renderRow(row, rowId) {
    return <tr> {row.map((cell, cellId) => <Cell width={this.gridWidth} height={this.gridHeight} alive={cell}/> )} </tr>
    }

    render () {
      return (
        <table cellpadding="0" cellspacing="0" style={{height:"100%", overflow: "hidden", position: "absolute", top: 0, bottom: 0, left: 0, right: 0}} className="worldTable">
        <tbody>
        {this.state.population.map((row, rowId) => this.renderRow(row, rowId))}
        </tbody>
        </table>
      );
    }
  }

  export default World;
