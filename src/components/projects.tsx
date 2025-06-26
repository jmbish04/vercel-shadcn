import { useEffect, useState } from "react";

interface Project {
  id: string;
  title?: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  const openProject = (id: string) => {
    setSelected(id);
    fetch(`/api/project/files?id=${id}`)
      .then((r) => r.json())
      .then((d) => setFiles(d.files || []))
      .catch(() => setFiles([]));
  };

  return (
    <div className="space-y-2">
      <h2 className="font-bold">Apps Script Projects</h2>
      <ul className="space-y-1">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              className="underline"
              onClick={() => openProject(p.id)}
            >
              {p.title || p.id}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-4">
          <h3 className="font-semibold">Files</h3>
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
