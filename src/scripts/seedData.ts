import { supabase } from "@/integrations/supabase/client";

// MEGA CONSTRUCTION COMPANY - Complete Seed Data
// A large-scale construction conglomerate with multiple mega projects

async function clearExistingData(organizationId: string) {
  console.log("🧹 Clearing existing data...");
  
  // Tables with organization_id - delete in order to respect foreign key constraints
  const orgTables = [
    "chat_messages",
    "notifications", 
    "attendance",
    "petty_cash_entries",
    "safety_incidents",
    "toolbox_talks",
    "equipment_logs",
    "inventory_transfers",
    "meeting_minutes",
    "photo_progress",
    "documents",
    "drawings",
    "goods_receipts",
    "purchase_orders",
    "material_requests",
    "stock_entries",
    "worker_assignments",
    "worker_schedules",
    "issues",
    "tasks",
    "equipment",
    "workers",
    "materials",
    "vendors",
    "inspections",
    "checklist_templates",
    "ra_bills",
    "projects",
  ];

  // First, delete child tables that don't have organization_id
  const { data: tasks } = await supabase.from("tasks").select("id").eq("organization_id", organizationId);
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map(t => t.id);
    await supabase.from("task_comments").delete().in("task_id", taskIds);
    console.log("  ✓ task_comments");
  }

  const { data: issues } = await supabase.from("issues").select("id").eq("organization_id", organizationId);
  if (issues && issues.length > 0) {
    const issueIds = issues.map(i => i.id);
    await supabase.from("issue_comments").delete().in("issue_id", issueIds);
    console.log("  ✓ issue_comments");
  }

  const { data: grns } = await supabase.from("goods_receipts").select("id").eq("organization_id", organizationId);
  if (grns && grns.length > 0) {
    const grnIds = grns.map(g => g.id);
    await supabase.from("grn_items").delete().in("grn_id", grnIds);
    console.log("  ✓ grn_items");
  }

  const { data: pos } = await supabase.from("purchase_orders").select("id").eq("organization_id", organizationId);
  if (pos && pos.length > 0) {
    const poIds = pos.map(p => p.id);
    await supabase.from("po_items").delete().in("po_id", poIds);
    console.log("  ✓ po_items");
  }

  const { data: raBills } = await supabase.from("ra_bills").select("id").eq("organization_id", organizationId);
  if (raBills && raBills.length > 0) {
    const billIds = raBills.map(b => b.id);
    await supabase.from("ra_bill_items").delete().in("bill_id", billIds);
    console.log("  ✓ ra_bill_items");
  }

  for (const table of orgTables) {
    const { error } = await supabase
      .from(table as never)
      .delete()
      .eq("organization_id", organizationId);
    
    if (error) {
      console.log(`  ⚠️ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ ${table}`);
    }
  }
  console.log("✅ Cleared\n");
}

