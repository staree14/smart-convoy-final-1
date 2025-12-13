import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateConvoy from "./pages/CreateConvoy";
import ConvoyHistory from "./pages/ConvoyHistory";
import ViewRoute from "./pages/ViewRoute";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/create-convoy" element={
          <ProtectedRoute>
            <CreateConvoy />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <ConvoyHistory />
          </ProtectedRoute>
        } />
        <Route path="/route/:convoyId" element={
          <ProtectedRoute>
            <ViewRoute />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;