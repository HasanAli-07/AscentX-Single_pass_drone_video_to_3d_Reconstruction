import { Section } from "../types";

interface SidebarProps {
  activeSection: Section;
  setActiveSection: (s: Section) => void;
}

export function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const sections: { id: Section; label: string; num: string }[] = [
    { id: "project",        label: "PROJECT",        num: "01" },
    { id: "input",          label: "INPUT DATA",     num: "02" },
    { id: "frames",         label: "FRAME SELECTION",num: "03" },
    { id: "reconstruction", label: "RECONSTRUCTION", num: "04" },
    { id: "analysis",       label: "MESH ANALYSIS",   num: "05" },
    { id: "georef",         label: "GEOREFERENCING", num: "06" },
    { id: "visualization", label: "VISUALIZATION",   num: "07" },
    { id: "measurements",  label: "MEASUREMENTS",   num: "08" },
    { id: "reports",        label: "REPORTS",        num: "09" },
    { id: "export",         label: "EXPORT",         num: "10" },
  ];

  return (
    <aside className="w-56 border-r flex flex-col flex-shrink-0" style={{ background: "#131418", borderColor: "#2a2b31" }}>
      <div className="p-3 border-b" style={{ borderColor: "#1f2025" }}>
        <span className="stat-label" style={{ color: "#4a4d5a" }}>WORKFLOW PIPELINE</span>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer"
              style={{
                background: isActive ? "#00c8d410" : "transparent",
                borderLeft: isActive ? "3px solid #00c8d4" : "3px solid transparent",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ color: isActive ? "#00c8d4" : "#3a3d4a", fontFamily: "JetBrains Mono, monospace", fontSize: 9 }}>
                  {s.num}
                </span>
                <span
                  style={{
                    color: isActive ? "#e2e4ea" : "#6a6d7a",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00c8d4" }} />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