export async function seedMegaCompanyData(organizationId: string, userId: string) {
  await clearExistingData(organizationId);
  console.log("🏗️ MEGA CONSTRUCTION COMPANY - Seeding Data...\n");

  // ============ 1. MEGA PROJECTS ============
  const projects = [
    { name: "Mega City Tower Complex", description: "Twin 80-story iconic towers with sky bridge, luxury hotel, premium offices, and observation deck. Flagship project of Mega Construction.", location: "Marine Drive, Mumbai", client_name: "Mega Realty Holdings Ltd", status: "active" as const, start_date: "2024-06-01", end_date: "2028-12-31", budget: 2500000000, progress: 28, spent: 700000000 },
    { name: "International Airport Terminal 4", description: "State-of-the-art international terminal with 50 gates, automated baggage handling, and sustainable design. Capacity: 40 million passengers/year.", location: "Navi Mumbai International Airport", client_name: "Mumbai International Airport Ltd", status: "active" as const, start_date: "2024-01-15", end_date: "2027-06-30", budget: 4200000000, progress: 35, spent: 1470000000 },
    { name: "Metro Rail Phase 3 - Underground", description: "25km underground metro with 18 stations, twin tunnels, and integrated transit hub. Connects CBD to suburbs.", location: "South Mumbai to Thane", client_name: "Mumbai Metro Rail Corporation", status: "active" as const, start_date: "2023-09-01", end_date: "2028-03-31", budget: 6800000000, progress: 42, spent: 2856000000 },
    { name: "Mega Smart City Township", description: "500-acre integrated township with 15,000 residential units, commercial hub, schools, hospitals, and smart infrastructure.", location: "Panvel, Navi Mumbai", client_name: "Mega Smart City Developers", status: "active" as const, start_date: "2024-03-01", end_date: "2030-12-31", budget: 8500000000, progress: 18, spent: 1530000000 },
    { name: "Coastal Highway Bridge", description: "6km sea-link bridge connecting coastal areas with 8-lane expressway and dedicated metro corridor.", location: "Versova to Bandra", client_name: "MSRDC", status: "active" as const, start_date: "2024-08-01", end_date: "2028-08-31", budget: 3200000000, progress: 22, spent: 704000000 },
    { name: "Mega Data Center Campus", description: "Tier-4 data center with 100MW capacity, renewable energy integration, and disaster recovery facilities.", location: "Pune IT Park", client_name: "Mega Digital Infrastructure", status: "active" as const, start_date: "2025-01-01", end_date: "2026-12-31", budget: 1800000000, progress: 15, spent: 270000000 },
    { name: "Heritage District Redevelopment", description: "Restoration and redevelopment of 50-acre heritage precinct with museums, cultural centers, and boutique hotels.", location: "Fort Area, Mumbai", client_name: "Mumbai Heritage Trust", status: "active" as const, start_date: "2024-04-01", end_date: "2027-03-31", budget: 950000000, progress: 32, spent: 304000000 },
    { name: "Industrial Mega Park", description: "1000-acre industrial park with manufacturing facilities, logistics hub, and worker housing.", location: "Talegaon MIDC, Pune", client_name: "Maharashtra Industrial Development Corp", status: "active" as const, start_date: "2024-02-01", end_date: "2027-12-31", budget: 2200000000, progress: 38, spent: 836000000 },
    { name: "Luxury Resort & Convention Center", description: "5-star beach resort with 500 rooms, convention center for 5000 guests, and private marina.", location: "Alibaug, Maharashtra", client_name: "Mega Hospitality Group", status: "active" as const, start_date: "2024-07-01", end_date: "2026-06-30", budget: 1200000000, progress: 45, spent: 540000000 },
    { name: "University Campus Expansion", description: "New academic blocks, research centers, hostels, and sports complex for premier university.", location: "Powai, Mumbai", client_name: "IIT Mumbai", status: "active" as const, start_date: "2024-05-01", end_date: "2026-08-31", budget: 650000000, progress: 52, spent: 338000000 },
    { name: "Multi-Modal Logistics Hub", description: "Integrated logistics park with rail terminal, container yard, warehousing, and cold storage.", location: "JNPT, Navi Mumbai", client_name: "Mega Logistics Pvt Ltd", status: "active" as const, start_date: "2024-09-01", end_date: "2026-12-31", budget: 1100000000, progress: 28, spent: 308000000 },
    { name: "Sports Stadium Complex", description: "50,000-seat multi-sport stadium with retractable roof, training facilities, and sports academy.", location: "BKC, Mumbai", client_name: "Mumbai Sports Authority", status: "on_hold" as const, start_date: "2025-01-01", end_date: "2027-12-31", budget: 1500000000, progress: 8, spent: 120000000 },
    { name: "Riverfront Development", description: "10km riverfront beautification with promenades, parks, amphitheater, and water sports facilities.", location: "Mithi River, Mumbai", client_name: "MMRDA", status: "active" as const, start_date: "2024-10-01", end_date: "2027-09-30", budget: 780000000, progress: 20, spent: 156000000 },
    { name: "Healthcare City", description: "Integrated healthcare campus with super-specialty hospital, medical college, and research center.", location: "Kharghar, Navi Mumbai", client_name: "Mega Healthcare Foundation", status: "active" as const, start_date: "2024-06-15", end_date: "2027-06-30", budget: 1350000000, progress: 30, spent: 405000000 },
    { name: "Green Energy Park", description: "Renewable energy demonstration park with solar, wind, and hydrogen facilities plus visitor center.", location: "Raigad District", client_name: "Mega Green Energy Ltd", status: "completed" as const, start_date: "2023-01-01", end_date: "2025-01-31", budget: 420000000, progress: 100, spent: 398000000 },
  ];

  const { data: createdProjects, error: projectError } = await supabase
    .from("projects")
    .insert(projects.map(p => ({ ...p, organization_id: organizationId, created_by: userId })))
    .select();
  if (projectError) { console.error("Projects error:", projectError); return; }
  console.log(`✅ ${createdProjects.length} Mega Projects`);

  // ============ 2. COMPREHENSIVE MATERIALS CATALOG ============
  const materials = [
    // Cement
    { name: "OPC 53 Grade Cement", unit: "bag", category: "Cement", standard_rate: 380 },
    { name: "OPC 43 Grade Cement", unit: "bag", category: "Cement", standard_rate: 350 },
    { name: "PPC Cement", unit: "bag", category: "Cement", standard_rate: 360 },
    { name: "PSC Cement (Slag)", unit: "bag", category: "Cement", standard_rate: 340 },
    { name: "White Cement", unit: "bag", category: "Cement", standard_rate: 520 },
    { name: "Rapid Hardening Cement", unit: "bag", category: "Cement", standard_rate: 450 },
    // Steel
    { name: "TMT Steel Fe500D 8mm", unit: "kg", category: "Steel", standard_rate: 75 },
    { name: "TMT Steel Fe500D 10mm", unit: "kg", category: "Steel", standard_rate: 73 },
    { name: "TMT Steel Fe500D 12mm", unit: "kg", category: "Steel", standard_rate: 71 },
    { name: "TMT Steel Fe500D 16mm", unit: "kg", category: "Steel", standard_rate: 69 },
    { name: "TMT Steel Fe500D 20mm", unit: "kg", category: "Steel", standard_rate: 68 },
    { name: "TMT Steel Fe500D 25mm", unit: "kg", category: "Steel", standard_rate: 67 },
    { name: "TMT Steel Fe500D 32mm", unit: "kg", category: "Steel", standard_rate: 66 },
    { name: "Structural Steel I-Beam", unit: "kg", category: "Steel", standard_rate: 85 },
    { name: "Structural Steel H-Beam", unit: "kg", category: "Steel", standard_rate: 88 },
    { name: "Steel Plates 10mm", unit: "kg", category: "Steel", standard_rate: 82 },
    { name: "Steel Plates 20mm", unit: "kg", category: "Steel", standard_rate: 80 },
    { name: "Binding Wire", unit: "kg", category: "Steel", standard_rate: 95 },
    // Aggregates
    { name: "River Sand (Fine)", unit: "cft", category: "Aggregates", standard_rate: 85 },
    { name: "M-Sand (Manufactured)", unit: "cft", category: "Aggregates", standard_rate: 55 },
    { name: "Crushed Stone 6mm", unit: "cft", category: "Aggregates", standard_rate: 42 },
    { name: "Crushed Stone 12mm", unit: "cft", category: "Aggregates", standard_rate: 45 },
    { name: "Crushed Stone 20mm", unit: "cft", category: "Aggregates", standard_rate: 48 },
    { name: "Crushed Stone 40mm", unit: "cft", category: "Aggregates", standard_rate: 45 },
    // Concrete
    { name: "Ready Mix Concrete M20", unit: "cum", category: "Concrete", standard_rate: 4800 },
    { name: "Ready Mix Concrete M25", unit: "cum", category: "Concrete", standard_rate: 5200 },
    { name: "Ready Mix Concrete M30", unit: "cum", category: "Concrete", standard_rate: 5600 },
    { name: "Ready Mix Concrete M35", unit: "cum", category: "Concrete", standard_rate: 5900 },
    { name: "Ready Mix Concrete M40", unit: "cum", category: "Concrete", standard_rate: 6200 },
    { name: "Ready Mix Concrete M50", unit: "cum", category: "Concrete", standard_rate: 6800 },
    { name: "Ready Mix Concrete M60", unit: "cum", category: "Concrete", standard_rate: 7500 },
    { name: "Self-Compacting Concrete", unit: "cum", category: "Concrete", standard_rate: 8200 },
    { name: "Fiber Reinforced Concrete", unit: "cum", category: "Concrete", standard_rate: 7800 },
    // Masonry
    { name: "Red Clay Bricks (First Class)", unit: "nos", category: "Masonry", standard_rate: 9 },
    { name: "Fly Ash Bricks", unit: "nos", category: "Masonry", standard_rate: 7 },
    { name: "AAC Blocks 4 inch", unit: "nos", category: "Masonry", standard_rate: 42 },
    { name: "AAC Blocks 6 inch", unit: "nos", category: "Masonry", standard_rate: 58 },
    { name: "AAC Blocks 8 inch", unit: "nos", category: "Masonry", standard_rate: 75 },
    { name: "Concrete Blocks 4 inch", unit: "nos", category: "Masonry", standard_rate: 35 },
    { name: "Concrete Blocks 6 inch", unit: "nos", category: "Masonry", standard_rate: 48 },
    // Shuttering
    { name: "Plywood 18mm BWR Grade", unit: "sqft", category: "Shuttering", standard_rate: 95 },
    { name: "Plywood 12mm MR Grade", unit: "sqft", category: "Shuttering", standard_rate: 65 },
    { name: "Steel Shuttering Plates", unit: "sqft", category: "Shuttering", standard_rate: 180 },
    { name: "Aluminum Formwork", unit: "sqft", category: "Shuttering", standard_rate: 250 },
    { name: "Scaffolding Pipes", unit: "rft", category: "Shuttering", standard_rate: 45 },
    { name: "Scaffolding Couplers", unit: "nos", category: "Shuttering", standard_rate: 85 },
    // Waterproofing
    { name: "APP Membrane 3mm", unit: "sqm", category: "Waterproofing", standard_rate: 280 },
    { name: "APP Membrane 4mm", unit: "sqm", category: "Waterproofing", standard_rate: 350 },
    { name: "SBS Membrane 4mm", unit: "sqm", category: "Waterproofing", standard_rate: 420 },
    { name: "Liquid Waterproofing", unit: "sqm", category: "Waterproofing", standard_rate: 180 },
    { name: "Crystalline Waterproofing", unit: "kg", category: "Waterproofing", standard_rate: 450 },
    { name: "Bitumen Primer", unit: "ltr", category: "Waterproofing", standard_rate: 180 },
    // Plumbing
    { name: "PVC Pipes 2 inch", unit: "rft", category: "Plumbing", standard_rate: 65 },
    { name: "PVC Pipes 4 inch", unit: "rft", category: "Plumbing", standard_rate: 125 },
    { name: "PVC Pipes 6 inch", unit: "rft", category: "Plumbing", standard_rate: 185 },
    { name: "CPVC Pipes 0.5 inch", unit: "rft", category: "Plumbing", standard_rate: 55 },
    { name: "CPVC Pipes 1 inch", unit: "rft", category: "Plumbing", standard_rate: 85 },
    { name: "GI Pipes 2 inch", unit: "rft", category: "Plumbing", standard_rate: 220 },
    { name: "HDPE Pipes 110mm", unit: "rft", category: "Plumbing", standard_rate: 165 },
    // Electrical
    { name: "Electrical Conduits 20mm", unit: "rft", category: "Electrical", standard_rate: 22 },
    { name: "Electrical Conduits 25mm", unit: "rft", category: "Electrical", standard_rate: 28 },
    { name: "Copper Wire 1.5 sqmm", unit: "mtr", category: "Electrical", standard_rate: 45 },
    { name: "Copper Wire 2.5 sqmm", unit: "mtr", category: "Electrical", standard_rate: 65 },
    { name: "Copper Wire 4 sqmm", unit: "mtr", category: "Electrical", standard_rate: 95 },
    { name: "Copper Wire 6 sqmm", unit: "mtr", category: "Electrical", standard_rate: 140 },
    { name: "Armored Cable 3x95 sqmm", unit: "mtr", category: "Electrical", standard_rate: 1850 },
    { name: "Cable Tray (Perforated)", unit: "rft", category: "Electrical", standard_rate: 320 },
    // Finishing
    { name: "Wall Putty (White)", unit: "bag", category: "Finishing", standard_rate: 850 },
    { name: "Gypsum Plaster", unit: "bag", category: "Finishing", standard_rate: 420 },
    { name: "POP (Plaster of Paris)", unit: "bag", category: "Finishing", standard_rate: 380 },
    { name: "Primer (Interior)", unit: "ltr", category: "Finishing", standard_rate: 180 },
    { name: "Primer (Exterior)", unit: "ltr", category: "Finishing", standard_rate: 220 },
    { name: "Emulsion Paint (Interior)", unit: "ltr", category: "Finishing", standard_rate: 320 },
    { name: "Emulsion Paint (Exterior)", unit: "ltr", category: "Finishing", standard_rate: 450 },
    { name: "Enamel Paint", unit: "ltr", category: "Finishing", standard_rate: 380 },
    // Flooring
    { name: "Ceramic Tiles 2x2 ft", unit: "sqft", category: "Flooring", standard_rate: 45 },
    { name: "Vitrified Tiles 2x2 ft", unit: "sqft", category: "Flooring", standard_rate: 65 },
    { name: "Vitrified Tiles 4x4 ft", unit: "sqft", category: "Flooring", standard_rate: 85 },
    { name: "Granite Flooring", unit: "sqft", category: "Flooring", standard_rate: 180 },
    { name: "Marble Flooring", unit: "sqft", category: "Flooring", standard_rate: 250 },
    { name: "Kota Stone", unit: "sqft", category: "Flooring", standard_rate: 55 },
    { name: "Epoxy Flooring", unit: "sqft", category: "Flooring", standard_rate: 120 },
    // Glass & Facade
    { name: "Float Glass 6mm", unit: "sqft", category: "Glass", standard_rate: 85 },
    { name: "Float Glass 12mm", unit: "sqft", category: "Glass", standard_rate: 145 },
    { name: "Tempered Glass 10mm", unit: "sqft", category: "Glass", standard_rate: 180 },
    { name: "Tempered Glass 12mm", unit: "sqft", category: "Glass", standard_rate: 220 },
    { name: "DGU Glass 6+12+6", unit: "sqft", category: "Glass", standard_rate: 350 },
    { name: "ACP Sheets 4mm", unit: "sqft", category: "Facade", standard_rate: 95 },
    { name: "HPL Cladding", unit: "sqft", category: "Facade", standard_rate: 180 },
    // HVAC
    { name: "GI Duct (Insulated)", unit: "sqft", category: "HVAC", standard_rate: 280 },
    { name: "Chilled Water Pipes", unit: "rft", category: "HVAC", standard_rate: 450 },
    { name: "Insulation (Nitrile Rubber)", unit: "sqft", category: "HVAC", standard_rate: 85 },
    { name: "Diffusers (Supply)", unit: "nos", category: "HVAC", standard_rate: 1200 },
    // Fire Fighting
    { name: "MS Pipes (Fire)", unit: "rft", category: "Fire Fighting", standard_rate: 280 },
    { name: "Sprinkler Heads", unit: "nos", category: "Fire Fighting", standard_rate: 450 },
    { name: "Fire Extinguisher 4kg", unit: "nos", category: "Fire Fighting", standard_rate: 1800 },
    { name: "Fire Alarm Panel", unit: "nos", category: "Fire Fighting", standard_rate: 45000 },
  ];

  const { data: createdMaterials, error: materialError } = await supabase
    .from("materials")
    .insert(materials.map(m => ({ ...m, organization_id: organizationId })))
    .select();
  if (materialError) { console.error("Materials error:", materialError); return; }
  console.log(`✅ ${createdMaterials.length} Materials`);


  // ============ 3. MEGA WORKFORCE ============
  const trades = [
    { trade: "Mason", rate: 850 }, { trade: "Carpenter", rate: 900 }, { trade: "Electrician", rate: 950 },
    { trade: "Plumber", rate: 900 }, { trade: "Welder", rate: 1000 }, { trade: "Painter", rate: 750 },
    { trade: "Helper", rate: 500 }, { trade: "Bar Bender", rate: 800 }, { trade: "Shuttering Carpenter", rate: 950 },
    { trade: "Tile Fitter", rate: 850 }, { trade: "Crane Operator", rate: 1200 }, { trade: "Supervisor", rate: 1500 },
    { trade: "Foreman", rate: 1800 }, { trade: "Safety Officer", rate: 2000 }, { trade: "Surveyor", rate: 1600 },
    { trade: "Rigger", rate: 1100 }, { trade: "Scaffolder", rate: 950 }, { trade: "Steel Fixer", rate: 900 },
    { trade: "HVAC Technician", rate: 1100 }, { trade: "Fire Fighter Installer", rate: 1050 },
    { trade: "Glass Fitter", rate: 1000 }, { trade: "Waterproofing Specialist", rate: 1100 },
    { trade: "Tunnel Worker", rate: 1300 }, { trade: "TBM Operator", rate: 2500 },
  ];
  const firstNames = ["Ramesh", "Suresh", "Mahesh", "Ganesh", "Rajesh", "Dinesh", "Mukesh", "Naresh", "Kamlesh", "Yogesh", "Santosh", "Prakash", "Anil", "Sunil", "Manoj", "Vinod", "Pramod", "Ashok", "Vijay", "Sanjay", "Ravi", "Kiran", "Mohan", "Sohan", "Gopal", "Deepak", "Rakesh", "Harish", "Girish", "Satish", "Nilesh", "Umesh", "Bharat", "Kishore", "Shankar", "Balaji", "Venkat", "Subramaniam", "Krishnan", "Rajan"];
  const lastNames = ["Kumar", "Singh", "Sharma", "Verma", "Yadav", "Patel", "Gupta", "Mishra", "Pandey", "Tiwari", "Joshi", "Nair", "Menon", "Pillai", "Reddy", "Rao", "Naidu", "Iyer", "Mukherjee", "Banerjee"];
  const contractors = ["Mega Labour Services", "Sharma Constructions", "Patel Builders", "Singh Labour Supply", "Kumar Contractors", "National Workforce Solutions", "Metro Manpower", "Elite Construction Labour", null];

  const workers = Array.from({ length: 500 }, (_, i) => {
    const t = trades[i % trades.length];
    return {
      name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      trade: t.trade,
      daily_rate: t.rate + Math.floor(Math.random() * 300) - 150,
      is_active: Math.random() > 0.08,
      organization_id: organizationId,
      contractor: contractors[Math.floor(Math.random() * contractors.length)],
    };
  });

  // Insert workers in batches
  for (let i = 0; i < workers.length; i += 100) {
    await supabase.from("workers").insert(workers.slice(i, i + 100));
  }
  const { data: createdWorkers } = await supabase.from("workers").select().eq("organization_id", organizationId);
  console.log(`✅ ${createdWorkers?.length || 0} Workers`);

  // ============ 4. MAJOR VENDORS ============
  const vendors = [
    { name: "UltraTech Cement Ltd", contact_person: "Rajiv Mehta", phone: "9820123456", email: "rajiv@ultratech.com", address: "Worli, Mumbai", category: "Cement Supplier", gst_number: "27AABCU1234A1ZV" },
    { name: "ACC Limited", contact_person: "Priya Sharma", phone: "9821234567", email: "priya@acc.com", address: "Thane, Mumbai", category: "Cement Supplier", gst_number: "27AABCA1234B2ZW" },
    { name: "Ambuja Cements", contact_person: "Amit Jain", phone: "9822345678", email: "amit@ambuja.com", address: "Andheri, Mumbai", category: "Cement Supplier", gst_number: "27AABCA5678C3ZX" },
    { name: "JSW Steel Ltd", contact_person: "Vikram Reddy", phone: "9823456789", email: "vikram@jsw.com", address: "Bellary, Karnataka", category: "Steel Supplier", gst_number: "29AABCJ1234D4ZY" },
    { name: "Tata Steel BSL", contact_person: "Suresh Nair", phone: "9824567890", email: "suresh@tatasteel.com", address: "Jamshedpur, Jharkhand", category: "Steel Supplier", gst_number: "20AABCT5678E5ZZ" },
    { name: "SAIL - Steel Authority", contact_person: "Manoj Kumar", phone: "9825678901", email: "manoj@sail.com", address: "Bokaro, Jharkhand", category: "Steel Supplier", gst_number: "20AABCS9012F6ZA" },
    { name: "ACC Ready Mix", contact_person: "Deepa Iyer", phone: "9826789012", email: "deepa@accrmc.com", address: "Thane, Mumbai", category: "RMC Supplier", gst_number: "27AABCA3456G7ZB" },
    { name: "UltraTech RMC", contact_person: "Kiran Desai", phone: "9827890123", email: "kiran@ultratechrmc.com", address: "Navi Mumbai", category: "RMC Supplier", gst_number: "27AABCU7890H8ZC" },
    { name: "Prism RMC", contact_person: "Rohit Agarwal", phone: "9828901234", email: "rohit@prismrmc.com", address: "Pune", category: "RMC Supplier", gst_number: "27AABCP1234I9ZD" },
    { name: "Pidilite Industries", contact_person: "Anita Menon", phone: "9829012345", email: "anita@pidilite.com", address: "Mahim, Mumbai", category: "Waterproofing", gst_number: "27AABCP5678J0ZE" },
    { name: "BASF India", contact_person: "Thomas George", phone: "9830123456", email: "thomas@basf.com", address: "Navi Mumbai", category: "Construction Chemicals", gst_number: "27AABCB9012K1ZF" },
    { name: "Sika India", contact_person: "Sanjay Patil", phone: "9831234567", email: "sanjay@sika.com", address: "Pune", category: "Construction Chemicals", gst_number: "27AABCS3456L2ZG" },
    { name: "Finolex Pipes", contact_person: "Ramesh Kulkarni", phone: "9832345678", email: "ramesh@finolex.com", address: "Pimpri, Pune", category: "Plumbing", gst_number: "27AABCF7890M3ZH" },
    { name: "Supreme Industries", contact_person: "Girish Shah", phone: "9833456789", email: "girish@supreme.com", address: "Mumbai", category: "Plumbing", gst_number: "27AABCS1234N4ZI" },
    { name: "Astral Pipes", contact_person: "Nilesh Patel", phone: "9834567890", email: "nilesh@astral.com", address: "Ahmedabad", category: "Plumbing", gst_number: "24AABCA5678O5ZJ" },
    { name: "Havells India Ltd", contact_person: "Arun Kapoor", phone: "9835678901", email: "arun@havells.com", address: "Noida, UP", category: "Electrical", gst_number: "09AABCH9012P6ZK" },
    { name: "Polycab India", contact_person: "Bharat Mehta", phone: "9836789012", email: "bharat@polycab.com", address: "Halol, Gujarat", category: "Electrical", gst_number: "24AABCP3456Q7ZL" },
    { name: "KEI Industries", contact_person: "Chetan Joshi", phone: "9837890123", email: "chetan@kei.com", address: "Delhi", category: "Electrical", gst_number: "07AABCK7890R8ZM" },
    { name: "Asian Paints", contact_person: "Divya Iyer", phone: "9838901234", email: "divya@asianpaints.com", address: "Bhandup, Mumbai", category: "Paints", gst_number: "27AABCA1234S9ZN" },
    { name: "Berger Paints", contact_person: "Esha Roy", phone: "9839012345", email: "esha@berger.com", address: "Kolkata", category: "Paints", gst_number: "19AABCB5678T0ZO" },
    { name: "Kajaria Ceramics", contact_person: "Farhan Khan", phone: "9840123456", email: "farhan@kajaria.com", address: "Gurgaon, Haryana", category: "Tiles", gst_number: "06AABCK9012U1ZP" },
    { name: "Somany Ceramics", contact_person: "Gaurav Singh", phone: "9841234567", email: "gaurav@somany.com", address: "Kadi, Gujarat", category: "Tiles", gst_number: "24AABCS3456V2ZQ" },
    { name: "Saint-Gobain Glass", contact_person: "Harini Menon", phone: "9842345678", email: "harini@saint-gobain.com", address: "Chennai, TN", category: "Glass", gst_number: "33AABCS7890W3ZR" },
    { name: "AIS Glass Solutions", contact_person: "Ishaan Gupta", phone: "9843456789", email: "ishaan@aisglass.com", address: "Rewari, Haryana", category: "Glass", gst_number: "06AABCA1234X4ZS" },
    { name: "Godrej Interio", contact_person: "Jaya Krishnan", phone: "9844567890", email: "jaya@godrej.com", address: "Vikhroli, Mumbai", category: "Furniture", gst_number: "27AABCG5678Y5ZT" },
    { name: "Larsen & Toubro", contact_person: "Kartik Rao", phone: "9845678901", email: "kartik@lnt.com", address: "Powai, Mumbai", category: "Equipment Rental", gst_number: "27AABCL9012Z6ZU" },
    { name: "Schwing Stetter", contact_person: "Lakshmi Nair", phone: "9846789012", email: "lakshmi@schwing.com", address: "Sriperumbudur, TN", category: "Concrete Equipment", gst_number: "33AABCS3456A7ZV" },
    { name: "Putzmeister India", contact_person: "Mohan Das", phone: "9847890123", email: "mohan@putzmeister.com", address: "Chennai", category: "Concrete Equipment", gst_number: "33AABCP7890B8ZW" },
    { name: "ACE Cranes", contact_person: "Naveen Sharma", phone: "9848901234", email: "naveen@acecranes.com", address: "Faridabad", category: "Cranes", gst_number: "06AABCA1234C9ZX" },
    { name: "Action Construction Equipment", contact_person: "Om Prakash", phone: "9849012345", email: "om@ace.com", address: "Ballabhgarh", category: "Construction Equipment", gst_number: "06AABCA5678D0ZY" },
    { name: "JCB India", contact_person: "Pradeep Verma", phone: "9850123456", email: "pradeep@jcb.com", address: "Ballabhgarh", category: "Earthmoving Equipment", gst_number: "06AABCJ9012E1ZZ" },
    { name: "Komatsu India", contact_person: "Qasim Ali", phone: "9851234567", email: "qasim@komatsu.com", address: "Chennai", category: "Earthmoving Equipment", gst_number: "33AABCK3456F2AA" },
    { name: "Herrenknecht India", contact_person: "Rajendra Singh", phone: "9852345678", email: "rajendra@herrenknecht.com", address: "Pune", category: "TBM Equipment", gst_number: "27AABCH7890G3AB" },
    { name: "Blue Star Ltd", contact_person: "Sunita Rao", phone: "9853456789", email: "sunita@bluestar.com", address: "Thane", category: "HVAC", gst_number: "27AABCB1234H4AC" },
    { name: "Voltas Ltd", contact_person: "Tarun Mehta", phone: "9854567890", email: "tarun@voltas.com", address: "Mumbai", category: "HVAC", gst_number: "27AABCV5678I5AD" },
    { name: "Johnson Controls", contact_person: "Uma Shankar", phone: "9855678901", email: "uma@jci.com", address: "Pune", category: "Fire & Safety", gst_number: "27AABCJ9012J6AE" },
    { name: "Honeywell India", contact_person: "Varun Kapoor", phone: "9856789012", email: "varun@honeywell.com", address: "Pune", category: "Building Automation", gst_number: "27AABCH3456K7AF" },
    { name: "Schindler India", contact_person: "Wasim Khan", phone: "9857890123", email: "wasim@schindler.com", address: "Mumbai", category: "Elevators", gst_number: "27AABCS7890L8AG" },
    { name: "KONE Elevators", contact_person: "Xavier D'Souza", phone: "9858901234", email: "xavier@kone.com", address: "Chennai", category: "Elevators", gst_number: "33AABCK1234M9AH" },
    { name: "Otis Elevator", contact_person: "Yash Agarwal", phone: "9859012345", email: "yash@otis.com", address: "Gurgaon", category: "Elevators", gst_number: "06AABCO5678N0AI" },
  ];

  const { data: createdVendors, error: vendorError } = await supabase
    .from("vendors")
    .insert(vendors.map(v => ({ ...v, organization_id: organizationId })))
    .select();
  if (vendorError) { console.error("Vendors error:", vendorError); return; }
  console.log(`✅ ${createdVendors.length} Vendors`);


  // ============ 5. HEAVY EQUIPMENT FLEET ============
  const equipmentList = [
    // Tower Cranes
    { name: "Tower Crane TC-8030", equipment_type: "crane", model: "Potain MDT 389", serial_number: "TC-2024-001", daily_rate: 35000, status: "in_use" },
    { name: "Tower Crane TC-8031", equipment_type: "crane", model: "Potain MDT 389", serial_number: "TC-2024-002", daily_rate: 35000, status: "in_use" },
    { name: "Tower Crane TC-6520", equipment_type: "crane", model: "Potain MC 310", serial_number: "TC-2024-003", daily_rate: 28000, status: "in_use" },
    { name: "Tower Crane TC-6521", equipment_type: "crane", model: "Potain MC 310", serial_number: "TC-2024-004", daily_rate: 28000, status: "in_use" },
    { name: "Tower Crane TC-6522", equipment_type: "crane", model: "Potain MC 310", serial_number: "TC-2024-005", daily_rate: 28000, status: "available" },
    { name: "Luffing Crane LC-01", equipment_type: "crane", model: "Liebherr 280 HC-L", serial_number: "LC-2024-001", daily_rate: 45000, status: "in_use" },
    { name: "Luffing Crane LC-02", equipment_type: "crane", model: "Liebherr 280 HC-L", serial_number: "LC-2024-002", daily_rate: 45000, status: "in_use" },
    // Mobile Cranes
    { name: "Mobile Crane 100T", equipment_type: "crane", model: "Liebherr LTM 1100", serial_number: "MC-2023-001", daily_rate: 55000, status: "in_use" },
    { name: "Mobile Crane 80T", equipment_type: "crane", model: "Liebherr LTM 1080", serial_number: "MC-2023-002", daily_rate: 45000, status: "in_use" },
    { name: "Mobile Crane 50T", equipment_type: "crane", model: "Liebherr LTM 1050", serial_number: "MC-2023-003", daily_rate: 35000, status: "available" },
    { name: "Mobile Crane 50T-B", equipment_type: "crane", model: "Liebherr LTM 1050", serial_number: "MC-2023-004", daily_rate: 35000, status: "in_use" },
    // Concrete Equipment
    { name: "Concrete Pump CP-01", equipment_type: "pump", model: "Schwing SP 3800", serial_number: "CP-2024-001", daily_rate: 22000, status: "in_use" },
    { name: "Concrete Pump CP-02", equipment_type: "pump", model: "Schwing SP 3800", serial_number: "CP-2024-002", daily_rate: 22000, status: "in_use" },
    { name: "Concrete Pump CP-03", equipment_type: "pump", model: "Putzmeister BSF 42", serial_number: "CP-2024-003", daily_rate: 25000, status: "in_use" },
    { name: "Concrete Pump CP-04", equipment_type: "pump", model: "Putzmeister BSF 42", serial_number: "CP-2024-004", daily_rate: 25000, status: "maintenance" },
    { name: "Placing Boom PB-01", equipment_type: "pump", model: "Schwing SPB 32", serial_number: "PB-2024-001", daily_rate: 18000, status: "in_use" },
    { name: "Placing Boom PB-02", equipment_type: "pump", model: "Schwing SPB 32", serial_number: "PB-2024-002", daily_rate: 18000, status: "in_use" },
    // Transit Mixers
    ...Array.from({ length: 15 }, (_, i) => ({
      name: `Transit Mixer TM-${String(i + 1).padStart(2, "0")}`,
      equipment_type: "mixer",
      model: "Schwing Stetter AM 9",
      serial_number: `TM-2023-${String(i + 1).padStart(3, "0")}`,
      daily_rate: 9000,
      status: i < 12 ? "in_use" : i === 12 ? "maintenance" : "available",
    })),
    // Excavators
    { name: "Excavator EX-01", equipment_type: "excavator", model: "Komatsu PC300", serial_number: "EX-2023-001", daily_rate: 18000, status: "in_use" },
    { name: "Excavator EX-02", equipment_type: "excavator", model: "Komatsu PC300", serial_number: "EX-2023-002", daily_rate: 18000, status: "in_use" },
    { name: "Excavator EX-03", equipment_type: "excavator", model: "Komatsu PC200", serial_number: "EX-2023-003", daily_rate: 14000, status: "in_use" },
    { name: "Excavator EX-04", equipment_type: "excavator", model: "Komatsu PC200", serial_number: "EX-2023-004", daily_rate: 14000, status: "in_use" },
    { name: "Excavator EX-05", equipment_type: "excavator", model: "JCB JS205", serial_number: "EX-2022-005", daily_rate: 12000, status: "available" },
    { name: "Mini Excavator ME-01", equipment_type: "excavator", model: "Kubota KX080", serial_number: "ME-2024-001", daily_rate: 6000, status: "in_use" },
    // Loaders
    { name: "Wheel Loader WL-01", equipment_type: "loader", model: "Caterpillar 950M", serial_number: "WL-2023-001", daily_rate: 12000, status: "in_use" },
    { name: "Wheel Loader WL-02", equipment_type: "loader", model: "Caterpillar 950M", serial_number: "WL-2023-002", daily_rate: 12000, status: "in_use" },
    { name: "Backhoe Loader BL-01", equipment_type: "loader", model: "JCB 3DX Super", serial_number: "BL-2023-001", daily_rate: 6500, status: "in_use" },
    { name: "Backhoe Loader BL-02", equipment_type: "loader", model: "JCB 3DX Super", serial_number: "BL-2023-002", daily_rate: 6500, status: "in_use" },
    { name: "Backhoe Loader BL-03", equipment_type: "loader", model: "JCB 3DX Super", serial_number: "BL-2023-003", daily_rate: 6500, status: "in_use" },
    { name: "Skid Steer Loader SSL-01", equipment_type: "loader", model: "Bobcat S650", serial_number: "SSL-2024-001", daily_rate: 5000, status: "in_use" },
    // TBM (Tunnel Boring Machines)
    { name: "TBM Mega-1", equipment_type: "tbm", model: "Herrenknecht EPB Shield", serial_number: "TBM-2023-001", daily_rate: 500000, status: "in_use" },
    { name: "TBM Mega-2", equipment_type: "tbm", model: "Herrenknecht EPB Shield", serial_number: "TBM-2023-002", daily_rate: 500000, status: "in_use" },
    // Compactors
    { name: "Vibratory Roller VR-01", equipment_type: "compactor", model: "Hamm HD 120", serial_number: "VR-2024-001", daily_rate: 8000, status: "in_use" },
    { name: "Vibratory Roller VR-02", equipment_type: "compactor", model: "Hamm HD 120", serial_number: "VR-2024-002", daily_rate: 8000, status: "available" },
    { name: "Plate Compactor PC-01", equipment_type: "compactor", model: "Wacker Neuson", serial_number: "PC-2024-001", daily_rate: 1500, status: "in_use" },
    // Generators
    { name: "Generator 1000KVA", equipment_type: "generator", model: "Cummins C1000D5", serial_number: "GN-2023-001", daily_rate: 15000, status: "in_use" },
    { name: "Generator 750KVA", equipment_type: "generator", model: "Cummins C750D5", serial_number: "GN-2023-002", daily_rate: 12000, status: "in_use" },
    { name: "Generator 500KVA-A", equipment_type: "generator", model: "Cummins C500D5", serial_number: "GN-2023-003", daily_rate: 8000, status: "in_use" },
    { name: "Generator 500KVA-B", equipment_type: "generator", model: "Cummins C500D5", serial_number: "GN-2023-004", daily_rate: 8000, status: "in_use" },
    { name: "Generator 250KVA-A", equipment_type: "generator", model: "Kirloskar KG1-250", serial_number: "GN-2023-005", daily_rate: 5000, status: "in_use" },
    { name: "Generator 250KVA-B", equipment_type: "generator", model: "Kirloskar KG1-250", serial_number: "GN-2023-006", daily_rate: 5000, status: "available" },
    // Welding & Rebar
    { name: "Welding Machine Set-01", equipment_type: "welding", model: "ESAB Warrior 500i", serial_number: "WM-2024-001", daily_rate: 2000, status: "in_use" },
    { name: "Welding Machine Set-02", equipment_type: "welding", model: "ESAB Warrior 500i", serial_number: "WM-2024-002", daily_rate: 2000, status: "in_use" },
    { name: "Welding Machine Set-03", equipment_type: "welding", model: "Lincoln Electric", serial_number: "WM-2024-003", daily_rate: 1800, status: "in_use" },
    { name: "Bar Bending Machine BBM-01", equipment_type: "rebar", model: "Jaypee BBM-52", serial_number: "BB-2023-001", daily_rate: 2500, status: "in_use" },
    { name: "Bar Bending Machine BBM-02", equipment_type: "rebar", model: "Jaypee BBM-52", serial_number: "BB-2023-002", daily_rate: 2500, status: "in_use" },
    { name: "Bar Cutting Machine BCM-01", equipment_type: "rebar", model: "Jaypee BCM-52", serial_number: "BC-2023-001", daily_rate: 2200, status: "in_use" },
    { name: "Bar Cutting Machine BCM-02", equipment_type: "rebar", model: "Jaypee BCM-52", serial_number: "BC-2023-002", daily_rate: 2200, status: "in_use" },
    // Piling Equipment
    { name: "Piling Rig PR-01", equipment_type: "piling", model: "Bauer BG 28", serial_number: "PR-2023-001", daily_rate: 85000, status: "in_use" },
    { name: "Piling Rig PR-02", equipment_type: "piling", model: "Bauer BG 28", serial_number: "PR-2023-002", daily_rate: 85000, status: "in_use" },
    { name: "Diaphragm Wall Grab DW-01", equipment_type: "piling", model: "Casagrande B300", serial_number: "DW-2023-001", daily_rate: 95000, status: "in_use" },
    // Aerial Platforms
    { name: "Boom Lift BL-01", equipment_type: "aerial", model: "JLG 860SJ", serial_number: "BL-2024-001", daily_rate: 8000, status: "in_use" },
    { name: "Boom Lift BL-02", equipment_type: "aerial", model: "JLG 860SJ", serial_number: "BL-2024-002", daily_rate: 8000, status: "in_use" },
    { name: "Scissor Lift SL-01", equipment_type: "aerial", model: "Genie GS-4069", serial_number: "SL-2024-001", daily_rate: 4000, status: "in_use" },
    { name: "Scissor Lift SL-02", equipment_type: "aerial", model: "Genie GS-4069", serial_number: "SL-2024-002", daily_rate: 4000, status: "in_use" },
  ];

  const { data: createdEquipment, error: equipmentError } = await supabase
    .from("equipment")
    .insert(equipmentList.map((e, i) => ({
      ...e,
      organization_id: organizationId,
      current_project_id: e.status === "in_use" ? createdProjects[i % createdProjects.length].id : null,
      last_maintenance: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      next_maintenance: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    })))
    .select();
  if (equipmentError) { console.error("Equipment error:", equipmentError); return; }
  console.log(`✅ ${createdEquipment.length} Equipment`);


  // ============ 6. COMPREHENSIVE TASKS ============
  const taskTemplates = [
    // Foundation Phase
    { title: "Site Survey & Setting Out", status: "completed" as const, priority: "high" as const },
    { title: "Soil Investigation & Testing", status: "completed" as const, priority: "high" as const },
    { title: "Site Clearing & Demolition", status: "completed" as const, priority: "high" as const },
    { title: "Excavation for Foundation", status: "completed" as const, priority: "high" as const },
    { title: "Dewatering System Installation", status: "completed" as const, priority: "critical" as const },
    { title: "Pile Foundation Work", status: "completed" as const, priority: "critical" as const },
    { title: "Pile Load Testing", status: "completed" as const, priority: "critical" as const },
    { title: "Pile Cap Construction", status: "completed" as const, priority: "high" as const },
    { title: "Raft Foundation PCC", status: "completed" as const, priority: "high" as const },
    { title: "Raft Foundation Reinforcement", status: "completed" as const, priority: "high" as const },
    { title: "Raft Foundation Concrete Pour", status: "completed" as const, priority: "critical" as const },
    // Substructure
    { title: "Basement Retaining Wall", status: "completed" as const, priority: "high" as const },
    { title: "Basement Waterproofing", status: "completed" as const, priority: "critical" as const },
    { title: "Basement Slab - B3", status: "completed" as const, priority: "high" as const },
    { title: "Basement Slab - B2", status: "completed" as const, priority: "high" as const },
    { title: "Basement Slab - B1", status: "in_progress" as const, priority: "high" as const },
    { title: "Basement MEP Rough-in", status: "in_progress" as const, priority: "medium" as const },
    // Superstructure
    { title: "Ground Floor Columns", status: "in_progress" as const, priority: "high" as const },
    { title: "Ground Floor Slab", status: "in_progress" as const, priority: "high" as const },
    { title: "1st Floor Columns", status: "not_started" as const, priority: "high" as const },
    { title: "1st Floor Slab", status: "not_started" as const, priority: "high" as const },
    { title: "Typical Floor Structure (2-10)", status: "not_started" as const, priority: "high" as const },
    { title: "Typical Floor Structure (11-20)", status: "not_started" as const, priority: "high" as const },
    { title: "Core Wall Construction", status: "in_progress" as const, priority: "critical" as const },
    { title: "Shear Wall Construction", status: "in_progress" as const, priority: "critical" as const },
    // MEP
    { title: "Electrical Conduit Installation", status: "in_progress" as const, priority: "medium" as const },
    { title: "Plumbing Rough-in", status: "in_progress" as const, priority: "medium" as const },
    { title: "Fire Fighting Piping", status: "not_started" as const, priority: "critical" as const },
    { title: "HVAC Duct Installation", status: "not_started" as const, priority: "medium" as const },
    { title: "Electrical Panel Installation", status: "not_started" as const, priority: "high" as const },
    { title: "Generator Installation", status: "not_started" as const, priority: "high" as const },
    // Finishing
    { title: "External Brick Work", status: "not_started" as const, priority: "medium" as const },
    { title: "Internal Brick Work", status: "not_started" as const, priority: "medium" as const },
    { title: "External Plastering", status: "not_started" as const, priority: "medium" as const },
    { title: "Internal Plastering", status: "not_started" as const, priority: "medium" as const },
    { title: "Waterproofing - Toilets", status: "not_started" as const, priority: "high" as const },
    { title: "Waterproofing - Terrace", status: "not_started" as const, priority: "high" as const },
    { title: "Flooring & Tiling", status: "not_started" as const, priority: "medium" as const },
    { title: "False Ceiling Installation", status: "not_started" as const, priority: "low" as const },
    { title: "Painting - Interior", status: "not_started" as const, priority: "low" as const },
    { title: "Painting - Exterior", status: "not_started" as const, priority: "low" as const },
    // Facade
    { title: "Curtain Wall Installation", status: "not_started" as const, priority: "high" as const },
    { title: "ACP Cladding", status: "not_started" as const, priority: "medium" as const },
    { title: "Glass Installation", status: "not_started" as const, priority: "medium" as const },
    // Vertical Transportation
    { title: "Elevator Shaft Construction", status: "in_progress" as const, priority: "high" as const },
    { title: "Elevator Installation", status: "not_started" as const, priority: "high" as const },
    { title: "Escalator Installation", status: "not_started" as const, priority: "medium" as const },
    // External Works
    { title: "External Roads & Paving", status: "not_started" as const, priority: "low" as const },
    { title: "Landscaping", status: "not_started" as const, priority: "low" as const },
    { title: "Boundary Wall & Gates", status: "not_started" as const, priority: "low" as const },
    // Commissioning
    { title: "MEP Testing & Commissioning", status: "not_started" as const, priority: "critical" as const },
    { title: "Fire Safety Certification", status: "not_started" as const, priority: "critical" as const },
    { title: "Elevator Certification", status: "not_started" as const, priority: "critical" as const },
    { title: "Final Inspection & Handover", status: "not_started" as const, priority: "critical" as const },
  ];

  const allTasks = createdProjects.flatMap(project => {
    const projectStart = new Date(project.start_date || "2025-01-01");
    return taskTemplates.map((t, i) => {
      const start = new Date(projectStart); start.setDate(start.getDate() + i * 12);
      const end = new Date(start); end.setDate(end.getDate() + 11);
      return {
        title: t.title, description: `${t.title} for ${project.name}. Detailed scope and specifications as per approved drawings.`,
        status: t.status, priority: t.priority,
        start_date: start.toISOString().split("T")[0], due_date: end.toISOString().split("T")[0],
        project_id: project.id, organization_id: organizationId, created_by: userId, assignee_id: userId,
        progress: t.status === "completed" ? 100 : t.status === "in_progress" ? Math.floor(Math.random() * 60) + 20 : 0,
      };
    });
  });

  // Insert tasks in batches
  for (let i = 0; i < allTasks.length; i += 100) {
    await supabase.from("tasks").insert(allTasks.slice(i, i + 100));
  }
  const { data: createdTasks } = await supabase.from("tasks").select().eq("organization_id", organizationId);
  console.log(`✅ ${createdTasks?.length || 0} Tasks`);

  // ============ 7. ISSUES & NCRs ============
  const issueTemplates = [
    { title: "Concrete cube strength below specification", severity: "critical" as const, category: "quality" as const, status: "open" as const },
    { title: "Reinforcement cover inadequate", severity: "high" as const, category: "quality" as const, status: "in_progress" as const },
    { title: "Honeycombing in concrete pour", severity: "high" as const, category: "quality" as const, status: "open" as const },
    { title: "Steel delivery delayed by 2 weeks", severity: "high" as const, category: "material" as const, status: "open" as const },
    { title: "Cement quality variation observed", severity: "medium" as const, category: "material" as const, status: "resolved" as const },
    { title: "RMC slump not as per specification", severity: "medium" as const, category: "material" as const, status: "open" as const },
    { title: "Worker fall from height - minor injury", severity: "critical" as const, category: "safety" as const, status: "resolved" as const },
    { title: "Scaffolding not properly secured", severity: "critical" as const, category: "safety" as const, status: "open" as const },
    { title: "PPE compliance issue on site", severity: "high" as const, category: "safety" as const, status: "in_progress" as const },
    { title: "Fire extinguisher expired", severity: "high" as const, category: "safety" as const, status: "resolved" as const },
    { title: "Design change causing 3-week delay", severity: "high" as const, category: "delay" as const, status: "open" as const },
    { title: "Rain damage to exposed work", severity: "medium" as const, category: "delay" as const, status: "closed" as const },
    { title: "Permit approval pending", severity: "high" as const, category: "delay" as const, status: "open" as const },
    { title: "Labour shortage - skilled masons", severity: "medium" as const, category: "labour" as const, status: "open" as const },
    { title: "Subcontractor performance issue", severity: "high" as const, category: "labour" as const, status: "in_progress" as const },
    { title: "Crane breakdown - urgent repair needed", severity: "critical" as const, category: "other" as const, status: "in_progress" as const },
    { title: "Waterproofing membrane defect", severity: "high" as const, category: "quality" as const, status: "open" as const },
    { title: "Alignment issue in column", severity: "high" as const, category: "quality" as const, status: "resolved" as const },
    { title: "Electrical conduit routing conflict", severity: "medium" as const, category: "other" as const, status: "open" as const },
    { title: "Plumbing leak in basement", severity: "high" as const, category: "quality" as const, status: "in_progress" as const },
  ];

  const allIssues = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 5 + Math.floor(Math.random() * 8) }, () => {
      const t = issueTemplates[Math.floor(Math.random() * issueTemplates.length)];
      const created = new Date(); created.setDate(created.getDate() - Math.floor(Math.random() * 45));
      const due = new Date(created); due.setDate(due.getDate() + 7 + Math.floor(Math.random() * 21));
      return {
        title: t.title, description: `${t.title} at ${project.name}. Immediate attention required. Root cause analysis in progress.`,
        severity: t.severity, category: t.category, status: t.status,
        due_date: due.toISOString().split("T")[0], project_id: project.id,
        organization_id: organizationId, created_by: userId, assigned_to: userId,
      };
    });
  });

  const { data: createdIssues, error: issueError } = await supabase.from("issues").insert(allIssues).select();
  if (issueError) { console.error("Issues error:", issueError); return; }
  console.log(`✅ ${createdIssues.length} Issues`);


  // ============ 8. PURCHASE ORDERS ============
  let poCounter = 1;
  const allPOs = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 8 + Math.floor(Math.random() * 8) }, () => {
      const vendor = createdVendors[Math.floor(Math.random() * createdVendors.length)];
      const statuses = ["pending", "approved", "fulfilled"];
      return {
        po_number: `PO-2025-${String(poCounter++).padStart(5, "0")}`,
        vendor_name: vendor.name,
        total_amount: 100000 + Math.floor(Math.random() * 5000000),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        notes: `Purchase order for ${project.name} - ${vendor.category}`,
        project_id: project.id, organization_id: organizationId, created_by: userId,
      };
    });
  });

  const { data: createdPOs, error: poError } = await supabase.from("purchase_orders").insert(allPOs).select();
  if (poError) { console.error("POs error:", poError); return; }
  console.log(`✅ ${createdPOs.length} Purchase Orders`);

  // ============ 9. PO ITEMS ============
  const poItems = createdPOs.flatMap(po => {
    const numItems = 2 + Math.floor(Math.random() * 5);
    return Array.from({ length: numItems }, () => {
      const material = createdMaterials[Math.floor(Math.random() * createdMaterials.length)];
      const quantity = 50 + Math.floor(Math.random() * 500);
      const unitPrice = (material.standard_rate || 100) * (0.9 + Math.random() * 0.2);
      return {
        po_id: po.id,
        material_id: material.id,
        quantity,
        unit_price: Math.round(unitPrice),
        total: Math.round(quantity * unitPrice),
      };
    });
  });

  for (let i = 0; i < poItems.length; i += 100) {
    await supabase.from("po_items").insert(poItems.slice(i, i + 100));
  }
  console.log(`✅ ${poItems.length} PO Items`);

  // ============ 10. GOODS RECEIPTS ============
  let grnCounter = 1;
  const approvedPOs = createdPOs.filter(po => po.status === "approved" || po.status === "fulfilled");
  const grns = approvedPOs.slice(0, 60).map(po => {
    const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    return {
      grn_number: `GRN-2025-${String(grnCounter++).padStart(5, "0")}`,
      po_id: po.id,
      vendor_name: po.vendor_name,
      received_date: d.toISOString().split("T")[0],
      notes: `Goods received against ${po.po_number}`,
      project_id: po.project_id, organization_id: organizationId, received_by: userId,
    };
  });

  const { data: createdGRNs, error: grnError } = await supabase.from("goods_receipts").insert(grns).select();
  if (grnError) { console.error("GRNs error:", grnError); return; }
  console.log(`✅ ${createdGRNs.length} Goods Receipts`);

  // ============ 11. GRN ITEMS ============
  const grnItems = createdGRNs.flatMap(grn => {
    const numItems = 2 + Math.floor(Math.random() * 4);
    return Array.from({ length: numItems }, () => {
      const material = createdMaterials[Math.floor(Math.random() * createdMaterials.length)];
      const qtyReceived = 50 + Math.floor(Math.random() * 300);
      const qtyAccepted = Math.floor(qtyReceived * (0.95 + Math.random() * 0.05));
      return {
        grn_id: grn.id,
        material_id: material.id,
        quantity_received: qtyReceived,
        quantity_accepted: qtyAccepted,
        notes: qtyAccepted < qtyReceived ? "Partial rejection due to quality" : null,
      };
    });
  });

  for (let i = 0; i < grnItems.length; i += 100) {
    await supabase.from("grn_items").insert(grnItems.slice(i, i + 100));
  }
  console.log(`✅ ${grnItems.length} GRN Items`);

  // ============ 12. STOCK ENTRIES ============
  const stockEntries = createdProjects.slice(0, 10).flatMap(project => {
    return createdMaterials.slice(0, 40).flatMap(material => {
      const entries = [];
      // Stock in
      entries.push({
        material_id: material.id, project_id: project.id, organization_id: organizationId,
        quantity: 500 + Math.floor(Math.random() * 2000),
        entry_type: "in", recorded_by: userId, notes: "Stock received from vendor",
      });
      // Stock out (consumption)
      entries.push({
        material_id: material.id, project_id: project.id, organization_id: organizationId,
        quantity: 100 + Math.floor(Math.random() * 400),
        entry_type: "out", recorded_by: userId, notes: "Consumed for construction",
      });
      return entries;
    });
  });

  for (let i = 0; i < stockEntries.length; i += 200) {
    await supabase.from("stock_entries").insert(stockEntries.slice(i, i + 200));
  }
  console.log(`✅ ${stockEntries.length} Stock Entries`);

  // ============ 13. INVENTORY TRANSFERS ============
  const transfers = [];
  for (let i = 0; i < 50; i++) {
    const fromProject = createdProjects[Math.floor(Math.random() * 10)];
    let toProject = createdProjects[Math.floor(Math.random() * 10)];
    while (toProject.id === fromProject.id) toProject = createdProjects[Math.floor(Math.random() * 10)];
    const material = createdMaterials[Math.floor(Math.random() * createdMaterials.length)];
    transfers.push({
      from_project_id: fromProject.id, to_project_id: toProject.id, material_id: material.id,
      quantity: 20 + Math.floor(Math.random() * 200), organization_id: organizationId,
      transferred_by: userId, status: ["pending", "approved", "completed"][Math.floor(Math.random() * 3)],
      notes: `Transfer of ${material.name} from ${fromProject.name} to ${toProject.name}`,
    });
  }

  const { data: createdTransfers, error: transferError } = await supabase.from("inventory_transfers").insert(transfers).select();
  if (transferError) { console.error("Transfers error:", transferError); return; }
  console.log(`✅ ${createdTransfers.length} Inventory Transfers`);


  // ============ 14. ATTENDANCE (Last 60 days) ============
  const today = new Date();
  const attendanceRecords: Array<{
    worker_id: string; project_id: string; organization_id: string;
    date: string; status: "present" | "absent" | "half_day" | "overtime";
    overtime_hours: number | null; recorded_by: string;
  }> = [];

  const activeWorkers = createdWorkers?.filter(w => w.is_active) || [];
  for (let day = 0; day < 60; day++) {
    const date = new Date(today); date.setDate(date.getDate() - day);
    if (date.getDay() === 0) continue; // Skip Sundays
    const dateStr = date.toISOString().split("T")[0];
    const workersForDay = activeWorkers.slice(0, 200 + Math.floor(Math.random() * 150));
    
    for (const worker of workersForDay) {
      const project = createdProjects[Math.floor(Math.random() * 10)];
      const roll = Math.random();
      let status: "present" | "absent" | "half_day" | "overtime" = "present";
      let overtime = 0;
      if (roll < 0.72) { status = "present"; if (Math.random() < 0.25) overtime = 1 + Math.floor(Math.random() * 4); }
      else if (roll < 0.82) status = "half_day";
      else if (roll < 0.90) status = "absent";
      else { status = "overtime"; overtime = 2 + Math.floor(Math.random() * 4); }
      
      attendanceRecords.push({
        worker_id: worker.id, project_id: project.id, organization_id: organizationId,
        date: dateStr, status, overtime_hours: overtime || null, recorded_by: userId,
      });
    }
  }

  // Insert in batches
  for (let i = 0; i < attendanceRecords.length; i += 500) {
    await supabase.from("attendance").insert(attendanceRecords.slice(i, i + 500));
  }
  console.log(`✅ ${attendanceRecords.length} Attendance Records`);

  // ============ 15. WORKER ASSIGNMENTS ============
  const assignments = [];
  const tasksForAssignment = createdTasks?.filter(t => t.status === "in_progress") || [];
  for (const task of tasksForAssignment.slice(0, 100)) {
    const numWorkers = 3 + Math.floor(Math.random() * 8);
    const assignedWorkers = activeWorkers.slice(0, numWorkers);
    for (const worker of assignedWorkers) {
      assignments.push({
        worker_id: worker.id, task_id: task.id, project_id: task.project_id,
        organization_id: organizationId, notes: `Assigned to ${task.title}`,
      });
    }
  }

  for (let i = 0; i < assignments.length; i += 100) {
    await supabase.from("worker_assignments").insert(assignments.slice(i, i + 100));
  }
  console.log(`✅ ${assignments.length} Worker Assignments`);

  // ============ 16. PETTY CASH ============
  const pettyCashCategories = ["Transportation", "Site Consumables", "Tea & Refreshments", "Minor Repairs", "Stationery", "Miscellaneous", "Labour Advance", "Emergency Purchase", "Medical", "Communication"];
  const pettyCash = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 40 }, () => {
      const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 90));
      return {
        project_id: project.id, organization_id: organizationId,
        amount: 100 + Math.floor(Math.random() * 9900),
        category: pettyCashCategories[Math.floor(Math.random() * pettyCashCategories.length)],
        description: `Expense for ${project.name}`, date: d.toISOString().split("T")[0],
        recorded_by: userId, receipt_number: Math.random() > 0.25 ? `RCP-${Math.floor(10000 + Math.random() * 90000)}` : null,
      };
    });
  });

  for (let i = 0; i < pettyCash.length; i += 100) {
    await supabase.from("petty_cash_entries").insert(pettyCash.slice(i, i + 100));
  }
  console.log(`✅ ${pettyCash.length} Petty Cash Entries`);

  // ============ 17. SAFETY INCIDENTS ============
  const safetyTypes = ["near_miss", "injury", "hazard", "violation", "illness"];
  const safetyTitles = [
    "Near miss - falling object from height",
    "Minor cut injury during steel work",
    "Scaffolding instability observed",
    "PPE violation - no safety helmet",
    "Heat exhaustion case",
    "Electrical hazard identified",
    "Slip and fall incident",
    "Chemical exposure incident",
    "Crane operation near miss",
    "Excavation cave-in risk",
    "Fire hazard - welding near flammables",
    "Confined space entry violation",
  ];

  const safetyIncidents = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 4 + Math.floor(Math.random() * 6) }, () => {
      const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 120));
      return {
        title: safetyTitles[Math.floor(Math.random() * safetyTitles.length)],
        description: `Safety incident at ${project.name}. Investigation and corrective action required.`,
        incident_type: safetyTypes[Math.floor(Math.random() * safetyTypes.length)],
        severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)],
        incident_date: d.toISOString().split("T")[0], location: project.location,
        status: ["reported", "investigating", "resolved"][Math.floor(Math.random() * 3)],
        project_id: project.id, organization_id: organizationId, reported_by: userId,
      };
    });
  });

  const { data: createdSafety, error: safetyError } = await supabase.from("safety_incidents").insert(safetyIncidents).select();
  if (safetyError) { console.error("Safety error:", safetyError); return; }
  console.log(`✅ ${createdSafety.length} Safety Incidents`);

  // ============ 18. TOOLBOX TALKS ============
  const toolboxTopics = [
    "Working at Heights Safety", "PPE Usage and Importance", "Fire Safety Awareness",
    "Electrical Safety", "Excavation Safety", "Crane Operation Safety",
    "Heat Stress Prevention", "First Aid Basics", "Housekeeping on Site",
    "Chemical Handling Safety", "Scaffolding Safety", "Confined Space Entry",
    "Manual Handling Techniques", "Emergency Evacuation Procedures", "COVID-19 Protocols",
  ];

  const toolboxTalks = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 8 + Math.floor(Math.random() * 8) }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i * 7 - Math.floor(Math.random() * 3));
      return {
        topic: toolboxTopics[Math.floor(Math.random() * toolboxTopics.length)],
        description: `Weekly safety toolbox talk at ${project.name}`,
        conducted_date: d.toISOString().split("T")[0],
        attendee_count: 15 + Math.floor(Math.random() * 35),
        attendee_names: ["Site Engineer", "Safety Officer", "Foreman", "Workers"],
        notes: "Talk conducted successfully. All attendees signed the register.",
        project_id: project.id, organization_id: organizationId, conducted_by: userId,
      };
    });
  });

  for (let i = 0; i < toolboxTalks.length; i += 50) {
    await supabase.from("toolbox_talks").insert(toolboxTalks.slice(i, i + 50));
  }
  console.log(`✅ ${toolboxTalks.length} Toolbox Talks`);


  // ============ 19. MEETING MINUTES ============
  const meetingTopics = [
    "Weekly Progress Review Meeting", "Monthly Management Review", "Client Coordination Meeting",
    "Subcontractor Performance Review", "Quality Audit Discussion", "Schedule Recovery Planning",
    "Safety Committee Meeting", "Design Coordination Meeting", "Cost Review Meeting",
    "Procurement Planning Meeting", "Risk Assessment Meeting", "Handover Planning Meeting",
  ];

  const meetings = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 8 + Math.floor(Math.random() * 8) }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i * 7 - Math.floor(Math.random() * 3));
      return {
        title: meetingTopics[Math.floor(Math.random() * meetingTopics.length)],
        meeting_date: d.toISOString().split("T")[0], location: `${project.name} - Site Office`,
        agenda: "1. Progress update\n2. Issues discussion\n3. Resource planning\n4. Safety briefing\n5. Next week targets",
        notes: "Meeting conducted successfully. All action items assigned with deadlines.",
        attendees: ["Project Manager", "Site Engineer", "Safety Officer", "QA/QC Engineer", "Contractor Rep", "Client Rep"],
        action_items: JSON.stringify([
          { task: "Submit revised schedule", assignee: "Site Engineer", due: "Next Monday", status: "pending" },
          { task: "Arrange material delivery", assignee: "Procurement", due: "This week", status: "in_progress" },
          { task: "Complete NCR closure", assignee: "QA/QC", due: "Friday", status: "pending" },
        ]),
        project_id: project.id, organization_id: organizationId, created_by: userId,
      };
    });
  });

  for (let i = 0; i < meetings.length; i += 50) {
    await supabase.from("meeting_minutes").insert(meetings.slice(i, i + 50));
  }
  console.log(`✅ ${meetings.length} Meeting Minutes`);

  // ============ 20. DRAWINGS ============
  const drawingCategories = ["Architectural", "Structural", "MEP", "HVAC", "Plumbing", "Electrical", "Fire Fighting", "Landscape", "Interior", "Facade"];
  const drawingTypes = ["Floor Plan", "Section", "Detail", "Elevation", "Layout", "Schematic", "Shop Drawing", "As-Built"];

  const drawings = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 15 + Math.floor(Math.random() * 15) }, (_, i) => {
      const cat = drawingCategories[Math.floor(Math.random() * drawingCategories.length)];
      const type = drawingTypes[Math.floor(Math.random() * drawingTypes.length)];
      return {
        title: `${cat} - ${type} - ${["Level " + (Math.floor(Math.random() * 20) + 1), "Basement", "Terrace", "Typical Floor"][Math.floor(Math.random() * 4)]}`,
        drawing_number: `DWG-${project.name.substring(0, 3).toUpperCase()}-${cat.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
        category: cat, revision: Math.floor(Math.random() * 5),
        status: ["draft", "for_review", "approved", "superseded"][Math.floor(Math.random() * 4)],
        notes: `${cat} ${type} for ${project.name}. Refer to specification for details.`,
        project_id: project.id, organization_id: organizationId, uploaded_by: userId,
      };
    });
  });

  for (let i = 0; i < drawings.length; i += 50) {
    await supabase.from("drawings").insert(drawings.slice(i, i + 50));
  }
  console.log(`✅ ${drawings.length} Drawings`);

  // ============ 21. DOCUMENTS ============
  const docFolders = ["Contracts", "Permits", "Reports", "Correspondence", "Specifications", "BOQ", "Insurance", "Warranties", "Certificates", "Submittals"];
  const documents = createdProjects.slice(0, 12).flatMap(project => {
    return Array.from({ length: 12 + Math.floor(Math.random() * 12) }, (_, i) => {
      const folder = docFolders[Math.floor(Math.random() * docFolders.length)];
      return {
        title: `${folder} - ${project.name} - Document ${i + 1}`,
        folder, notes: `${folder} document for ${project.name}. Confidential.`,
        tags: [folder.toLowerCase(), project.name.split(" ")[0].toLowerCase(), "2025"],
        project_id: project.id, organization_id: organizationId, uploaded_by: userId,
      };
    });
  });

  for (let i = 0; i < documents.length; i += 50) {
    await supabase.from("documents").insert(documents.slice(i, i + 50));
  }
  console.log(`✅ ${documents.length} Documents`);

  // ============ 22. EQUIPMENT LOGS ============
  const logTypes = ["usage", "maintenance", "inspection", "repair", "fuel"];
  const equipmentLogs = createdEquipment.slice(0, 40).flatMap(equipment => {
    return Array.from({ length: 10 + Math.floor(Math.random() * 15) }, () => {
      const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 60));
      const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
      return {
        equipment_id: equipment.id,
        log_type: logType,
        log_date: d.toISOString().split("T")[0],
        hours_used: logType === "usage" ? 4 + Math.floor(Math.random() * 8) : null,
        description: `${logType.charAt(0).toUpperCase() + logType.slice(1)} log for ${equipment.name}`,
        project_id: equipment.current_project_id,
        organization_id: organizationId, logged_by: userId,
      };
    });
  });

  for (let i = 0; i < equipmentLogs.length; i += 100) {
    await supabase.from("equipment_logs").insert(equipmentLogs.slice(i, i + 100));
  }
  console.log(`✅ ${equipmentLogs.length} Equipment Logs`);


  // ============ 23. CHAT MESSAGES ============
  const chatMessages = [
    { content: "Good morning team! Today's concrete pour for Tower A is scheduled for 10 AM. All preparations complete.", channel: "general" },
    { content: "Steel delivery arrived at Gate 2. Unloading in progress. Need 10 helpers immediately.", channel: "general" },
    { content: "Safety inspection completed for Metro Section 4. Minor observations noted - report shared.", channel: "safety" },
    { content: "Client visit tomorrow at 11 AM for Airport Terminal. Please ensure site is presentable.", channel: "general" },
    { content: "Tower Crane TC-8030 maintenance scheduled for Sunday. Plan concrete pours accordingly.", channel: "equipment" },
    { content: "Weather alert: Heavy rain expected Thursday-Friday. Cover all exposed reinforcement.", channel: "general" },
    { content: "Excellent progress on Mega City Tower! We're ahead of schedule by 2 weeks 💪", channel: "general" },
    { content: "Material shortage for waterproofing at Smart City. Procurement please expedite.", channel: "materials" },
    { content: "New safety guidelines for TBM operations uploaded. All tunnel workers must review.", channel: "safety" },
    { content: "Overtime approved for weekend work on Airport Terminal. Supervisors coordinate shifts.", channel: "general" },
    { content: "Quality audit passed for Data Center foundation. Zero NCRs - great job team!", channel: "quality" },
    { content: "Reminder: All workers must complete safety induction before entering Metro tunnel.", channel: "safety" },
    { content: "Electrician team needed at Healthcare City for panel installation.", channel: "general" },
    { content: "Monthly progress report submitted to all clients. Dashboard updated.", channel: "general" },
    { content: "New batch of 50 workers joining tomorrow. HR please arrange induction.", channel: "general" },
    { content: "Concrete cube test results for Bridge project - all samples passed. Strength achieved.", channel: "quality" },
    { content: "TBM Mega-1 achieved 15m advance today - new daily record! 🎉", channel: "general" },
    { content: "Payment released for January bills. Vendors please check accounts.", channel: "general" },
    { content: "MMRDA inspection scheduled for Riverfront project on Friday.", channel: "general" },
    { content: "Waterproofing test successful at Resort project. No leakage after 48 hours.", channel: "quality" },
    { content: "Crane operator certification expiring next week. HR please arrange renewal.", channel: "general" },
    { content: "Design change approved for Industrial Park. Updated drawings uploaded.", channel: "general" },
    { content: "Emergency: Power outage at Metro site. Backup generators activated.", channel: "general" },
    { content: "Congratulations to Safety team - 100 days without LTI at Airport project! 🏆", channel: "safety" },
    { content: "RMC delivery delayed by 2 hours due to traffic. Adjust pour schedule.", channel: "materials" },
    { content: "New project kickoff meeting for Phase 2 tomorrow at 3 PM.", channel: "general" },
    { content: "Scaffolding inspection completed at Heritage project. All platforms certified.", channel: "safety" },
    { content: "Cost review meeting rescheduled to Wednesday 2 PM.", channel: "general" },
    { content: "Excellent feedback from IIT client on campus expansion progress.", channel: "general" },
    { content: "Fire drill conducted successfully at all active sites today.", channel: "safety" },
  ];

  const chatData = chatMessages.map((msg, i) => {
    const d = new Date(); d.setHours(d.getHours() - i * 2 - Math.floor(Math.random() * 3));
    return {
      content: msg.content, channel: msg.channel,
      organization_id: organizationId, sender_id: userId,
      project_id: i % 4 === 0 ? createdProjects[Math.floor(Math.random() * 8)].id : null,
      created_at: d.toISOString(),
    };
  });

  const { data: createdChat, error: chatError } = await supabase.from("chat_messages").insert(chatData).select();
  if (chatError) { console.error("Chat error:", chatError); return; }
  console.log(`✅ ${createdChat.length} Chat Messages`);

  // ============ 24. TASK COMMENTS ============
  const taskCommentTexts = [
    "Work progressing as planned. On track for completion.",
    "Need additional resources - 5 more masons required.",
    "Completed ahead of schedule! Moving to next activity.",
    "Waiting for material delivery. Expected tomorrow.",
    "Quality check passed. Proceeding to next stage.",
    "Minor rework required. Will complete by EOD.",
    "Coordination needed with MEP team for embedments.",
    "Client approved the work. Photos uploaded.",
    "Weather delay - resuming tomorrow morning.",
    "Inspection scheduled for Friday. Preparing documentation.",
    "Subcontractor mobilized. Work starting tomorrow.",
    "Design clarification received. Proceeding with revised scope.",
  ];

  const taskComments = (createdTasks || []).slice(0, 100).flatMap(task => {
    return Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => ({
      task_id: task.id, user_id: userId,
      content: taskCommentTexts[Math.floor(Math.random() * taskCommentTexts.length)],
    }));
  });

  for (let i = 0; i < taskComments.length; i += 50) {
    await supabase.from("task_comments").insert(taskComments.slice(i, i + 50));
  }
  console.log(`✅ ${taskComments.length} Task Comments`);

  // ============ 25. ISSUE COMMENTS ============
  const issueCommentTexts = [
    "Investigating the root cause. Initial findings suggest material issue.",
    "Corrective action initiated. Rework scheduled for tomorrow.",
    "Escalated to management for urgent attention.",
    "Vendor notified about the quality issue. Replacement expected.",
    "Temporary fix applied. Permanent solution in progress.",
    "Root cause identified - human error. Training scheduled.",
    "Issue resolved. Closing ticket after verification.",
    "Need more information from site team.",
    "Site visit scheduled for detailed inspection.",
    "NCR issued to subcontractor. Response awaited.",
    "Client informed about the delay impact.",
    "Recovery plan submitted. Awaiting approval.",
  ];

  const issueComments = createdIssues.slice(0, 50).flatMap(issue => {
    return Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => ({
      issue_id: issue.id, user_id: userId,
      content: issueCommentTexts[Math.floor(Math.random() * issueCommentTexts.length)],
    }));
  });

  for (let i = 0; i < issueComments.length; i += 50) {
    await supabase.from("issue_comments").insert(issueComments.slice(i, i + 50));
  }
  console.log(`✅ ${issueComments.length} Issue Comments`);

  // ============ 26. NOTIFICATIONS ============
  const notificationTypes = ["task", "issue", "material", "safety", "general", "approval", "deadline"];
  const notificationTitles: Record<string, string[]> = {
    task: ["Task assigned to you", "Task deadline approaching", "Task completed", "Task requires attention"],
    issue: ["New issue reported", "Issue assigned to you", "Issue resolved", "Issue escalated"],
    material: ["Material request approved", "Low stock alert", "Delivery received", "PO approved"],
    safety: ["Safety incident reported", "Safety inspection due", "Toolbox talk scheduled", "PPE audit required"],
    general: ["New announcement", "Meeting scheduled", "Report available", "Document uploaded"],
    approval: ["Approval required", "Request approved", "Request rejected", "Pending your review"],
    deadline: ["Deadline tomorrow", "Overdue task", "Milestone approaching", "Submission due"],
  };

  const notifications = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(); d.setHours(d.getHours() - i * 3);
    const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
    return {
      title: notificationTitles[type][Math.floor(Math.random() * notificationTitles[type].length)],
      message: `Notification regarding ${type} activity. Please review and take necessary action.`,
      type, is_read: Math.random() > 0.35,
      organization_id: organizationId, user_id: userId,
      link: `/${type === "general" ? "dashboard" : type + "s"}`,
      created_at: d.toISOString(),
    };
  });

  const { data: createdNotifications, error: notifError } = await supabase.from("notifications").insert(notifications).select();
  if (notifError) { console.error("Notifications error:", notifError); return; }
  console.log(`✅ ${createdNotifications.length} Notifications`);


  // ============ 27. RA BILLS ============
  let raBillCounter = 1;
  const raBills = createdProjects.slice(0, 10).flatMap(project => {
    return Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (_, i) => {
      const billDate = new Date(); billDate.setMonth(billDate.getMonth() - i);
      const periodFrom = new Date(billDate); periodFrom.setDate(1);
      const periodTo = new Date(billDate); periodTo.setMonth(periodTo.getMonth() + 1); periodTo.setDate(0);
      const totalAmount = 5000000 + Math.floor(Math.random() * 50000000);
      const retentionPercent = 5;
      const retentionAmount = Math.round(totalAmount * retentionPercent / 100);
      return {
        bill_number: `RA-${project.name.substring(0, 3).toUpperCase()}-${String(raBillCounter++).padStart(4, "0")}`,
        bill_date: billDate.toISOString().split("T")[0],
        period_from: periodFrom.toISOString().split("T")[0],
        period_to: periodTo.toISOString().split("T")[0],
        total_amount: totalAmount,
        retention_percent: retentionPercent,
        retention_amount: retentionAmount,
        net_amount: totalAmount - retentionAmount,
        status: ["draft", "submitted", "approved", "paid"][Math.floor(Math.random() * 4)],
        notes: `Running Account Bill for ${project.name} - Period ${i + 1}`,
        project_id: project.id, organization_id: organizationId, created_by: userId,
      };
    });
  });

  const { data: createdRABills, error: raBillError } = await supabase.from("ra_bills").insert(raBills).select();
  if (raBillError) { console.error("RA Bills error:", raBillError); return; }
  console.log(`✅ ${createdRABills.length} RA Bills`);

  // ============ 28. RA BILL ITEMS ============
  const raBillItems = createdRABills.flatMap(bill => {
    const items = [
      { description: "Excavation in all types of soil", unit: "cum", rate: 450 },
      { description: "PCC M15 grade", unit: "cum", rate: 4800 },
      { description: "RCC M30 grade for foundation", unit: "cum", rate: 7500 },
      { description: "Reinforcement steel Fe500D", unit: "kg", rate: 85 },
      { description: "Formwork for foundation", unit: "sqm", rate: 450 },
      { description: "Brick masonry in CM 1:6", unit: "cum", rate: 6500 },
      { description: "Plastering 12mm thick", unit: "sqm", rate: 280 },
      { description: "Waterproofing treatment", unit: "sqm", rate: 380 },
    ];
    return items.slice(0, 4 + Math.floor(Math.random() * 4)).map(item => {
      const quantity = 100 + Math.floor(Math.random() * 500);
      const previousQty = Math.floor(quantity * Math.random() * 0.6);
      const currentQty = Math.floor((quantity - previousQty) * (0.3 + Math.random() * 0.4));
      return {
        bill_id: bill.id,
        description: item.description,
        unit: item.unit,
        quantity,
        rate: item.rate,
        previous_quantity: previousQty,
        current_quantity: currentQty,
        cumulative_quantity: previousQty + currentQty,
        amount: (previousQty + currentQty) * item.rate,
      };
    });
  });

  for (let i = 0; i < raBillItems.length; i += 50) {
    await supabase.from("ra_bill_items").insert(raBillItems.slice(i, i + 50));
  }
  console.log(`✅ ${raBillItems.length} RA Bill Items`);

  // ============ 29. CHECKLIST TEMPLATES ============
  const checklistTemplates = [
    {
      name: "Concrete Pour Checklist",
      category: "Quality",
      items: JSON.stringify([
        { item: "Formwork alignment checked", required: true },
        { item: "Reinforcement as per drawing", required: true },
        { item: "Cover blocks in place", required: true },
        { item: "Formwork joints sealed", required: true },
        { item: "Concrete grade verified", required: true },
        { item: "Slump test conducted", required: true },
        { item: "Vibrator available", required: true },
        { item: "Curing arrangement ready", required: true },
      ]),
    },
    {
      name: "Scaffolding Inspection",
      category: "Safety",
      items: JSON.stringify([
        { item: "Base plates on firm ground", required: true },
        { item: "Standards plumb and level", required: true },
        { item: "Ledgers and transoms secure", required: true },
        { item: "Bracing adequate", required: true },
        { item: "Platforms fully boarded", required: true },
        { item: "Guard rails in place", required: true },
        { item: "Toe boards installed", required: true },
        { item: "Access ladder provided", required: true },
      ]),
    },
    {
      name: "Excavation Safety Checklist",
      category: "Safety",
      items: JSON.stringify([
        { item: "Underground utilities located", required: true },
        { item: "Shoring/sloping adequate", required: true },
        { item: "Safe access provided", required: true },
        { item: "Spoil kept away from edge", required: true },
        { item: "Barriers and signage in place", required: true },
        { item: "Dewatering if required", required: false },
        { item: "Daily inspection conducted", required: true },
      ]),
    },
    {
      name: "Waterproofing Inspection",
      category: "Quality",
      items: JSON.stringify([
        { item: "Surface prepared and clean", required: true },
        { item: "Primer applied uniformly", required: true },
        { item: "Membrane overlaps correct", required: true },
        { item: "Joints properly sealed", required: true },
        { item: "Protection screed applied", required: true },
        { item: "Flood test conducted", required: true },
      ]),
    },
    {
      name: "Electrical Installation Checklist",
      category: "Quality",
      items: JSON.stringify([
        { item: "Conduit routing as per drawing", required: true },
        { item: "Wire gauge as specified", required: true },
        { item: "Earthing connections complete", required: true },
        { item: "Insulation resistance tested", required: true },
        { item: "Panel terminations tight", required: true },
        { item: "Labeling complete", required: true },
      ]),
    },
  ];

  const { data: createdChecklists, error: checklistError } = await supabase
    .from("checklist_templates")
    .insert(checklistTemplates.map(c => ({ ...c, organization_id: organizationId, created_by: userId })))
    .select();
  if (checklistError) { console.error("Checklists error:", checklistError); return; }
  console.log(`✅ ${createdChecklists.length} Checklist Templates`);

  // ============ 30. INSPECTIONS ============
  const inspections = createdProjects.slice(0, 10).flatMap(project => {
    return Array.from({ length: 5 + Math.floor(Math.random() * 8) }, () => {
      const template = createdChecklists[Math.floor(Math.random() * createdChecklists.length)];
      const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 60));
      return {
        title: `${template.name} - ${project.name}`,
        category: template.category,
        template_id: template.id,
        inspection_date: d.toISOString().split("T")[0],
        status: ["scheduled", "in_progress", "completed"][Math.floor(Math.random() * 3)],
        overall_result: ["pass", "fail", "conditional"][Math.floor(Math.random() * 3)],
        results: JSON.stringify({ items_checked: 8, items_passed: 7, items_failed: 1 }),
        notes: `Inspection conducted at ${project.name}. Minor observations noted.`,
        project_id: project.id, organization_id: organizationId, inspector_id: userId,
      };
    });
  });

  for (let i = 0; i < inspections.length; i += 50) {
    await supabase.from("inspections").insert(inspections.slice(i, i + 50));
  }
  console.log(`✅ ${inspections.length} Inspections`);

  // ============ SUMMARY ============
  console.log("\n🎉 MEGA CONSTRUCTION COMPANY - Seed Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Mega Projects:        ${createdProjects.length}`);
  console.log(`  Materials Catalog:    ${createdMaterials.length}`);
  console.log(`  Workforce:            ${createdWorkers?.length || 0}`);
  console.log(`  Vendors:              ${createdVendors.length}`);
  console.log(`  Equipment Fleet:      ${createdEquipment.length}`);
  console.log(`  Tasks:                ${createdTasks?.length || 0}`);
  console.log(`  Issues/NCRs:          ${createdIssues.length}`);
  console.log(`  Purchase Orders:      ${createdPOs.length}`);
  console.log(`  PO Items:             ${poItems.length}`);
  console.log(`  Goods Receipts:       ${createdGRNs.length}`);
  console.log(`  GRN Items:            ${grnItems.length}`);
  console.log(`  Stock Entries:        ${stockEntries.length}`);
  console.log(`  Transfers:            ${createdTransfers.length}`);
  console.log(`  Attendance Records:   ${attendanceRecords.length}`);
  console.log(`  Worker Assignments:   ${assignments.length}`);
  console.log(`  Petty Cash:           ${pettyCash.length}`);
  console.log(`  Safety Incidents:     ${createdSafety.length}`);
  console.log(`  Toolbox Talks:        ${toolboxTalks.length}`);
  console.log(`  Meetings:             ${meetings.length}`);
  console.log(`  Drawings:             ${drawings.length}`);
  console.log(`  Documents:            ${documents.length}`);
  console.log(`  Equipment Logs:       ${equipmentLogs.length}`);
  console.log(`  Chat Messages:        ${createdChat.length}`);
  console.log(`  Task Comments:        ${taskComments.length}`);
  console.log(`  Issue Comments:       ${issueComments.length}`);
  console.log(`  Notifications:        ${createdNotifications.length}`);
  console.log(`  RA Bills:             ${createdRABills.length}`);
  console.log(`  RA Bill Items:        ${raBillItems.length}`);
  console.log(`  Checklist Templates:  ${createdChecklists.length}`);
  console.log(`  Inspections:          ${inspections.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return { success: true };
}

// Run from browser
export async function runSeed() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error("❌ Not logged in"); return; }

  // Try to get existing profile
  let { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
  
  // If no profile or no organization, create one
  if (!profile?.organization_id) {
    console.log("📝 Creating organization and profile...");
    
    // Create organization
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: "Mega Construction Company", slug: "mega-construction-" + Date.now() })
      .select()
      .single();
    
    if (orgError) { console.error("❌ Failed to create organization:", orgError.message); return; }
    
    // Create or update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ 
        user_id: user.id, 
        organization_id: newOrg.id,
        full_name: user.email?.split("@")[0] || "Admin User"
      }, { onConflict: "user_id" });
    
    if (profileError) { console.error("❌ Failed to create profile:", profileError.message); return; }
    
    console.log("✅ Organization created: Mega Construction Company");
    return seedMegaCompanyData(newOrg.id, user.id);
  }

  return seedMegaCompanyData(profile.organization_id, user.id);
}

// Clear only (no seeding)
export async function runClearOnly() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error("❌ Not logged in"); return; }

  // Try to get existing profile
  let { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", user.id).single();
  
  if (!profile?.organization_id) { 
    console.error("❌ No organization found. Run 'Clear & Seed Data' first to create one."); 
    return; 
  }

  await clearExistingData(profile.organization_id);
  console.log("🎉 All data cleared successfully!");
  return { success: true };
}
