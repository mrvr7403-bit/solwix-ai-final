export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, subject, level, history } = req.body;
    const apiKey = process.env.GEMINI_KEY;

    if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден." });

    // Самое простое название, которое существует с первого дня
    const model = "gemini-pro"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `Ты — Solwix AI. Предмет: ${subject}. Уровень: ${level}.` }] },
          { role: "model", parts: [{ text: "Окей!" }] },
          ...(history || []).map(m => ({ role: m.role, parts: [{ text: m.parts[0].text }] })),
          { role: "user", parts: [{ text: message }] }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      // Если ОПЯТЬ 404, мы заставим его выплюнуть список того, что он ВООБЩЕ умеет
      if (data.error.code === 404) {
        return res.status(200).json({ 
          text: `Google опять вредничает (404). Он не видит модель '${model}'. Попробуй написать в чат слово 'СПИСОК', чтобы я попробовал найти доступные модели.` 
        });
      }
      return res.status(200).json({ text: `Google выдал: ${data.error.message}` });
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Пусто.";
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Ошибка: " + error.message });
  }
}