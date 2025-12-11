import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateConvoy from "./pages/CreateConvoy";
import ConvoyHistory from "./pages/ConvoyHistory";
import ViewRoute from "./pages/ViewRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-convoy" element={<CreateConvoy />} />
        <Route path="/history" element={<ConvoyHistory />} />
        <Route path="/route/:convoyId" element={<ViewRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;