// pages/api/generate.js (혹은 app/api/generate/route.js)

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
let openai;
if (apiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다.");
}

export default async function handler(req, res) {
  // 1) CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  if (!openai) {
    return res.status(500).json({ error: "서버 설정 오류: API 키 누락" });
  }

  // 2) 요청 본문에서 prompt 추출
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "prompt가 필요합니다." });
  }

  try {
    // 3) 고퀄리티 생성용 payload
    const bodyPayload = {
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,                      // 여러 장을 원하면 4 등으로 조정
      size: "1024x1024",         // 고해상도
      response_format: "url"     // 원본 PNG URL
    };

    console.log("▶ OpenAI 이미지 생성 요청:", bodyPayload);
    const imageResponse = await openai.images.generate(bodyPayload);

    const data = imageResponse?.data?.[0];
    if (!data?.url) {
      console.error("❌ 유효한 이미지 URL 미발견:", imageResponse);
      return res.status(500).json({ error: "이미지 URL을 가져오지 못했습니다." });
    }

    // 4) 성공 응답
    return res.status(200).json({ imageUrl: data.url });

  } catch (err) {
    console.error("❌ 이미지 생성 중 오류:", err);

    // 에러 메시지 파싱
    let message = "서버 오류가 발생했습니다.";
    let status = 500;
    if (err.response?.data?.error?.message) {
      message = err.response.data.error.message;
      status = err.response.status || status;
    } else if (err.message) {
      message = err.message;
    }

    return res.status(status).json({ error: message });
  }
}
