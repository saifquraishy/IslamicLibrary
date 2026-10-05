import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { initAnalytics } from './lib/analytics';
import './index.css';
import './stage2.css';
initAnalytics();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><App /></HashRouter></React.StrictMode>);
