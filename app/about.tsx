import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const ACCENT = '#FF5F00';

export default function AboutScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <View style={styles.closeCircle}>
                    <Text style={styles.closeIcon}>✕</Text>
                </View>
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>About FINDER</Text>

                <Text style={styles.paragraph}>
                    FINDER is a digital tricycle booking and management application designed to connect
                    passengers, drivers, and transport operators in one platform. The app allows passengers to
                    request rides, enables drivers to manage trip bookings, and provides administrators with
                    tools for monitoring operations.
                </Text>

                <Text style={styles.paragraph}>
                    FINDER aims to improve convenience, efficiency, and coordination within local tricycle
                    transportation services by using modern mobile and web technologies.
                </Text>

                <Text style={styles.version}>
                    <Text style={styles.versionBold}>Version</Text>: 1.0
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    closeBtn: {
        padding: 16,
        alignSelf: 'flex-start',
    },
    closeCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 18,
    },
    paragraph: {
        fontSize: 13.5,
        color: '#333',
        lineHeight: 21,
        marginBottom: 14,
        textAlign: 'justify',
    },
    version: {
        fontSize: 13.5,
        color: '#333',
        marginTop: 4,
    },
    versionBold: {
        fontWeight: '700',
    },
});
