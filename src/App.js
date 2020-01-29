import React from 'react';
import './App.css';
import {OpenGL} from './World.js'

function App() {
  return (
    <div style={{overflow: "hidden"}} className="App">
      <header className="App-header">
        <OpenGL></OpenGL>
      </header>
    </div>
  );
}

export default App;
