// pages/api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  const { input, selected_npcs } = req.body;
  if (!input) {
    return res.status(400).json({ error: "Input is required." });
  }

  try {
    const pythonBackendUrl = `${process.env.BACKEND_URL}/api/chat`;

    // 向你的 Python 后端发送请求
    const backendResponse = await fetch(pythonBackendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        input, 
        selected_npcs: selected_npcs || []  // 传递选中的NPC列表
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || "Python backend returned an error.");
    }

    const data = await backendResponse.json();
    return res.status(200).json(data);
  } catch (error) {
      console.error("Error in /api/chat:", error.message);
      return res.status(500).json({ error: "Failed to communicate with Python backend." });
    }
}