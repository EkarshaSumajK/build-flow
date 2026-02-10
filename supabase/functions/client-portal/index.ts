import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch token
    const { data: tokenData, error: tokenError } = await supabase
      .from("client_portal_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: "Token has expired" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = tokenData.project_id;
    const permissions = tokenData.permissions as string[];

    // Fetch project
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, status, progress, budget, start_date, end_date, client_name, location")
      .eq("id", projectId)
      .single();

    let tasks: any[] = [];
    let photos: any[] = [];
    let bills: any[] = [];

    // Fetch based on permissions
    if (permissions.includes("progress") || permissions.includes("schedule")) {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, progress, start_date, due_date, priority")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      tasks = data || [];
    }

    if (permissions.includes("photos")) {
      const { data } = await supabase
        .from("photo_progress")
        .select("id, photo_url, location, description, taken_at")
        .eq("project_id", projectId)
        .order("taken_at", { ascending: false })
        .limit(20);
      photos = data || [];
    }

    if (permissions.includes("billing")) {
      const { data } = await supabase
        .from("ra_bills")
        .select("id, bill_number, bill_date, total_amount, net_amount, status")
        .eq("project_id", projectId)
        .order("bill_date", { ascending: false })
        .limit(20);
      bills = data || [];
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        client_name: tokenData.client_name,
        permissions,
        project,
        tasks,
        photos,
        bills,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Client portal error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});