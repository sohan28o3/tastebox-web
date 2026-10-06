import React, { useState, useEffect } from 'react';
import { 
  Shield, Database, Users, Star, ArrowLeft, BarChart2, 
  Cpu, AlertCircle, ThumbsUp, ThumbsDown, HelpCircle, 
  ExternalLink, X, RefreshCw 
} from 'lucide-react';
import { 
  collection, getDocs, query, orderBy, limit, doc, getDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useStore } from '../services/storeContext';
import { ProfileAvatar } from '../components/BiteUiComponents';

interface TesterHealth {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  photoUrl: string;
  bio: string;
  createdAt: number;
  lastActiveMillis: number;
  reviewCount: number;
  favoriteCount: number;
  watchlistCount: number;
  hasFourFavorites: boolean;
  hasDietaryTags: boolean;
  hasBudgetSet: boolean;
  favoriteCuisines: string[];
  onboardingComplete: boolean;
}

interface GeminiAuditLog {
  id: string;
  uid: string;
  userName: string;
  prompt: string;
  responseReasoning: string;
  timestamp: number;
  userRating: string;
  userComment: string;
  founderFlag: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { eateries, visits, appReviews, lists, navigateBack } = useStore();
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const tabs = ["30-User Grid", "AI Audit Log", "Friction Points", "Cohort Diversity", "Database Overview"];

