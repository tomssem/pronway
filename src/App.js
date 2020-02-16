import React from 'react';
import './App.css';
import {WorldGL} from './World.js'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <WorldGL worldWidth={100} worldHeight={100} width={1000} height={1000} FPS={10}></WorldGL>
      </header>
    </div>
  );
}

export default App;
