import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { materialService } from '../../services';
import { FileText, Link2, Video, Image, Upload, Download, ExternalLink, Trash2, Plus, X } from 'lucide-react';
import type { Material, User } from '../../types';

interface Ctx { classId: string; user: User }

const typeIcons: Record<string, typeof FileText> = { pdf: FileText, link: Link2, video: Video, image: Image, document: FileText };
const typeColors: Record<string, string> = { pdf: 'bg-red-50 text-red-600', link: 'bg-blue-50 text-blue-600', video: 'bg-purple-50 text-purple-600', image: 'bg-green-50 text-green-600', document: 'bg-amber-50 text-amber-600' };

export default function ClassMaterialsTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', type: 'pdf' as Material['type'], summarize: '' });

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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
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
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
                <Upload size={24} className="text-surface-400 mb-2" />
                <span className="text-sm text-surface-500">Drag & drop files here, or click to browse</span>
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
                <h3 className="font-semibold text-surface-800">{mat.name}</h3>
                {mat.summarize && <p className="text-sm text-surface-500 mt-1 line-clamp-2">{mat.summarize}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                  <span className="badge bg-surface-100 text-surface-600 uppercase">{mat.type}</span>
                  <span>{formatDate(mat.uploaded_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {mat.type === 'link' || mat.type === 'video' ? (
                  <a href={mat.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-surface-500">
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <button className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-surface-500">
                    <Download size={16} />
                  </button>
                )}
                {user.role === 'doctor' && (
                  <button onClick={() => handleDelete(mat.material_id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-surface-400 hover:text-red-500">
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
          <h3 className="text-lg font-semibold text-surface-700">No Materials Yet</h3>
          <p className="text-surface-500 mt-1">{user.role === 'doctor' ? 'Upload materials for your students.' : 'No materials have been uploaded yet.'}</p>
        </div>
      )}
    </div>
  );
}
