import { useState, useEffect } from 'react';
import {
  X,
  Users,
  Activity,
  BarChart3,
  Crown,
  Shield,
  Trash2,
  ChevronDown,
  RefreshCw,
  Download,
  Search,
  Calendar,
  Zap,
  FileImage,
  LogIn,
  Sparkles,
  TrendingUp,
  Clock,
  Database,
  Plus,
  GripVertical,
  Eye,
  EyeOff,
  Edit3,
  Check,
} from 'lucide-react';
import { Branding } from '../common/Branding';
import { useAdminStore } from '../../store/useAdminStore';
import type { ActivityLog } from '../../store/useAdminStore';
import type { SubscriptionTier } from '../../types';

interface AdminPanelProps {
  onClose: () => void;
}

type TabType = 'dashboard' | 'users' | 'logs' | 'content';

export function AdminPanel({ onClose }: AdminPanelProps) {
  const {
    users,
    activityLogs,
    stats,
    loadDemoData,
    updateUserSubscription,
    deleteUser,
    refreshStats,
    demoQueries,
    addDemoQuery,
    updateDemoQuery,
    deleteDemoQuery,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'all'>('all');
  const [logFilter, setLogFilter] = useState<ActivityLog['action'] | 'all'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingQuery, setEditingQuery] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description: string; sql: string }>({ name: '', description: '', sql: '' });
  const [showAddQuery, setShowAddQuery] = useState(false);
  const [newQueryForm, setNewQueryForm] = useState({ name: '', description: '', sql: '' });

  // Load demo data if no users exist
  useEffect(() => {
    if (users.length === 0) {
      loadDemoData();
    }
  }, [users.length, loadDemoData]);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || user.subscription === tierFilter;
    return matchesSearch && matchesTier;
  });

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = log.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = logFilter === 'all' || log.action === logFilter;
    return matchesSearch && matchesAction;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActionIcon = (action: ActivityLog['action']) => {
    switch (action) {
      case 'generation':
        return <Zap className="w-4 h-4 text-blue-400" />;
      case 'export':
        return <FileImage className="w-4 h-4 text-green-400" />;
      case 'login':
        return <LogIn className="w-4 h-4 text-slate-400" />;
      case 'register':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'upgrade':
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 'ai_analysis':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTierBadge = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'pro':
        return (
          <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-bold rounded-full">
            PRO
          </span>
        );
      case 'enterprise':
        return (
          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
            ENTERPRISE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-[10px] font-semibold rounded-full">
            FREE
          </span>
        );
    }
  };

  const handleExportLogs = () => {
    const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csv = [
      ['Timestamp', 'User Email', 'Action', 'Details'].join(','),
      ...filteredLogs.map(log =>
        [
          escapeCSV(new Date(log.timestamp).toISOString()),
          escapeCSV(log.userEmail),
          escapeCSV(log.action),
          escapeCSV(log.details),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schemaflow-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <Branding size="md" variant="dark" />
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Admin Panel</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { id: 'dashboard' as TabType, label: 'Dashboard', icon: BarChart3 },
            { id: 'users' as TabType, label: 'Users', icon: Users, count: users.length },
            { id: 'logs' as TabType, label: 'Activity Logs', icon: Activity, count: activityLogs.length },
            { id: 'content' as TabType, label: 'Demo Content', icon: Database, count: demoQueries.filter(q => q.isActive).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-500 bg-slate-700/30'
                  : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-700/20'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] bg-slate-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                      <p className="text-xs text-slate-400">Total Users</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>{stats.activeUsersToday} active today</span>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalGenerations}</p>
                      <p className="text-xs text-slate-400">Total Generations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-400">
                    <Clock className="w-3 h-3" />
                    <span>{stats.generationsToday} today</span>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.proSubscribers}</p>
                      <p className="text-xs text-slate-400">Pro Subscribers</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    ${stats.proSubscribers * 12}/mo revenue
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.enterpriseSubscribers}</p>
                      <p className="text-xs text-slate-400">Enterprise</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Custom pricing
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Recent Activity
                  </h3>
                  <button
                    onClick={refreshStats}
                    className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {activityLogs.slice(0, 10).map(log => (
                    <div key={log.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-800/50">
                      {getActionIcon(log.action)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{log.details}</p>
                        <p className="text-xs text-slate-500">{log.userEmail}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="relative">
                  <select
                    value={tierFilter}
                    onChange={e => setTierFilter(e.target.value as SubscriptionTier | 'all')}
                    className="appearance-none px-4 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                  >
                    <option value="all">All Tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Subscription
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Generations
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Last Active
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white flex items-center gap-2">
                                {user.name || 'No name'}
                                {user.isAdmin && (
                                  <span title="Admin">
                                    <Shield className="w-3 h-3 text-red-400" />
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block">
                            <select
                              value={user.subscription}
                              onChange={e => updateUserSubscription(user.id, e.target.value as SubscriptionTier)}
                              className="appearance-none bg-transparent border-0 text-white cursor-pointer focus:outline-none pr-6 [&>option]:bg-slate-900 [&>option]:text-white"
                              disabled={user.isAdmin}
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                            {!user.isAdmin && (
                              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            )}
                          </div>
                          <div className="mt-1">{getTierBadge(user.subscription)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{user.generationsTotal} total</p>
                          <p className="text-xs text-slate-500">{user.generationsToday} today</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-300">{formatRelativeTime(user.lastActive)}</p>
                          <p className="text-xs text-slate-500">{formatDate(user.lastActive)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!user.isAdmin && (
                            <>
                              {showDeleteConfirm === user.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No users found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by user email..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="relative">
                  <select
                    value={logFilter}
                    onChange={e => setLogFilter(e.target.value as ActivityLog['action'] | 'all')}
                    className="appearance-none px-4 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                  >
                    <option value="all">All Actions</option>
                    <option value="generation">Generation</option>
                    <option value="export">Export</option>
                    <option value="login">Login</option>
                    <option value="register">Register</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="ai_analysis">AI Analysis</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <button
                  onClick={handleExportLogs}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {/* Logs Table */}
              <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredLogs.slice(0, 100).map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-sm text-white capitalize">{log.action.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">{log.userEmail}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-400">{log.details}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">{formatDate(log.timestamp)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredLogs.length === 0 && (
                  <div className="p-8 text-center">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No activity logs found</p>
                  </div>
                )}

                {filteredLogs.length > 100 && (
                  <div className="p-3 border-t border-slate-700 text-center">
                    <p className="text-xs text-slate-500">
                      Showing 100 of {filteredLogs.length} logs. Export to see all.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Demo SQL Queries</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Manage the demo queries that users see when loading the demo. Active queries auto-cycle.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddQuery(true);
                    setNewQueryForm({ name: '', description: '', sql: '' });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Query
                </button>
              </div>

              {/* Add Query Form */}
              {showAddQuery && (
                <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Add New Demo Query</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newQueryForm.name}
                        onChange={e => setNewQueryForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Query name..."
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={newQueryForm.description}
                        onChange={e => setNewQueryForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Short description..."
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <textarea
                      value={newQueryForm.sql}
                      onChange={e => setNewQueryForm(f => ({ ...f, sql: e.target.value }))}
                      placeholder="SELECT ... FROM ... JOIN ..."
                      rows={6}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowAddQuery(false)}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newQueryForm.name && newQueryForm.sql) {
                            addDemoQuery({ ...newQueryForm, isActive: true });
                            setShowAddQuery(false);
                            setNewQueryForm({ name: '', description: '', sql: '' });
                          }
                        }}
                        disabled={!newQueryForm.name || !newQueryForm.sql}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Add Query
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Queries List */}
              <div className="space-y-3">
                {demoQueries
                  .sort((a, b) => a.order - b.order)
                  .map((query, index) => (
                    <div
                      key={query.id}
                      className={`bg-slate-900/50 rounded-xl border transition-all ${
                        query.isActive ? 'border-blue-500/50' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {editingQuery === query.id ? (
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="Query name..."
                              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                            <input
                              type="text"
                              value={editForm.description}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Short description..."
                              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <textarea
                            value={editForm.sql}
                            onChange={e => setEditForm(f => ({ ...f, sql: e.target.value }))}
                            rows={8}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingQuery(null)}
                              className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                updateDemoQuery(query.id, editForm);
                                setEditingQuery(null);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 text-slate-500 pt-1">
                              <GripVertical className="w-4 h-4" />
                              <span className="text-xs font-mono w-5">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-white">{query.name}</h4>
                                {query.isActive && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-medium rounded">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-400 mb-2">{query.description}</p>
                              <pre className="text-xs text-slate-500 bg-slate-800/50 rounded p-2 overflow-x-auto max-h-24">
                                {query.sql.substring(0, 200)}
                                {query.sql.length > 200 && '...'}
                              </pre>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateDemoQuery(query.id, { isActive: !query.isActive })}
                                className={`p-2 rounded-lg transition-colors ${
                                  query.isActive
                                    ? 'text-blue-400 hover:bg-blue-500/20'
                                    : 'text-slate-500 hover:bg-slate-700'
                                }`}
                                title={query.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {query.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQuery(query.id);
                                  setEditForm({ name: query.name, description: query.description, sql: query.sql });
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteDemoQuery(query.id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {demoQueries.length === 0 && (
                <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-700">
                  <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">No demo queries configured</p>
                  <p className="text-sm text-slate-500">Add queries that will be shown when users load the demo</p>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                <h4 className="text-sm font-medium text-blue-300 mb-2">How Demo Cycling Works</h4>
                <ul className="text-xs text-blue-400/80 space-y-1">
                  <li>• Active queries will automatically cycle when users click "Load Demo"</li>
                  <li>• Each click loads the next query in sequence</li>
                  <li>• {demoQueries.filter(q => q.isActive).length} of {demoQueries.length} queries are currently active</li>
                  <li>• Drag to reorder queries (affects cycling order)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
