import React from 'react';
import './App.css';
import {World} from './World.js'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <World worldWidth={5} worldHeight={5} width={1000} height={1000} FPS={2}></World>
      </header>
    </div>
  );
}

export default App;
