import { useState, useRef, useEffect } from "react";

const TABS = [
  { id: "news", label: "📰 নিউজ", en: "News" },
  { id: "chat", label: "💬 চ্যাট", en: "Chat" },
  { id: "image", label: "🎨 ছবি তৈরি", en: "Image" },
  { id: "analyze", label: "🔍 ছবি বিশ্লেষণ", en: "Analyze" },
];

const MODEL = "claude-sonnet-4-20250514";

async function callClaude({ messages, system, tools }) {
  const body = { model: MODEL, max_tokens: 1000, messages };
  if (system) body.system = system;
  if (tools) body.tools = tools;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── NEWS TAB ───────────────────────────────────────────────────────────────
function NewsTab() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("বিশ্বের শীর্ষ সংবাদ");

  async function fetchNews() {
    setLoading(true);
    setNews([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [
            {
              role: "user",
              content: `Search for today's top 5 news about: "${topic}". 
              Return ONLY a JSON array (no markdown, no explanation) like:
              [{"title":"...","summary":"...","source":"..."}]
              Titles and summaries should be in Bengali if possible.`,
            },
          ],
        }),
      });
      const data = await res.json();
      const textBlocks = data.content?.filter((b) => b.type === "text") || [];
      const rawText = textBlocks.map((b) => b.text).join("");
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setNews(parsed);
      } else {
        setNews([{ title: "তথ্য পাওয়া যায়নি", summary: rawText.slice(0, 300), source: "" }]);
      }
    } catch (e) {
      setNews([{ title: "ত্রুটি হয়েছে", summary: "আবার চেষ্টা করুন।", source: "" }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="যেমন: বাংলাদেশ, খেলাধুলা, প্রযুক্তি..."
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && fetchNews()}
        />
        <button onClick={fetchNews} style={btnStyle} disabled={loading}>
          {loading ? "⏳" : "খোঁজো"}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={spinnerStyle} />
          <p style={{ color: "#94a3b8", marginTop: 12 }}>সংবাদ খোঁজা হচ্ছে...</p>
        </div>
      )}

      {news.map((item, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>
              {["🔴", "🟠", "🟡", "🟢", "🔵"][i] || "⚪"}
            </span>
            <div>
              <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>
                {item.title}
              </h3>
              <p style={{ margin: "8px 0 4px", color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
                {item.summary}
              </p>
              {item.source && (
                <span style={{ fontSize: 11, color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 8px", borderRadius: 20 }}>
                  {item.source}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {!loading && news.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
          <p>বিষয় লিখে "খোঁজো" চাপুন</p>
        </div>
      )}
    </div>
  );
}

// ─── CHAT TAB ────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const data = await callClaude({
        system: "তুমি একটি সহায়ক AI সহকারী। বাংলায় উত্তর দাও যদি প্রশ্ন বাংলায় হয়। সংক্ষিপ্ত ও স্পষ্টভাবে উত্তর দাও।",
        messages: newHistory,
      });
      const reply = data.content?.find((b) => b.type === "text")?.text || "উত্তর পাওয়া যায়নি।";
      setMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "ত্রুটি হয়েছে। আবার চেষ্টা করুন।" }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8, minHeight: 300, maxHeight: 420 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p>যেকোনো প্রশ্ন করুন!</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {["বাংলাদেশের রাজধানী কোথায়?", "AI কী?", "রান্নার রেসিপি দাও"].map((s) => (
                <button key={s} onClick={() => setInput(s)} style={{ ...btnStyle, padding: "6px 12px", fontSize: 12, background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? "linear-gradient(135deg,#38bdf8,#818cf8)" : "rgba(255,255,255,0.07)",
              color: "#f1f5f9", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "18px 18px 18px 4px", padding: "10px 16px" }}>
              <span style={{ color: "#94a3b8" }}>ভাবছি</span>
              <span style={{ animation: "blink 1s infinite", marginLeft: 4, color: "#38bdf8" }}>●●●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="এখানে লিখুন..."
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading} style={btnStyle}>
          {loading ? "⏳" : "পাঠাও"}
        </button>
      </div>
    </div>
  );
}

// ─── IMAGE GENERATION TAB ────────────────────────────────────────────────────
function ImageTab() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [translatedPrompt, setTranslatedPrompt] = useState("");

  async function generateImage() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setImageUrl("");
    setTranslatedPrompt("");
    try {
      // Translate Bengali prompt to English for better image generation
      const data = await callClaude({
        messages: [{
          role: "user",
          content: `Translate this image description to English for an image generation AI. Return ONLY the English translation, nothing else: "${prompt}"`
        }]
      });
      const englishPrompt = data.content?.find((b) => b.type === "text")?.text?.trim() || prompt;
      setTranslatedPrompt(englishPrompt);
      const encoded = encodeURIComponent(englishPrompt + ", high quality, detailed, artistic");
      setImageUrl(`https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${Date.now()}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ছবির বর্ণনা লিখুন... যেমন: নদীর পাশে সূর্যাস্ত"
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && generateImage()}
        />
        <button onClick={generateImage} style={btnStyle} disabled={loading}>
          {loading ? "⏳" : "তৈরি করো"}
        </button>
      </div>

      {translatedPrompt && (
        <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
          🔤 English: {translatedPrompt}
        </div>
      )}

      {loading && !imageUrl && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={spinnerStyle} />
          <p style={{ color: "#94a3b8", marginTop: 12 }}>ছবি তৈরি হচ্ছে...</p>
        </div>
      )}

      {imageUrl && (
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
          <img
            src={imageUrl}
            alt={prompt}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{ width: "100%", display: "block", borderRadius: 16 }}
          />
          <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{prompt}</span>
            <a href={imageUrl} download="ai-image.jpg" style={{ color: "#38bdf8", fontSize: 12, textDecoration: "none" }}>
              ⬇️ ডাউনলোড
            </a>
          </div>
        </div>
      )}

      {!imageUrl && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
          <p>বর্ণনা লিখুন, AI ছবি বানিয়ে দেবে!</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
            {["সমুদ্রের মাঝে সূর্যাস্ত", "মহাকাশে মহাকাশচারী", "বনের মধ্যে পরী"].map((s) => (
              <button key={s} onClick={() => setPrompt(s)} style={{ ...btnStyle, padding: "6px 12px", fontSize: 12, background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IMAGE ANALYSIS TAB ──────────────────────────────────────────────────────
function AnalyzeTab() {
  const [imageData, setImageData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("এই ছবিতে কী আছে বিস্তারিত বলো।");
  const fileRef = useRef();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setImageData({ base64, type: file.type });
      setPreview(ev.target.result);
      setAnalysis("");
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!imageData || loading) return;
    setLoading(true);
    setAnalysis("");
    try {
      const data = await callClaude({
        system: "তুমি একজন বিশেষজ্ঞ ছবি বিশ্লেষক। বাংলায় উত্তর দাও।",
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: imageData.type, data: imageData.base64 } },
            { type: "text", text: question }
          ]
        }]
      });
      setAnalysis(data.content?.find((b) => b.type === "text")?.text || "বিশ্লেষণ করা সম্ভব হয়নি।");
    } catch {
      setAnalysis("ত্রুটি হয়েছে। আবার চেষ্টা করুন।");
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: "2px dashed rgba(56,189,248,0.4)", borderRadius: 16, padding: preview ? 0 : 40,
          textAlign: "center", cursor: "pointer", overflow: "hidden",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#38bdf8"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)"}
      >
        {preview ? (
          <img src={preview} alt="uploaded" style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "contain" }} />
        ) : (
          <div style={{ color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
            <p>ক্লিক করে ছবি আপলোড করুন</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP সমর্থিত</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      </div>

      {preview && (
        <>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="ছবি সম্পর্কে প্রশ্ন করুন..."
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["এই ছবিতে কী আছে বিস্তারিত বলো।", "এই ছবির আবেগ কেমন?", "এটি কোন ধরনের ছবি?"].map((q) => (
              <button key={q} onClick={() => setQuestion(q)} style={{ ...btnStyle, padding: "5px 10px", fontSize: 11, background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
                {q}
              </button>
            ))}
          </div>
          <button onClick={analyze} disabled={loading} style={btnStyle}>
            {loading ? "⏳ বিশ্লেষণ চলছে..." : "🔍 বিশ্লেষণ করো"}
          </button>
        </>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={spinnerStyle} />
        </div>
      )}

      {analysis && (
        <div style={{ ...cardStyle, whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#e2e8f0", fontSize: 14 }}>
          {analysis}
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const inputStyle = {
  flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none",
  fontFamily: "inherit",
};
const btnStyle = {
  background: "linear-gradient(135deg,#38bdf8,#818cf8)", border: "none", borderRadius: 12,
  padding: "10px 18px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
  whiteSpace: "nowrap", fontFamily: "inherit",
};
const cardStyle = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16, padding: 16,
};
const spinnerStyle = {
  width: 36, height: 36, border: "3px solid rgba(56,189,248,0.2)",
  borderTop: "3px solid #38bdf8", borderRadius: "50%",
  animation: "spin 0.8s linear infinite", margin: "0 auto",
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("news");

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e 0%,#0d1424 50%,#0a0f1e 100%)",
      fontFamily: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif", color: "#f1f5f9",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #64748b; }
        input:focus { border-color: rgba(56,189,248,0.5) !important; box-shadow: 0 0 0 3px rgba(56,189,248,0.1); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.3); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#38bdf8,#818cf8)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>✦</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            নেক্সাস AI
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>আপনার বুদ্ধিমান সহকারী</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontSize: 11, color: "#64748b" }}>সক্রিয়</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, padding: "12px 16px",
        background: "rgba(0,0,0,0.2)", overflowX: "auto",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              transition: "all 0.2s",
              background: tab === t.id ? "linear-gradient(135deg,#38bdf8,#818cf8)" : "rgba(255,255,255,0.05)",
              color: tab === t.id ? "#fff" : "#94a3b8",
              boxShadow: tab === t.id ? "0 4px 15px rgba(56,189,248,0.3)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16, animation: "fadeIn 0.3s ease" }} key={tab}>
        {tab === "news" && <NewsTab />}
        {tab === "chat" && <ChatTab />}
        {tab === "image" && <ImageTab />}
        {tab === "analyze" && <AnalyzeTab />}
      </div>
    </div>
  );
}
