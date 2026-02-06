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

export interface DemoQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
  isActive: boolean;
  order: number;
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
  demoQueries: DemoQuery[];
  currentDemoIndex: number;

  // Actions
  setIsAdmin: (isAdmin: boolean) => void;
  setShowAdminPanel: (show: boolean) => void;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  updateUserSubscription: (userId: string, tier: SubscriptionTier) => void;
  deleteUser: (userId: string) => void;
  refreshStats: () => void;

  // Demo query management
  addDemoQuery: (query: Omit<DemoQuery, 'id' | 'order'>) => void;
  updateDemoQuery: (id: string, updates: Partial<Omit<DemoQuery, 'id'>>) => void;
  deleteDemoQuery: (id: string) => void;
  reorderDemoQueries: (queries: DemoQuery[]) => void;
  getActiveDemoQueries: () => DemoQuery[];
  getCurrentDemoQuery: () => DemoQuery | null;
  cycleToNextDemo: () => void;

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

const createDefaultDemoQueries = (): DemoQuery[] => [
  {
    id: 'demo-1',
    name: 'E-Commerce Orders',
    description: 'Order summary with customer details and shipping info',
    sql: `-- E-Commerce Order Report
SELECT
    o.order_number,
    o.created_at AS order_date,
    u.email AS customer_email,
    u.first_name || ' ' || u.last_name AS customer_name,
    a.city || ', ' || a.country AS shipping_location,
    o.total_amount,
    o.status
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN addresses a ON o.shipping_address_id = a.id
WHERE o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC;`,
    isActive: true,
    order: 0,
  },
  {
    id: 'demo-2',
    name: 'Product Sales Analysis',
    description: 'Sales performance by product and category',
    sql: `-- Product Sales Analysis
SELECT
    p.name AS product_name,
    c.name AS category,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, c.name
ORDER BY revenue DESC;`,
    isActive: true,
    order: 1,
  },
  {
    id: 'demo-3',
    name: 'Customer Lifetime Value',
    description: 'Customer order history and spending patterns',
    sql: `-- Customer Lifetime Value
SELECT
    u.username,
    u.email,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(o.total_amount) AS lifetime_value,
    AVG(o.total_amount) AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username, u.email
HAVING COUNT(o.id) > 0
ORDER BY lifetime_value DESC;`,
    isActive: true,
    order: 2,
  },
  {
    id: 'demo-4',
    name: 'Inventory Status',
    description: 'Product stock levels with category breakdown',
    sql: `-- Inventory Status Report
SELECT
    c.name AS category,
    p.name AS product,
    p.sku,
    p.stock_quantity,
    p.price,
    CASE
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity < 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY p.stock_quantity ASC;`,
    isActive: true,
    order: 3,
  },
  {
    id: 'demo-5',
    name: 'Full Schema Overview',
    description: 'Complete e-commerce data model with all relationships',
    sql: `-- Full E-Commerce Schema Overview
-- Order Details with All Relationships
SELECT
    o.order_number,
    u.username AS customer,
    u.email,
    a.street_address,
    a.city,
    a.country,
    p.name AS product,
    c.name AS category,
    oi.quantity,
    oi.unit_price,
    o.total_amount,
    o.status
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN addresses a ON o.shipping_address_id = a.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
ORDER BY o.created_at DESC
LIMIT 100;`,
    isActive: true,
    order: 4,
  },
];

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
      demoQueries: createDefaultDemoQueries(),
      currentDemoIndex: 0,

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

      // Demo query management
      addDemoQuery: (query) => {
        const { demoQueries } = get();
        const newQuery: DemoQuery = {
          ...query,
          id: generateId(),
          order: demoQueries.length,
        };
        set({ demoQueries: [...demoQueries, newQuery] });
      },

      updateDemoQuery: (id, updates) => {
        const { demoQueries } = get();
        set({
          demoQueries: demoQueries.map(q =>
            q.id === id ? { ...q, ...updates } : q
          ),
        });
      },

      deleteDemoQuery: (id) => {
        const { demoQueries, currentDemoIndex } = get();
        const newQueries = demoQueries.filter(q => q.id !== id);
        // Reorder remaining queries
        const reorderedQueries = newQueries.map((q, idx) => ({ ...q, order: idx }));
        // Adjust current index if needed
        const activeQueries = reorderedQueries.filter(q => q.isActive);
        const newIndex = currentDemoIndex >= activeQueries.length ? 0 : currentDemoIndex;
        set({ demoQueries: reorderedQueries, currentDemoIndex: newIndex });
      },

      reorderDemoQueries: (queries) => {
        set({ demoQueries: queries.map((q, idx) => ({ ...q, order: idx })) });
      },

      getActiveDemoQueries: () => {
        const { demoQueries } = get();
        return demoQueries
          .filter(q => q.isActive)
          .sort((a, b) => a.order - b.order);
      },

      getCurrentDemoQuery: () => {
        const { demoQueries, currentDemoIndex } = get();
        const activeQueries = demoQueries
          .filter(q => q.isActive)
          .sort((a, b) => a.order - b.order);
        if (activeQueries.length === 0) return null;
        return activeQueries[currentDemoIndex % activeQueries.length];
      },

      cycleToNextDemo: () => {
        const { demoQueries, currentDemoIndex } = get();
        const activeQueries = demoQueries.filter(q => q.isActive);
        if (activeQueries.length === 0) return;
        set({ currentDemoIndex: (currentDemoIndex + 1) % activeQueries.length });
      },

      loadDemoData: () => {
        const users = createDemoUsers();
        const logs = createDemoLogs(users);
        const stats = calculateStats(users, logs);
        // Initialize demo queries if empty
        const { demoQueries } = get();
        const queries = demoQueries.length === 0 ? createDefaultDemoQueries() : demoQueries;
        set({ users, activityLogs: logs, stats, isAdmin: true, demoQueries: queries });
      },
    }),
    {
      name: 'schemaflow-admin',
      partialize: (state) => ({
        isAdmin: state.isAdmin,
        users: state.users,
        activityLogs: state.activityLogs,
        demoQueries: state.demoQueries,
        currentDemoIndex: state.currentDemoIndex,
      }),
    }
  )
);
