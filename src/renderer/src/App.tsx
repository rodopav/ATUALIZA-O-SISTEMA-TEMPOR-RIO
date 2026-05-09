import * as React from 'react'
import { RouterProvider } from 'react-router-dom'
import * as Tooltip from '@radix-ui/react-tooltip'
import { router } from './router'
import { Toaster } from './components/ui/toaster'

export function App(): React.ReactElement {
  return (
    <Tooltip.Provider delayDuration={250}>
      <RouterProvider router={router} />
      <Toaster />
    </Tooltip.Provider>
  )
}
