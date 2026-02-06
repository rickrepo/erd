import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Subscription, UsageStats, SubscriptionFeatures } from '../types';
import { FREE_TIER_LIMITS, PRO_TIER_FEATURES, ENTERPRISE_TIER_FEATURES, ANONYMOUS_LIMITS } from '../types';
import {
  getUsageData,
  incrementAnonymousUsage,
  canAnonymousGenerate,
  getRemainingAnonymousGenerations,
  linkUsageToUser,
} from '../utils/usageTracking';
import { switchUserStorage } from './useStore';
import { useAdminStore } from './useAdminStore';

// Admin accounts - in production, this would be validated server-side with hashed passwords
const ADMIN_ACCOUNTS: Record<string, string> = {
  'admin@schemaflow.io': 'SchemaFlow2024!',
  'admin@example.com': 'Admin@2024Secure',
};

const ADMIN_EMAILS = Object.keys(ADMIN_ACCOUNTS);

interface AuthStore {
  // State
  user: User | null;
  subscription: Subscription;
  usage: UsageStats;
  showPremiumModal: boolean;
  showUsageLimitModal: boolean;
  showAuthPage: boolean;
  premiumModalTrigger: 'limit' | 'feature' | 'upgrade' | null;

  // Auth Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;

  // Subscription Actions
  setSubscription: (subscription: Subscription) => void;
  upgradeToPro: () => Promise<boolean>;
  upgradeToEnterprise: () => Promise<boolean>;

  // Usage Actions
  incrementUsage: () => Promise<boolean>;
  canGenerate: () => Promise<boolean>;
  getRemainingGenerations: () => Promise<number>;
  resetDailyUsage: () => void;
  getAnonymousUsageData: () => Promise<{ used: number; limit: number; remaining: number }>;

  // Modal Actions
  setShowPremiumModal: (show: boolean, trigger?: 'limit' | 'feature' | 'upgrade') => void;
  setShowUsageLimitModal: (show: boolean) => void;
  setShowAuthPage: (show: boolean) => void;

