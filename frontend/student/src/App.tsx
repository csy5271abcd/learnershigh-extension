import { RouterProvider } from 'react-router'
import { studentRouter } from './app/router.tsx'

function App() {
  return <RouterProvider router={studentRouter} />
}

export default App
