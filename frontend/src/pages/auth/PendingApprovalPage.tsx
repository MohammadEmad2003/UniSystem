import { Link } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-4">
          <Clock size={32} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md mb-2">Account Pending Approval</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
          Your account has been registered successfully. An administrator will review your documents and approve your account shortly.
        </p>
        <div className="bg-slate-100 dark:bg-[#050b14] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <FileText size={20} className="text-surface-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">What happens next?</p>
              <ol className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-1 list-decimal list-inside">
                <li>Admin reviews your uploaded documents</li>
                <li>Your identity is verified</li>
                <li>Account is approved & you receive access</li>
              </ol>
            </div>
          </div>
        </div>
        <Link to="/login" className="btn-primary inline-flex items-center gap-2">
          Back to Login
        </Link>
      </div>
    </div>
  );
}


