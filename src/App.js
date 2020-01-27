import React from 'react';
import './App.css';
import {World} from './World.js'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <World renderHeight={1000} width={1000} height={1000} FPS={30}></World>
      </header>
    </div>
  );
}

export default App;
