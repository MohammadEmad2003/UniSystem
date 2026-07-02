import { useState, useEffect } from "react";
import { useAuthStore } from "../../hooks/useAuthStore";
import { studentService } from "../../services";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Loader2,
  Shield,
  X,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { FormSkeleton, StatsCardSkeleton } from "../../components/ui/Skeleton";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─── Inner Payment Form (rendered inside Elements with clientSecret) ──────────
function PaymentForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: (data: any) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Validation failed");
      setProcessing(false);
      return;
    }

    // Confirm payment using the clientSecret already in Elements context
    const { error: stripeError, paymentIntent } =
      await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

    if (stripeError) {
      setError(stripeError.message || "Payment failed");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Notify backend to record the payment
      try {
        const { token } = useAuthStore.getState();
        const confirmResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/payment/confirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          }
        );
        const confirmData = await confirmResponse.json();
        onSuccess(confirmData.data);
      } catch {
        // Even if backend confirm fails, Stripe recorded the payment
        onSuccess({ status: "succeeded" });
      }
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["link", "card"],
        }}
      />

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-[2] py-3 rounded-2xl bg-[#635bff] hover:bg-[#5248d9] text-white font-black text-base shadow-lg shadow-[#635bff]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Shield size={16} />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <Shield size={11} />
        Secured by Stripe · Your card info is never stored
      </p>
    </form>
  );
}

