import React, { useMemo } from 'react';
import {
  Target,
  AlertCircle,
  Lightbulb,
  Palette,
  FolderKanban,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ItemType } from '../../types';
import { typeLabels, getStatusColors, getStatusCategory, typeColors } from '../../utils/colors';

const typeIcons: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  mission: Target,
  problem: AlertCircle,
  solution: Lightbulb,
  design: Palette,
  project: FolderKanban,
};

const StatsOverview: React.FC = () => {
  const { getStats, items } = useStore();
  const stats = getStats();

  // Get unique statuses from items in order of first occurrence
  const statusOrder = useMemo(() => {
    const statusList: string[] = [];
    const statusSet = new Set<string>();
    Array.from(items.values()).forEach((item) => {
      if (!statusSet.has(item.status)) {
        statusSet.add(item.status);
        statusList.push(item.status);
      }
    });
    return statusList;
  }, [items]);

  // Calculate in-progress and completed counts dynamically
  const inProgressCount = useMemo(() => {
    let count = 0;
    Object.entries(stats.byStatus).forEach(([status, num]) => {
      if (getStatusCategory(status) === 'in-progress') count += num;
    });
    return count;
  }, [stats.byStatus]);

  const completedCount = useMemo(() => {
    let count = 0;
    Object.entries(stats.byStatus).forEach(([status, num]) => {
      if (getStatusCategory(status) === 'completed') count += num;
    });
    return count;
  }, [stats.byStatus]);

  const typeOrder: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total items */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total Items</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalItems}</div>
        </div>

        {/* Completion rate */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Completion</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            {stats.completionRate.toFixed(0)}%
          </div>
        </div>

        {/* Blocked items */}
        <div className="bg-red-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Blocked</span>
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.blockedItems}</div>
        </div>

        {/* Overdue items */}
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.overdueItems}</div>
        </div>

        {/* In Progress */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-status" />
            <span className="text-xs font-medium uppercase">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{inProgressCount}</div>
        </div>

        {/* Completed */}
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Completed</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{completedCount}</div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-6">
          {/* By Status */}
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              By Status
            </h4>
            <div className="flex items-center gap-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              {statusOrder.map((status) => {
                const count = stats.byStatus[status] || 0;
                const percent = stats.totalItems > 0 ? (count / stats.totalItems) * 100 : 0;
                if (percent === 0) return null;
                return (
                  <div
                    key={status}
                    className={`h-full ${getStatusColors(status).dot} transition-all`}
                    style={{ width: `${percent}%` }}
                    title={`${status}: ${count} (${percent.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {statusOrder.map((status) => {
                const count = stats.byStatus[status] || 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className={`w-2 h-2 rounded-full ${getStatusColors(status).dot}`} />
                    <span>{status}</span>
                    <span className="font-medium">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Type */}
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              By Type
            </h4>
            <div className="flex flex-wrap gap-2">
              {typeOrder.map((type) => {
                const count = stats.byType[type];
                const Icon = typeIcons[type];
                return (
                  <div
                    key={type}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-full text-xs
                      ${typeColors[type].bg} ${typeColors[type].text}
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{typeLabels[type]}</span>
                    <span className="font-semibold">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
