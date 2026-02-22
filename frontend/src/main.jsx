import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e94560' },
    background: { default: '#0f0f1a', paper: '#1a1a2e' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#fff',
          '&:hover': { backgroundColor: 'rgba(233,69,96,0.1)' },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: 'rgba(255,255,255,0.5)' },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
