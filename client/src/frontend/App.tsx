import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import Game from './Game';

function App() {
  return (
    <>
      <GlobalStyle />
      <Router>
        <Routes>
          <Route path='/:privKeyIdx' element={<Game />} />
          <Route path='/' element={<Game />} />
        </Routes>
      </Router>
    </>
  );
}

const GlobalStyle = createGlobalStyle`
body {
  color: "#ffffff";
  width: 100vw;
  min-height: 100vh;
  background-color: "#ffffff";
  overflow: hidden;
  font-family: "League Mono", monospace;
}
`;

export default App;
