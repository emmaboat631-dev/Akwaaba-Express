import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { relay } from './services/relay'

// Open the LAN sync socket on every device as soon as the app loads, so a
// driver going online and a passenger booking are shared without waiting for a
// particular screen to subscribe. No-op if the relay isn't reachable.
relay.ensure()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
