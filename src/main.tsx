import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeApi } from './lib/api-init'
import { fetchFallbackEnvironment } from './lib/fallback-env'

// Initialize the fallback environment and retry once if it fails
console.log('Initializing application with fallback server environment...');

// First attempt
initializeApi()
  .then(() => {
    console.log('Application initialized, rendering React application');
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch(error => {
    console.error('First initialization attempt failed, retrying once:', error);
    
    // Second attempt after a delay
    setTimeout(() => {
      fetchFallbackEnvironment(true)
        .then(() => {
          console.log('Second initialization attempt succeeded, rendering React application');
          createRoot(document.getElementById("root")!).render(<App />);
        })
        .catch(secondError => {
          console.error('Second initialization attempt also failed, proceeding with defaults:', secondError);
          createRoot(document.getElementById("root")!).render(<App />);
        });
    }, 2000);
  });
