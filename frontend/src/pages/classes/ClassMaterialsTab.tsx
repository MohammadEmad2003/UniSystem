import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { materialService, aiRagService } from '../../services';
import { FileText, Link2, Video, Image as ImageIcon, Upload, Download, ExternalLink, Trash2, Plus, X, BrainCircuit, Sparkles, Layers, BookOpen, FileQuestion } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Material, User } from '../../types';

interface Ctx { classId: string; user: User }

const typeIcons: Record<string, typeof FileText> = { pdf: FileText, link: Link2, video: Video, image: ImageIcon, document: FileText };
const typeColors: Record<string, string> = { pdf: 'bg-red-500/10 text-red-400', link: 'bg-blue-500/10 text-blue-400', video: 'bg-purple-500/10 text-purple-600', image: 'bg-green-500/10 text-green-500', document: 'bg-amber-500/10 text-amber-400' };

export default function ClassMaterialsTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', type: 'pdf' as Material['type'], summarize: '' });

  // AI RAG State
  const [activeAiMaterial, setActiveAiMaterial] = useState<Material | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null); // holds action
  const [aiResult, setAiResult] = useState<{ title: string; content: string; type: string } | null>(null);

  const handleAiAction = async (mat: Material, action: string, title: string) => {
    setAiLoading(action);
    try {
      let content = "";
      if (action === 'summary') {
        const res = await aiRagService.summarizeMaterial(classId, mat.material_id);
        content = res.data.summary || res.data.answer || JSON.stringify(res.data, null, 2);
      } else if (action === 'flashcards') {
        const res = await aiRagService.getFlashcards(classId, mat.material_id);
        content = res.data.flashcards || res.data.answer || JSON.stringify(res.data, null, 2);
      } else if (action === 'quiz') {
        const res = await aiRagService.getQuiz(classId, mat.material_id);
        content = res.data.quiz || res.data.answer || JSON.stringify(res.data, null, 2);
      } else if (action === 'notes') {
        const res = await aiRagService.getNotes(classId, mat.material_id);
        content = res.data.notes || res.data.answer || JSON.stringify(res.data, null, 2);
      } else if (action === 'pages') {
        const res = await aiRagService.getPageSummaries(classId, mat.material_id);
        content = res.data.summaries ? res.data.summaries.join('\n\n---\n\n') : res.data.answer || JSON.stringify(res.data, null, 2);
      }
      setAiResult({ title, content, type: action });
    } catch (err: any) {
      setAiResult({ title: `Error: ${title}`, content: `**Failed to generate content.**\n\n${err.message}`, type: 'error' });
    } finally {
      setAiLoading(null);
    }
  };

  const closeAiModal = () => {
    setActiveAiMaterial(null);
    setAiResult(null);
    setAiLoading(null);
  };

  useEffect(() => {
    materialService.getByClass(classId).then(r => setMaterials(r.data)).finally(() => setLoading(false));
  }, [classId]);

  const handleUpload = async () => {
    if (!form.name.trim()) return;
    const res = await materialService.upload({ ...form, class_id: classId, uploaded_by: user.user_id });
    setMaterials(prev => [res.data, ...prev]);
    setShowUpload(false);
    setForm({ name: '', url: '', type: 'pdf', summarize: '' });
  };

  const handleDelete = async (matId: string) => {
    await materialService.delete(matId);
    setMaterials(prev => prev.filter(m => m.material_id !== matId));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Upload button - doctor only */}
      {user.role === 'doctor' && (
        <div className="flex justify-end">
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> Upload Material
          </button>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Material</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Material name" className="input-field" />
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="URL or file path" className="input-field" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Material['type'] })} className="input-field">
                <option value="pdf">PDF</option>
                <option value="link">Link</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="image">Image</option>
              </select>
              <textarea value={form.summarize} onChange={e => setForm({ ...form, summarize: e.target.value })} placeholder="Summary (optional)" className="input-field resize-none" rows={2} />
              {/* Drag & Drop zone */}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-[#00e5ff]/10/30 transition-colors">
                <Upload size={24} className="text-surface-400 mb-2" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Drag & drop files here, or click to browse</span>
                <input type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) setForm(f => ({ ...f, name: f.name || e.target.files![0].name })); }} />
              </label>
              <button onClick={handleUpload} className="btn-primary w-full">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Materials list */}
      {materials.map((mat, i) => {
        const Icon = typeIcons[mat.type] || FileText;
        const colorClass = typeColors[mat.type] || typeColors.document;
        return (
          <div key={mat.material_id} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} flex-shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{mat.name}</h3>
                {mat.summarize && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{mat.summarize}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                  <span className="badge bg-surface-100 text-slate-600 dark:text-slate-400 uppercase">{mat.type}</span>
                  <span>{formatDate(mat.uploaded_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button 
                  onClick={() => setActiveAiMaterial(mat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00e5ff]/10 to-[#00b8d4]/10 border border-[#00e5ff]/20 text-[#00b8d4] dark:text-[#00e5ff] hover:from-[#00e5ff]/20 hover:to-[#00b8d4]/20 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(0,229,255,0.05)] hover:shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  title="Study with AI"
                >
                  <Sparkles size={14} /> Study with AI
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/50 mx-1"></div>
                {mat.type === 'link' || mat.type === 'video' ? (
                  <a href={mat.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <button className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                    <Download size={16} />
                  </button>
                )}
                {user.role === 'doctor' && (
                  <button onClick={() => handleDelete(mat.material_id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-surface-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {materials.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Materials Yet</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{user.role === 'doctor' ? 'Upload materials for your students.' : 'No materials have been uploaded yet.'}</p>
        </div>
      )}

      {/* Dedicated AI Study Modal */}
      {activeAiMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-[#050b14]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" onClick={closeAiModal}>
          <div 
            className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/60 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.8)] w-full max-w-4xl h-[90vh] flex flex-col animate-scale-in overflow-hidden relative" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 dark:from-[#0f2038] to-white dark:to-[#0a192f] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                  <Sparkles size={24} className="text-[#00e5ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white drop-shadow-md flex items-center gap-2">
                    {aiResult ? aiResult.title : "Study with AI"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {activeAiMaterial.name}
                  </p>
                </div>
              </div>
              <button onClick={closeAiModal} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-transparent relative">
              
              {/* Loader Overlay */}
              {aiLoading && (
                <div className="absolute inset-0 z-10 bg-white/60 dark:bg-[#0a192f]/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
                  <div className="w-16 h-16 mb-4 relative">
                    <div className="absolute inset-0 border-4 border-[#00e5ff]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[#00e5ff] border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-[#00e5ff] animate-pulse" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">AI is analyzing...</h3>
                  <p className="text-slate-500 dark:text-slate-400">Generating the best content for your study session.</p>
                </div>
              )}

              {!aiResult ? (
                /* Grid of Tools */
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-10 mt-4">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">How would you like to study?</h3>
                    <p className="text-slate-600 dark:text-slate-400">Select an AI tool to instantly extract knowledge from this material.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => handleAiAction(activeAiMaterial, 'summary', 'Document Summary')} className="group p-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl hover:border-[#00e5ff]/50 hover:shadow-[0_10px_30px_rgba(0,229,255,0.1)] transition-all text-left flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-[#00e5ff] transition-colors">Summarize Material</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Get a concise, high-level overview of the entire document's core concepts.</p>
                      </div>
                    </button>

                    <button onClick={() => handleAiAction(activeAiMaterial, 'pages', 'Page by Page Summary')} className="group p-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl hover:border-indigo-500/50 hover:shadow-[0_10px_30px_rgba(99,102,241,0.1)] transition-all text-left flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-400 transition-colors">Page-by-Page Summary</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Break down the document page by page for detailed sequential reading.</p>
                      </div>
                    </button>

                    <button onClick={() => handleAiAction(activeAiMaterial, 'flashcards', 'Flashcards')} className="group p-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl hover:border-pink-500/50 hover:shadow-[0_10px_30px_rgba(236,72,153,0.1)] transition-all text-left flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-pink-400 transition-colors">Generate Flashcards</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Extract key terms and definitions into a ready-to-study flashcard format.</p>
                      </div>
                    </button>

                    <button onClick={() => handleAiAction(activeAiMaterial, 'quiz', 'Quiz Me')} className="group p-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl hover:border-amber-500/50 hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)] transition-all text-left flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <FileQuestion size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-amber-400 transition-colors">Quiz Me</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Test your knowledge with an AI-generated multiple-choice quiz based on the text.</p>
                      </div>
                    </button>

                    <button onClick={() => handleAiAction(activeAiMaterial, 'notes', 'Study Notes')} className="group p-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl hover:border-emerald-500/50 hover:shadow-[0_10px_30px_rgba(16,185,129,0.1)] transition-all text-left flex gap-4 items-start md:col-span-2 md:w-2/3 md:mx-auto">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <BrainCircuit size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-400 transition-colors">Generate Comprehensive Notes</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Turn this document into beautifully formatted, structured study notes with bullet points.</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* Results View */
                <div className="animate-fade-in max-w-3xl mx-auto">
                  <div className="prose prose-slate dark:prose-invert prose-base md:prose-lg max-w-none 
                      prose-p:leading-loose prose-headings:font-bold prose-headings:tracking-tight 
                      prose-a:text-[#00e5ff] prose-a:no-underline hover:prose-a:underline
                      prose-code:text-[#00e5ff] prose-code:bg-[#00e5ff]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:shadow-xl
                      prose-ul:list-disc prose-ol:list-decimal prose-li:my-2
                      prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
                      marker:text-slate-400 dark:marker:text-slate-500"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {aiResult.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a192f] flex justify-between items-center shrink-0">
              {aiResult ? (
                <button onClick={() => setAiResult(null)} className="btn-secondary py-2 px-5 font-medium flex items-center gap-2 text-sm">
                  ← Back to Options
                </button>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit size={14} /> AI content may contain inaccuracies
                </p>
              )}
              {aiResult && (
                 <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:flex items-center gap-1.5">
                   <BrainCircuit size={14} /> AI Generated
                 </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


