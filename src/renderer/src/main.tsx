import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/source-sans-3/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConfigGate } from './components/ConfigGate'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    },
  },
})

const container = document.getElementById('root')
if (!container) {
  throw new Error('Elemento #root não encontrado em index.html.')
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigGate>
          <App />
        </ConfigGate>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
