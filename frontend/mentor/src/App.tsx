import { RouterProvider } from 'react-router'
import { mentorRouter } from './app/router.tsx'

function App() {
  return <RouterProvider router={mentorRouter} />
}

export default App
