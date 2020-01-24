import React from 'react'
import Table from 'react-table'
import assert from 'assert'

class Cell extends React.Component {
  constructor (props) {
    super(props);
    this.state = {alive: 0};
  }

  kill() {
    this.setState((state, props) => state.alive = 0);
  }

  bringToLife() {
    this.setState((state, props) => state.alive = 1);
  }

  isAlive() {
    return this.state.alive;
  }

  getColor() {
    return this.isAlive ? "FloralWhite" : "DarkBlue";
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
    const gridWidth = renderWidth / this.props.width;
    const gridHeight = renderHeight / this.props.height;

    this.state = {};

    this.state.population = [...Array(this.props.height)].map(
      _ => [...Array(this.props.width)].map(
        _ => {return <Cell width={gridWidth} height={gridHeight}/>}));
    console.table(this.state.population);
    console.log(this);
  }

  getPopulation() {
    return this.state.population;
  }

  clonePopulation() {
    return this.state.population.slice(0)
  }

  setPopulation(population) {
    this.setState((state, props) => {
      assert(population.length === state.population.length);
      population.forEach((row, i) => assert(row.length === state.population[i].lenght));
      state.population = population;
    });
  }

  renderRow(row) {
    return <tr> {row.map(cell => cell)} </tr>
  }

   render () {
     return (
      <table style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0}} className="worldTable">
       {this.state.population.map(this.renderRow)}
      </table>
     );
   }
}

// export class World extends React.Component {
// 
//   render () {
//     return this.state.population.map(row => {
//       return <tr>
//         row.map(element => {
//           <td>element.render()</td>
//         });
//       </tr>
//     });
//   }
// };

export default World;
