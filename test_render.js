import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import App from './src/App.js';

// We need to bypass CSS imports and standard setup if doing this in node.
// To avoid dealing with CSS or vite plugins, we could just render the Scene.
