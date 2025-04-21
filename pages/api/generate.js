export default async function handler(req, res) {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "프롬프트가 필요합니다." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "512x512"
      })
    });

    // 응답 확인
    if (!response.ok) {
      const errorText = await response.text(); // JSON 아닐 수도 있으므로
      console.error("이미지 생성 실패:", errorText);
      return res.status(response.status).json({ error: "이미지 생성 실패: " + errorText });
    }

    const result = await response.json();
    const imageUrl = result.data[0].url;

    res.status(200).json({ imageUrl });

  } catch (err) {
    console.error("예상치 못한 에러:", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}
