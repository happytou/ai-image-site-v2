// pages/api/generate.js

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
let openai;
if (apiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다.");
}

export default async function handler(req, res) {
  // CORS 설정
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

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "prompt가 필요합니다." });
  }

  try {
    const bodyPayload = {
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    };

    console.log("▶ OpenAI 이미지 생성 요청 (b64_json):", bodyPayload);
    const imageResponse = await openai.images.generate(bodyPayload);
    const data = imageResponse?.data?.[0];

    if (!data?.b64_json) {
      console.error("❌ 유효한 Base64 응답 미발견:", imageResponse);
      return res.status(500).json({ error: "이미지 데이터를 가져오지 못했습니다." });
    }

    return res.status(200).json({ b64_json: data.b64_json });

  } catch (err) {
    console.error("❌ 이미지 생성 중 오류:", err);

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
