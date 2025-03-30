import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeApi } from './lib/api-init'

// Initialize the API environment from fallback server
initializeApi().then(() => {
  console.log('Application initialized, rendering React application');
  createRoot(document.getElementById("root")!).render(<App />);
}).catch(error => {
  console.error('Failed to initialize application, proceeding with defaults:', error);
  createRoot(document.getElementById("root")!).render(<App />);
});
