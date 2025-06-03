// Vercel: pages/api/generate.js (혹은 app/api/generate/route.js)

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
let openai;
if (apiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다.");
}

export default async function handler(req, res) {
  // 1) CORS 설정 (Base64 방식을 사용하면 Vercel API를 직접 호출하는 대신,
  // Wix 백엔드를 통해 이미지를 처리하므로 Vercel API의 CORS는 덜 중요해질 수 있으나,
  // Wix 프론트엔드가 Vercel API를 직접 호출하여 Base64 데이터를 받아오므로 여전히 필요합니다.)
  res.setHeader("Access-Control-Allow-Origin", "*"); // 또는 특정 Wix 도메인
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

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "prompt가 필요합니다." });
  }

  try {
    const bodyPayload = {
      model: "gpt-image-1",
      prompt: prompt.trim(),
      n: 1,
      size: "1024x1024",
      response_format: "b64_json" // << 변경된 부분
    };

    console.log("▶ OpenAI 이미지 생성 요청 (Base64):", bodyPayload);
    const imageResponse = await openai.images.generate(bodyPayload);

    const data = imageResponse?.data?.[0];
    if (!data?.b64_json) { // << 변경된 부분
      console.error("❌ 유효한 Base64 이미지 데이터 미발견:", imageResponse);
      return res.status(500).json({ error: "Base64 이미지 데이터를 가져오지 못했습니다." });
    }

    // 성공 응답 (Base64 데이터 전달)
    return res.status(200).json({ b64Json: data.b64_json }); // << 변경된 부분

  } catch (err) {
    console.error("❌ 이미지 생성 중 오류 (Base64):", err);
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