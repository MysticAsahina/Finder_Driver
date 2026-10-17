import { Colors } from '@/constants/theme';
import { AuthContext } from '@/context/AuthContext';
import { SocketContext } from '@/context/SocketContext';
import { getAppealToken } from '@/store/authStore';
import api from '@/utils/axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';

const ACCENT = Colors.light.tint;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Message = {
    _id: string;
    ticketId: string;
    senderId: string;
    senderRole: 'passenger' | 'driver' | 'admin';
    body?: string;
    createdAt: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
};

export default function SupportChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { accessToken } = useContext(AuthContext);
    const { socket: sharedSocket } = useContext(SocketContext);
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [ticket, setTicket] = useState<any>(null);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>((params.ticketId as string) || null);
    const [isResolved, setIsResolved] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const listRef = useRef<FlatList>(null);
    const [pendingMedia, setPendingMedia] = useState<{ uri: string, mediaType: 'image' | 'video', fileName: string, base64?: string | null } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const isAppeal = params.isAppeal === 'true';
    const token = accessToken || getAppealToken();

    const loadAppealChat = useCallback(async () => {
        if (!token) return;
        try {
            const appealRes = await api.get('/appeals/my-appeal', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const appData = appealRes.data?.appeal;
            if (appData) {
                const loadedMsgs: Message[] = [];
                if (appData.reason) {
                    loadedMsgs.push({
                        _id: 'initial-' + (appData._id || '0'),
                        ticketId: appData._id || 'appeal',
                        senderId: appData.userId || '',
                        senderRole: 'driver',
                        body: appData.reason,
                        createdAt: appData.createdAt || new Date().toISOString(),
                        mediaUrl: appData.proofMedia || undefined,
                        mediaType: appData.proofMedia ? 'image' : undefined,
                    });
                }
                if (Array.isArray(appData.messages)) {
                    appData.messages.forEach((m: any, idx: number) => {
                        const isAdmin = m.senderRole === 'admin';
                        loadedMsgs.push({
                            _id: m._id || `msg-${idx}-${m.createdAt || Date.now()}`,
                            ticketId: appData._id || 'appeal',
                            senderId: m.senderId || '',
                            senderRole: isAdmin ? 'admin' : 'driver',
                            body: m.body,
                            createdAt: m.createdAt || new Date().toISOString(),
                            mediaUrl: m.mediaUrl,
                            mediaType: m.mediaType,
                        });
                    });
                }
                setMsgs(loadedMsgs);
                setIsResolved(appData.status !== 'pending');
            }
        } catch (e) {
            console.error("Failed to load appeal", e);
        }
    }, [token]);

    const ensureTicket = async () => {
        if (isAppeal) return ticketId || 'appeal';
        try {
            if (!ticketId) {
                const ticketsRes = await api.get('/support/tickets');
                const ticketsData = ticketsRes.data;
                const openTicket = ticketsData.tickets?.find(
                    (t: any) => t.status === 'open' || t.status === 'in_progress'
                );

                let activeTicketId = null;
                if (openTicket) {
                    activeTicketId = openTicket._id;
                } else {
                    const createRes = await api.post('/support/tickets', { subject: 'General Support' });
                    activeTicketId = createRes.data.ticket._id;
                }
                setTicketId(activeTicketId);
                return activeTicketId;
            }
            return ticketId;
        } catch (err) {
            console.error('Failed to ensure ticket', err);
            return null;
        }
    };

    // Appeal chat socket lifecycle
    useEffect(() => {
        if (!isAppeal || !token) return;

        let isMounted = true;
        loadAppealChat();

        const appealSocket = io(API_URL, {
            auth: { token },
            transports: ['websocket'],
        });
        socketRef.current = appealSocket;

        appealSocket.on('connect', () => {
            if (!isMounted) return;
            if (ticketId) {
                appealSocket.emit('join_ticket', { ticketId });
                appealSocket.emit('join_appeal', { appealId: ticketId });
            }
        });

        appealSocket.on('receive_message', () => {
            if (isMounted) loadAppealChat();
        });
        appealSocket.on('appeal_message', () => {
            if (isMounted) loadAppealChat();
        });
        appealSocket.on('appeal_updated', () => {
            if (isMounted) loadAppealChat();
        });
        appealSocket.on('appeal_resolved', () => {
            if (isMounted) {
                setIsResolved(true);
                loadAppealChat();
            }
        });

        // Poll every 2.5s while chat is open so admin replies are received in real time
        const pollInterval = setInterval(() => {
            if (isMounted) loadAppealChat();
        }, 2500);

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                if (isMounted) loadAppealChat();
                if (appealSocket && !appealSocket.connected) {
                    appealSocket.connect();
                }
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (appealSocket && appealSocket.connected) {
                    appealSocket.disconnect();
                }
            }
        });

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
            subscription.remove();
            appealSocket.disconnect();
            if (socketRef.current === appealSocket) {
                socketRef.current = null;
            }
        };
    }, [isAppeal, token, ticketId, loadAppealChat]);

    // Regular support ticket message history loader
    useEffect(() => {
        if (isAppeal) return;

        let isMounted = true;

        async function initTicketAndHistory() {
            const activeTicketId = await ensureTicket();
            if (!activeTicketId || !isMounted) return;

            try {
                const msgsRes = await api.get(`/support/tickets/${activeTicketId}/messages`);
                if (!isMounted) return;
                const msgsData = msgsRes.data;
                setMsgs(msgsData.messages || []);
                setIsResolved(msgsData.status === 'resolved');
                if (msgsData.ticket) {
                    setTicket(msgsData.ticket);
                }
            } catch (err) {
                console.error("Failed to load ticket messages:", err);
            }
        }

        initTicketAndHistory();

        return () => {
            isMounted = false;
        };
    }, [isAppeal, ticketId]);

    // Regular support ticket live room events using sharedSocket
    useEffect(() => {
        if (isAppeal || !ticketId || !sharedSocket) return;

        socketRef.current = sharedSocket;

        const handleReceiveMessage = (newMsg: Message) => {
            setMsgs(prev => {
                if (prev.some(m => m._id === newMsg._id)) return prev;
                const isOwnOptimistic = prev.some(m => 
                    m.body === newMsg.body && 
                    m.senderRole === newMsg.senderRole && 
                    m._id.length < 24
                );
                if (isOwnOptimistic) return prev;
                return [...prev, newMsg];
            });
        };

        const handleTicketResolved = () => {
            setIsResolved(true);
        };

        const joinRoom = () => {
            sharedSocket.emit('join_ticket', { ticketId });
        };

        if (sharedSocket.connected) {
            joinRoom();
        }

        sharedSocket.on('connect', joinRoom);
        sharedSocket.on('receive_message', handleReceiveMessage);
        sharedSocket.on('ticket_resolved', handleTicketResolved);

        return () => {
            sharedSocket.off('connect', joinRoom);
            sharedSocket.off('receive_message', handleReceiveMessage);
            sharedSocket.off('ticket_resolved', handleTicketResolved);
            sharedSocket.emit('leave_ticket', { ticketId });
            if (socketRef.current === sharedSocket) {
                socketRef.current = null;
            }
        };
    }, [isAppeal, ticketId, sharedSocket]);

    useEffect(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, [msgs]);

    const processMediaResult = (result: ImagePicker.ImagePickerResult) => {
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
            
            setPendingMedia({ uri: asset.uri, mediaType, fileName, base64: asset.base64 });
        }
    };

    const handlePickMedia = () => {
        Alert.alert(
            "Attach Media",
            "Choose a media source",
            [
                {
                    text: "Camera",
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
                                return;
                            }
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ['images', 'videos'],
                                quality: 0.8,
                                videoMaxDuration: 60,
                                base64: true,
                            });
                            processMediaResult(result);
                        } catch (error) {
                            console.error('Error opening camera:', error);
                            Alert.alert('Error', 'Failed to open camera');
                        }
                    }
                },
                {
                    text: "Gallery",
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images', 'videos'],
                                quality: 0.8,
                                videoMaxDuration: 60,
                                base64: true,
                            });
                            processMediaResult(result);
                        } catch (error) {
                            console.error('Error opening gallery:', error);
                            Alert.alert('Error', 'Failed to open gallery');
                        }
                    }
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    const send = async () => {
        const text = input.trim();
        if ((!text && !pendingMedia) || sending || uploading) return;

        let activeTicketId: string | null = null;
        if (isAppeal) {
            activeTicketId = ticketId || 'appeal';
        } else {
            activeTicketId = await ensureTicket();
            if (!activeTicketId) return;
        }

        setSending(true);
        setInput('');
        
        let localMediaUrl = pendingMedia?.uri;
        let localMediaType = pendingMedia?.mediaType;
        let localFileName = pendingMedia?.fileName;
        let localBase64 = pendingMedia?.base64;
        
        setPendingMedia(null);

        const optimisticMsg: Message = {
            _id: Date.now().toString(),
            ticketId: activeTicketId,
            senderId: '',
            senderRole: 'driver',
            body: text || undefined,
            createdAt: new Date().toISOString(),
            mediaUrl: localMediaUrl,
            mediaType: localMediaType,
        };
        setMsgs(prev => [...prev, optimisticMsg]);

        try {
            let finalMediaUrl: string | undefined = undefined;
            if (localMediaUrl && localMediaType) {
                setUploading(true);
                const sigRes = await api.post(
                    '/chat/cloudinary-signature',
                    { mediaType: localMediaType },
                    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                );
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
                if (uploadData.secure_url) {
                    finalMediaUrl = uploadData.secure_url;
                }
            }

            if (isAppeal) {
                const res = await api.post('/appeals/my-appeal/messages', {
                    body: text || undefined,
                    mediaUrl: finalMediaUrl,
                    mediaType: localMediaType,
                    imageBase64: (!finalMediaUrl && localBase64) ? `data:image/jpeg;base64,${localBase64}` : undefined,
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data;
                if (data?.message) {
                    const serverMsg: Message = {
                        _id: data.message._id || optimisticMsg._id,
                        ticketId: data.message.ticketId || ticketId || 'appeal',
                        senderId: data.message.senderId || '',
                        senderRole: 'driver',
                        body: data.message.body || text,
                        createdAt: data.message.createdAt || new Date().toISOString(),
                        mediaUrl: data.message.mediaUrl || finalMediaUrl || optimisticMsg.mediaUrl,
                        mediaType: data.message.mediaType || localMediaType || optimisticMsg.mediaType,
                    };
                    setMsgs(prev => {
                        if (prev.some(m => m._id === data.message._id)) {
                            return prev.filter(m => m._id !== optimisticMsg._id);
                        }
                        return prev.map(m => m._id === optimisticMsg._id ? serverMsg : m);
                    });
                }
                loadAppealChat();
                return;
            }

            const res = await api.post(`/support/tickets/${activeTicketId}/messages`, { 
                body: text || undefined,
                mediaUrl: finalMediaUrl,
                mediaType: localMediaType
            });
            const data = res.data;
            setMsgs(prev => {
                if (prev.some(m => m._id === data.message._id)) {
                    return prev.filter(m => m._id !== optimisticMsg._id);
                }
                return prev.map(m => m._id === optimisticMsg._id ? data.message : m);
            });
        } catch (err) {
            console.error('Failed to send message:', err);
            Alert.alert('Error', 'Failed to send message');
            setMsgs(prev => prev.filter(m => m._id !== optimisticMsg._id));
        } finally {
            setSending(false);
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
                <Text style={styles.headerTitle}>Customer Support</Text>
                <View style={{ width: 38 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={listRef}
                    data={msgs}
                    keyExtractor={m => m._id}
                    renderItem={({ item }) => (
                        <View style={[styles.messageBubbleWrap, item.senderRole === 'driver' && styles.userBubbleWrap]}>
                            <View style={[styles.messageBubble, item.senderRole === 'driver' ? styles.userBubble : styles.botBubble]}>
                                {item.mediaUrl && item.mediaType === 'image' && (
                                    <TouchableOpacity onPress={() => setPreviewImage(item.mediaUrl as string)}>
                                        <Image 
                                            source={{ uri: item.mediaUrl }} 
                                            style={{ width: 200, height: 200, borderRadius: 12, marginTop: item.body ? 8 : 0 }} 
                                            resizeMode='cover' 
                                        />
                                    </TouchableOpacity>
                                )}
                                {item.mediaUrl && item.mediaType === 'video' && (
                                    <VideoBubble mediaUrl={item.mediaUrl} marginBottom={item.body ? 8 : 0} />
                                )}
                                {!!item.body && (
                                    <Text style={[styles.messageText, item.senderRole === 'driver' && styles.userMessageText]}>
                                        {item.body}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.messageTime, item.senderRole === 'driver' && styles.userTime]}>
                                {new Date(item.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </Text>
                        </View>
                    )}
                    contentContainerStyle={[styles.chatContent, { paddingBottom: insets.bottom + 8 }]}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                    ListHeaderComponent={
                        <View style={{ marginBottom: 16 }}>
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
                            {ticket?.rideId && typeof ticket.rideId === 'object' && (
                                <View style={styles.tripBanner}>
                                    <View style={styles.tripBannerHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={styles.tripBadge}>
                                                <Text style={styles.tripBadgeTxt}>TRIP #{((ticket.rideId._id || ticket.rideId).toString()).slice(-6).toUpperCase()}</Text>
                                            </View>
                                            <Text style={styles.tripStatusTxt}>{(ticket.rideId.status || 'Trip').toUpperCase()}</Text>
                                        </View>
                                        <Text style={styles.tripFareTxt}>₱{Number(ticket.rideId.fare || 0).toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.tripRouteWrap}>
                                        <View style={styles.tripDot} />
                                        <Text style={styles.tripRouteTxt} numberOfLines={1}>{ticket.rideId.pickup?.address || 'Pickup'}</Text>
                                    </View>
                                    <View style={[styles.tripRouteWrap, { marginTop: 4 }]}>
                                        <View style={[styles.tripDot, { backgroundColor: ACCENT }]} />
                                        <Text style={styles.tripRouteTxt} numberOfLines={1}>{ticket.rideId.dropoff?.address || 'Dropoff'}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    }
                    ListFooterComponent={<View style={{ paddingBottom: 10 }} />}
                />

                {/* Input bar */}
                {isResolved ? (
                    <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, justifyContent: 'center' }]}>
                        <Text style={{ color: '#888', fontStyle: 'italic', marginVertical: 10 }}>This ticket has been resolved.</Text>
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
                                <TouchableOpacity 
                                    style={styles.removeMediaBtn} 
                                    onPress={() => setPendingMedia(null)}
                                >
                                    <Ionicons name="close-circle" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.inputBar}>
                            <TouchableOpacity 
                                style={styles.plusBtn} 
                                activeOpacity={0.7} 
                                onPress={handlePickMedia} 
                                disabled={sending || uploading}
                            >
                                <Ionicons name="add" size={24} color={ACCENT} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Describe your issues..."
                                placeholderTextColor="#999"
                                value={input}
                                onChangeText={setInput}
                                multiline
                                maxLength={500}
                                editable={!sending && !uploading}
                            />
                            <TouchableOpacity 
                                style={styles.sendBtn} 
                                onPress={send} 
                                activeOpacity={0.7} 
                                disabled={sending || uploading || (!input.trim() && !pendingMedia)}
                            >
                                {sending || uploading ? (
                                    <ActivityIndicator size="small" color={ACCENT} />
                                ) : (
                                    <Ionicons 
                                        name="send" 
                                        size={20} 
                                        color={(!input.trim() && !pendingMedia) ? "#ccc" : ACCENT} 
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Fullscreen image preview modal */}
            <Modal
                visible={previewImage !== null}
                transparent={true}
                onRequestClose={() => setPreviewImage(null)}
            >
                <View style={styles.modalBackground}>
                    <TouchableOpacity 
                        style={styles.closePreviewBtn} 
                        onPress={() => setPreviewImage(null)}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    {previewImage && (
                        <Image 
                            source={{ uri: previewImage }} 
                            style={styles.fullScreenImage} 
                            resizeMode="contain" 
                        />
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
        marginBottom: 12,
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
    tripBanner: {
        padding: 12,
        backgroundColor: '#FFF8F4',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FFD0B0',
    },
    tripBannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tripBadge: {
        backgroundColor: ACCENT,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    tripBadgeTxt: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    tripStatusTxt: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
    },
    tripFareTxt: {
        fontSize: 13,
        fontWeight: '800',
        color: ACCENT,
    },
    tripRouteWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tripDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
    },
    tripRouteTxt: {
        fontSize: 12,
        color: '#444',
        flex: 1,
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
