import * as SecureStore from 'expo-secure-store';

export interface RideReportRecord {
    id: string;
    rideId: string;
    rideRefId: string;
    reporterUserId: string;
    reporterRole: 'Passenger' | 'Driver';
    reportedUserId: string;
    reportedUserName: string;
    reportedUserRole: 'Driver' | 'Passenger';
    reason: string;
    timestamp: number;
}

export interface FlaggedAccountRecord {
    id: string;
    userId: string;
    name: string;
    role: 'Driver' | 'Passenger';
    reason: string;
    date: string;
    status: string;
    reportsCount: number;
    flaggedAt: number;
}

const REPORTS_KEY = 'finder_ride_reports_v1';
const FLAGGED_KEY = 'finder_auto_flagged_accounts_v1';

async function getStoredItem(key: string): Promise<string | null> {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(key);
            if (val) return val;
        }
    } catch (e) {}
    try {
        return await SecureStore.getItemAsync(key);
    } catch (e) {
        return null;
    }
}

async function setStoredItem(key: string, value: string): Promise<void> {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    } catch (e) {}
    try {
        await SecureStore.setItemAsync(key, value);
    } catch (e) {}
}

export async function getAllReports(): Promise<RideReportRecord[]> {
    const raw = await getStoredItem(REPORTS_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

export async function recordRideReport(report: Omit<RideReportRecord, 'id' | 'timestamp'>): Promise<{
    report: RideReportRecord;
    isAutoFlagged: boolean;
    flaggedAccount?: FlaggedAccountRecord;
}> {
    const now = Date.now();
    const newReport: RideReportRecord = {
        ...report,
        id: `rep-${now}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
    };

    const existingReports = await getAllReports();
    const updatedReports = [newReport, ...existingReports];
    await setStoredItem(REPORTS_KEY, JSON.stringify(updatedReports));

    // Check 1-day (24 hours) threshold for reportedUserId
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Sort all reports within the last 24h newest-first
    const recentReportsInDay = updatedReports.filter(r => r.timestamp >= oneDayAgo);

    // Check if the reported user has 3 reports in 1 day (or 3 consecutive reports)
    // 1) 3 reports for this user in 1 day
    const userReportsInDay = recentReportsInDay.filter(r => r.reportedUserId === report.reportedUserId);
    
    // 2) Or 3 consecutive reports received in the system
    let consecutiveCount = 0;
    for (const r of recentReportsInDay) {
        if (r.reportedUserId === report.reportedUserId) {
            consecutiveCount++;
            if (consecutiveCount >= 3) break;
        } else {
            break;
        }
    }

    const shouldFlag = consecutiveCount >= 3 || userReportsInDay.length >= 3;

    if (shouldFlag) {
        // Auto-flag the user
        const dateStr = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });

        const flaggedRec: FlaggedAccountRecord = {
            id: `flg-auto-${report.reportedUserId}`,
            userId: report.reportedUserId,
            name: report.reportedUserName || (report.reportedUserRole === 'Driver' ? 'Driver' : 'Passenger'),
            role: report.reportedUserRole,
            reason: 'Reported 3 consecutive times in 1 day',
            date: dateStr,
            status: 'Flagged',
            reportsCount: Math.max(consecutiveCount, userReportsInDay.length),
            flaggedAt: now,
        };

        const existingFlaggedRaw = await getStoredItem(FLAGGED_KEY);
        let flaggedList: FlaggedAccountRecord[] = [];
        if (existingFlaggedRaw) {
            try {
                flaggedList = JSON.parse(existingFlaggedRaw);
            } catch (e) {}
        }

        const filtered = flaggedList.filter(f => f.userId !== report.reportedUserId);
        const updatedFlagged = [flaggedRec, ...filtered];
        await setStoredItem(FLAGGED_KEY, JSON.stringify(updatedFlagged));

        return {
            report: newReport,
            isAutoFlagged: true,
            flaggedAccount: flaggedRec
        };
    }

    return {
        report: newReport,
        isAutoFlagged: false
    };
}

export async function getAutoFlaggedAccounts(): Promise<FlaggedAccountRecord[]> {
    const raw = await getStoredItem(FLAGGED_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
