// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'
// import { BrowserRouter } from 'react-router-dom'
// import {Provider} from "react-redux"
// import { store } from './redux/store.js'
// export const serverUrl="http://localhost:8000"

// ReactDOM.createRoot(document.getElementById('root')).render(
// <Provider store={store}>
// <BrowserRouter>
//       <App />
//      </BrowserRouter>
//       </Provider> 
// )

// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'
// import { BrowserRouter } from 'react-router-dom'
// import { Provider } from "react-redux"
// import { store } from './redux/store.js'

// export const serverUrl = "http://localhost:8000"   

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <Provider store={store}>
//     <BrowserRouter>
//       <App />
//     </BrowserRouter>
//   </Provider>
// )

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from "react-redux";
import { store } from './redux/store.js';

export const serverUrl = "http://localhost:8000";

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);


