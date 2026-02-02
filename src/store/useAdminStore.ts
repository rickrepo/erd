import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, SubscriptionTier } from '../types';

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'generation' | 'login' | 'register' | 'upgrade' | 'export' | 'ai_analysis';
  details: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AdminUser extends User {
  subscription: SubscriptionTier;
  generationsToday: number;
  generationsTotal: number;
  lastActive: Date;
  isAdmin: boolean;
}

interface AdminStats {
  totalUsers: number;
  activeUsersToday: number;
  totalGenerations: number;
  generationsToday: number;
  proSubscribers: number;
  enterpriseSubscribers: number;
}

interface AdminStore {
  // State
  isAdmin: boolean;
  showAdminPanel: boolean;
  users: AdminUser[];
  activityLogs: ActivityLog[];
  stats: AdminStats;

  // Actions
  setIsAdmin: (isAdmin: boolean) => void;
  setShowAdminPanel: (show: boolean) => void;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  updateUserSubscription: (userId: string, tier: SubscriptionTier) => void;
  deleteUser: (userId: string) => void;
  refreshStats: () => void;

  // Demo data
  loadDemoData: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createDemoUsers = (): AdminUser[] => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'user-admin-1',
      email: 'admin@schemaflow.io',
      name: 'Admin User',
      createdAt: weekAgo,
      subscription: 'enterprise',
      generationsToday: 12,
      generationsTotal: 156,
      lastActive: now,
      isAdmin: true,
    },
    {
      id: 'user-pro-1',
      email: 'sarah.dev@company.com',
      name: 'Sarah Chen',
      createdAt: weekAgo,
      subscription: 'pro',
      generationsToday: 8,
      generationsTotal: 89,
      lastActive: now,
      isAdmin: false,
    },
    {
      id: 'user-pro-2',
      email: 'mike.johnson@startup.io',
      name: 'Mike Johnson',
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      subscription: 'pro',
      generationsToday: 3,
      generationsTotal: 45,
      lastActive: dayAgo,
      isAdmin: false,
    },
    {
      id: 'user-free-1',
      email: 'alex.newuser@gmail.com',
      name: 'Alex Thompson',
      createdAt: dayAgo,
      subscription: 'free',
      generationsToday: 2,
      generationsTotal: 5,
      lastActive: now,
      isAdmin: false,
    },
    {
      id: 'user-free-2',
      email: 'jamie.lee@university.edu',
      name: 'Jamie Lee',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      subscription: 'free',
      generationsToday: 3,
      generationsTotal: 9,
      lastActive: dayAgo,
      isAdmin: false,
    },
    {
      id: 'user-free-3',
      email: 'taylor.smith@example.com',
      name: 'Taylor Smith',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      subscription: 'free',
      generationsToday: 0,
      generationsTotal: 3,
      lastActive: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      isAdmin: false,
    },
  ];
};

const createDemoLogs = (users: AdminUser[]): ActivityLog[] => {
  const logs: ActivityLog[] = [];
  const now = new Date();

  const actions: Array<{ action: ActivityLog['action']; details: string }> = [
    { action: 'generation', details: 'Generated ERD from SQL query' },
    { action: 'generation', details: 'Generated ERD from CREATE TABLE statements' },
    { action: 'export', details: 'Exported ERD as PNG' },
    { action: 'export', details: 'Exported ERD as SVG' },
    { action: 'ai_analysis', details: 'Ran AI-powered relationship analysis' },
    { action: 'login', details: 'User logged in' },
    { action: 'upgrade', details: 'Upgraded to Pro subscription' },
  ];

  // Generate random logs for the past 24 hours
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const hoursAgo = Math.random() * 24;

    logs.push({
      id: generateId(),
      userId: user.id,
      userEmail: user.email,
      action: action.action,
      details: action.details,
      timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
    });
  }

  // Sort by timestamp descending
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const calculateStats = (users: AdminUser[], logs: ActivityLog[]): AdminStats => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const generationsToday = logs.filter(
    l => l.action === 'generation' && new Date(l.timestamp) >= todayStart
  ).length;

  const activeUsersToday = new Set(
    logs
      .filter(l => new Date(l.timestamp) >= todayStart)
      .map(l => l.userId)
  ).size;

  return {
    totalUsers: users.length,
    activeUsersToday,
    totalGenerations: logs.filter(l => l.action === 'generation').length,
    generationsToday,
    proSubscribers: users.filter(u => u.subscription === 'pro').length,
    enterpriseSubscribers: users.filter(u => u.subscription === 'enterprise').length,
  };
};

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      // Initial State
      isAdmin: false,
      showAdminPanel: false,
      users: [],
      activityLogs: [],
      stats: {
        totalUsers: 0,
        activeUsersToday: 0,
        totalGenerations: 0,
        generationsToday: 0,
        proSubscribers: 0,
        enterpriseSubscribers: 0,
      },

      // Actions
      setIsAdmin: (isAdmin) => set({ isAdmin }),

      setShowAdminPanel: (show) => set({ showAdminPanel: show }),

      addActivityLog: (log) => {
        const { activityLogs, refreshStats } = get();
        const newLog: ActivityLog = {
          ...log,
          id: generateId(),
          timestamp: new Date(),
        };
        set({ activityLogs: [newLog, ...activityLogs].slice(0, 500) }); // Keep last 500 logs
        refreshStats();
      },

      updateUserSubscription: (userId, tier) => {
        const { users, addActivityLog, refreshStats } = get();
        const user = users.find(u => u.id === userId);

        if (user) {
          set({
            users: users.map(u =>
              u.id === userId ? { ...u, subscription: tier } : u
            ),
          });

          addActivityLog({
            userId,
            userEmail: user.email,
            action: 'upgrade',
            details: `Subscription changed to ${tier} by admin`,
          });

          refreshStats();
        }
      },

      deleteUser: (userId) => {
        const { users, activityLogs, refreshStats } = get();
        set({
          users: users.filter(u => u.id !== userId),
          activityLogs: activityLogs.filter(l => l.userId !== userId),
        });
        refreshStats();
      },

      refreshStats: () => {
        const { users, activityLogs } = get();
        set({ stats: calculateStats(users, activityLogs) });
      },

      loadDemoData: () => {
        const users = createDemoUsers();
        const logs = createDemoLogs(users);
        const stats = calculateStats(users, logs);
        set({ users, activityLogs: logs, stats, isAdmin: true });
      },
    }),
    {
      name: 'schemaflow-admin',
      partialize: (state) => ({
        isAdmin: state.isAdmin,
        users: state.users,
        activityLogs: state.activityLogs,
      }),
    }
  )
);
