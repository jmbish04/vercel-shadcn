export async function fetchSession() {
  try {
    const res = await fetch('/api/session');
    if (!res.ok) throw new Error('Request failed');
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchModels() {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error('Request failed');
    return await res.json();
  } catch {
    return null;
  }
}

export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append('audio', file);
  try {
    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Request failed');
    return await res.json();
  } catch {
    return { error: 'Failed to transcribe' };
  }
}