// ─── Amount Input Step ────────────────────────────────────────────────────────
function AmountStep({
  details,
  user,
  token,
  onIntentCreated,
}: {
  details: any;
  user: any;
  token: string | null;
  onIntentCreated: (clientSecret: string, amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remaining = details?.remaining_amount || 0;

  const handleProceed = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (numAmount > remaining) {
      setError(`Amount cannot exceed the remaining balance ($${remaining.toFixed(2)}).`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/payment/${user.user_id}/create-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: numAmount }),
        }
      );
      const { success, data } = await response.json();
      if (!success) throw new Error(data?.message || "Failed to create payment intent");
      onIntentCreated(data.clientSecret, numAmount);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Amount input */}
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
          Payment Amount (USD)
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Enter any amount up to your remaining balance of{" "}
          <span className="font-bold text-rose-500">${remaining.toFixed(2)}</span>
        </p>
        <div className="relative">
          <DollarSign
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setError("");
              setAmount(e.target.value);
            }}
            placeholder="0.00"
            min="1"
            step="0.01"
            className="w-full bg-emerald-500/5 border-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-emerald-500 transition-all font-black text-2xl"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleProceed}
        disabled={loading || !amount || parseFloat(amount) <= 0}
        className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black text-lg shadow-xl shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Preparing...
          </>
        ) : (
          <>
            <CreditCard size={20} />
            Proceed to Payment
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const { user, token } = useAuthStore();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Payment flow state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paidInfo, setPaidInfo] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    studentService
      .getPayment(user.user_id)
      .then((res) => { if (res.success) setDetails(res.data); })
      .finally(() => setLoading(false));
  }, [user, token]);

  const handleIntentCreated = (cs: string, amt: number) => {
    setClientSecret(cs);
    setPaymentAmount(amt);
  };

  const handlePaymentSuccess = (data: any) => {
    setPaymentSuccess(true);
    setPaidInfo(data);
    setDetails((prev: any) => ({
      ...prev,
      paid_amount: data?.paid_amount ?? (prev?.paid_amount ?? 0) + paymentAmount,
      payment_status: data?.payment_status ?? "Partial",
      remaining_amount: data?.remaining_amount ?? Math.max(0, (prev?.remaining_amount ?? 0) - paymentAmount),
    }));
    setClientSecret(null);
  };

  const handleCancel = () => {
    setClientSecret(null);
    setPaymentAmount(0);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <StatsCardSkeleton />
        <FormSkeleton fields={3} />
      </div>
    </div>
  );

  const isPaid = details?.payment_status?.toLowerCase() === "paid";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white drop-shadow-md">
            Payment Portal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Securely pay your tuition fees</p>
        </div>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-500 hover:text-white transition-all border border-primary-500/20 text-sm"
        >
          <BookOpen size={16} />
          {showBreakdown ? "Hide Breakdown" : "Show Tuition Details"}
          {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Course Breakdown */}
      {showBreakdown && (
        <div className="card overflow-hidden p-0 border-primary-500/20 shadow-xl animate-slide-down">
          <div className="bg-primary-500/5 px-6 py-4 border-b border-primary-500/10">
            <h3 className="font-bold text-primary-700 dark:text-primary-400">
              Registered Courses &amp; Hours
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-[#050b14] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs">Course</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Semester</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-center">Hours</th>
                <th className="px-6 py-3 font-bold uppercase tracking-wider text-xs text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {details?.courses?.map((c: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                  <td className="px-6 py-3 text-center text-slate-500">{c.semester}</td>
                  <td className="px-6 py-3 text-center font-bold">{c.credit_hours}H</td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-600">
                    ${(c.credit_hours * (c.hour_price || 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
              {(!details?.courses || details.courses.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
            {details?.courses?.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-[#050b14] border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} />
                  <td className="px-6 py-3 text-center font-black text-slate-700 dark:text-slate-200">
                    {details.total_hours}H
                  </td>
                  <td className="px-6 py-3 text-right font-black text-slate-900 dark:text-white">
                    ${details.total_fees?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Main Payment Card */}
      <div className="card overflow-hidden p-0 border-none shadow-2xl bg-white dark:bg-[#0a192f]">
        <div className="flex flex-col lg:flex-row min-h-[520px]">
          {/* Left — Summary */}
          <div className="lg:w-[42%] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#050b14] dark:to-[#0a192f] p-8 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                Payment Summary
              </h2>

              {details && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#050b14] border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                      Tuition Total
                    </span>
                    <div className="text-right">
                      <span className="font-black text-slate-900 dark:text-white">
                        ${details.total_fees?.toFixed(2)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {details.total_hours}hrs × ${details.hour_price}/hr
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                      Amount Paid
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      ${details.paid_amount?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 shadow-inner">
                    <span className="text-xs text-rose-600 font-black uppercase tracking-[0.2em]">
                      Remaining
                    </span>
                    <span className="text-2xl font-black text-rose-600">
                      ${details.remaining_amount?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {details.total_fees > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-bold">
                        <span>PAYMENT PROGRESS</span>
                        <span>
                          {Math.round(((details.paid_amount || 0) / details.total_fees) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                          style={{
                            width: `${Math.min(100, ((details.paid_amount || 0) / details.total_fees) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Shield size={11} />
                Secured by Stripe
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="lg:w-[58%] p-8 md:p-10 bg-white dark:bg-[#0a192f] flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">

              {/* SUCCESS STATE */}
              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-scale-in">
                  <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border-8 border-emerald-500/20 mb-6 shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 size={48} className="text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
                    Payment Successful!
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">
                    ${paymentAmount.toFixed(2)} has been charged successfully.
                  </p>
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#050b14] border border-slate-200 dark:border-slate-800 w-full space-y-2.5 text-left mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Paid this session</span>
                      <span className="font-bold text-emerald-600">${paymentAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total paid</span>
                      <span className="font-bold">${details?.paid_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Remaining</span>
                      <span className="font-bold text-rose-500">${details?.remaining_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                  {details?.remaining_amount > 0 && (
                    <button
                      onClick={() => setPaymentSuccess(false)}
                      className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold transition-all"
                    >
                      Make Another Payment
                    </button>
                  )}
                </div>

              // FULLY PAID STATE
              ) : isPaid ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-scale-in">
                  <div className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center border-8 border-emerald-500/20 mb-6 shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 size={56} className="text-emerald-500" />
                  </div>
                  <h2 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter mb-3">
                    APPROVED
                  </h2>
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#050b14] border border-slate-200 dark:border-slate-800 w-full space-y-2.5 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Student</span>
                      <span className="font-bold">{user?.f_name} {user?.l_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Level</span>
                      <span className="font-bold">{details?.academic_level}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <span className="px-3 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
                        Fully Paid
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-6">
                    Your financial status is clear for the current semester.
                  </p>
                </div>

              // STRIPE PAYMENT ELEMENT (after intent created)
              ) : clientSecret ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#635bff]/10 text-[#635bff]">
                        <CreditCard size={22} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                          Complete Payment
                        </h2>
                        <p className="text-xs text-slate-500">Amount: ${paymentAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancel}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      locale: "en",
                      appearance: {
                        theme: document.documentElement.classList.contains("dark") ? "night" : "stripe",
                        variables: {
                          colorPrimary: "#635bff",
                          borderRadius: "12px",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      amount={paymentAmount}
                      onSuccess={handlePaymentSuccess}
                      onCancel={handleCancel}
                    />
                  </Elements>
                </div>

              // AMOUNT INPUT STEP
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-500/20">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-none">
                        Secure Payment
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pay your tuition fees securely with Stripe
                      </p>
                    </div>
                  </div>

                  {/* Student info */}
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#050b14] border border-slate-200 dark:border-slate-800 mb-6">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                      <p className="text-sm font-bold truncate">{user?.f_name} {user?.l_name}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                      <p className="text-sm font-bold truncate">{user?.email}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Level</label>
                      <p className="text-sm font-bold">{details?.academic_level}</p>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Due</label>
                      <p className="text-sm font-bold text-rose-600">${details?.remaining_amount?.toFixed(2)}</p>
                    </div>
                  </div>

                  <AmountStep
                    details={details}
                    user={user}
                    token={token}
                    onIntentCreated={handleIntentCreated}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
