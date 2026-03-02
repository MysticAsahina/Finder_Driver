import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

const ACCENT = Colors.light.tint;

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
}

const AUTO_REPLIES = [
    "Thank you for reaching out! We're looking into your concern.",
    'Could you provide more details so we can assist you better?',
    'We understand your concern. Our team is working on it.',
    'Your issue has been noted. A support agent will follow up shortly.',
    "Thank you for your patience. We'll get back to you soon!",
    'Is there anything else we can help you with?',
    "We appreciate your feedback! It helps us improve FINDER.",
    "Rest assured, we're here to help you with any issues.",
];

function getTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export default function SupportChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    const [inputText, setInputText] = useState('');
    const [replyIndex, setReplyIndex] = useState(0);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hi there! Welcome to Finder Customer Support. How can we help you today?',
            isUser: false,
            time: getTime(),
        },
    ]);

    const sendMessage = () => {
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            isUser: true,
            time: getTime(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');

        const replyText = AUTO_REPLIES[replyIndex % AUTO_REPLIES.length];
        setReplyIndex((prev) => prev + 1);

        setTimeout(() => {
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: replyText,
                isUser: false,
                time: getTime(),
            };
            setMessages((prev) => [...prev, botMsg]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }, 1200);

        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <View style={styles.backCircle}>
                        <Ionicons name="chevron-back" size={20} color="#555" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Customer Support</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* KeyboardAvoidingView wraps ONLY the chat body + input */}
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.chatArea}
                    contentContainerStyle={[
                        styles.chatContent,
                        { paddingBottom: insets.bottom + 8 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() =>
                        scrollRef.current?.scrollToEnd({ animated: true })
                    }
                >
                    {/* Agent card */}
                    <View style={styles.agentCard}>
                        <View style={styles.agentIcon}>
                            <Ionicons name="headset" size={26} color={ACCENT} />
                        </View>
                        <View>
                            <Text style={styles.agentName}>Finder Customer Support</Text>
                            <View style={styles.statusRow}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.statusText}>Online now</Text>
                            </View>
                        </View>
                    </View>

                    {/* Messages */}
                    {messages.map((msg) => (
                        <View
                            key={msg.id}
                            style={[
                                styles.messageBubbleWrap,
                                msg.isUser && styles.userBubbleWrap,
                            ]}
                        >
                            <View
                                style={[
                                    styles.messageBubble,
                                    msg.isUser ? styles.userBubble : styles.botBubble,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        msg.isUser && styles.userMessageText,
                                    ]}
                                >
                                    {msg.text}
                                </Text>
                            </View>
                            <Text style={[styles.messageTime, msg.isUser && styles.userTime]}>
                                {msg.time}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Input bar */}
                <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                    <TouchableOpacity style={styles.plusBtn} activeOpacity={0.7}>
                        <Ionicons name="add" size={24} color={ACCENT} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Write a message..."
                        placeholderTextColor="#bbb"
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.7}>
                        <Ionicons name="send" size={20} color={ACCENT} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    backCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT,
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    agentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ffe0c0',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 16,
        gap: 12,
        backgroundColor: '#fff8f2',
    },
    agentIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#ffe8d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4caf50',
    },
    statusText: {
        fontSize: 12,
        color: '#4caf50',
        fontWeight: '500',
    },
    messageBubbleWrap: {
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    userBubbleWrap: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '80%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    botBubble: {
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: ACCENT,
        borderTopRightRadius: 4,
    },
    messageText: {
        fontSize: 13.5,
        color: '#333',
        lineHeight: 20,
    },
    userMessageText: {
        color: '#fff',
    },
    messageTime: {
        fontSize: 11,
        color: '#bbb',
        marginTop: 4,
        paddingLeft: 4,
    },
    userTime: {
        paddingRight: 4,
        paddingLeft: 0,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
        backgroundColor: '#fff',
    },
    plusBtn: {
        padding: 4,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 50,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 14,
        color: '#333',
    },
    sendBtn: {
        padding: 6,
    },
});
