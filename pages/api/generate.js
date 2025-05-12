// 이 코드는 Vercel의 서버리스 함수 환경에서 실행됩니다.
// (예: Next.js 사용 시 pages/api/generate.js 또는 app/api/generate/route.js)

// OpenAI 라이브러리를 사용하려면 Vercel 프로젝트에 'openai' 패키지를 설치해야 합니다.
// npm install openai 또는 yarn add openai

import OpenAI from 'openai';

// OpenAI API 키는 Vercel 프로젝트의 환경 변수에 OPENAI_API_KEY로 설정해야 합니다.
const apiKey = process.env.OPENAI_API_KEY;

// OpenAI 클라이언트 인스턴스 생성 (API 키가 있을 경우에만)
let openai;
if (apiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. API 기능을 사용할 수 없습니다.");
}

export default async function handler(req, res) {
  // ✅ 1. CORS 허용 헤더 설정
  // 실제 프로덕션 환경에서는 Wix 사이트의 정확한 도메인으로 제한하는 것이 보안상 좋습니다.
  // 예: "https://your-wix-site-domain.com" 또는 Wix Studio 도메인
  res.setHeader("Access-Control-Allow-Origin", "*"); // 개발 중에는 "*"로 두거나, 특정 도메인으로 변경
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Authorization 헤더도 필요할 수 있음 (여기서는 불필요)

  // ✅ 2. 프리플라이트 요청(OPTIONS) 처리
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ 3. POST 요청만 처리
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // API 키가 설정되지 않은 경우 오류 반환
  if (!apiKey || !openai) {
    console.error("서버 설정 오류: OpenAI API 키가 없거나 클라이언트 초기화에 실패했습니다.");
    return res.status(500).json({ error: "서버 설정 오류로 인해 이미지 생성을 처리할 수 없습니다." });
  }

  // ✅ 4. 요청 본문에서 프롬프트 추출 및 유효성 검사
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === "") {
    return res.status(400).json({ error: "프롬프트가 필요합니다. (prompt is required)" });
  }

  try {
    // ✅ 5. OpenAI API 요청 파라미터 설정 (퀄리티 향상)
    const शरीरलोड = { // bodyPayload 변수명 변경 (오타 수정)
      model: "dall-e-3",    // 사용할 모델 (DALL·E 3 권장, API 키 지원 확인)
      prompt: prompt,       // 프론트엔드에서 받은 프롬프트
      n: 1,                 // 생성할 이미지 개수
      size: "1024x1024",    // 이미지 크기 (DALL·E 3는 1024x1024, 1792x1024, 1024x1792 지원)
      quality: "hd",        // 이미지 퀄리티 ("standard" 또는 "hd" - DALL·E 3)
      // style: "vivid",    // 이미지 스타일 ("vivid" 또는 "natural" - DALL·E 3, 선택 사항)
      // user: "unique-user-id-for-monitoring", // OpenAI 정책 준수 및 모니터링을 위한 사용자 ID (선택 사항)
    };

    console.log("OpenAI API 요청 페이로드:", शरीरलोड);

    const imageResponse = await openai.images.generate(शरीरलोड);

    // ✅ 6. OpenAI API 응답 처리
    if (!imageResponse || !imageResponse.data || imageResponse.data.length === 0 || !imageResponse.data[0].url) {
      console.error("OpenAI API 응답에서 유효한 이미지 URL을 찾을 수 없습니다:", imageResponse);
      return res.status(500).json({ error: "이미지 URL을 가져오는데 실패했습니다." });
    }

    const imageUrl = imageResponse.data[0].url;
    console.log("OpenAI API 이미지 생성 성공, URL:", imageUrl);

    // ✅ 7. 프론트엔드로 성공 응답 전송
    res.status(200).json({ imageUrl });

  } catch (err) {
    console.error("OpenAI API 호출 중 또는 기타 예상치 못한 에러:", err);

    let errorMessage = "서버 내부 오류가 발생했습니다.";
    let errorStatus = 500;

    // OpenAI API 오류인 경우 좀 더 구체적인 메시지 제공
    if (err.response) { // Axios 또는 유사 HTTP 클라이언트 오류 구조
        console.error('OpenAI API Error Response Data:', err.response.data);
        errorMessage = err.response.data?.error?.message || err.message || errorMessage;
        errorStatus = err.response.status || errorStatus;
    } else if (err.status && err.message) { // OpenAI 라이브러리 자체 오류 (v4+)
        console.error('OpenAI APIError Status:', err.status);
        console.error('OpenAI APIError Message:', err.message);
        errorMessage = err.message || errorMessage;
        errorStatus = err.status || errorStatus;
        if (err.code === 'content_policy_violation') {
            errorMessage = "프롬프트가 OpenAI의 콘텐츠 정책을 위반하여 이미지를 생성할 수 없습니다.";
            errorStatus = 400; // Bad Request
        } else if (err.status === 429) { // Rate limit
            errorMessage = "현재 요청량이 많습니다. 잠시 후 다시 시도해 주세요.";
        }
    } else {
        errorMessage = err.message || errorMessage;
    }

    res.status(errorStatus).json({ error: errorMessage });
  }
}