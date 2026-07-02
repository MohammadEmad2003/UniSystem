import { useState, useEffect } from 'react';
import { DollarSign, Save, Clock, Target, Calendar } from 'lucide-react';
import { adminService } from '../../services';
import { useAuthStore } from '../../hooks/useAuthStore';
import { FormSkeleton, StatsCardSkeleton } from '../../components/ui/Skeleton';

interface LevelConfig {
  fees: number;
  maxHours: number;
  minHours: number;
  hourPrice: number;
}

type SemesterConfigs = Record<number, LevelConfig>;
type GlobalConfigs = Record<string, SemesterConfigs>;

const initialLevelConfig = (): SemesterConfigs => ({
  1: { fees: 0, maxHours: 18, minHours: 12, hourPrice: 0 },
  2: { fees: 0, maxHours: 18, minHours: 12, hourPrice: 0 },
  3: { fees: 0, maxHours: 18, minHours: 12, hourPrice: 0 },
  4: { fees: 0, maxHours: 18, minHours: 12, hourPrice: 0 },
  5: { fees: 0, maxHours: 18, minHours: 12, hourPrice: 0 },
});

export default function ManageFeesPage() {
  const { token, user } = useAuthStore();
  const role = user?.role?.toLowerCase() || (user as any)?.Role?.toLowerCase();
  const isAdmin = role === 'admin';

  const [configs, setConfigs] = useState<GlobalConfigs>({
    Fall: initialLevelConfig(),
    Spring: initialLevelConfig(),
    Summer: initialLevelConfig(),
  });
  
  const [selectedSemester, setSelectedSemester] = useState<string>('Fall');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getAcademicLevelFees()
      .then(res => {
        if (res.success) {
          const newConfigs = { ...configs };
          (res.data as any).forEach((f: any) => {
            const sem = f.Semester || 'Fall';
            if (!newConfigs[sem]) newConfigs[sem] = initialLevelConfig();
            newConfigs[sem][f.Academic_Level] = {
              fees: f.Total_Fees || 0,
              maxHours: f.Max_Hours || 18,
              minHours: f.Min_Hours || 12,
              hourPrice: f.Hour_Price || 0,
            };
          });
          setConfigs(newConfigs);
        }
      })
      .catch(e => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSaveLevel = async (level: number) => {
    setSaving(true);
    try {
      const config = configs[selectedSemester][level];
      const res = await adminService.setAcademicLevelFees(
        level, 
        selectedSemester, 
        config.fees, 
        config.maxHours, 
        config.minHours, 
        config.hourPrice
      );
      if (!res.success) throw new Error(res.message || "Failed to update settings");
      alert(`${selectedSemester} - Level ${level} settings updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const currentSemConfigs = configs[selectedSemester];
      const promises = [1, 2, 3, 4, 5].map(level => {
        const config = currentSemConfigs[level];
        return adminService.setAcademicLevelFees(
          level, 
          selectedSemester, 
          config.fees, 
          config.maxHours, 
          config.minHours, 
          config.hourPrice
        );
      });

      const results = await Promise.all(promises);
      const hasError = results.some(r => !r.success);
      if (hasError) throw new Error("Some settings failed to update");

      alert(`All ${selectedSemester} settings updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (level: number, field: keyof LevelConfig, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [selectedSemester]: {
        ...prev[selectedSemester],
        [level]: { ...prev[selectedSemester][level], [field]: Number(value) }
      }
    }));
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      <FormSkeleton fields={4} />
    </div>
  );

  const currentLevelConfigs = configs[selectedSemester];

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Academic Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">Configure fees and credit hour limits per semester</p>
        </div>
        {isAdmin && (
          <button onClick={handleSaveAll} disabled={saving} className="btn-primary flex items-center gap-2 px-10 py-4 text-lg font-bold shadow-2xl shadow-primary-500/40 hover:scale-105 active:scale-95 transition-all">
            <Save size={24} /> {saving ? 'Saving...' : `Save ${selectedSemester}`}
          </button>
        )}
      </div>

      {/* Semester Selector */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-[#050b14] rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
        {['Fall', 'Spring', 'Summer'].map(sem => (
          <button
            key={sem}
            onClick={() => setSelectedSemester(sem)}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              selectedSemester === sem 
                ? 'bg-white dark:bg-[#0a192f] text-primary-600 shadow-lg dark:text-white' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calendar size={18} /> {sem}
          </button>
        ))}
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold text-center border border-red-500/20">{error}</div>}

      <div className="grid gap-8 animate-slide-up">
        {[1, 2, 3, 4, 5].map((level) => (
          <div key={`${selectedSemester}-${level}`} className="card p-8 group relative overflow-hidden bg-white dark:bg-[#0a192f] border-slate-200 dark:border-slate-800 hover:border-primary-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target size={120} className="text-primary-500" />
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
              {/* Level Badge */}
              <div className="flex items-center gap-6 min-w-[280px]">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-primary-500/20 transform group-hover:rotate-6 transition-transform">
                  <span className="text-white font-black text-3xl">L{level}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Level {level}</h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-500 text-xs font-bold uppercase tracking-widest mt-1">
                    {selectedSemester} Configuration
                  </span>
                </div>
              </div>

              {/* Controls Grid */}
              <div className="flex flex-wrap lg:flex-nowrap items-end gap-4 flex-1 w-full">
                {/* Hour Price Input */}
                <div className="flex-1 min-w-[120px] space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-primary-500 uppercase tracking-wider">
                    <DollarSign size={14} /> Price / Hr
                  </label>
                  <input
                    type="number"
                    value={currentLevelConfigs[level].hourPrice || ''}
                    onChange={e => handleChange(level, 'hourPrice', e.target.value)}
                    className="input-field w-full text-lg font-bold bg-primary-500/5 dark:bg-[#050b14] border-2 border-primary-500/20 focus:border-primary-500 transition-all"
                    placeholder="0.00"
                  />
                </div>

                {/* Max Hours Input */}
                <div className="w-24 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
                    <Clock size={14} /> Max
                  </label>
                  <input
                    type="number"
                    value={currentLevelConfigs[level].maxHours || ''}
                    onChange={e => handleChange(level, 'maxHours', e.target.value)}
                    className="input-field w-full text-lg font-bold bg-slate-50 dark:bg-[#050b14] border-2 focus:border-amber-500 transition-all text-center"
                    placeholder="18"
                  />
                </div>

                {/* Min Hours Input */}
                <div className="w-24 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
                    <Clock size={14} /> Min
                  </label>
                  <input
                    type="number"
                    value={currentLevelConfigs[level].minHours || ''}
                    onChange={e => handleChange(level, 'minHours', e.target.value)}
                    className="input-field w-full text-lg font-bold bg-slate-50 dark:bg-[#050b14] border-2 focus:border-indigo-500 transition-all text-center"
                    placeholder="12"
                  />
                </div>

                {/* Fees Input (Disabled & Auto-calculated) */}
                <div className="flex-1 min-w-[140px] space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <DollarSign size={14} className="text-emerald-500" /> Est. Total Fees
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={(currentLevelConfigs[level].hourPrice * currentLevelConfigs[level].maxHours).toFixed(2)}
                      disabled
                      className="input-field w-full text-lg font-bold bg-slate-100 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                    />
                    <div className="absolute inset-0 bg-transparent" title="Auto-calculated based on Max Hours" />
                  </div>
                </div>

                {/* Action Button */}
                {isAdmin && (
                  <div className="flex items-center">
                    <button
                      onClick={() => handleSaveLevel(level)}
                      disabled={saving}
                      className="p-4 rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-all border-2 border-primary-500/20 shadow-lg active:scale-90"
                      title="Save Level Settings"
                    >
                      <Save size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