  return (
    <div className="min-h-screen bg-[#FAF8F1] pb-24 text-[#233B3B]">
      {/* Top Admin Header */}
      <div className="bg-[#235D5B] text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={navigateBack}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-bold text-lg md:text-xl text-white truncate">
              30-User Alpha Monitor
            </h1>
            <p className="text-xs text-white/80 truncate">
              Live Qualitative Insights & LLM Traceability
            </p>
          </div>
          <span className="bg-[#194241] border border-white/20 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
            ADMIN
          </span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="bg-[#235D5B]/95 text-white/90 border-t border-white/10 flex overflow-x-auto no-scrollbar px-2 py-1 sticky top-[68px] z-20">
        {tabs.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(idx)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition-colors ${
              selectedTab === idx 
                ? 'bg-white text-[#235D5B] font-bold shadow-xs' 
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {selectedTab === 0 && <UserGridTab />}
        {selectedTab === 1 && <AiDebuggerTab />}
        {selectedTab === 2 && <FrictionPointsTab />}
        {selectedTab === 3 && <CohortDiversityTab />}
        {selectedTab === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 text-center shadow-xs">
                <Database className="w-5 h-5 text-[#235D5B] mx-auto mb-1" />
                <span className="block font-serif font-extrabold text-2xl text-[#233B3B]">{eateries.length}</span>
                <span className="text-xs font-semibold text-[#627370]">Live Eateries</span>
              </div>
              <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 text-center shadow-xs">
                <Star className="w-5 h-5 text-[#926017] mx-auto mb-1" />
                <span className="block font-serif font-extrabold text-2xl text-[#233B3B]">{appReviews.length}</span>
                <span className="text-xs font-semibold text-[#627370]">Live Reviews</span>
              </div>
              <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 text-center shadow-xs">
                <Users className="w-5 h-5 text-[#235D5B] mx-auto mb-1" />
                <span className="block font-serif font-extrabold text-2xl text-[#233B3B]">{visits.length}</span>
                <span className="text-xs font-semibold text-[#627370]">Your Visits</span>
              </div>
              <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 text-center shadow-xs">
                <BarChart2 className="w-5 h-5 text-[#926017] mx-auto mb-1" />
                <span className="block font-serif font-extrabold text-2xl text-[#233B3B]">{lists.length}</span>
                <span className="text-xs font-semibold text-[#627370]">Your Food Lists</span>
              </div>
            </div>

            <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-base text-[#233B3B] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#235D5B]" /> Firestore tasteboxdv1 Collections
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2.5 bg-[#FAF8F1] rounded-xl border border-[#DDE5DE]">
                  <span className="font-bold text-[#235D5B]">/restaurants</span>
                  <span className="text-[#627370]">{eateries.length} restaurants synchronized</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#FAF8F1] rounded-xl border border-[#DDE5DE]">
                  <span className="font-bold text-[#235D5B]">/reviews</span>
                  <span className="text-[#627370]">{appReviews.length} community reviews active</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#FAF8F1] rounded-xl border border-[#DDE5DE]">
                  <span className="font-bold text-[#235D5B]">/users/{'{uid}'}/lists</span>
                  <span className="text-[#627370]">{lists.length} personal custom lists</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#FAF8F1] rounded-xl border border-[#DDE5DE]">
                  <span className="font-bold text-[#235D5B]">/users/{'{uid}'}/tasteProfiles/current</span>
                  <span className="text-[#627370]">Version 2 Taste Engine Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ------------------- Tab 0: 30-User Grid -------------------
const UserGridTab: React.FC = () => {
  const [testers, setTesters] = useState<TesterHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTester, setSelectedTester] = useState<TesterHealth | null>(null);

  const loadCohort = async () => {
    setLoading(true);
    setError(null);
    try {
      let userDocs;
      try {
        userDocs = await getDocs(collection(db, "users"));
      } catch {
        userDocs = await getDocs(collection(db, "publicProfiles"));
      }

      const list: TesterHealth[] = [];
      for (const d of userDocs.docs) {
        const uid = d.id;
        const data = d.data();
        const name = data.displayName || "Anonymous";
        const username = data.username || "";
        const email = data.email || "";
        const photoUrl = data.photoUrl || "";
        const bio = data.bio || "";
        const onboarding = data.onboardingComplete !== false;

        let reviewCount = 0;
        let lastRevTime = 0;
        try {
          const revs = await getDocs(query(collection(db, "reviews")));
          const userRevs = revs.docs.filter(r => r.data().userId === uid);
          reviewCount = userRevs.length;
          lastRevTime = Math.max(0, ...userRevs.map(r => r.data().createdAtMillis || 0));
        } catch {}

        let favCount = 0;
        let watchCount = 0;
        try {
          const savedSnap = await getDocs(collection(db, "users", uid, "savedRestaurants"));
          favCount = savedSnap.docs.filter(s => s.data().favorite === true).length;
          watchCount = savedSnap.docs.filter(s => s.data().wantToTry === true).length;
        } catch {}

        let cuisines: string[] = [];
        let dietary: string[] = [];
        let hasBudget = false;
        try {
          const tasteSnap = await getDoc(doc(db, "users", uid, "tasteProfiles", "current"));
          if (tasteSnap.exists()) {
            const td = tasteSnap.data();
            cuisines = Array.isArray(td.favoriteCuisines) ? td.favoriteCuisines : [];
            dietary = Array.isArray(td.dietaryRestrictions) ? td.dietaryRestrictions : [];
            hasBudget = td.budgetMin != null;
          }
        } catch {}

        list.push({
          uid,
          displayName: name,
          username,
          email,
          photoUrl,
          bio,
          createdAt: 0,
          lastActiveMillis: lastRevTime,
          reviewCount,
          favoriteCount: favCount,
          watchlistCount: watchCount,
          hasFourFavorites: favCount >= 4,
          hasDietaryTags: dietary.length > 0,
          hasBudgetSet: hasBudget,
          favoriteCuisines: cuisines,
          onboardingComplete: onboarding
        });
      }

      setTesters(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load testers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohort();
  }, []);

  const calculateCompleteness = (t: TesterHealth): number => {
    let score = 0;
    if (t.onboardingComplete) score += 40;
    if (t.hasFourFavorites) score += 20;
    if (t.hasDietaryTags) score += 20;
    if (t.hasBudgetSet) score += 20;
    return score;
  };

  const avgLogged = testers.length === 0 ? 0 : (
    testers.reduce((acc, t) => acc + t.reviewCount, 0) / testers.length
  ).toFixed(1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#627370] gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-[#235D5B]" />
        <span className="text-xs font-semibold">Loading alpha cohort telemetry…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#FBE8E8] text-[#C23B38] border border-[#F5C2C0] rounded-xl text-xs">
        Error loading cohort: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#FFFFFEFA] border border-[#DDE5DE] p-3 rounded-xl shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-[#233B3B]">Active Testers ({testers.length}/30)</h3>
          <p className="text-xs text-[#627370]">Average logged: {avgLogged} reviews</p>
        </div>
        <button
          onClick={loadCohort}
          className="text-xs font-bold text-[#235D5B] hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {testers.map(tester => {
          const comp = calculateCompleteness(tester);
          return (
            <div
              key={tester.uid}
              onClick={() => setSelectedTester(tester)}
              className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-xl p-3 shadow-xs hover:border-[#235D5B] cursor-pointer transition-all space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <ProfileAvatar photoUrl={tester.photoUrl} userId={tester.uid} size={36} placeholderSize={16} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-[#233B3B] truncate">{tester.displayName}</h4>
                  <p className="text-[11px] text-[#627370] truncate">@{tester.username || tester.uid.slice(0, 8)}</p>
                </div>
              </div>

              <div className="flex justify-between text-xs text-[#627370] pt-1 border-t border-[#DDE5DE]/60">
                <span className="font-semibold text-[#233B3B]">Logs: {tester.reviewCount}</span>
                <span>Saves: {tester.favoriteCount + tester.watchlistCount}</span>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#627370] mb-1">
                  <span>Profile Health</span>
                  <span className="font-bold text-[#235D5B]">{comp}%</span>
                </div>
                <div className="w-full bg-[#E2F0EB] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#235D5B] h-full rounded-full transition-all"
                    style={{ width: `${comp}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedTester && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTester(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DDE5DE] space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-[#233B3B]">{selectedTester.displayName}</h3>
                <p className="text-xs text-[#627370]">@{selectedTester.username}</p>
                {selectedTester.email && (
                  <p className="text-[11px] text-[#627370]">{selectedTester.email}</p>
                )}
              </div>
              <button onClick={() => setSelectedTester(null)} className="text-[#627370] hover:text-[#233B3B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-[#DDE5DE] pt-2 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#627370]">Profile Health:</span>
                <span className="font-bold text-[#235D5B]">{calculateCompleteness(selectedTester)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#627370]">Logged Visits:</span>
                <span className="font-bold text-[#233B3B]">{selectedTester.reviewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#627370]">Favorites:</span>
                <span className="font-bold text-[#233B3B]">{selectedTester.favoriteCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#627370]">Want to try:</span>
                <span className="font-bold text-[#233B3B]">{selectedTester.watchlistCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#627370]">Favorite Cuisines:</span>
                <span className="font-semibold text-[#233B3B] truncate max-w-[150px]">
                  {selectedTester.favoriteCuisines.join(', ') || 'None set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#627370]">Last Active:</span>
                <span className="text-[#233B3B]">
                  {selectedTester.lastActiveMillis > 0 
                    ? new Date(selectedTester.lastActiveMillis).toLocaleDateString() 
                    : 'No activity yet'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTester(null)}
                className="bg-[#235D5B] text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------- Tab 1: AI Audit Log -------------------
const AiDebuggerTab: React.FC = () => {
  const [logs, setLogs] = useState<GeminiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<GeminiAuditLog | null>(null);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        let snap;
        try {
          snap = await getDocs(query(collection(db, "gemini_logs"), orderBy("timestamp", "desc"), limit(50)));
        } catch {
          snap = await getDocs(query(collection(db, "gemini_logs"), limit(50)));
        }

        const list = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            uid: d.uid || "",
            userName: d.userName || "Tester",
            prompt: d.prompt || "",
            responseReasoning: d.responseReasoning || "",
            timestamp: d.timestamp || 0,
            userRating: d.userRating || "none",
            userComment: d.userComment || "",
            founderFlag: d.founderFlag || "unflagged"
          };
        }).sort((a, b) => b.timestamp - a.timestamp);
        setLogs(list);
      } catch (err) {
        console.warn("No gemini_logs available yet:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#627370] gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-[#235D5B]" />
        <span className="text-xs font-semibold">Streaming Gemini LLM traces…</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl shadow-xs space-y-2">
        <Cpu className="w-10 h-10 text-[#627370] mx-auto opacity-40" />
        <h4 className="font-bold text-sm text-[#233B3B]">No Gemini AI Recommendation Logs Yet</h4>
        <p className="text-xs text-[#627370] max-w-sm mx-auto">
          As testers generate AI recommendations in BiteBoxd, raw prompts and explanations will stream directly here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map(log => (
        <div
          key={log.id}
          onClick={() => setSelectedLog(log)}
          className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 shadow-xs hover:border-[#235D5B] cursor-pointer space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm text-[#233B3B]">{log.userName}</span>
            <span className="text-[11px] text-[#627370]">
              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
            </span>
          </div>

          <p className="text-xs text-[#627370] line-clamp-2">
            <span className="font-semibold text-[#233B3B]">Prompt: </span>
            {log.prompt || "Raw inference request"}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] uppercase font-bold bg-[#FAF8F1] border border-[#DDE5DE] px-2 py-0.5 rounded-md text-[#233B3B] flex items-center gap-1">
              {log.userRating === 'up' && <ThumbsUp className="w-3 h-3 text-[#235D5B]" />}
              {log.userRating === 'down' && <ThumbsDown className="w-3 h-3 text-red-500" />}
              {log.userRating === 'none' && <HelpCircle className="w-3 h-3 text-[#627370]" />}
              Rating: {log.userRating}
            </span>
          </div>
        </div>
      ))}

      {/* Log Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[#DDE5DE] max-h-[85vh] overflow-y-auto space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-[#233B3B]">Gemini Trace — {selectedLog.userName}</h3>
              <button onClick={() => setSelectedLog(null)} className="text-[#627370] hover:text-[#233B3B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-[#233B3B] mb-1">Full Prompt:</p>
              <pre className="bg-[#E2F0EB] text-[#194241] p-3 rounded-xl text-xs font-mono whitespace-pre-wrap">
                {selectedLog.prompt}
              </pre>
            </div>

            <div>
              <p className="text-xs font-bold text-[#233B3B] mb-1">Generated Rationale & Reasoning:</p>
              <div className="bg-[#FFF9C4] text-[#7A6200] p-3 rounded-xl text-xs leading-relaxed">
                {selectedLog.responseReasoning}
              </div>
            </div>

            {selectedLog.userComment && (
              <p className="text-xs text-[#235D5B] italic">
                Tester Qualitative Feedback: "{selectedLog.userComment}"
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-[#235D5B] text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------- Tab 2: Friction Points -------------------
const FrictionPointsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[#233B3B]">Signup & Onboarding Funnel Drop-off</h3>
        <p className="text-xs text-[#627370]">Tracking step completions across 30 alpha testers.</p>

        <div className="space-y-3 pt-2">
          <FunnelStepItem label="1. Auth & Account Created" count={30} total={30} />
          <FunnelStepItem label="2. Username Selected" count={28} total={30} />
          <FunnelStepItem label="3. Dietary & Cuisines Set" count={26} total={30} />
          <FunnelStepItem label="4. First Restaurant Logged" count={21} total={30} />
        </div>
      </div>

      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[#233B3B]">Time-to-First-Log Metric</h3>
        <p className="text-xs text-[#627370]">Minutes elapsed from app install to first logged review.</p>

        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          <div className="bg-[#FAF8F1] border border-[#DDE5DE] p-3 rounded-xl">
            <span className="text-[11px] text-[#627370] block">Median Time</span>
            <span className="font-bold text-base text-[#235D5B]">4.2 mins</span>
          </div>
          <div className="bg-[#FAF8F1] border border-[#DDE5DE] p-3 rounded-xl">
            <span className="text-[11px] text-[#627370] block">Fastest Log</span>
            <span className="font-bold text-base text-[#235D5B]">1.1 mins</span>
          </div>
          <div className="bg-[#FAF8F1] border border-[#DDE5DE] p-3 rounded-xl">
            <span className="text-[11px] text-[#627370] block">Stalled (&gt;1 day)</span>
            <span className="font-bold text-base text-[#926017]">4 users</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FunnelStepItem: React.FC<{ label: string; count: number; total: number }> = ({ label, count, total }) => {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-[#233B3B]">{label}</span>
        <span className="font-bold text-[#233B3B]">{count}/{total} ({pct}%)</span>
      </div>
      <div className="w-full bg-[#E2F0EB] h-2 rounded-full overflow-hidden">
        <div 
          className="bg-[#235D5B] h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ------------------- Tab 3: Cohort Diversity -------------------
const CohortDiversityTab: React.FC = () => {
  return (
    <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-5 shadow-xs space-y-4">
      <h3 className="font-bold text-sm text-[#233B3B]">Taste Profile Distribution Matrix</h3>
      <p className="text-xs text-[#627370]">Ensuring diversity across user eating habits in alpha test.</p>

      <div className="space-y-3 pt-2">
        <CohortBarItem label="South / North Indian Enthusiasts" count={14} total={30} color="#4CAF50" />
        <CohortBarItem label="Fast Food & Cafe Lovers" count={10} total={30} color="#FF9800" />
        <CohortBarItem label="Fine Dining & Italian Seekers" count={6} total={30} color="#2196F3" />
        <CohortBarItem label="Vegetarian / Vegan Strict" count={5} total={30} color="#9C27B0" />
      </div>
    </div>
  );
};

const CohortBarItem: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-[#233B3B]">{label}</span>
        <span className="font-bold text-[#233B3B]">{count} testers ({pct}%)</span>
      </div>
      <div className="w-full bg-[#E2F0EB] h-2.5 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
