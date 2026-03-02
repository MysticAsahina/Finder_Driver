import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;

export default function TermsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ tab?: string }>();
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(
        params.tab === 'privacy' ? 'privacy' : 'terms'
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <View style={styles.closeCircle}>
                    <Text style={styles.closeIcon}>✕</Text>
                </View>
            </TouchableOpacity>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
                    onPress={() => setActiveTab('terms')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                        Terms of Service
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
                    onPress={() => setActiveTab('privacy')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                        Privacy Policy
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
            </ScrollView>
        </SafeAreaView>
    );
}

function TermsOfService() {
    return (
        <View>
            <Paragraph>
                FINDER is a digital tricycle booking and management system developed by MV Gallego TODA. The
                system facilitates ride requests, driver coordination, and administrative monitoring to
                improve local transport operations.
            </Paragraph>
            <Paragraph>
                The system is intended for registered passengers, authorized TODA drivers, and approved
                administrators. Users are required to provide accurate, truthful, and up-to-date information
                in compliance with system policies and applicable laws.
            </Paragraph>
            <Paragraph>By using the FINDER system, users agree to:</Paragraph>
            <BulletList
                items={[
                    'Use the system only for lawful and transport-related purposes',
                    'Provide correct and complete personal information',
                    'Respect other users and TODA officials',
                    'Avoid misuse, abuse, or activities that compromise system integrity',
                ]}
            />
            <Paragraph>
                FINDER functions as a coordination and booking platform. Ride availability depends on driver
                participation and operational conditions. The system does not guarantee uninterrupted access
                and may experience downtime due to maintenance or technical limitations.
            </Paragraph>
            <Paragraph>
                Accounts may be restricted or disabled in cases of policy violations, misuse of the system,
                or actions that compromise data security and user safety.
            </Paragraph>
            <Paragraph>
                The Terms of Service may be updated to ensure system improvement and compliance with
                applicable laws, including data protection regulations.
            </Paragraph>
        </View>
    );
}

function PrivacyPolicy() {
    return (
        <View>
            <Paragraph>
                This Privacy Policy is governed by the Data Privacy Act of 2012 (RA 10173) and its
                Implementing Rules and Regulations.
            </Paragraph>
            <Paragraph>
                The FINDER system collects only data necessary for system operation, including:
            </Paragraph>
            <BulletList
                items={[
                    'Personal information such as name, mobile number, and optional email address',
                    'Booking and trip-related information',
                    'Location data during active bookings',
                    'System usage data for evaluation and improvement',
                ]}
            />
            <Paragraph>
                Personal data are collected in accordance with the principles of transparency, legitimate
                purpose, and proportionality, as provided under RA 10173. Users are informed of the purpose
                of data collection, and only data relevant to system functions are processed.
            </Paragraph>
            <Paragraph>Collected data are used solely to:</Paragraph>
            <BulletList
                items={[
                    'Match passengers with drivers',
                    'Enable and log trip time computation',
                    'Monitor system performance and support academic evaluation',
                    'Process and manage tricycle bookings',
                ]}
            />
            <Paragraph>
                Personal data are stored in secured digital databases with restricted access. Reasonable
                organizational, physical, and technical security measures are implemented to protect data
                against unauthorized access, alteration, loss, or disclosure, in compliance with RA 10173.
            </Paragraph>
            <Paragraph>
                User data are not sold, shared, or disclosed to third parties. Information is used strictly
                for system operation, TODA administration, and academic research purposes, unless disclosure
                is required by law.
            </Paragraph>
            <Paragraph>
                In accordance with RA 10173, users have the right to:
            </Paragraph>
            <BulletList
                items={[
                    'Be informed about data collection and processing',
                    'Access their personal data',
                    'Request correction of inaccurate or outdated information',
                    'Withdraw consent and discontinue system use, subject to system limitations',
                ]}
            />
            <Paragraph>
                Personal data are retained only for as long as necessary to fulfill system functions and
                research objectives. Data are securely archived or disposed of when no longer required.
            </Paragraph>
        </View>
    );
}

function Paragraph({ children }: { children: React.ReactNode }) {
    return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
    return (
        <View style={styles.bulletList}>
            {items.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                </View>
            ))}
        </View>
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
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e8e8e8',
        marginBottom: 4,
    },
    tab: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginRight: 24,
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: ACCENT,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#aaa',
    },
    activeTabText: {
        color: ACCENT,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    paragraph: {
        fontSize: 13.5,
        color: '#333',
        lineHeight: 21,
        marginBottom: 14,
        textAlign: 'justify',
    },
    bulletList: {
        marginBottom: 14,
        paddingLeft: 4,
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingRight: 8,
    },
    bullet: {
        fontSize: 13.5,
        color: '#333',
        marginRight: 8,
        lineHeight: 21,
    },
    bulletText: {
        flex: 1,
        fontSize: 13.5,
        color: '#333',
        lineHeight: 21,
    },
});
