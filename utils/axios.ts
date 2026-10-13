import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
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

export const setAxiosAccessToken = async (token: string | null) => {
    currentAccessToken = token;
    if (token) {
        await SecureStore.setItemAsync('accessToken', token).catch(() => {});
    } else {
        await SecureStore.deleteItemAsync('accessToken').catch(() => {});
    }
};

export let onTokenRefresh: ((token: string) => void) | null = null;
export const setOnTokenRefresh = (callback: (token: string) => void) => {
    onTokenRefresh = callback;
};

api.interceptors.request.use(
    async (config) => {
        let token = currentAccessToken;
        if (!token) {
            token = await SecureStore.getItemAsync('accessToken').catch(() => null);
            if (token) currentAccessToken = token;
        }
        if (token && !config.headers['Authorization']) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const url = originalRequest.url || '';
        if (
            url.includes('/auth/login') || 
            url.includes('/auth/verify-otp') || 
            url.includes('/auth/resend-otp') || 
            url.includes('/auth/refresh') ||
            url.includes('/driver-register/verify-otp') ||
            url.includes('/driver-register/resend-otp') ||
            url.includes('/appeals')
        ) {
            return Promise.reject(error);
        }

        if (error.response?.status === 403 && error.response?.data?.message === "Account suspended.") {
            const { Alert } = require('react-native');
            Alert.alert("Account Suspended", "Your account has been suspended by an administrator.");
            await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
            await SecureStore.deleteItemAsync('accessToken').catch(() => {});
            await setAxiosAccessToken(null);
            if (originalRequest.headers['X-Is-Background'] !== 'true') { try { router.replace('/login'); } catch(e) {} }
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (error.response?.data?.message === "Session expired due to login on another device.") {
                // Check if the foreground app just logged in and we're just using an old token in memory
                const storedAccessToken = await SecureStore.getItemAsync('accessToken').catch(() => null);
                const usedToken = originalRequest.headers['Authorization']?.replace('Bearer ', '');
                
                if (storedAccessToken && storedAccessToken !== usedToken) {
                    await setAxiosAccessToken(storedAccessToken);
                    originalRequest.headers['Authorization'] = 'Bearer ' + storedAccessToken;
                    return api(originalRequest);
                }

                const { Alert } = require('react-native');
                Alert.alert("Session Expired", "Your account has been logged in on another device.");
                await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
                await SecureStore.deleteItemAsync('accessToken').catch(() => {});
                await SecureStore.deleteItemAsync('userData').catch(() => {});
                await setAxiosAccessToken(null);
                if (originalRequest.headers['X-Is-Background'] !== 'true') { try { router.replace('/login'); } catch(e) {} }
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

            const refreshToken = await SecureStore.getItemAsync('refreshToken').catch(() => null);
            
            if (!refreshToken) {
                isRefreshing = false;
                await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
                await SecureStore.deleteItemAsync('accessToken').catch(() => {});
                await setAxiosAccessToken(null);
                if (originalRequest.headers['X-Is-Background'] !== 'true') { try { router.replace('/login'); } catch(e) {} }
                return Promise.reject(error);
            }

            try {
                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken
                }, { timeout: 15000 });

                const newAccessToken = response.data.accessToken;
                const newRefreshToken = response.data.refreshToken;

                if (newRefreshToken) {
                    await SecureStore.setItemAsync('refreshToken', newRefreshToken).catch(() => {});
                }
                if (response.data.user) {
                    await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user)).catch(() => {});
                }
                
                await setAxiosAccessToken(newAccessToken);
                if (onTokenRefresh) onTokenRefresh(newAccessToken);
                originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
                
                processQueue(null, newAccessToken);
                return api(originalRequest);
            } catch (err: any) {
                // Check if another thread refreshed it successfully
                const currentStoredToken = await SecureStore.getItemAsync('refreshToken').catch(() => null);
                if (currentStoredToken && currentStoredToken !== refreshToken) {
                    const newAccess = await SecureStore.getItemAsync('accessToken').catch(() => null);
                    if (newAccess) {
                        await setAxiosAccessToken(newAccess);
                        if (onTokenRefresh) onTokenRefresh(newAccess);
                        originalRequest.headers['Authorization'] = 'Bearer ' + newAccess;
                        processQueue(null, newAccess);
                        isRefreshing = false;
                        return api(originalRequest);
                    }
                }

                processQueue(err, null);
                await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
                await SecureStore.deleteItemAsync('accessToken').catch(() => {});
                await SecureStore.deleteItemAsync('userData').catch(() => {});
                await setAxiosAccessToken(null);

                if (err.response?.status === 401 && err.response?.data?.message === "Session expired due to login on another device.") {
                    const { Alert } = require('react-native');
                    Alert.alert("Session Expired", "Your account has been logged in on another device.");
                }

                if (originalRequest.headers['X-Is-Background'] !== 'true') { try { router.replace('/login'); } catch(e) {} }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
