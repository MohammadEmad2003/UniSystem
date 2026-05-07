import { useState, useEffect } from 'react';
import { DollarSign, Save } from 'lucide-react';
import { adminService } from '../../services';
import { useAuthStore } from '../../hooks/useAuthStore';

export default function ManageFeesPage() {
  const { token, user } = useAuthStore();
  const role = user?.role?.toLowerCase() || (user as any)?.Role?.toLowerCase();
  const isAdmin = role === 'admin';

  const [fees, setFees] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getAcademicLevelFees()
      .then(res => {
        if (res.success) {
          const fetchedFees: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          (res.data as any).forEach((f: any) => {
            fetchedFees[f.Academic_Level] = f.Total_Fees;
          });
          setFees(fetchedFees);
        }
      })
      .catch(e => setError('Failed to load fees'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSaveLevel = async (level: number) => {
    setSaving(true);
    try {
      const res = await adminService.setAcademicLevelFees(level, fees[level]);
      if (!res.success) throw new Error(res.message || "Failed to update fees");
      alert(`Level ${level} fees updated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update fees');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = [1, 2, 3, 4, 5].map(level => {
        return adminService.setAcademicLevelFees(level, fees[level]);
      });

      const results = await Promise.all(promises);
      const hasError = results.some(r => !r.success);
      if (hasError) throw new Error("Some fees failed to update");

      alert('All fees updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update fees');
    } finally {
      setSaving(false);
    }
  };

  const handleFeeChange = (level: number, value: string) => {
    setFees(prev => ({ ...prev, [level]: Number(value) }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white drop-shadow-md">Manage Fees</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Set total tuition fees per academic level</p>
        </div>
        {isAdmin && (
          <button onClick={handleSaveAll} disabled={saving} className="btn-primary flex items-center gap-2 px-8 py-3 text-lg shadow-lg shadow-primary-500/30">
            <Save size={20} /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        )}
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-500 font-medium text-center">{error}</div>}

      <div className="grid gap-6 animate-slide-up">
        {[1, 2, 3, 4, 5].map((level) => (
          <div key={level} className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary-500/30 transition-all shadow-sm hover:shadow-md bg-white dark:bg-[#0a192f]">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00b8d4]/10 to-[#00e5ff]/10 flex items-center justify-center border border-[#00b8d4]/20 shadow-inner">
                <span className="text-[#00b8d4] font-black text-2xl">L{level}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Academic Level {level}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Specify the total required tuition fees for all students enrolled in level {level}.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold text-xl">$</span>
                <input
                  type="number"
                  value={fees[level] === 0 ? '' : fees[level]}
                  onChange={e => handleFeeChange(level, e.target.value)}
                  className="input-field w-32 text-xl font-black text-center bg-slate-50 dark:bg-[#050b14] border-2 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleSaveLevel(level)}
                  disabled={saving}
                  className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                  title="Save Level Only"
                >
                  <Save size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
