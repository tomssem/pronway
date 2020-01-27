import React from 'react';
import './App.css';
import World from './World.js'
import Rectangle from 'react-shapes'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <World width={20} height={20} FPS={4}></World>
      </header>
    </div>
  );
}

export default App;
