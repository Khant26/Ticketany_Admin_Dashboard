import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { showError, showSessionExpired } from "../utils/toastNotification";

const AuthContext = createContext();

const AuthContextProvider = ({ children}) => {
    let [user, setUser] = useState(null);
    let [loading, setLoading] = useState(false);

    let getUser = async (token) => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';
            let res = await axios.get(`${API_BASE}user/profile/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (res.status === 200) {
                setUser(res.data);
                return res.data;
            }
        } catch (error) {
            // Handle authentication errors
            if (error.response?.status === 401) {
                console.log('Unauthenticated - invalid token');
                localStorage.removeItem("access_token");
                localStorage.removeItem("user_data");
                setUser(null);
                showSessionExpired();
            } else {
                console.error('Error fetching user:', error);
                if (error.response?.status >= 500) {
                    showError("Server error. Please try again later.");
                }
            }
        }
    }

    let login = async (credentials) => {
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';
            const response = await axios.post(`${API_BASE}auth/login/`, {
                email: credentials.email,
                password: credentials.password
            });
            
            if (response.status === 200 && (response.data.access_token || response.data.token || response.data.access)) {
                const token = response.data.access_token || response.data.token || response.data.access;
                localStorage.setItem('access_token', token);
                localStorage.setItem('user_data', JSON.stringify(response.data));
                setUser(response.data);
                return { success: true, data: response.data };
            } else {
                return { success: false, error: 'Login failed. Please check your credentials.' };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || error.response?.data?.detail || 'Login failed. Please try again.' 
            };
        } finally {
            setLoading(false);
        }
    }

    let logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_data");
        setUser(null);
        showSessionExpired();
    }

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const userData = localStorage.getItem('user_data');
        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Error parsing user data:', error);
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_data');
            }
        }
    }, [])

    console.log(user)

    return (
        <AuthContext.Provider value={{ user, getUser, login, logout, loading }}>{children}</AuthContext.Provider>
    )
}

export { AuthContext, AuthContextProvider }