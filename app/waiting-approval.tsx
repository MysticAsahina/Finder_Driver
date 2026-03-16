import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Animated,
    Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, ACCENT_LIGHT } from '@/constants/theme';

export default function WaitingApprovalScreen() {
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // 3 seconds delay then go to login
        const timer = setTimeout(() => {
            router.replace('/login');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Animated.View 
                    style={[
                        styles.iconContainer, 
                        { 
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim 
                        }
                    ]}
                >
                    <View style={styles.pulseContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="time-outline" size={60} color={ACCENT} />
                        </View>
                    </View>
                </Animated.View>

                <Animated.Text style={[styles.title, { opacity: opacityAnim }]}>
                    Registration Received!
                </Animated.Text>
                
                <Animated.Text style={[styles.description, { opacity: opacityAnim }]}>
                    Please wait for admin approval of your account before you can start using FINDER Driver.
                </Animated.Text>

                <View style={styles.loaderContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View style={styles.progressFill} />
                    </View>
                    <Text style={styles.statusText}>Processing your application...</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 40,
    },
    pulseContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: ACCENT_LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: ACCENT,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 48,
    },
    loaderContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBar: {
        width: '80%',
        height: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressFill: {
        width: '60%', // Static for demo
        height: '100%',
        backgroundColor: ACCENT,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 13,
        color: '#999',
        fontWeight: '500',
    },
});
