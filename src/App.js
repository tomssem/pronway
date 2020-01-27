import React from 'react';
import './App.css';
import {World} from './World.js'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <World renderWidth={300} renderHeight={300} width={500} height={500} FPS={24}></World>
      </header>
    </div>
  );
}

export default App;
