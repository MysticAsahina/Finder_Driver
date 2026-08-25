import RNCallKeep from 'react-native-callkeep';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView, MediaStream } from 'react-native-webrtc';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import api from '@/utils/axios';
import InCallManager from '@novartc/react-native-incall-manager';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

export default function PassengerCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ isVideo?: string, isReceiving?: string }>();
    const isInitialVideoCall = params.isVideo === 'true';
    const isReceiving = params.isReceiving === 'true';

    const { socket, isConnected } = useContext(SocketContext);
    const { accessToken } = useContext(AuthContext);

    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(isInitialVideoCall);
    const [isMuted, setIsMuted] = useState(false);
    
    const [passengerName, setPassengerName] = useState('Passenger');
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    
    const pc = useRef<RTCPeerConnection | null>(null);
    const [rideId, setRideId] = useState<string | null>(null);

    const pendingCandidates = useRef<any[]>([]);

    const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(isInitialVideoCall);
    const [callDuration, setCallDuration] = useState(0);

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
        if (rideId && socket) {
            socket.emit('webrtc_end_call', { rideId });
        }
        cleanup();
        router.back();
    };

    const cleanup = () => {
        RNCallKeep.endAllCalls();
        InCallManager.stop();
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
    };

    useEffect(() => {
        // Start InCallManager
        InCallManager.start({ media: isInitialVideoCall ? 'video' : 'audio' });
        InCallManager.setForceSpeakerphoneOn(false); // Default to earpiece
        
        return () => cleanup();
    }, []);

    // Setup WebRTC and initiate/answer call
    useEffect(() => {
        if (!rideId || !socket || !isConnected) return;

        const setupWebRTC = async () => {
            let stream: MediaStream;
            try {
                const mediaConstraints = {
                    audio: true,
                    video: isInitialVideoCall ? { facingMode: 'user' } : false,
                };
                stream = await mediaDevices.getUserMedia(mediaConstraints);
                setLocalStream(stream);
            } catch (err) {
                console.error("Failed to get local stream", err);
                return;
            }

            const peer = new RTCPeerConnection(ICE_SERVERS);
            pc.current = peer;
            peer.onnegotiationneeded = async () => {
                try {
                    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await peer.setLocalDescription(offer);
                    socket.emit('webrtc_offer', { rideId, offer });
                } catch (err) {
                    console.error('onnegotiationneeded error', err);
                }
            };

            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });

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
            } else {
                // We are initiating
                // Send call initiated. We wait for accept to send offer.
                socket.emit('webrtc_call_initiated', { rideId, callerName: 'Driver', isVideo: isInitialVideoCall });
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
        if (!pc.current || !localStream) return;
        
        if (isVideoOn) {
            const videoTracks = localStream.getVideoTracks();
            videoTracks.forEach(t => t.enabled = false);
            setIsVideoOn(false);
            if (socket && rideId) socket.emit('webrtc_video_toggled', { rideId, isVideoOn: false });
        } else {
            const videoTracks = localStream.getVideoTracks();
            if (videoTracks.length === 0) {
                try {
                    const newStream = await mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    localStream.addTrack(newVideoTrack);
                    pc.current.addTrack(newVideoTrack, localStream);
                } catch(e) {
                    console.error(e);
                    return;
                }
            } else {
                videoTracks.forEach(t => t.enabled = true);
            }
            setIsVideoOn(true);
            if (socket && rideId) socket.emit('webrtc_video_toggled', { rideId, isVideoOn: true });
        }
    };
    
    // Socket Listeners
    useEffect(() => {
        if (!socket || !isConnected || !rideId) return;

        const handleCallAccepted = async () => {
            if (!pc.current) return;
            try {
                const offer = await pc.current.createOffer({});
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
        };

        const handleEndCall = () => {
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

    // Handle Speaker toggle
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        
        InCallManager.setForceSpeakerphoneOn(isSpeaker);
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
                    {isRemoteVideoOn && remoteStream ? (
                        <View style={styles.videoPlaceholder}>
                            <RTCView 
                                streamURL={remoteStream.toURL()} 
                                style={{ width: '100%', height: '100%', borderRadius: 24 }} 
                                objectFit="cover" 
                                zOrder={2}
                            />
                        </View>
                    ) : (
                        <View style={styles.audioAvatar}>
                            <Text style={styles.avatarInitial}>{passengerName.charAt(0)}</Text>
                        </View>
                    )}

                    {isVideoOn && localStream && (
                        <View style={styles.localVideoWrap}>
                            <RTCView 
                                streamURL={localStream.toURL()} 
                                style={{ width: '100%', height: '100%' }} 
                                objectFit="cover" 
                                mirror={true}
                                zOrder={1}
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
