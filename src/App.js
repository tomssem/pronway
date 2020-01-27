import React from 'react';
import './App.css';
import {World} from './World.js'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <World width={1000} height={1000} FPS={24}></World>
      </header>
    </div>
  );
}

export default App;
