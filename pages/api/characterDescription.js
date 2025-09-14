// pages/api/characterDescription.js

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST requests are allowed" });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
    }

    try {
        // 向 Python 后端发送请求
        const pythonBackendUrl = `${process.env.BACKEND_URL}/api/generate_description`;
        console.log('Requesting backend URL:', pythonBackendUrl);

        const backendResponse = await fetch(pythonBackendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });
        
        const contentType = backendResponse.headers.get('content-type') || '';
        console.log('Backend response status:', backendResponse.status);
        console.log('Backend response content-type:', contentType);

        if (!backendResponse.ok) {
            if (contentType.includes('application/json')) {
                const errorData = await backendResponse.json().catch(() => ({}));
                const message = errorData.detail || errorData.error || `Backend error ${backendResponse.status}`;
                throw new Error(message);
            } else {
                const text = await backendResponse.text().catch(() => '');
                throw new Error(`Backend error ${backendResponse.status}. Body: ${text.slice(0, 300)}`);
            }
        }

        if (contentType.includes('application/json')) {
            const data = await backendResponse.json();
            return res.status(200).json(data);
        } else {
            const text = await backendResponse.text();
            return res.status(200).json({ result: text });
        }

    } catch (err) {
        console.error("Error in /api/characterDescription:", err.message);
        return res.status(500).json({ error: "Failed to generate character description. Check the Python backend." });
    }
}