  // Feature Checks
  hasFeature: (feature: keyof SubscriptionFeatures) => boolean;
  getFeatures: () => SubscriptionFeatures;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getFeaturesByTier = (tier: 'free' | 'pro' | 'enterprise'): SubscriptionFeatures => {
  switch (tier) {
    case 'pro':
      return PRO_TIER_FEATURES;
    case 'enterprise':
      return ENTERPRISE_TIER_FEATURES;
    default:
      return FREE_TIER_LIMITS;
  }
};

const initialUsage: UsageStats = {
  generationsToday: 0,
  generationsTotal: 0,
  lastResetDate: getTodayDateString(),
};

const initialSubscription: Subscription = {
  tier: 'free',
  features: FREE_TIER_LIMITS,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      subscription: initialSubscription,
      usage: initialUsage,
      showPremiumModal: false,
      showUsageLimitModal: false,
      showAuthPage: false,
      premiumModalTrigger: null,

      // Auth Actions
      setUser: (user) => set({ user }),

      login: async (email, password) => {
        // Simulated login - in production, this would call an API with proper validation
        await new Promise(resolve => setTimeout(resolve, 1000));

        const emailLower = email.toLowerCase();

        // Check for admin email and validate password
        const isAdminUser = ADMIN_EMAILS.includes(emailLower);
        if (isAdminUser) {
          const expectedPassword = ADMIN_ACCOUNTS[emailLower];
          if (password !== expectedPassword) {
            throw new Error('Invalid credentials');
          }
        }

        // For non-admin users, accept any valid password (simulated)
        if (!password || password.length < 8) {
          throw new Error('Invalid credentials');
        }

        const user: User = {
          id: `user-${Date.now()}`,
          email,
          name: isAdminUser ? 'Administrator' : email.split('@')[0],
          createdAt: new Date(),
        };

        // Admin users get enterprise features
        const subscription: Subscription = isAdminUser
          ? { tier: 'enterprise', features: ENTERPRISE_TIER_FEATURES }
          : initialSubscription;

        set({ user, subscription, showAuthPage: false });
        // Load this user's saved schema data from their scoped storage
        setTimeout(() => switchUserStorage(), 0);

        // Link anonymous usage to this user
        await linkUsageToUser(user.id);

        // Log the login activity
        useAdminStore.getState().addActivityLog({
          userId: user.id,
          userEmail: user.email,
          action: 'login',
          details: `User logged in${isAdminUser ? ' (admin)' : ''}`,
        });

        return true;
      },

      register: async (email, _password, name) => {
        // Simulated registration - in production, this would call an API
        await new Promise(resolve => setTimeout(resolve, 1000));

        const user: User = {
          id: `user-${Date.now()}`,
          email,
          name: name || email.split('@')[0],
          createdAt: new Date(),
        };

        set({ user, showAuthPage: false });
        // Load this user's saved schema data from their scoped storage
        setTimeout(() => switchUserStorage(), 0);

        // Link anonymous usage to this user
        await linkUsageToUser(user.id);

        // Log the registration activity
        useAdminStore.getState().addActivityLog({
          userId: user.id,
          userEmail: user.email,
          action: 'register',
          details: 'New user registered',
        });

        return true;
      },

      logout: () => {
        set({
          user: null,
          subscription: initialSubscription,
          showAuthPage: false,
        });
        // Switch to anonymous storage after logout
        setTimeout(() => switchUserStorage(), 0);
      },

      isAuthenticated: () => {
        const { user } = get();
        return user !== null;
      },

      isAdmin: () => {
        const { user } = get();
        if (!user) return false;
        return ADMIN_EMAILS.includes(user.email.toLowerCase());
      },

      // Subscription Actions
      setSubscription: (subscription) => set({ subscription }),

      upgradeToPro: async () => {
        // Simulated upgrade - in production, this would integrate with Stripe/payment
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newSubscription: Subscription = {
          tier: 'pro',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          features: PRO_TIER_FEATURES,
        };

        const { user } = get();
        set({
          subscription: newSubscription,
          showPremiumModal: false,
          showUsageLimitModal: false,
        });

        // Log the upgrade
        if (user) {
          useAdminStore.getState().addActivityLog({
            userId: user.id,
            userEmail: user.email,
            action: 'upgrade',
            details: 'Upgraded to Pro subscription',
          });
        }

        return true;
      },

      upgradeToEnterprise: async () => {
        // Simulated enterprise upgrade
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newSubscription: Subscription = {
          tier: 'enterprise',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          features: ENTERPRISE_TIER_FEATURES,
        };

        const { user } = get();
        set({
          subscription: newSubscription,
          showPremiumModal: false,
          showUsageLimitModal: false,
        });

        // Log the upgrade
        if (user) {
          useAdminStore.getState().addActivityLog({
            userId: user.id,
            userEmail: user.email,
            action: 'upgrade',
            details: 'Upgraded to Enterprise subscription',
          });
        }

        return true;
      },

      // Usage Actions
      incrementUsage: async () => {
        const { user, usage, resetDailyUsage, isAdmin } = get();

        // Admins have unlimited access
        if (isAdmin()) {
          return true;
        }

        // Anonymous user tracking (uses robust multi-storage fingerprinting)
        if (!user) {
          const canGen = await canAnonymousGenerate(ANONYMOUS_LIMITS.maxGenerationsTotal);
          if (!canGen) {
            set({ showUsageLimitModal: true });
            return false;
          }
          await incrementAnonymousUsage();
          return true;
        }

        // Registered user - daily limit tracking
        const today = getTodayDateString();
        if (usage.lastResetDate !== today) {
          resetDailyUsage();
        }

        const currentUsage = get().usage;
        const { subscription } = get();
        if (currentUsage.generationsToday >= subscription.features.maxGenerationsPerDay) {
          set({ showUsageLimitModal: true });
          return false;
        }

        set({
          usage: {
            ...currentUsage,
            generationsToday: currentUsage.generationsToday + 1,
            generationsTotal: currentUsage.generationsTotal + 1,
            lastGenerationAt: new Date(),
            lastResetDate: today,
          }
        });

        return true;
      },

      canGenerate: async () => {
        const { user, usage, subscription, isAdmin } = get();

        // Admins always can generate
        if (isAdmin()) {
          return true;
        }

        // Anonymous user check
        if (!user) {
          return canAnonymousGenerate(ANONYMOUS_LIMITS.maxGenerationsTotal);
        }

        // Registered user check
        const today = getTodayDateString();
        const currentGenerations = usage.lastResetDate !== today ? 0 : usage.generationsToday;
        return currentGenerations < subscription.features.maxGenerationsPerDay;
      },

      getRemainingGenerations: async () => {
        const { user, usage, subscription, isAdmin } = get();

        // Admins have unlimited
        if (isAdmin()) {
          return Infinity;
        }

        // Anonymous user
        if (!user) {
          return getRemainingAnonymousGenerations(ANONYMOUS_LIMITS.maxGenerationsTotal);
        }

        // Registered user
        const today = getTodayDateString();
        const currentGenerations = usage.lastResetDate !== today ? 0 : usage.generationsToday;
        const remaining = subscription.features.maxGenerationsPerDay - currentGenerations;
        return Math.max(0, remaining);
      },

      getAnonymousUsageData: async () => {
        const data = await getUsageData();
        return {
          used: data.anonymousGenerations,
          limit: ANONYMOUS_LIMITS.maxGenerationsTotal,
          remaining: Math.max(0, ANONYMOUS_LIMITS.maxGenerationsTotal - data.anonymousGenerations),
        };
      },

      resetDailyUsage: () => {
        const { usage } = get();
        set({
          usage: {
            ...usage,
            generationsToday: 0,
            lastResetDate: getTodayDateString(),
          }
        });
      },

      // Modal Actions
      setShowPremiumModal: (show, trigger) => set({
        showPremiumModal: show,
        premiumModalTrigger: trigger || null,
      }),

      setShowUsageLimitModal: (show) => set({ showUsageLimitModal: show }),

      setShowAuthPage: (show) => set({ showAuthPage: show }),

      // Feature Checks
      hasFeature: (feature) => {
        const { subscription } = get();
        const value = subscription.features[feature];
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value > 0;
        return false;
      },

      getFeatures: () => {
        const { subscription } = get();
        return subscription.features;
      },
    }),
    {
      name: 'schemaflow-auth',
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        usage: state.usage,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthStore> | undefined;
        if (persisted?.subscription?.tier) {
          // Ensure features are properly loaded based on tier
          persisted.subscription.features = getFeaturesByTier(persisted.subscription.tier);
        }
        return { ...currentState, ...persisted };
      },
    }
  )
);
