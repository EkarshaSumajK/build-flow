import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "Test@123";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, phone, role, organization_id, created_by } = await req.json();

    // Validate required fields
    if (!email || !full_name || !role || !organization_id || !created_by) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: email, full_name, role, organization_id, created_by" 
      }), {
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate role
    if (!["project_manager", "site_engineer"].includes(role)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid role. Must be project_manager or site_engineer" 
      }), {
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the creator is an owner of the organization
    const { data: creatorRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", created_by)
      .eq("organization_id", organization_id)
      .single();

    if (roleError || creatorRole?.role !== "owner") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Only organization owners can create team members" 
      }), {
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user with this email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Check if user is already in this organization
      const { data: existingMember } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "User is already a member of this organization" 
        }), {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add existing user to organization
      const { error: roleInsertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: existingUser.id,
          organization_id,
          role,
        });

      if (roleInsertError) throw roleInsertError;

      // Update profile to link to this organization
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: existingUser.id,
          organization_id,
          full_name,
          phone: phone || null,
        }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      return new Response(JSON.stringify({
        success: true,
        message: "Existing user added to organization",
        user_id: existingUser.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new user with default password
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: createError.message 
      }), {
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: newUser.user.id,
        organization_id,
        full_name,
        phone: phone || null,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail - profile might be created by trigger
    }

    // Assign role
    const { error: roleInsertError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        organization_id,
        role,
      });

    if (roleInsertError) {
      console.error("Role assignment error:", roleInsertError);
      throw roleInsertError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Team member created successfully. Default password: ${DEFAULT_PASSWORD}`,
      user_id: newUser.user.id,
      default_password: DEFAULT_PASSWORD,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Create team member error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || "Internal error" 
    }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
