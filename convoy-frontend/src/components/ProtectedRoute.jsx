import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setIsAuthenticated(false);
                return;
            }

            try {
                // Decode token payload to check expiration
                const payloadBase64 = token.split('.')[1];
                if (!payloadBase64) {
                    throw new Error('Invalid token format');
                }

                const decodedJson = atob(payloadBase64);
                const decoded = JSON.parse(decodedJson);

                const currentTime = Date.now() / 1000;

                // If token is expired
                if (decoded.exp && decoded.exp < currentTime) {
                    console.warn("Token expired");
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('user_id');
                    setIsAuthenticated(false);
                    return;
                }

                setIsAuthenticated(true);
            } catch (e) {
                console.error("Token validation error", e);
                localStorage.removeItem('access_token');
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        // You can replace this with a nice loading spinner if you have one
        return <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white">Verifying Access...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
