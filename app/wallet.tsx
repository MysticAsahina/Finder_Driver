import React, { useState, useContext, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Platform,
    Image,
    ActivityIndicator,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { ACCENT } from '@/constants/theme';
import { AuthContext } from '@/context/AuthContext';
import { SocketContext } from '@/context/SocketContext';
import api from '@/utils/axios';

interface Transaction {
    _id: string;
    type: 'cash_in' | 'cash_out' | 'fare_deduction' | 'fare_earning' | 'refund';
    description: string;
    amount: number;
    fee: number;
    grossAmount: number;
    referenceNumber: string;
    createdAt: string;
}

type FilterType = 'all' | 'money_in' | 'money_out';

export default function WalletScreen() {
    const router = useRouter();
    const { user } = useContext(AuthContext);
    const { socket, isConnected } = useContext(SocketContext);

    const displayName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver'
        : 'Driver';

    const [balance, setBalance] = useState<number>(0);
    const [hideBalance, setHideBalance] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // Cash Out modal state
    const [cashOutModalVisible, setCashOutModalVisible] = useState(false);
    const [amountInput, setAmountInput] = useState('');
    const [accountName, setAccountName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [submittingCashOut, setSubmittingCashOut] = useState(false);

    const fetchWalletData = async () => {
        try {
            const [balRes, txRes] = await Promise.all([
                api.get('/wallet/balance'),
                api.get('/wallet/transactions'),
            ]);
            setBalance(balRes.data?.balance || 0);
            setTransactions(txRes.data?.transactions || []);
            if (balRes.data?.savedPayoutDetails) {
                setAccountName(balRes.data.savedPayoutDetails.accountName || '');
                setMobileNumber(balRes.data.savedPayoutDetails.mobileNumber || '');
            } else if (user) {
                setAccountName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
                setMobileNumber(user.mobileNumber || '');
            }
        } catch (err) {
            console.error('Failed to fetch driver wallet data', err);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWalletData();
        }, [])
    );

    // Real-time socket listener for wallet updates
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleWalletUpdated = (data: any) => {
            console.log('[Driver Wallet] Real-time wallet_updated received:', data);
            if (data?.newBalance !== undefined) {
                setBalance(data.newBalance);
            }
            if (data?.transaction) {
                setTransactions((prev) => [
                    data.transaction,
                    ...prev.filter(
                        (t) => t._id !== data.transaction._id && t.referenceNumber !== data.transaction.referenceNumber
                    ),
                ]);
            }
            fetchWalletData();
        };

        socket.on('wallet_updated', handleWalletUpdated);
        return () => {
            socket.off('wallet_updated', handleWalletUpdated);
        };
    }, [socket, isConnected]);

    // Automatically refresh wallet data when switching back to app
    useEffect(() => {
        const sub = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                fetchWalletData();
            }
        });
        return () => sub.remove();
    }, []);

    const handleCashOut = async () => {
        const num = parseFloat(amountInput);
        if (isNaN(num) || num < 100 || num > 2000) {
            Alert.alert('Invalid Amount', 'Please enter an amount between ₱100.00 and ₱2,000.00.');
            return;
        }
        if (num > balance) {
            Alert.alert('Insufficient Balance', 'You do not have enough funds to cash out this amount.');
            return;
        }
        if (!accountName.trim()) {
            Alert.alert('Missing Field', 'Please enter your GCash account name.');
            return;
        }
        if (!mobileNumber.trim() || !/^09\d{9}$/.test(mobileNumber.trim())) {
            Alert.alert('Invalid Mobile Number', 'Please enter a valid 11-digit GCash number starting with 09.');
            return;
        }

        setSubmittingCashOut(true);
        try {
            const res = await api.post('/wallet/cash-out/request', {
                amount: num,
                accountName: accountName.trim(),
                mobileNumber: mobileNumber.trim(),
            });

            if (res.data?.newBalance !== undefined) {
                setBalance(res.data.newBalance);
            }
            if (res.data?.transaction) {
                setTransactions((prev) => [
                    res.data.transaction,
                    ...prev.filter((t) => t._id !== res.data.transaction._id),
                ]);
            }
            setAmountInput('');
            setCashOutModalVisible(false);

            fetchWalletData();

            Alert.alert('Success', `Successfully cashed out ₱${num.toFixed(2)} to GCash (${mobileNumber.trim()}). Transfer fee: ₱0.00 (Covered by FINDER).`);
        } catch (err: any) {
            console.error('Failed to cash out', err);
            Alert.alert('Cash Out Notice', err.response?.data?.message || 'Failed to process cash out.');
        } finally {
            setSubmittingCashOut(false);
        }
    };

    const filteredTransactions = transactions.filter((tx) => {
        if (filter === 'money_in') return tx.type === 'cash_in' || tx.type === 'fare_earning' || tx.type === 'refund';
        if (filter === 'money_out') return tx.type === 'cash_out' || tx.type === 'fare_deduction';
        return true;
    });

    const getFilterLabel = () => {
        if (filter === 'money_in') return 'Money In';
        if (filter === 'money_out') return 'Money Out';
        return 'All';
    };

    const formatAmount = (num: number) => {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* Top User Profile Header */}
            <View style={styles.userHeader}>
                <View style={styles.userLeft}>
                    <View style={styles.avatarCircle}>
                        {user?.profilePicture ? (
                            <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
                        ) : (
                            <Ionicons name="person" size={22} color={ACCENT} />
                        )}
                    </View>
                    <View>
                        <Text style={styles.userGreeting}>FINDER Driver</Text>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName}>{displayName}</Text>
                            <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={{ marginLeft: 4 }} />
                        </View>
                    </View>
                </View>

                <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active</Text>
                </View>
            </View>

            {/* Main Content Area (Fixed layout, fits on one screen) */}
            <View style={styles.contentContainer}>
                {/* Premium Orange Wallet Card */}
                <View style={styles.walletCard}>
                    {/* Decorative Background Circles */}
                    <View style={styles.cardWatermark}>
                        <Svg width={180} height={180} viewBox="0 0 200 200" style={styles.svgWatermark}>
                            <Circle cx={160} cy={40} r={110} fill="rgba(255,255,255,0.08)" />
                            <Circle cx={130} cy={70} r={80} fill="rgba(255,255,255,0.06)" />
                        </Svg>
                    </View>

                    {/* Header bar inside card */}
                    <View style={styles.cardHeaderRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <Text style={styles.cardTitle}>Wallet</Text>

                        <View style={styles.cardRightIcon}>
                            <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.85)" />
                        </View>
                    </View>

                    <View style={styles.cardHeaderDivider} />

                    {/* Available Balance Label + Eye Toggle */}
                    <View style={styles.balanceHeaderRow}>
                        <Text style={styles.balanceLabel}>Available Balance</Text>
                        <TouchableOpacity
                            onPress={() => setHideBalance((v) => !v)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Ionicons
                                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                                size={17}
                                color="rgba(255, 255, 255, 0.85)"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Balance Numbers */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.currencyPrefix}>PHP</Text>
                        <Text style={styles.balanceNumber}>
                            {hideBalance ? '••••••••' : formatAmount(balance)}
                        </Text>
                    </View>

                    <View style={styles.balanceUnderline} />

                    {/* Action Button: Elevated Pill with Icon */}
                    <View style={styles.actionBtnWrapper}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => setCashOutModalVisible(true)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="arrow-up-circle" size={19} color={ACCENT} />
                            <Text style={styles.actionBtnText}>Cash Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transactions Section Header */}
                <View style={styles.txHeaderRow}>
                    <View style={styles.txHeaderLeft}>
                        <Text style={styles.txHeaderTitle}>Transactions</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{filteredTransactions.length}</Text>
                        </View>
                    </View>

                    {/* Filter Button */}
                    <TouchableOpacity
                        style={styles.filterBtn}
                        onPress={() => setFilterModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="filter-outline" size={13} color={ACCENT} style={{ marginRight: 4 }} />
                        <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
                        <Ionicons name="chevron-down" size={14} color={ACCENT} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                </View>

                {/* Outer Container with Orange Border - ONLY SCROLLABLE ELEMENT */}
                <View style={styles.txOuterContainer}>
                    <ScrollView
                        style={styles.txScrollView}
                        contentContainerStyle={styles.txScrollContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 40 }} color={ACCENT} />
                        ) : filteredTransactions.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="receipt-outline" size={44} color="#FFB085" />
                                <Text style={styles.emptyTitle}>No Transactions</Text>
                                <Text style={styles.emptyText}>No records match the selected filter.</Text>
                            </View>
                        ) : (
                            filteredTransactions.map((tx) => {
                                const isMoneyOut = tx.type === 'cash_out' || tx.type === 'fare_deduction';
                                const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                });
                                return (
                                    <View key={tx._id} style={styles.txCard}>
                                        <View style={styles.txLeft}>
                                            <View
                                                style={[
                                                    styles.txIconBadge,
                                                    isMoneyOut ? styles.txIconCashOut : styles.txIconCashIn,
                                                ]}
                                            >
                                                <Ionicons
                                                    name={isMoneyOut ? 'arrow-up' : 'arrow-down'}
                                                    size={16}
                                                    color={isMoneyOut ? ACCENT : '#16A34A'}
                                                />
                                            </View>

                                            <View style={styles.txDetails}>
                                                <Text style={styles.txTypeTitle}>{tx.description}</Text>
                                                <Text style={styles.txDateText}>{formattedDate}</Text>
                                                <Text style={styles.txRefText}>Ref. {tx.referenceNumber}</Text>
                                            </View>
                                        </View>

                                        {/* Right Side Amount */}
                                        <View style={styles.txRight}>
                                            <Text
                                                style={[
                                                    styles.txAmountText,
                                                    isMoneyOut ? styles.txAmountCashOut : styles.txAmountCashIn,
                                                ]}
                                            >
                                                {isMoneyOut ? '–PHP ' : '+PHP '}
                                                <Text style={styles.txAmountNumber}>
                                                    {formatAmount(tx.amount)}
                                                </Text>
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            </View>

            {/* Filter Modal */}
            <Modal
                visible={filterModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFilterModalVisible(false)}
                >
                    <View style={styles.filterMenuBox}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.filterMenuHeader}>Filter Transactions</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#888" />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.filterMenuItem, filter === 'all' && styles.filterMenuItemActive]}
                            onPress={() => {
                                setFilter('all');
                                setFilterModalVisible(false);
                            }}
                        >
                            <View style={[styles.filterIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                <Ionicons name="swap-vertical" size={16} color="#4B5563" />
                            </View>
                            <Text style={[styles.filterMenuText, filter === 'all' && styles.filterMenuTextActive]}>
                                All Transactions
                            </Text>
                            {filter === 'all' && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterMenuItem, filter === 'money_in' && styles.filterMenuItemActive]}
                            onPress={() => {
                                setFilter('money_in');
                                setFilterModalVisible(false);
                            }}
                        >
                            <View style={[styles.filterIconCircle, { backgroundColor: '#E8F8EE' }]}>
                                <Ionicons name="arrow-down" size={16} color="#16A34A" />
                            </View>
                            <Text style={[styles.filterMenuText, filter === 'money_in' && styles.filterMenuTextActive]}>
                                Money In (Cash In)
                            </Text>
                            {filter === 'money_in' && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterMenuItem, filter === 'money_out' && styles.filterMenuItemActive]}
                            onPress={() => {
                                setFilter('money_out');
                                setFilterModalVisible(false);
                            }}
                        >
                            <View style={[styles.filterIconCircle, { backgroundColor: '#FFF1E8' }]}>
                                <Ionicons name="arrow-up" size={16} color={ACCENT} />
                            </View>
                            <Text style={[styles.filterMenuText, filter === 'money_out' && styles.filterMenuTextActive]}>
                                Money Out (Cash Out)
                            </Text>
                            {filter === 'money_out' && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Cash In Modal */}
            <Modal
                visible={cashOutModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCashOutModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.actionModalCard}>
                        <View style={styles.modalHeaderRow}>
                            <View>
                                <Text style={styles.actionModalTitle}>Cash Out (Withdraw)</Text>
                                <Text style={styles.actionModalSubtitle}>
                                    Withdraw earnings directly from your FINDER driver wallet.
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setAmountInput('');
                                    setCashOutModalVisible(false);
                                }}
                            >
                                <Ionicons name="close-circle-outline" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {/* Payout Destination (GCash) */}
                        <Text style={[styles.chipsLabel, { marginTop: 12 }]}>Disbursement Method</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 10 }}>
                            <Ionicons name="phone-portrait-outline" size={20} color="#16A34A" style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>GCash Express</Text>
                                <Text style={{ fontSize: 11, color: '#666' }}>Zero transfer fees covered by FINDER</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                        </View>

                        <Text style={styles.chipsLabel}>GCash Account Name</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10, color: '#1a1a1a' }}
                            placeholder="e.g. Juan Dela Cruz"
                            placeholderTextColor="#888"
                            value={accountName}
                            onChangeText={setAccountName}
                        />

                        <Text style={styles.chipsLabel}>GCash Mobile Number</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: '#1a1a1a' }}
                            placeholder="09XXXXXXXXX"
                            placeholderTextColor="#888"
                            keyboardType="phone-pad"
                            maxLength={11}
                            value={mobileNumber}
                            onChangeText={setMobileNumber}
                        />

                        <Text style={styles.chipsLabel}>Withdrawal Amount (Min ₱100 - Max ₱2,000)</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputCurrencyPrefix}>PHP</Text>
                            <TextInput
                                style={styles.amountInput}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#888"
                                value={amountInput}
                                onChangeText={setAmountInput}
                            />
                        </View>

                        {/* Quick amount chips */}
                        <Text style={styles.chipsLabel}>Quick Select Amount</Text>
                        <View style={styles.chipsRow}>
                            {[100, 200, 500, 1000].map((amt) => {
                                const isSelected = amountInput === amt.toString();
                                return (
                                    <TouchableOpacity
                                        key={amt}
                                        style={[styles.chipBtn, isSelected && styles.chipBtnSelected]}
                                        onPress={() => setAmountInput(amt.toString())}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                            +{amt}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Zero-fee driver payout banner */}
                        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#BBF7D0' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, color: '#666' }}>Disbursement Amount:</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a1a1a' }}>₱{(parseFloat(amountInput) || 0).toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, color: '#666' }}>Transfer Fee:</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>₱0.00 (Zero Fee)</Text>
                            </View>
                            <View style={{ height: 1, backgroundColor: '#BBF7D0', marginVertical: 4 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1a1a1a' }}>Net Amount Received:</Text>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A' }}>₱{(parseFloat(amountInput) || 0).toFixed(2)}</Text>
                            </View>
                        </View>

                        <Text style={{ fontSize: 11, color: '#888', marginTop: 10, textAlign: 'center', lineHeight: 15 }}>
                            ℹ️ Cash-outs are limited to once per 24 hours to prevent disbursement congestion. Funds are transferred directly to your nominated GCash account.
                        </Text>

                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    setAmountInput('');
                                    setCashOutModalVisible(false);
                                }}
                                disabled={submittingCashOut}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmBtn, submittingCashOut && { opacity: 0.7 }]}
                                onPress={handleCashOut}
                                disabled={submittingCashOut}
                                activeOpacity={0.85}
                            >
                                {submittingCashOut ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Confirm Cash Out</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    userLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF3EC',
        borderWidth: 1.5,
        borderColor: '#FFD6C0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    userGreeting: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 16.5,
        fontWeight: '800',
        color: ACCENT,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    walletCard: {
        backgroundColor: ACCENT,
        borderRadius: 20,
        paddingTop: 14,
        paddingBottom: 14,
        paddingHorizontal: 18,
        shadowColor: '#FF5F00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 6,
        overflow: 'hidden',
        position: 'relative',
    },
    cardWatermark: {
        position: 'absolute',
        top: -20,
        right: -20,
        pointerEvents: 'none',
    },
    svgWatermark: {
        opacity: 0.9,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
    },
    backBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.38)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    cardRightIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardHeaderDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
        marginHorizontal: 8,
        marginBottom: 10,
    },
    balanceHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12.5,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    currencyPrefix: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 15,
        fontWeight: '800',
        marginRight: 6,
    },
    balanceNumber: {
        color: '#FFFFFF',
        fontSize: 27,
        fontWeight: '900',
        letterSpacing: -0.6,
    },
    balanceUnderline: {
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginTop: 6,
        marginBottom: 12,
    },
    actionBtnWrapper: {
        alignItems: 'center',
        paddingTop: 2,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingVertical: 9,
        paddingHorizontal: 22,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 3,
    },
    actionBtnText: {
        color: ACCENT,
        fontSize: 14.5,
        fontWeight: '800',
    },
    txHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 18,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    txHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    txHeaderTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: ACCENT,
    },
    countBadge: {
        backgroundColor: '#FFF1E8',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#FFD4BE',
    },
    countBadgeText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: ACCENT,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.2,
        borderColor: '#FF7A29',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#FFF9F5',
    },
    filterBtnText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: ACCENT,
    },
    txOuterContainer: {
        flex: 1,
        borderWidth: 1.2,
        borderColor: '#FFA570',
        borderRadius: 16,
        padding: 7,
        backgroundColor: '#FFFFFF',
        marginBottom: 4,
    },
    txScrollView: {
        flex: 1,
    },
    txScrollContent: {
        gap: 8,
        paddingBottom: 4,
    },
    txCard: {
        borderWidth: 1.2,
        borderColor: '#FFC09F',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#FF5F00',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    txLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        flex: 1,
    },
    txIconBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    txIconCashOut: {
        backgroundColor: '#FFF0E6',
        borderWidth: 1.2,
        borderColor: '#FFD1B8',
    },
    txIconCashIn: {
        backgroundColor: '#E8F9EE',
        borderWidth: 1.2,
        borderColor: '#B0E9C2',
    },
    txDetails: {
        flex: 1,
    },
    txTypeTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        color: ACCENT,
        marginBottom: 1,
    },
    txDateText: {
        fontSize: 10,
        color: '#FF7A29',
        lineHeight: 13,
        fontWeight: '500',
    },
    txRefText: {
        fontSize: 9.5,
        color: '#FF7A29',
        fontWeight: '500',
    },
    txRight: {
        alignItems: 'flex-end',
        paddingLeft: 6,
    },
    txAmountText: {
        fontSize: 12,
        fontWeight: '700',
    },
    txAmountCashOut: {
        color: '#1a1a1a',
    },
    txAmountCashIn: {
        color: '#15803D',
    },
    txAmountNumber: {
        fontSize: 15,
        fontWeight: '800',
    },
    emptyContainer: {
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        marginTop: 10,
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
    },
    emptyText: {
        marginTop: 4,
        color: '#999',
        fontSize: 12.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    filterMenuBox: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 8,
    },
    filterMenuHeader: {
        fontSize: 17,
        fontWeight: '800',
        color: ACCENT,
    },
    filterMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    filterMenuItemActive: {
        backgroundColor: '#FFF3EC',
    },
    filterIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterMenuText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    filterMenuTextActive: {
        color: ACCENT,
        fontWeight: '700',
    },
    actionModalCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 10,
    },
    actionModalTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: ACCENT,
        marginBottom: 3,
    },
    actionModalSubtitle: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8E8E8',
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 16,
    },
    inputCurrencyPrefix: {
        fontSize: 16,
        fontWeight: '800',
        color: ACCENT,
        marginRight: 10,
    },
    amountInput: {
        flex: 1,
        fontSize: 22,
        fontWeight: '800',
        color: '#1a1a1a',
        padding: 0,
    },
    chipsLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#777',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    chipBtn: {
        flex: 1,
        paddingVertical: 9,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chipBtnSelected: {
        backgroundColor: '#FFF3EC',
        borderColor: ACCENT,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#555',
    },
    chipTextSelected: {
        color: ACCENT,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666',
    },
    confirmBtn: {
        flex: 1.5,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: ACCENT,
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    confirmBtnText: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});
