import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, first_name, last_name, username, province, country } = await req.json();

    if (!email || !password || !username) {
      return new Response(
        JSON.stringify({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name?.trim() ?? "",
        last_name: last_name?.trim() ?? "",
        username: username.trim(),
        province: province ?? "กรุงเทพมหานคร",
        country: country ?? "Thailand",
      },
    });

    if (createError) {
      const status: number = (createError as any).status ?? 0;
      const code: string = (createError as any).code ?? "";
      if (status === 422 || code === "email_exists" || code === "user_already_exists") {
        return new Response(
          JSON.stringify({ error: "อีเมลนี้ถูกใช้งานแล้ว" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ error: "ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userData.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "เกิดข้อผิดพลาด" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
