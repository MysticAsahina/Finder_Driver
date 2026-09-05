import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request interceptor to attach access token if we have it in memory or store (we don't store it, AuthContext holds it).
// So wait, how does `api.ts` get the access token? We need to export a setter or use AuthContext directly.
// Actually, `AuthContext` holds `accessToken` in state. If we pass `api` into `AuthContext`, we can intercept requests.
// A better pattern: The request interceptor shouldn't fetch from SecureStore for access token because we don't store access token in SecureStore.
// Let's rely on components passing `Authorization: Bearer ...` directly, or we can expose a `setAxiosAccessToken` method.

// For now, let's just make it handle the response interceptor (the 401 retry logic).
// When it retries, it updates the originalRequest.headers['Authorization'].
// We can also have an interceptor to inject the token if we export a global variable here.

let currentAccessToken: string | null = null;

export const setAxiosAccessToken = (token: string | null) => {
    currentAccessToken = token;
};

api.interceptors.request.use(
    (config) => {
        if (currentAccessToken && !config.headers['Authorization']) {
            config.headers['Authorization'] = 'Bearer ' + currentAccessToken;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh logic for login/otp endpoints
        const url = originalRequest.url || '';
        if (
            url.includes('/auth/login') || 
            url.includes('/auth/verify-otp') || 
            url.includes('/auth/resend-otp') || 
            url.includes('/auth/refresh') ||
            url.includes('/driver-register/verify-otp') ||
            url.includes('/driver-register/resend-otp')
        ) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (error.response?.data?.message === "Session expired due to login on another device.") {
                const { Alert } = require('react-native');
                Alert.alert("Session Expired", "Your account has been logged in on another device.");
                await SecureStore.deleteItemAsync('refreshToken');
                setAxiosAccessToken(null);
                router.replace('/login');
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            
            if (!refreshToken) {
                isRefreshing = false;
                await SecureStore.deleteItemAsync('refreshToken');
                setAxiosAccessToken(null);
                router.replace('/login');
                return Promise.reject(error);
            }

            try {
                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken
                });

                const newAccessToken = response.data.accessToken;
                const newRefreshToken = response.data.refreshToken;

                if (newRefreshToken) {
                    await SecureStore.setItemAsync('refreshToken', newRefreshToken);
                }
                
                setAxiosAccessToken(newAccessToken);
                originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
                
                processQueue(null, newAccessToken);
                return api(originalRequest);
            } catch (err: any) {
                processQueue(err, null);
                await SecureStore.deleteItemAsync('refreshToken');
                setAxiosAccessToken(null);

                if (err.response?.status === 401 && err.response?.data?.message === "Session expired due to login on another device.") {
                    const { Alert } = require('react-native');
                    Alert.alert("Session Expired", "Your account has been logged in on another device.");
                }

                router.replace('/login');
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
