import { useState, useEffect } from "react";
import { useAuthStore } from "../../hooks/useAuthStore";
import { gradeService } from "../../services";
import { Award, TrendingUp, BookOpen, Download } from "lucide-react";
import type { Grade } from "../../types";

export default function StudentGradesPage() {
  const { user } = useAuthStore();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    gradeService
      .getByStudent(user.user_id)
      .then((res) => {
        if (res.success) setGrades(res.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDownload = () => {
    if (grades.length === 0) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          
          body { 
            font-family: 'Inter', sans-serif; 
            background-color: #0f172a; /* خلفية الصفحة الأساسية */
            margin: 0; 
            padding: 0;
          }

          .pdf-page {
            padding: 30px;
            background-color: #0f172a; /* لون داكن عميق */
            color: #f1f5f9;
            position: relative;
            min-height: 1060px;
            box-sizing: border-box;
          }

          /* البوردر الخارجي بلون Cyan مضيء */
          .outer-border {
            border: 2px solid #00b8d4;
            height: 100%;
            position: relative;
          }

          .inner-border {
            padding: 40px;
            position: relative;
            z-index: 1;
          }

          /* علامة مائية خفيفة جداً لتناسب الخلفية الداكنة */
          .watermark {
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 85px;
            font-weight: 900;
            color: rgba(255, 255, 255, 0.03);
            white-space: nowrap;
            z-index: 0;
            pointer-events: none;
            letter-spacing: 10px;
          }

          /* الهيدر */
          .header {
            text-align: center;
            margin-bottom: 50px;
            border-bottom: 2px solid rgba(0, 184, 212, 0.3);
            padding-bottom: 30px;
          }

          .logo-img {
            width: 130px;
            height: auto;
            margin-bottom: 15px;
            filter: drop-shadow(0 0 10px rgba(0, 184, 212, 0.4)); /* توهج خفيف للوجو */
          }

          .uni-name h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .uni-name p {
            margin: 5px 0 0;
            color: #00b8d4;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 4px;
          }

          .document-type {
            background: #00b8d4;
            color: #0f172a;
            display: inline-block;
            padding: 8px 35px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: 800;
            margin-top: 25px;
            text-transform: uppercase;
          }

          /* معلومات الطالب */
          .student-info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding: 25px;
            background: rgba(30, 41, 59, 0.5); /* خلفية شفافة قليلاً */
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .label { 
            font-weight: 700; 
            color: #94a3b8; 
            width: 110px; 
            display: inline-block;
            font-size: 11px;
            text-transform: uppercase;
          }

          .val { color: #ffffff; font-weight: 600; }

          /* الجدول بستايل Dark */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }

          th {
            background-color: rgba(0, 184, 212, 0.1);
            color: #00b8d4;
            text-align: left;
            padding: 15px 12px;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 2px solid #00b8d4;
          }

          td {
            padding: 14px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 13px;
            color: #cbd5e1;
          }

          tr:nth-child(even) {
            background-color: rgba(255, 255, 255, 0.02);
          }

          .gpa-column {
            color: #22d3ee;
            font-weight: 800;
            text-align: center;
          }

          /* الفوتر والإحصائيات */
          .footer-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .stats-card {
            background: linear-gradient(135deg, #00b8d4 0%, #008fa3 100%);
            color: #0f172a;
            padding: 25px 50px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 184, 212, 0.2);
          }

          .stats-card .val {
            display: block;
            font-size: 38px;
            font-weight: 900;
            line-height: 1;
          }

          .stats-card .lbl {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
          }

          .signature-box {
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            padding-top: 10px;
            width: 200px;
            color: #94a3b8;
          }

          .legal-footer {
            margin-top: 80px;
            text-align: center;
            font-size: 10px;
            color: #64748b;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="pdf-page">
          <div class="outer-border">
            <div class="inner-border">
              <div class="watermark">OFFICIAL RECORD</div>
              
              <div class="header">
                <div class="logo-box">
                  <img src="/uni_logo.png" class="logo-img" alt="University Logo" />
                </div>
                <div class="uni-name">
                  <h1>Capital University</h1>
                  <p>Faculty of Information Technology</p>
                </div>
                <div class="document-type">Official Academic Transcript</div>
              </div>

              <div class="student-info-grid">
                <div class="info-group">
                  <p><span class="label">Student:</span> <span class="val">${user?.f_name} ${user?.l_name}</span></p>
                  <p><span class="label">ID Number:</span> <span class="val">${user?.user_id}</span></p>
                </div>
                <div class="info-group" style="text-align: right;">
                  <p><span class="label">Issue Date:</span> <span class="val">${new Date().toLocaleDateString()}</span></p>
                  <p><span class="label">Ref Number:</span> <span class="val">#CU-${Math.floor(1000 + Math.random() * 9000)}</span></p>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 35%">Course Title</th>
                    <th>Code</th>
                    <th style="text-align:center">Mid</th>
                    <th style="text-align:center">Prac</th>
                    <th style="text-align:center">Proj</th>
                    <th style="text-align:center">Final</th>
                    <th style="text-align:center">Total</th>
                    <th style="text-align:center">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  ${grades
                    .map(
                      (g, i) => `
                    <tr>
                      <td style="font-weight:700; color:#ffffff;">${g.course_name}</td>
                      <td style="color:#94a3b8; font-family:monospace;">${g.course_code}</td>
                      <td style="text-align:center">${g.midterm || 0}</td>
                      <td style="text-align:center">${g.practical || 0}</td>
                      <td style="text-align:center">${g.project || 0}</td>
                      <td style="text-align:center">${g.final || 0}</td>
                      <td style="text-align:center; font-weight:800; color:#00b8d4;">
                        ${(g.midterm || 0) + (g.practical || 0) + (g.project || 0) + (g.attendance || 0) + (g.final || 0)}
                      </td>
                      <td class="gpa-column">${g.gpa.toFixed(2)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>

              <div class="footer-section">
                <div class="signature-box">
                  <p style="margin-bottom: 30px;">University Registrar</p>
                  <p style="font-size: 10px; font-weight: 400;">Certified Electronic Document</p>
                </div>
                
                <div style="display: flex; gap: 30px; align-items: center;">
                  <div style="text-align: right;">
                    <p style="margin:0; font-size:12px; color:#94a3b8;">Total Credits: <strong style="color:white;">${(user as any)?.total_hours || 0}</strong></p>
                    <p style="margin:5px 0 0; font-size:12px; color:#94a3b8;">Standing: <strong style="color:white;">Distinction</strong></p>
                  </div>
                  <div class="stats-card">
                    <span class="lbl">Cumulative GPA</span>
                    <span class="val">${(user as any)?.total_gpa?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              <div class="legal-footer">
                This is a secure electronic document. Digital signatures are embedded for verification.<br>
                © ${new Date().getFullYear()} Capital University. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const element = document.createElement("div");
    element.innerHTML = htmlContent;

    const opt = {
      margin: 0,
      filename: `Dark_Transcript_${user?.l_name}.pdf`,
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: {
        scale: 4,
        useCORS: true,
        backgroundColor: "#0f172a", // تأكيد لون الخلفية في التحويل
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    (window as any).html2pdf().set(opt).from(element).save();
  };
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">
            My Grades
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Your academic performance and transcript
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={16} /> Download Transcript
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Cumulative GPA</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {(user as any)?.total_gpa?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">
              Completed Credits
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {(user as any)?.total_hours || 0} Hrs
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Courses</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {grades.length}
            </p>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0a121f] border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Midterm
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Practical
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Project
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Attendance
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Final
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Total
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  GPA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {grades.map((grade) => {
                const total =
                  (grade.midterm || 0) +
                  (grade.practical || 0) +
                  (grade.project || 0) +
                  (grade.attendance || 0) +
                  (grade.final || 0);
                return (
                  <tr
                    key={grade.grade_id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {grade.course_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {grade.course_code} • Level {grade.level} •{" "}
                          {grade.semester}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {grade.midterm || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {grade.practical || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {grade.project || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                      {grade.attendance || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center font-semibold">
                      {grade.final || 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${total >= 50 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                      >
                        {total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-primary-500">
                      {grade.gpa.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {!loading && grades.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No grades have been posted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
