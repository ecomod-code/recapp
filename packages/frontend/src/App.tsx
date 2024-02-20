import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Login />,
	},
	{
		path: "/Dashboard",
		element: <Dashboard />,
	},
]);

function App() {
	return <RouterProvider router={router} />;
}

export default App;
