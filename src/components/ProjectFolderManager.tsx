import React, { useState } from "react";
import { Project } from "../types";
import { Badge, Btn } from "./SharedPrimitives";
import { createProject, updateProjectDetails, deleteProject } from "../services/api";

interface ProjectFolderManagerProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onRefreshProjects: () => void;
  onClose: () => void;
  onNavigate: (section: any) => void;
}

export function ProjectFolderManager({
  projects,
  activeProject,
  onSelectProject,
  onRefreshProjects,
  onClose,
  onNavigate,
}: ProjectFolderManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCrs, setEditCrs] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCrs, setNewCrs] = useState("WGS84 / UTM Zone 33N");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenProject = (p: Project) => {
    onSelectProject(p);
    onNavigate("visualization");
    onClose();
  };

  const handleStartEdit = (p: Project) => {
    setEditingProject(p);
    setEditName(p.name);
    setEditDesc(p.description || "");
    setEditCrs(p.coordinate_system || "WGS84 / UTM Zone 33N");
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !editName.trim()) return;
    await updateProjectDetails(editingProject.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      coordinate_system: editCrs,
    });
    setEditingProject(null);
    onRefreshProjects();
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;
    const created = await createProject(newName.trim(), newDesc.trim());
    if (newCrs && created.id) {
      await updateProjectDetails(created.id, { coordinate_system: newCrs });
    }
    setShowNewModal(false);
    setNewName("");
    setNewDesc("");
    onRefreshProjects();
    onSelectProject(created);
    onNavigate("input");
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteProject(id);
    setDeletingId(null);
    onRefreshProjects();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs text-slate-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#131418] border border-[#2a2b31] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2b31] bg-[#18191d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-base">
              📂
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">PROJECT FOLDER STORAGE HUB</h2>
              <p className="text-[10px] text-slate-400">
                Manage, open, and edit 3D drone reconstruction projects saved in <code className="text-cyan-400 font-semibold">backend/storage/</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewModal(true)}
              className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <span>✨</span> NEW PROJECT FOLDER
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded bg-[#22242b] text-slate-400 hover:text-slate-200 border border-[#2a2b31] text-xs cursor-pointer"
            >
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-[#2a2b31] bg-[#15161b] flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search project folders by name, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1c1d23] text-slate-200 pl-8 pr-4 py-1.5 rounded border border-[#2a2b31] outline-none focus:border-cyan-500/60 text-xs"
            />
            <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
          </div>
          <span className="text-[10px] text-slate-400">
            SHOWING <strong className="text-cyan-400">{filteredProjects.length}</strong> OF {projects.length} PROJECTS
          </span>
        </div>

        {/* Project Folder List */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const isActive = activeProject?.id === p.id;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/5"
                    : "bg-[#18191d] border-[#2a2b31] hover:border-[#3d3e47]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-100 font-bold text-sm truncate max-w-[200px]">{p.name}</span>
                        {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-400 border border-cyan-400/30">ACTIVE</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                    </div>
                    <Badge label={p.status} variant={p.status === "COMPLETED" ? "ok" : "running"} />
                  </div>

                  {p.description && (
                    <p className="text-[11px] text-slate-300 mb-3 line-clamp-2">{p.description}</p>
                  )}

                  {/* Folder Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-[#131418] p-2.5 rounded-lg border border-[#23242c] mb-3 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">LOCAL STORAGE FOLDER</span>
                      <span className="text-cyan-400 font-semibold truncate block">storage/{p.id}/</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">COORDINATE SYSTEM</span>
                      <span className="text-slate-300 truncate block">{p.coordinate_system || "WGS84 / UTM 33N"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">3D MESH & TEXTURE</span>
                      <span className="text-emerald-400 font-semibold block">model.glb (2048x2048 Atlas)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SOURCE VIDEO</span>
                      <span className="text-slate-300 truncate block">{p.video_filename || "Drone UAV Scan"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#23242c]">
                  <span className="text-[9px] text-slate-500">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="px-2.5 py-1 rounded bg-[#22242b] text-slate-300 hover:text-cyan-400 border border-[#2a2b31] text-[10px] cursor-pointer"
                    >
                      ✏️ EDIT
                    </button>
                    <button
                      onClick={() => setDeletingId(p.id)}
                      className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] cursor-pointer"
                    >
                      🗑️ DELETE
                    </button>
                    <button
                      onClick={() => handleOpenProject(p)}
                      className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <span>🚀</span> OPEN & VIEW 3D
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#18191d] border border-[#2a2b31] rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#2a2b31] pb-2">
              <span className="font-bold text-slate-100 text-sm">EDIT PROJECT: {editingProject.id}</span>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-400 text-[10px] mb-1 block">Project Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#131418] text-slate-100 p-2 rounded border border-[#2a2b31] outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] mb-1 block">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#131418] text-slate-100 p-2 rounded border border-[#2a2b31] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] mb-1 block">Coordinate Reference System (CRS)</label>
                <select
                  value={editCrs}
                  onChange={(e) => setEditCrs(e.target.value)}
                  className="w-full bg-[#131418] text-cyan-400 p-2 rounded border border-[#2a2b31] outline-none"
                >
                  <option value="WGS84 / UTM Zone 33N">WGS84 / UTM Zone 33N (EPSG:32633)</option>
                  <option value="WGS84 / UTM Zone 32N">WGS84 / UTM Zone 32N (EPSG:32632)</option>
                  <option value="WGS84 Geographic">WGS84 Geographic (EPSG:4326)</option>
                  <option value="Web Mercator">Web Mercator (EPSG:3857)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2b31]">
              <button
                onClick={() => setEditingProject(null)}
                className="px-3 py-1.5 rounded bg-[#22242b] text-slate-400 text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold"
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#18191d] border border-[#2a2b31] rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#2a2b31] pb-2">
              <span className="font-bold text-slate-100 text-sm">CREATE NEW PROJECT FOLDER</span>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-400 text-[10px] mb-1 block">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Zurich_MAV_Scan_Session_02"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#131418] text-slate-100 p-2 rounded border border-[#2a2b31] outline-none focus:border-cyan-500/60"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] mb-1 block">Description</label>
                <textarea
                  placeholder="Optional site notes, location info, or survey objective..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#131418] text-slate-100 p-2 rounded border border-[#2a2b31] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] mb-1 block">Target Coordinate System (CRS)</label>
                <select
                  value={newCrs}
                  onChange={(e) => setNewCrs(e.target.value)}
                  className="w-full bg-[#131418] text-cyan-400 p-2 rounded border border-[#2a2b31] outline-none"
                >
                  <option value="WGS84 / UTM Zone 33N">WGS84 / UTM Zone 33N (EPSG:32633)</option>
                  <option value="WGS84 / UTM Zone 32N">WGS84 / UTM Zone 32N (EPSG:32632)</option>
                  <option value="WGS84 Geographic">WGS84 Geographic (EPSG:4326)</option>
                  <option value="Web Mercator">Web Mercator (EPSG:3857)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2b31]">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 rounded bg-[#22242b] text-slate-400 text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreateNew}
                className="px-4 py-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-bold"
              >
                CREATE PROJECT FOLDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-[#18191d] border border-rose-500/40 rounded-xl p-5 shadow-2xl flex flex-col gap-4 text-center">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-sm font-bold text-slate-100">CONFIRM PROJECT DELETION</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete project folder <strong className="text-rose-400">{deletingId}</strong> and all its 3D mesh files from disk?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-1.5 rounded bg-[#22242b] text-slate-300 text-xs cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingId)}
                className="px-4 py-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold cursor-pointer"
              >
                DELETE FOREVER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
