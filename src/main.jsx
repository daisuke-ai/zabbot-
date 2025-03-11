import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App'
import './utils/adminCheck.js' // Import admin utilities
import './utils/forceAdmin.js' // Import force admin utility
import './utils/databaseCheck.js' // Import database check utility

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)