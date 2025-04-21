import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setImage(data.imageUrl);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🎨 AI 이미지 생성기</h1>
      <input
        type="text"
        placeholder="무엇을 그리고 싶나요?"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: "300px", marginRight: "10px" }}
      />
      <button onClick={generate}>생성하기</button>
      {loading && <p>이미지 생성 중...</p>}
      {image && <img src={image} alt="AI 이미지" style={{ marginTop: "20px", maxWidth: "512px" }} />}
    </div>
  );
}
