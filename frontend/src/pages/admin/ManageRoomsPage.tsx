import { useState, useEffect } from "react";
import { Plus, X, MapPin, Users, Building2, Trash2, Edit2, Search } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { CardSkeleton } from "../../components/ui/Skeleton";

interface Room {
  room_id: string;
  room_name: string;
  capacity: number;
  type: string;
  location: string;
}

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Room>({
    room_id: "",
    room_name: "",
    capacity: 30,
    type: "Lecture",
    location: "",
  });

  const fetchRooms = async () => {
    try {
      const res = await apiClient.get("/rooms");
      // Normalize keys to lowercase if backend returns PascalCase
      const normalized = res.data.data.map((r: any) => ({
        room_id: r.Room_ID || r.room_id,
        room_name: r.Room_Name || r.room_name,
        capacity: r.Capacity || r.capacity,
        type: r.Type || r.type,
        location: r.Location || r.location
      }));
      setRooms(normalized);
    } catch (err: any) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isEditing) {
        await apiClient.put(`/rooms/${form.room_id}`, form);
      } else {
        await apiClient.post("/rooms", form);
      }
      setShowModal(false);
      fetchRooms();
      setForm({ room_id: "", room_name: "", capacity: 30, type: "Lecture", location: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    setError(null);
    try {
      await apiClient.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (err: any) {
      console.error("Failed to delete room", err);
      const msg = err?.response?.data?.message || "Failed to delete room";
      setError(msg);
      alert(msg);
    }
  };

  const handleEdit = (room: Room) => {
    setForm({ ...room });
    setIsEditing(true);
    setShowModal(true);
  };

  const filteredRooms = rooms.filter(r => 
    (r.room_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.room_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">ROOM MANAGEMENT</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage university halls, labs and lecture rooms.</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setForm({ room_id: "", room_name: "", capacity: 30, type: "Lecture", location: "" });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 px-6 py-3"
        >
          <Plus size={20} /> Add New Room
        </button>
      </div>

      <div className="flex items-center gap-4 bg-slate-900/95 dark:bg-slate-950/95 p-4 rounded-3xl border border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
        <div className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center shadow-inner">
          <Search className="text-slate-300" size={20} />
        </div>
        <input
          type="text"
          placeholder="Search by room name or ID..."
          className="w-full bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700 dark:border-slate-700 rounded-[28px] px-5 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.room_id} className="card p-6 group hover:border-primary-500/50 transition-all duration-300 animate-slide-up bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800">
              <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(room)} className="p-2 hover:bg-primary-500/10 rounded-xl text-slate-400 hover:text-primary-500 transition-all">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(room.room_id)} className="p-2 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/10 to-indigo-600/10 flex items-center justify-center border border-primary-500/20">
                  <Building2 size={28} className="text-primary-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{room.room_name}</h3>
                  <span className="text-xs font-black text-primary-500 tracking-widest uppercase">{room.room_id}</span>
                </div>
              </div>

              <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Users size={16} className="text-primary-500" />
                  <span className="font-medium">Capacity:</span>
                  <span className="font-bold text-slate-900 dark:text-white ml-auto">{room.capacity} Students</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Building2 size={16} className="text-primary-500" />
                  <span className="font-medium">Type:</span>
                  <span className="font-bold text-slate-900 dark:text-white ml-auto">{room.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin size={16} className="text-primary-500" />
                  <span className="font-medium">Location:</span>
                  <span className="font-bold text-slate-900 dark:text-white ml-auto truncate">{room.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950/95 border border-slate-800 shadow-[0_35px_120px_rgba(0,0,0,0.45)] w-full max-w-xl rounded-[32px] overflow-hidden animate-scale-in">
            <div className="p-6 bg-gradient-to-r from-[#0b1220] via-[#07101c] to-[#0b1220] border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-400/70">Room Details</p>
                <h2 className="text-2xl font-black text-white leading-tight">{isEditing ? "Edit Room" : "Add New Room"}</h2>
                <p className="text-sm text-slate-400 max-w-xl">Keep room data accurate and consistent across schedules, labs, and lecture halls.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-2 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-slate-950">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-3xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.24em]">Room ID</label>
                  <input
                    required
                    disabled={isEditing}
                    className="input-field bg-slate-900/80 text-white border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30"
                    placeholder="H1-101"
                    value={form.room_id}
                    onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.24em]">Room Name</label>
                  <input
                    required
                    className="input-field bg-slate-900/80 text-white border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30"
                    placeholder="Hall A"
                    value={form.room_name}
                    onChange={(e) => setForm({ ...form, room_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.24em]">Capacity</label>
                  <input
                    required
                    type="number"
                    className="input-field bg-slate-900/80 text-white border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.24em]">Type</label>
                  <select
                    className="input-field bg-slate-900/80 text-white border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Lecture">Lecture Hall</option>
                    <option value="Section">Section Room</option>
                    <option value="Lab">Computer Lab</option>
                    <option value="Office">Office</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-[0.24em]">Location</label>
                <input
                  required
                  className="input-field bg-slate-900/80 text-white border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30"
                  placeholder="Building H1, Floor 2"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                <button type="submit" className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-[0.24em] shadow-xl shadow-cyan-500/20 transition-all hover:-translate-y-0.5">
                  {isEditing ? "Update Room" : "Create Room"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-3xl border border-slate-700 bg-slate-900/70 px-6 py-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
