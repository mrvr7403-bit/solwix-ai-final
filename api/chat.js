export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) return res.status(200).json({ text: "Ошибка: Ключ не найден." });

  try {
    // Мы идем по адресу, который просто возвращает список доступных моделей
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const response = await fetch(listUrl);
    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ text: `Ошибка при получении списка: ${data.error.message}` });
    }

    // Собираем названия всех моделей, которые разрешил Google
    const modelNames = data.models.map(m => m.name.replace('models/', '')).join(', ');

    return res.status(200).json({ 
      text: `Google говорит, что тебе доступны только эти модели: [ ${modelNames} ]. Скопируй этот список и пришли мне!` 
    });

  } catch (error) {
    return res.status(200).json({ text: "Системная ошибка диагностики: " + error.message });
  }
}