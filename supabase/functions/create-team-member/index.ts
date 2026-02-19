import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // User client to verify caller identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, phone, role, organization_id } = await req.json();

    if (!email || !full_name || !role || !organization_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, full_name, role, organization_id",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["project_manager", "site_engineer"].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid role. Must be project_manager or site_engineer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is owner in this org
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("organization_id", organization_id)
      .single();

    if (!callerRole || callerRole.role !== "owner") {
      return new Response(
        JSON.stringify({ success: false, error: "Only owners can create team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a strong random temp password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // Check if already in this org
      const { data: existingMember } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ success: false, error: "User is already a member of this organization" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reset their password so the owner can share new credentials
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword,
      });
      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add to org
      await supabaseAdmin.from("user_roles").insert({
        user_id: existingUser.id,
        organization_id,
        role,
      });

      await supabaseAdmin.from("profiles").upsert(
        {
          user_id: existingUser.id,
          organization_id,
          full_name,
          phone: phone || null,
          email,
          temp_password: tempPassword,
        },
        { onConflict: "user_id" }
      );

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
          temp_password: tempPassword,
          default_password: tempPassword,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: newUser.user.id,
      organization_id,
      full_name,
      phone: phone || null,
      email,
      temp_password: tempPassword,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // Assign role
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      organization_id,
      role,
    });

    if (roleInsertError) {
      console.error("Role assignment error:", roleInsertError);
      throw roleInsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        temp_password: tempPassword,
        default_password: tempPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Create team member error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
