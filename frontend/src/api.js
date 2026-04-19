const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function setupSession(companyUrl, companyName, roleTitle, maxPages = 30) {
  const res = await fetch(`${BASE_URL}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_url: companyUrl,
      company_name: companyName,
      role_title: roleTitle,
      max_pages: maxPages,
    }),
  });
  return res.json();
}

export async function pollStatus(sessionId) {
  const res = await fetch(`${BASE_URL}/status/${sessionId}`);
  return res.json();
}

export async function uploadResume(sessionId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/upload/${sessionId}?category=resume`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function getNextQuestion(sessionId) {
  const res = await fetch(`${BASE_URL}/quiz/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return res.json();
}

export async function submitAnswer(sessionId, question, answer, contextUsed) {
  const res = await fetch(`${BASE_URL}/quiz/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      question,
      answer,
      context_used: contextUsed,
    }),
  });
  return res.json();
}

export async function getMemory(sessionId) {
  const res = await fetch(`${BASE_URL}/memory/${sessionId}`);
  return res.json();
}

export async function gradeInterview(sessionId, conversation, roleTitle, companyName) {
  const res = await fetch(`${BASE_URL}/grade-interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      conversation,
      role_title: roleTitle,
      company_name: companyName,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grading failed (${res.status}): ${err}`);
  }
  return res.json();
}

export async function getRealtimeSession(sessionId = null) {
  const res = await fetch(`${BASE_URL}/realtime/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),  // sends null if no session yet
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Realtime session failed (${res.status}): ${err}`);
  }
  return res.json();
}
