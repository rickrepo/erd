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
    name: 'Sales Dashboard Reports',
    description: 'Order analytics, revenue tracking, and customer insights',
    sql: `-- SCENARIO 1: Sales Dashboard Reports
-- These queries power the main sales dashboard

-- Query 1: Order Summary with Customer Details
SELECT
    o.order_number,
    o.created_at,
    o.status,
    o.total_amount,
    u.username,
    u.email,
    u.first_name,
    u.last_name
FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC;

-- Query 2: Order with Shipping Address
SELECT
    o.order_number,
    o.total_amount,
    a.street_address,
    a.city,
    a.state,
    a.postal_code,
    a.country
FROM orders o
JOIN addresses a ON o.shipping_address_id = a.id
WHERE o.status = 'shipped';

-- Query 3: Daily Revenue Summary
SELECT
    DATE(o.created_at) AS order_date,
    COUNT(*) AS order_count,
    SUM(o.total_amount) AS daily_revenue
FROM orders o
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;`,
    isActive: true,
    order: 0,
  },
  {
    id: 'demo-2',
    name: 'Product Catalog Management',
    description: 'Product listings, categories, and inventory reports',
    sql: `-- SCENARIO 2: Product Catalog Management
-- Queries for managing products and categories

-- Query 1: Products by Category
SELECT
    p.name AS product_name,
    p.sku,
    p.price,
    p.stock_quantity,
    c.name AS category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY c.name, p.name;

-- Query 2: Category Hierarchy
SELECT
    child.name AS subcategory,
    parent.name AS parent_category
FROM categories child
LEFT JOIN categories parent ON child.parent_id = parent.id
ORDER BY parent.name, child.name;

-- Query 3: Low Stock Alert
SELECT
    p.name,
    p.sku,
    p.stock_quantity,
    c.name AS category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.stock_quantity < 10
  AND p.is_active = true
ORDER BY p.stock_quantity ASC;`,
    isActive: true,
    order: 1,
  },
  {
    id: 'demo-3',
    name: 'Order Line Items Analysis',
    description: 'Detailed order breakdown with products and pricing',
    sql: `-- SCENARIO 3: Order Line Items Analysis
-- Understanding what customers are buying

-- Query 1: Order Details with Items
SELECT
    o.order_number,
    p.name AS product_name,
    oi.quantity,
    oi.unit_price,
    oi.discount,
    (oi.quantity * oi.unit_price - COALESCE(oi.discount, 0)) AS line_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
ORDER BY o.order_number;

-- Query 2: Best Selling Products
SELECT
    p.name,
    p.sku,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY p.id, p.name, p.sku
ORDER BY total_sold DESC;

-- Query 3: Product Performance by Category
SELECT
    c.name AS category,
    COUNT(DISTINCT p.id) AS product_count,
    SUM(oi.quantity) AS units_sold
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY units_sold DESC;`,
    isActive: true,
    order: 2,
  },
  {
    id: 'demo-4',
    name: 'Customer Address Book',
    description: 'User profiles with shipping addresses',
    sql: `-- SCENARIO 4: Customer Address Book
-- Managing user profiles and addresses

-- Query 1: Users with Addresses
SELECT
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    a.label,
    a.street_address,
    a.city,
    a.country,
    a.is_default
FROM users u
JOIN addresses a ON a.user_id = u.id
ORDER BY u.username, a.is_default DESC;

-- Query 2: Users with Order History
SELECT
    u.username,
    u.email,
    COUNT(o.id) AS total_orders,
    SUM(o.total_amount) AS lifetime_value,
    MAX(o.created_at) AS last_order
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.username, u.email
ORDER BY lifetime_value DESC;

-- Query 3: Shipping Destinations
SELECT
    a.country,
    a.city,
    COUNT(DISTINCT a.user_id) AS customer_count
FROM addresses a
GROUP BY a.country, a.city
ORDER BY customer_count DESC;`,
    isActive: true,
    order: 3,
  },
  {
    id: 'demo-5',
    name: 'Full E-Commerce Overview',
    description: 'Complete data model with all table relationships',
    sql: `-- SCENARIO 5: Full E-Commerce Overview
-- Complete picture of the data model

-- Query 1: Complete Order View
SELECT
    o.order_number,
    o.status,
    o.total_amount,
    u.username AS customer,
    u.email,
    a.city AS ship_to_city,
    a.country AS ship_to_country
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN addresses a ON o.shipping_address_id = a.id;

-- Query 2: Order Items with Full Details
SELECT
    o.order_number,
    u.username,
    p.name AS product,
    c.name AS category,
    oi.quantity,
    oi.unit_price
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id;

-- Query 3: Customer 360 View
SELECT
    u.username,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT o.id) AS orders,
    COUNT(DISTINCT a.id) AS addresses,
    SUM(o.total_amount) AS total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
LEFT JOIN addresses a ON a.user_id = u.id
GROUP BY u.id, u.username, u.first_name, u.last_name;`,
    isActive: true,
    order: 4,
  },
];

// Version for demo queries - increment when queries change
const DEMO_QUERIES_VERSION = 2;

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
      version: DEMO_QUERIES_VERSION,
      partialize: (state) => ({
        isAdmin: state.isAdmin,
        users: state.users,
        activityLogs: state.activityLogs,
        demoQueries: state.demoQueries,
        currentDemoIndex: state.currentDemoIndex,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AdminStore>;
        // Reset demo queries when version changes to ensure fresh defaults
        if (version < DEMO_QUERIES_VERSION) {
          return {
            ...state,
            demoQueries: createDefaultDemoQueries(),
            currentDemoIndex: 0,
          };
        }
        return state as AdminStore;
      },
    }
  )
);
