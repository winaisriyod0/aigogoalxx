import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HEADLINE_INSTRUCTION = `คุณคือบรรณาธิการข่าวฟุตบอลระดับมืออาชีพ

หน้าที่: สร้างพาดหัวข่าวก่อนการแข่งขันฟุตบอล 2 บรรทัด

กฎ:
- ภาษาไทย
- จำนวน 2 บรรทัดพอดี คั่นด้วย \\n
- ไม่เกิน 60 ตัวอักษรต่อบรรทัด
- ห้ามใส่เครื่องหมายคำพูด
- ห้ามใช้ Emoji
- ห้ามกล่าวถึงราคาบอลหรือการพนัน
- เขียนแบบสื่อกีฬาอาชีพผสมการวิเคราะห์เชิงข้อมูล
- ต้องดึงจุดสำคัญที่สุดของคู่แข่งขัน
- เน้นฟอร์มล่าสุด สถิติสำคัญ แรงจูงใจ และโอกาสเข้ารอบ
- หลีกเลี่ยงคำเวอร์เกินจริง
- อ่านจบภายใน 2 วินาที

รูปแบบ:
บรรทัดที่ 1 = ประเด็นหลักของเกม (ไม่เกิน 60 ตัวอักษร)
บรรทัดที่ 2 = มุมวิเคราะห์หรือสิ่งที่น่าจับตา (ไม่เกิน 60 ตัวอักษร)

ตัวอย่าง:
บราซิลลุ้นยึดแชมป์กลุ่ม C คืนนี้
สกอตแลนด์ต้องชนะเพื่อรักษาความหวังเข้ารอบ`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { aiId, homeTeam, awayTeam, stage, group } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

    const matchInfo = `${homeTeam} vs ${awayTeam} (${stage}${group ? ` - ${group}` : ""}) ฟุตบอลโลก 2026`;

    const prompt = `${HEADLINE_INSTRUCTION}

แมตช์: ${matchInfo}

ตอบกลับเป็น JSON เท่านั้น (ห้ามมีข้อความอื่นนอก JSON):
{
  "score": "X-Y",
  "headline": "บรรทัดที่ 1 ไม่เกิน 60 ตัวอักษร\\nบรรทัดที่ 2 ไม่เกิน 60 ตัวอักษร",
  "analysis": "วิเคราะห์แมตช์ภาษาไทย เชิงลึก (150-300 ตัวอักษร)",
  "scenario": "สถานการณ์ที่คาดหวังภาษาไทย (100-200 ตัวอักษร)"
}`;

    let result: { score: string; headline: string; analysis: string; scenario: string } | null = null;

    if (aiId === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 },
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      result = parseJSON(text);
    } else if (aiId === "deepseek") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: HEADLINE_INSTRUCTION,
            },
            {
              role: "user",
              content: `วิเคราะห์แมตช์: ${matchInfo}\n\nตอบกลับเป็น JSON เท่านั้น:\n{\n  "score": "X-Y",\n  "headline": "บรรทัดที่ 1\\nบรรทัดที่ 2",\n  "analysis": "วิเคราะห์เชิงลึก 150-300 ตัวอักษร",\n  "scenario": "สถานการณ์ที่คาดหวัง 100-200 ตัวอักษร"\n}`,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      result = parseJSON(text);
    } else if (aiId === "claude") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://aigogoal.app",
          "X-Title": "AI Go Goal",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-haiku",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      result = parseJSON(text);
    }

    if (!result) throw new Error("ไม่ได้รับข้อมูลจาก AI");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseJSON(text: string): { score: string; headline: string; analysis: string; scenario: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
