import { useState, useEffect } from "react";
import { useAuthStore } from "../../hooks/useAuthStore";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Wifi,
  User,
  Calendar,
  Lock,
  ChevronDown,
  ChevronUp,
  BookOpen
} from "lucide-react";

export default function PaymentPage() {
  const { user, token } = useAuthStore();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Card States
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3000/api/students/${user?.user_id}/payment`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setDetails(res.data);
      })
      .catch((e) => setError("Failed to load payment details"))
      .finally(() => setLoading(false));
  }, [user, token]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 16);
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handlePay = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return setError("Invalid amount");
    
    const remaining = details?.remaining_amount || 0;
    if (Number(amount) > remaining && remaining > 0)
      return setError(`Amount cannot exceed the remaining balance ($${remaining}).`);

    if (cardNumber.replace(/\s/g, "").length < 16)
      return setError("Invalid card number. Must be 16 digits.");
    if (!cardHolder) return setError("Please enter cardholder name");
    if (expiry.length < 5) return setError("Invalid expiry date (MM/YY)");
    if (cvv.length < 3) return setError("Invalid CVV");

    setError("");

    try {
      const res = await fetch(
        `http://localhost:3000/api/students/${user?.user_id}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: Number(amount) }),
        },
      ).then((r) => r.json());

      if (!res.success) throw new Error(res.message);

      setDetails({
        ...details,
        paid_amount: res.data.paid_amount,
        payment_status: res.data.payment_status,
        remaining_amount: res.data.remaining_amount,
      });
      setAmount("");
      alert("Payment successful!");
    } catch (e: any) {
      setError(e.message || "Payment failed");
    }
  };

  const getCardType = () => {
    if (cardNumber.startsWith("4")) return "VISA";
    if (cardNumber.startsWith("5")) return "MASTERCARD";
    return "CARD";
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Payment Portal</h1>
          <p className="text-slate-600 dark:text-slate-400">Securely pay your tuition fees</p>
        </div>
        <button 
           onClick={() => setShowBreakdown(!showBreakdown)}
           className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500/10 text-primary-600 font-bold hover:bg-primary-500 hover:text-white transition-all border border-primary-500/20"
        >
           <BookOpen size={18} />
           {showBreakdown ? 'Hide Breakdown' : 'Show Tuition Details'}
           {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Course Breakdown (Conditional) */}
      {showBreakdown && (
        <div className="card overflow-hidden p-0 border-primary-500/20 shadow-xl animate-slide-down">
           <div className="bg-primary-500/5 px-6 py-4 border-b border-primary-500/10">
              <h3 className="font-bold text-primary-700 dark:text-primary-400">Registered Courses & Hours</h3>
           </div>
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-[#050b14] text-slate-500">
                 <tr>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-center">Semester</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-center">Hours</th>
                    <th className="px-6 py-3 font-bold uppercase tracking-wider text-right">Fee</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {details?.courses?.map((c: any, i: number) => (
                    <tr key={i}>
                       <td className="px-6 py-3 font-medium">{c.Name}</td>
                       <td className="px-6 py-3 text-center opacity-70">{c.Semester}</td>
                       <td className="px-6 py-3 text-center font-bold">{c.Credit_Hours}H</td>
                       <td className="px-6 py-3 text-right font-bold">${(c.Credit_Hours * (c.Hour_Price || 0)).toFixed(2)}</td>
                    </tr>
                 ))}
                 {(!details?.courses || details.courses.length === 0) && (
                   <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No courses found.</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      )}

      <div className="card overflow-hidden p-0 border-none shadow-2xl bg-white dark:bg-[#0a192f]">
        <div className="flex flex-col lg:flex-row min-h-[550px]">
          {/* Left Column: Card Graphic & Info */}
          <div className="lg:w-[45%] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#050b14] dark:to-[#0a192f] p-8 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800">
            <div>
               <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Payment Preview</h2>
               
               {/* Interactive Card Graphic */}
               <div
                className={`relative w-full aspect-[1.58/1] rounded-2xl p-6 text-white shadow-2xl mb-8 overflow-hidden transition-all duration-500 mx-auto ${
                  getCardType() === "VISA"
                    ? "bg-gradient-to-br from-[#1a1f71] to-[#0d1440]"
                    : getCardType() === "MASTERCARD"
                      ? "bg-gradient-to-br from-[#eb001b] via-[#f79e1b] to-[#ff5f00]"
                      : "bg-gradient-to-br from-[#2a0845] via-[#6441A5] to-[#f47b85]"
                }`}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <Wifi size={24} className="rotate-90 opacity-80" />
                    <div className="font-bold italic opacity-90 text-base tracking-widest">
                      {getCardType()}
                    </div>
                  </div>
                  <div className="mt-auto space-y-4">
                    <div className="text-xl md:text-2xl font-mono tracking-[0.1em] text-white/90 text-center whitespace-nowrap overflow-hidden">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-widest opacity-70 font-semibold">Card Holder</div>
                        <div className="text-sm font-semibold truncate max-w-[150px]">{cardHolder || "YOUR NAME"}</div>
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="text-[10px] uppercase tracking-widest opacity-70 font-semibold">Expires</div>
                        <div className="text-sm font-semibold">{expiry || "MM/YY"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              {details && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#050b14] border border-slate-200 dark:border-slate-800">
                    <span className="text-sm text-slate-500 font-medium uppercase tracking-widest">Tuition Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">${details.total_fees}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Amount Paid</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">${details.paid_amount}</span>
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 shadow-inner">
                    <span className="text-xs text-rose-600 font-black uppercase tracking-[0.2em]">Remaining Balance</span>
                    <span className="text-2xl font-black text-rose-600 animate-pulse-slow">${details.remaining_amount}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center lg:text-left">
               <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">
                 Encrypted & Secure Transaction
               </p>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:w-[55%] p-8 md:p-12 bg-white dark:bg-[#0a192f]">
            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-3 rounded-2xl bg-primary-600 text-white shadow-xl shadow-primary-500/20">
                  <CreditCard size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Payment Details</h2>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
                  <AlertCircle size={18} /> <span>{error}</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Card Number</label>
                  <div className="relative group">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full bg-slate-50 dark:bg-[#050b14] border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-12 py-4 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-mono text-lg font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Cardholder Name</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="FULL NAME"
                      className="w-full bg-slate-50 dark:bg-[#050b14] border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-12 py-4 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-bold tracking-wide"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Expiry</label>
                    <div className="relative group">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-slate-50 dark:bg-[#050b14] border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-12 py-4 focus:outline-none focus:border-primary-500 transition-all font-bold text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">CVV</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="password"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        placeholder="•••"
                        maxLength={3}
                        className="w-full bg-slate-50 dark:bg-[#050b14] border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-12 py-4 focus:outline-none focus:border-primary-500 transition-all font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Amount</label>
                  <div className="relative group">
                    <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const max = details?.remaining_amount || 0;
                        if (val > max) setAmount(max.toString());
                        else setAmount(e.target.value);
                      }}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-[#050b14] border-2 border-emerald-500/20 text-emerald-600 rounded-2xl px-12 py-4 focus:outline-none focus:border-emerald-500 transition-all font-black text-xl"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePay}
                  className="w-full mt-4 btn-primary py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Confirm & Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
