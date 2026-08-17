import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SocketContext } from '../context/SocketContext';
import api from '@/utils/axios';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';

const ACCENT = '#FF5F00';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    time: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
}



function getTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export default function PassengerChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    const params = useLocalSearchParams<{ name?: string, rideId?: string }>();
    const passengerName = params.name || 'Passenger';
    const { socket, isConnected } = useContext(SocketContext);

    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState<string>('active');
    const [pendingMedia, setPendingMedia] = useState<{ uri: string, mediaType: 'image' | 'video', fileName: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        // @ts-ignore
        global.isRideChatActive = true;
        return () => {
            // @ts-ignore
            global.isRideChatActive = false;
        };
    }, []);

    useEffect(() => {
        if (!params.rideId) return;

        const loadMessages = async () => {
            try {
                const res = await api.get(`/driver/ride/${params.rideId}/chat`);
                if (res.data.messages) {
                    const mapped = res.data.messages.map((m: any) => ({
                        id: m.id,
                        text: m.text,
                        isUser: m.senderRole === 'driver',
                        time: m.time,
                        mediaUrl: m.mediaUrl,
                        mediaType: m.mediaType
                    }));
                    setMessages(mapped);
                }
            } catch (err: any) {
                if (err.response?.status === 400) {
                    setStatus('closed');
                }
                console.error("Failed to load messages", err);
            }
        };

        loadMessages();
    }, [params.rideId]);

    useEffect(() => {
        if (socket && isConnected) {
            socket.on('receive_ride_message', (msg) => {
                const newMsg: Message = {
                    id: msg.id,
                    text: msg.text,
                    isUser: msg.from === 'driver',
                    time: msg.time,
                    mediaUrl: msg.mediaUrl,
                    mediaType: msg.mediaType
                };
                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            });
        }
        return () => {
            socket?.off('receive_ride_message');
        };
    }, [socket, isConnected]);

    const handlePickMedia = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                quality: 0.8,
                videoMaxDuration: 60,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const mediaType = asset.type === 'video' ? 'video' : 'image';
                
                if (asset.fileSize) {
                    const sizeMB = asset.fileSize / (1024 * 1024);
                    if (mediaType === 'image' && sizeMB > 5) {
                        Alert.alert('Error', 'Image must be smaller than 5MB');
                        return;
                    }
                    if (mediaType === 'video' && sizeMB > 20) {
                        Alert.alert('Error', 'Video must be smaller than 20MB');
                        return;
                    }
                }
                
                let fileName = asset.fileName;
                if (!fileName) {
                    const ext = mediaType === 'video' ? 'mp4' : 'jpg';
                    fileName = `upload.${ext}`;
                }
                
                setPendingMedia({ uri: asset.uri, mediaType, fileName });
            }
        } catch (error) {
            console.error('Error picking media:', error);
            Alert.alert('Error', 'Failed to pick media');
        }
    };

    const sendMessage = async () => {
        if ((!inputText.trim() && !pendingMedia) || status === 'closed' || uploading) return;

        const msgId = Date.now().toString();
        const msgTime = getTime();
        
        let localMediaUrl = pendingMedia?.uri;
        let localMediaType = pendingMedia?.mediaType;
        let localFileName = pendingMedia?.fileName;

        const userMsg: Message = {
            id: msgId,
            text: inputText.trim(),
            isUser: true,
            time: msgTime,
            mediaUrl: localMediaUrl,
            mediaType: localMediaType,
        };

        setMessages((prev) => [...prev, userMsg]);
        const currentText = inputText.trim();
        setInputText('');
        setPendingMedia(null);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            let finalMediaUrl: string | undefined = undefined;
            if (localMediaUrl && localMediaType) {
                setUploading(true);
                const sigRes = await api.post('/chat/cloudinary-signature', { mediaType: localMediaType });
                const signatureData = sigRes.data;

                const formData = new FormData();
                formData.append('file', { 
                    uri: localMediaUrl, 
                    name: localFileName || (localMediaType === 'video' ? 'upload.mp4' : 'upload.jpg'), 
                    type: localMediaType === 'video' ? 'video/mp4' : 'image/jpeg' 
                } as any);
                formData.append('api_key', signatureData.apiKey);
                formData.append('timestamp', signatureData.timestamp.toString());
                formData.append('signature', signatureData.signature);
                formData.append('folder', signatureData.folder);
                if (signatureData.tags) formData.append('tags', signatureData.tags);

                const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType}/upload`, { 
                    method: 'POST', 
                    body: formData 
                });
                const uploadData = await uploadRes.json();
                if (!uploadData.secure_url) {
                     throw new Error('Upload failed');
                }
                finalMediaUrl = uploadData.secure_url;
            }

            await api.post(`/driver/ride/${params.rideId}/chat`, { 
                text: currentText || undefined, 
                time: msgTime, 
                id: msgId,
                mediaUrl: finalMediaUrl,
                mediaType: localMediaType
            });
            
            if (finalMediaUrl) {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, mediaUrl: finalMediaUrl } : m));
            }
        } catch (err: any) {
            console.error('Failed to send message:', err);
            Alert.alert('Error', 'Failed to send message');
            setMessages(prev => prev.filter(m => m.id !== msgId));
            if (err.response?.status === 400) {
                setStatus('closed');
            }
        } finally {
            setUploading(false);
        }
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
                <Text style={styles.headerTitle}>{passengerName}</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        activeOpacity={0.6}
                        onPress={() => router.push({ pathname: '/passenger-call', params: { name: passengerName, isVideo: 'false' } })}
                    >
                        <Ionicons name="call" size={22} color={ACCENT} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        activeOpacity={0.6}
                        onPress={() => router.push({ pathname: '/passenger-call', params: { name: passengerName, isVideo: 'true' } })}
                    >
                        <Ionicons name="videocam" size={26} color={ACCENT} />
                    </TouchableOpacity>
                </View>
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
                    {/* Passenger card */}
                    <View style={styles.passengerCard}>
                        <View style={styles.passengerAvatar}>
                            <Ionicons name="person" size={24} color={ACCENT} />
                        </View>
                        <View>
                            <Text style={styles.passengerName}>{passengerName}</Text>
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
                                    msg.isUser ? styles.userBubble : styles.passengerBubble,
                                ]}
                            >
                                {msg.mediaUrl && msg.mediaType === 'image' && (
                                    <TouchableOpacity onPress={() => setPreviewImage(msg.mediaUrl as string)}>
                                        <Image 
                                            source={{ uri: msg.mediaUrl }} 
                                            style={{ width: 200, height: 200, borderRadius: 12, marginTop: msg.text ? 8 : 0 }} 
                                            resizeMode='cover' 
                                        />
                                    </TouchableOpacity>
                                )}
                                {msg.mediaUrl && msg.mediaType === 'video' && (
                                    <VideoBubble mediaUrl={msg.mediaUrl} marginBottom={msg.text ? 8 : 0} />
                                )}
                                {!!msg.text && (
                                    <Text
                                        style={[
                                            styles.messageText,
                                            msg.isUser && styles.userMessageText,
                                        ]}
                                    >
                                        {msg.text}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.messageTime, msg.isUser && styles.userTime]}>
                                {msg.time}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Input bar */}
                {status === 'closed' ? (
                    <View style={[styles.inputBar, { justifyContent: 'center', paddingVertical: 20 }]}>
                        <Text style={{ color: '#888', fontStyle: 'italic' }}>Chat is closed for this ride.</Text>
                    </View>
                ) : (
                    <View style={[styles.inputBarWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                        {pendingMedia && (
                            <View style={styles.previewContainer}>
                                {pendingMedia.mediaType === 'image' ? (
                                    <Image source={{ uri: pendingMedia.uri }} style={styles.previewThumb} />
                                ) : (
                                    <View style={styles.previewVideoThumb}>
                                        <Ionicons name="videocam" size={20} color="#fff" />
                                        <Text style={styles.previewVideoText} numberOfLines={1}>
                                            {pendingMedia.fileName}
                                        </Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setPendingMedia(null)}>
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.inputBar}>
                            <TouchableOpacity style={styles.plusBtn} onPress={handlePickMedia} activeOpacity={0.7} disabled={uploading}>
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
                                editable={!uploading}
                            />
                            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.7} disabled={uploading}>
                                {uploading ? <ActivityIndicator size="small" color={ACCENT} /> : <Ionicons name="send" size={20} color={ACCENT} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Full-screen Image Preview Modal */}
            <Modal visible={!!previewImage} transparent animationType='fade'>
                <View style={styles.modalBackground}>
                    <TouchableOpacity 
                        style={styles.closePreviewBtn} 
                        onPress={() => setPreviewImage(null)}
                    >
                        <Ionicons name='close' size={30} color='#fff' />
                    </TouchableOpacity>
                    {previewImage && (
                        <Image source={{ uri: previewImage }} style={styles.fullScreenImage} resizeMode='contain' />
                    )}
                </View>
            </Modal>
        </View>
    );
}

function VideoBubble({ mediaUrl, marginBottom }: { mediaUrl: string, marginBottom: number }) {
    const player = useVideoPlayer(mediaUrl, player => {
        player.loop = false;
    });
    return (
        <VideoView
            style={{ width: 220, height: 160, borderRadius: 12, marginBottom }}
            player={player}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
        />
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionIcon: {
        padding: 4,
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    passengerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFD0B0',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 16,
        gap: 12,
        backgroundColor: '#FFF3EC',
    },
    passengerAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#FFD0B0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    passengerName: {
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
    passengerBubble: {
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
    inputBarWrapper: {
        backgroundColor: '#fff',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
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
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    previewThumb: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    previewVideoThumb: {
        width: 100,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        padding: 4,
        gap: 4,
    },
    previewVideoText: {
        color: '#fff',
        fontSize: 10,
        flex: 1,
    },
    removeMediaBtn: {
        position: 'absolute',
        top: 2,
        left: 65,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 2,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closePreviewBtn: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
    },
    fullScreenImage: {
        width: '90%',
        height: '80%',
    },
});
