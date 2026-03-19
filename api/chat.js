export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, subject, level, history } = req.body;
  const apiKey = process.env.GEMINI_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured on server' });
  }

  const systemInstruction = `Ты — Solwix AI, умный помощник. 
    Предмет: ${subject}. 
    Целевая аудитория: ${level}. 
    Твоя задача: помогать ученику. Если это математика или физика, пиши формулы в формате $$...$$ для блоков и $...$ для строк. 
    Используй жирный текст для терминов. Отвечай на русском языке.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: history,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}