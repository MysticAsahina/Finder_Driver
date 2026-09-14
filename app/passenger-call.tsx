import RNCallKeep from 'react-native-callkeep';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, BackHandler, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView, MediaStream } from 'react-native-webrtc';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import api from '@/utils/axios';
import InCallManager from '@novartc/react-native-incall-manager';
import { ensureCallPermission } from '../utils/callPermissions';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

export default function PassengerCallScreen() {
    // Block hardware back button so users don't accidentally leave the call screen
    useEffect(() => {
        const backAction = () => {
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, []);

    const router = useRouter();
    const params = useLocalSearchParams<{ isVideo?: string, isReceiving?: string, uuid?: string }>();
    const callUUIDRef = useRef<string | null>(params.uuid || null);
    const isInitialVideoCall = params.isVideo === 'true';
    const isReceiving = params.isReceiving === 'true';

    const { socket, isConnected } = useContext(SocketContext);
    const { accessToken } = useContext(AuthContext);

    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(isInitialVideoCall);
    const [isMuted, setIsMuted] = useState(false);
    
    const [passengerName, setPassengerName] = useState('Passenger');
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    
    const pc = useRef<RTCPeerConnection | null>(null);
    const [rideId, setRideId] = useState<string | null>(null);

    const pendingCandidates = useRef<any[]>([]);

    const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(isInitialVideoCall);
    const [hasRemoteVideoBeenOn, setHasRemoteVideoBeenOn] = useState(isInitialVideoCall);
    const [callDuration, setCallDuration] = useState(0);

    // Lifecycle & recovery refs
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const wasVideoOnBeforeBackground = useRef(false);
    const disconnectTimer = useRef<any>(null);
    const hasSetupWebRTC = useRef(false);
    const isVideoOnRef = useRef(isInitialVideoCall);
    const [localStreamRevision, setLocalStreamRevision] = useState(0);

    // Call timer
    useEffect(() => {
        let timer: any;
        if (isCallActive) {
            timer = setInterval(() => setCallDuration(v => v + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isCallActive]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Get current ride details
    useEffect(() => {
        const fetchRide = async () => {
            try {
                const res = await api.get('/driver/ride/current');
                if (res.data.ride) {
                    setRideId(res.data.ride._id);
                    if (res.data.ride.passengerId) {
                        setPassengerName(`${res.data.ride.passengerId.firstName} ${res.data.ride.passengerId.lastName}`);
                    }
                }
            } catch (err) {
                console.error('Failed to get ride details', err);
            }
        };
        fetchRide();
    }, []);

    const endCall = () => {
        if (isEnding.current) return;
        isEnding.current = true;
        if (rideId && socket) {
            socket.emit('webrtc_end_call', { rideId });
        }
        cleanup();
        router.back();
    };

    const isEnding = useRef(false);

    const isCleanedUp = useRef(false);

    const cleanup = () => {
        if (isCleanedUp.current) return;
        isCleanedUp.current = true;

        // Clear any pending disconnect timer
        if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
        }

        // Properly signal Telecom framework that the call is over FIRST
        try {
            if (callUUIDRef.current) {
                if (Platform.OS === 'ios') {
                    RNCallKeep.reportEndCallWithUUID(callUUIDRef.current, 6); // 6 = REMOTE_ENDED
                }
                RNCallKeep.endCall(callUUIDRef.current);
            } else {
                RNCallKeep.endAllCalls();
            }
        } catch (e) {
            console.log('CallKeep endCall error:', e);
            try { RNCallKeep.endAllCalls(); } catch(err){}
        }

        // Stop InCallManager AFTER telecom has been notified
        try {
            InCallManager.stop();
        } catch (e) { console.log('InCallManager stop error:', e); }
        
        try {
            if (pc.current) {
                pc.current.close();
                pc.current = null;
            }
        } catch (e) {}
        
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                setLocalStream(null);
                localStreamRef.current = null;
            }
        } catch (e) {}
    };

    useEffect(() => {
        // Start InCallManager
        InCallManager.start({ media: isInitialVideoCall ? 'video' : 'audio' });
        InCallManager.setForceSpeakerphoneOn(false); // Default to earpiece
        
        return () => cleanup();
    }, []);

    // Keep isVideoOnRef in sync so the AppState callback always has the current value
    useEffect(() => {
        isVideoOnRef.current = isVideoOn;
    }, [isVideoOn]);

    // Handle app background/foreground transitions for camera lifecycle
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            const prev = appStateRef.current;
            appStateRef.current = nextAppState;

            if (prev === 'active' && nextAppState.match(/inactive|background/)) {
                // ── Going to background ──
                // Stop video track to release camera (Android 12+ revokes access in background)
                if (isVideoOnRef.current && localStreamRef.current) {
                    wasVideoOnBeforeBackground.current = true;
                    const videoTracks = localStreamRef.current.getVideoTracks();
                    videoTracks.forEach(t => {
                        t.enabled = false;
                        t.stop();
                    });
                    // Notify remote peer that our video is temporarily off
                    if (socket && rideId) {
                        socket.emit('webrtc_video_toggled', { rideId, isVideoOn: false });
                    }
                }
            } else if (prev.match(/inactive|background/) && nextAppState === 'active') {
                // ── Coming back to foreground ──
                if (wasVideoOnBeforeBackground.current && pc.current && localStreamRef.current) {
                    wasVideoOnBeforeBackground.current = false;
                    try {
                        // Re-acquire camera
                        const newStream = await mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                        const newVideoTrack = newStream.getVideoTracks()[0];

                        // Remove dead tracks from the local stream
                        const oldVideoTracks = localStreamRef.current.getVideoTracks();
                        oldVideoTracks.forEach(t => localStreamRef.current!.removeTrack(t));

                        // Add the fresh track to the stream
                        localStreamRef.current.addTrack(newVideoTrack);

                        // Replace the track on the existing sender (no renegotiation needed)
                        const senders = pc.current.getSenders();
                        const videoSender = senders.find(s => s.track?.kind === 'video');
                        if (videoSender) {
                            await videoSender.replaceTrack(newVideoTrack);
                        } else {
                            // No existing video sender — add track and renegotiate
                            pc.current.addTrack(newVideoTrack, localStreamRef.current);
                            const offer = await pc.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                            await pc.current.setLocalDescription(offer);
                            if (socket && rideId) socket.emit('webrtc_offer', { rideId, offer });
                        }

                        // Force RTCView remount by bumping revision (same object ref won't trigger re-render)
                        setLocalStreamRevision(r => r + 1);
                        setIsVideoOn(true);

                        // Notify remote peer that video is back
                        if (socket && rideId) {
                            socket.emit('webrtc_video_toggled', { rideId, isVideoOn: true });
                        }
                    } catch (err) {
                        console.error('Failed to re-acquire camera after foreground:', err);
                        setIsVideoOn(false);
                        wasVideoOnBeforeBackground.current = false;
                    }
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [socket, rideId]);

    // Setup WebRTC and initiate/answer call
    useEffect(() => {
        if (!rideId || !socket || !isConnected) return;
        if (hasSetupWebRTC.current) return;
        hasSetupWebRTC.current = true;
        const setupWebRTC = async () => {
            let stream: MediaStream;
            try {
                const mediaConstraints = {
                    audio: true,
                    video: isInitialVideoCall ? { facingMode: 'user' } : false,
                };
                stream = await mediaDevices.getUserMedia(mediaConstraints);
                setLocalStream(stream);
                localStreamRef.current = stream;
            } catch (err) {
                console.error("Failed to get local stream", err);
                return;
            }

            const peer = new RTCPeerConnection(ICE_SERVERS);
            pc.current = peer;
            // onnegotiationneeded removed to prevent glare

            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });

            pc.current.oniceconnectionstatechange = () => {
                const state = pc.current?.iceConnectionState;
                if (state === 'disconnected') {
                    // Give ICE time to recover (e.g., brief network blip)
                    disconnectTimer.current = setTimeout(() => {
                        if (pc.current?.iceConnectionState !== 'connected' &&
                            pc.current?.iceConnectionState !== 'completed') {
                            endCall();
                        }
                    }, 8000);
                } else if (state === 'connected' || state === 'completed') {
                    if (disconnectTimer.current) {
                        clearTimeout(disconnectTimer.current);
                        disconnectTimer.current = null;
                    }
                } else if (state === 'failed' || state === 'closed') {
                    if (disconnectTimer.current) {
                        clearTimeout(disconnectTimer.current);
                        disconnectTimer.current = null;
                    }
                    endCall();
                }
            };

            peer.ontrack = (event: any) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            peer.onicecandidate = (event: any) => {
                if (event.candidate) {
                    socket.emit('webrtc_ice_candidate', { rideId, candidate: event.candidate });
                }
            };

            if (isReceiving) {
                // If receiving, we already accepted. We just wait for offer.
                setIsCallActive(true);
                socket.emit('webrtc_call_accepted', { rideId });
                if (isInitialVideoCall) {
                    socket.emit('webrtc_video_toggled', { rideId, isVideoOn: true });
                }
            } else {
                // We are initiating
                const hasPermission = await ensureCallPermission();
                if (!hasPermission) {
                    cleanup();
                    router.back();
                    return;
                }
                // Send call initiated. We wait for accept to send offer.
                const callUUID = '11111111-2222-3333-4444-' + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
                callUUIDRef.current = callUUID;
                try {
                    RNCallKeep.startCall(callUUID, passengerName, passengerName, 'number', isInitialVideoCall);
                } catch (e) {
                    console.warn('CallKeep startCall failed:', e);
                }
                socket.emit('webrtc_call_initiated', { callerName: 'Driver', isVideo: isInitialVideoCall, rideId });
            }
        };

        setupWebRTC();

    }, [rideId, socket, isConnected, isReceiving]);

    // Handle Audio Mute
    useEffect(() => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].enabled = !isMuted;
            }
        }
    }, [isMuted, localStream]);
    


    const toggleVideo = async () => {
        if (!pc.current || !localStreamRef.current) return;
        
        if (isVideoOn) {
            // Turn video OFF
            const videoTracks = localStreamRef.current.getVideoTracks();
            videoTracks.forEach(t => t.enabled = false);
            setIsVideoOn(false);
            if (socket && rideId) socket.emit('webrtc_video_toggled', { rideId, isVideoOn: false });
        } else {
            // Turn video ON
            const videoTracks = localStreamRef.current.getVideoTracks();
            const hasLiveTrack = videoTracks.some(t => t.readyState === 'live');

            if (hasLiveTrack) {
                // Existing live tracks — just re-enable
                videoTracks.forEach(t => t.enabled = true);
            } else {
                // No live video tracks (either none exist, or they died from backgrounding)
                // Remove any dead tracks from the stream first
                videoTracks.forEach(t => localStreamRef.current!.removeTrack(t));
                try {
                    const newStream = await mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    localStreamRef.current.addTrack(newVideoTrack);

                    // Use replaceTrack if a sender already exists (avoids duplicate transceivers)
                    const senders = pc.current.getSenders();
                    const videoSender = senders.find(s => s.track?.kind === 'video');
                    if (videoSender) {
                        await videoSender.replaceTrack(newVideoTrack);
                    } else {
                        // No existing video sender — add track and renegotiate
                        pc.current.addTrack(newVideoTrack, localStreamRef.current);
                        const offer = await pc.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                        await pc.current.setLocalDescription(offer);
                        if (socket && rideId) socket.emit('webrtc_offer', { rideId, offer });
                    }
                    // Force RTCView remount by bumping revision
                    setLocalStreamRevision(r => r + 1);
                } catch (err) {
                    console.error("Failed to add video track", err);
                    return;
                }
            }
            setIsVideoOn(true);
            if (socket && rideId) socket.emit('webrtc_video_toggled', { rideId, isVideoOn: true });
        }
    };
    
    // Socket Listeners
    useEffect(() => {
        if (!socket || !isConnected || !rideId) return;

        const handleCallAccepted = async () => {
            if (callUUIDRef.current) RNCallKeep.setCurrentCallActive(callUUIDRef.current);
            if (!pc.current) return;
            try {
                const offer = await pc.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                await pc.current.setLocalDescription(offer);
                socket.emit('webrtc_offer', { rideId, offer });
                setIsCallActive(true);
            } catch (err) {
                console.error(err);
            }
        };

        const handleCallDenied = () => {
            cleanup();
            router.back();
        };

        const handleOffer = async (offer: any) => {
            if (!pc.current) return;
            try {
                await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
                for (const candidate of pendingCandidates.current) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidates.current = [];
                
                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);
                socket.emit('webrtc_answer', { rideId, answer });
            } catch (err) {
                console.error(err);
            }
        };

        const handleAnswer = async (answer: any) => {
            if (!pc.current) return;
            try {
                await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
                for (const candidate of pendingCandidates.current) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidates.current = [];
            } catch (err) {
                console.error(err);
            }
        };

        const handleIceCandidate = async (candidate: any) => {
            if (!pc.current) return;
            try {
                if (pc.current.remoteDescription) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    pendingCandidates.current.push(candidate);
                }
            } catch (err) {
                console.error(err);
            }
        };

        const handleVideoToggled = (data: { isVideoOn: boolean }) => {
            setIsRemoteVideoOn(data.isVideoOn);
            if (data.isVideoOn) setHasRemoteVideoBeenOn(true);
        };



        const handleEndCall = () => {
            if (isEnding.current) return;
            isEnding.current = true;
            cleanup();
            router.back();
        };

        socket.on('webrtc_call_accepted', handleCallAccepted);
        socket.on('webrtc_call_denied', handleCallDenied);
        socket.on('webrtc_offer', handleOffer);
        socket.on('webrtc_answer', handleAnswer);
        socket.on('webrtc_ice_candidate', handleIceCandidate);
        socket.on('webrtc_video_toggled', handleVideoToggled);
        socket.on('webrtc_end_call', handleEndCall);

        return () => {
            socket.off('webrtc_call_accepted', handleCallAccepted);
            socket.off('webrtc_call_denied', handleCallDenied);
            socket.off('webrtc_offer', handleOffer);
            socket.off('webrtc_answer', handleAnswer);
            socket.off('webrtc_ice_candidate', handleIceCandidate);
            socket.off('webrtc_video_toggled', handleVideoToggled);
            socket.off('webrtc_end_call', handleEndCall);
        };
    }, [socket, isConnected, rideId]);

    

    const hasMounted = useRef(false);

    // Toggle speaker
    useEffect(() => {
        InCallManager.setForceSpeakerphoneOn(isSpeaker);
        if (callUUIDRef.current) {
            try {
                RNCallKeep.toggleAudioRouteSpeaker(callUUIDRef.current, isSpeaker);
            } catch (err) {
                console.warn('CallKeep speaker toggle failed', err);
            }
        }
    }, [isSpeaker]);

    // Initialize remote video state when incoming call is a video call
    useEffect(() => {
        if (isReceiving && isInitialVideoCall) {
            setIsRemoteVideoOn(true);
        } else if (!isReceiving && isInitialVideoCall) {
            // We started as video, but don't know remote yet. Wait for their toggle.
        }
    }, [isReceiving, isInitialVideoCall]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Header: User Info */}
                <View style={styles.topSection}>
                    <Text style={styles.name}>{passengerName}</Text>
                    <Text style={styles.status}>{isCallActive ? formatTime(callDuration) : 'Calling...'}</Text>
                </View>

                {/* Main Avatar / Video Area */}
                <View style={styles.avatarContainer}>
                    {remoteStream && (isRemoteVideoOn || hasRemoteVideoBeenOn) && (
                        <View style={[styles.videoPlaceholder, { display: isRemoteVideoOn ? 'flex' : 'none' }]}>
                            <RTCView 
                                key={remoteStream.toURL()}
                                streamURL={remoteStream.toURL()} 
                                style={{ width: '100%', height: '100%', borderRadius: 24 }} 
                                objectFit="cover" 
                                zOrder={1}
                            />
                        </View>
                    )}
                    
                    {(!isRemoteVideoOn || !remoteStream) && (
                        <View style={styles.audioAvatar}>
                            <Text style={styles.avatarInitial}>{passengerName.charAt(0)}</Text>
                        </View>
                    )}

                    {isVideoOn && localStream && (
                        <View style={styles.localVideoWrap}>
                            <RTCView 
                                key={`${localStream.toURL()}-${localStreamRevision}`}
                                streamURL={localStream.toURL()} 
                                style={{ width: '100%', height: '100%' }} 
                                objectFit="cover" 
                                mirror={true}
                                zOrder={2}
                            />
                        </View>
                    )}
                </View>

                {/* Bottom Controls */}
                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        style={[styles.controlBtn, isSpeaker && styles.activeBtn]}
                        onPress={() => setIsSpeaker(!isSpeaker)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={isSpeaker ? "volume-high" : "volume-medium"} size={28} color={isSpeaker ? "#000" : "#fff"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlBtn, isMuted && styles.activeBtn]}
                        onPress={() => setIsMuted(!isMuted)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "#000" : "#fff"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlBtn, isVideoOn && styles.activeBtn]}
                        onPress={toggleVideo}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={isVideoOn ? "videocam" : "videocam-off"} size={28} color={isVideoOn ? "#000" : "#fff"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.endCallBtn}
                        onPress={endCall}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a' },
    content: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
    topSection: { alignItems: 'center', marginTop: 40 },
    name: { fontSize: 30, fontWeight: '700', color: '#fff', marginBottom: 8 },
    status: { fontSize: 16, color: '#aaa', letterSpacing: 1 },
    avatarContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
    audioAvatar: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#FF5F00', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#FF5F00', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
    avatarInitial: { fontSize: 64, fontWeight: '700', color: '#fff' },
    videoPlaceholder: { width: '85%', height: '70%', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3a3a3a', position: 'relative' },
    localVideoWrap: { position: 'absolute', bottom: 20, right: 20, width: 100, height: 150, borderWidth: 2, borderColor: '#fff', backgroundColor: 'transparent' },
    controlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 20, paddingVertical: 24, borderRadius: 50 },
    controlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#3a3a3a', justifyContent: 'center', alignItems: 'center' },
    activeBtn: { backgroundColor: '#e0e0e0' },
    endCallBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ff3b30', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});
