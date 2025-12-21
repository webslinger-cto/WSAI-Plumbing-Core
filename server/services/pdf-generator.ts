import PDFDocument from "pdfkit";

export function generateApplicationPDF(): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });

  // Title
  doc.fontSize(24).font("Helvetica-Bold").text("Chicago Sewer Experts CRM", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica").text("Application Documentation", { align: "center" });
  doc.moveDown(2);

  // Overview Section
  doc.fontSize(16).font("Helvetica-Bold").text("Overview");
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica").text(
    "A comprehensive Customer Relationship Management (CRM) and Field Service Management system designed for Chicago Sewer Experts, a sewer and plumbing services business. This application provides complete lead-to-job lifecycle management with role-based access control, automated workflows, and real-time field operations tracking."
  );
  doc.moveDown(1.5);

  // Features Section
  doc.fontSize(16).font("Helvetica-Bold").text("Key Features");
  doc.moveDown(0.5);

  const features = [
    { title: "Lead Management", items: ["Multi-source lead intake (eLocal, Networx, Angi, Thumbtack, Inquirly)", "Webhook integration for automated capture", "Lead scoring and duplicate detection", "SLA tracking with breach alerts"] },
    { title: "Job Management", items: ["Full lifecycle tracking (Pending to Completed)", "Cost tracking (labor, materials, travel, equipment)", "Revenue and profit calculation", "Cancellation tracking with reasons"] },
    { title: "Technician Management", items: ["Real-time GPS tracking with map view", "Automated dispatch to closest technician", "Availability status monitoring", "Skill-based job assignment", "Commission and hourly rate tracking"] },
    { title: "Quote Generation", items: ["Mobile quote builder for field use", "Line items with labor and materials", "Tax calculation", "Public shareable quote links", "Quote status tracking"] },
    { title: "Photo & Video Capture", items: ["Mobile camera integration", "GPS tagging on captures", "Before/During/After categorization", "Captions for documentation"] },
    { title: "Automated Workflows", items: ["Auto-contact on new leads", "Automatic job creation", "Technician auto-assignment", "Appointment reminders via email"] },
    { title: "Analytics & Reporting", items: ["Revenue dashboard by source and technician", "Lead conversion rate tracking", "Technician performance metrics", "CSV export functionality"] },
  ];

  features.forEach((feature) => {
    doc.fontSize(12).font("Helvetica-Bold").text(feature.title);
    feature.items.forEach((item) => {
      doc.fontSize(10).font("Helvetica").text(`  • ${item}`);
    });
    doc.moveDown(0.5);
  });

  doc.addPage();

  // User Roles Section
  doc.fontSize(16).font("Helvetica-Bold").text("User Roles");
  doc.moveDown(0.5);

  const roles = [
    { role: "Administrator", desc: "Full system access including leads, jobs, technicians, settings, analytics, and automation configuration." },
    { role: "Dispatcher", desc: "Manage incoming leads, create and assign jobs, monitor technician locations, handle customer communications." },
    { role: "Technician", desc: "View assigned jobs, update job status, create quotes, capture photos/videos, track earnings." },
  ];

  roles.forEach((r) => {
    doc.fontSize(12).font("Helvetica-Bold").text(r.role);
    doc.fontSize(10).font("Helvetica").text(r.desc);
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  // Demo Credentials
  doc.fontSize(16).font("Helvetica-Bold").text("Demo Credentials");
  doc.moveDown(0.5);

  const creds = [
    { role: "Admin", user: "admin", pass: "demo123" },
    { role: "Dispatcher", user: "dispatcher", pass: "demo123" },
    { role: "Technician", user: "mike", pass: "demo123" },
    { role: "Technician", user: "carlos", pass: "demo123" },
    { role: "Technician", user: "james", pass: "demo123" },
  ];

  doc.fontSize(10).font("Helvetica");
  creds.forEach((c) => {
    doc.text(`${c.role}: ${c.user} / ${c.pass}`);
  });

  doc.moveDown(1.5);

  // API Endpoints Section
  doc.fontSize(16).font("Helvetica-Bold").text("API Endpoints");
  doc.moveDown(0.5);

  const endpoints = [
    { category: "Leads", items: ["GET /api/leads - List all leads", "POST /api/leads - Create a lead", "GET /api/leads/:id - Get lead details", "PATCH /api/leads/:id - Update lead"] },
    { category: "Jobs", items: ["GET /api/jobs - List all jobs", "POST /api/jobs - Create a job", "GET /api/jobs/:id - Get job details", "POST /api/jobs/:id/attachments - Upload attachment"] },
    { category: "Technicians", items: ["GET /api/technicians - List all technicians", "GET /api/technicians/available - Available technicians", "POST /api/technicians/:id/location - Update location"] },
    { category: "Dispatch", items: ["POST /api/dispatch/closest-technician - Find closest technician"] },
    { category: "Quotes", items: ["GET /api/quotes - List quotes", "POST /api/quotes - Create quote", "GET /api/quotes/public/:token - Public quote view"] },
    { category: "Webhooks", items: ["POST /api/webhooks/elocal", "POST /api/webhooks/networx", "POST /api/webhooks/angi", "POST /api/webhooks/thumbtack", "POST /api/webhooks/inquirly", "POST /api/webhooks/zapier"] },
  ];

  endpoints.forEach((ep) => {
    doc.fontSize(11).font("Helvetica-Bold").text(ep.category);
    ep.items.forEach((item) => {
      doc.fontSize(9).font("Helvetica").text(`  ${item}`);
    });
    doc.moveDown(0.3);
  });

  doc.addPage();

  // Technology Stack
  doc.fontSize(16).font("Helvetica-Bold").text("Technology Stack");
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("Frontend");
  doc.fontSize(10).font("Helvetica").text("React 18 with TypeScript, Vite, TanStack Query, Tailwind CSS, Radix UI/shadcn, Wouter, Recharts, Leaflet");
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("Backend");
  doc.fontSize(10).font("Helvetica").text("Node.js with Express, TypeScript, PostgreSQL, Drizzle ORM, Passport.js, Resend email");
  doc.moveDown(1.5);

  // Service Types
  doc.fontSize(16).font("Helvetica-Bold").text("Service Types");
  doc.moveDown(0.5);

  const services = [
    "Sewer Main - Clear, Repair, Replace",
    "Drain Cleaning",
    "Water Heater - Repair/Replace",
    "Toilet Repair",
    "Faucet Repair",
    "Pipe Repair/Replacement",
    "Sump Pump",
    "Ejector Pump",
    "Camera Inspection",
    "Hydro Jetting",
  ];

  doc.fontSize(10).font("Helvetica");
  services.forEach((s) => {
    doc.text(`• ${s}`);
  });

  doc.moveDown(1.5);

  // Notifications
  doc.fontSize(16).font("Helvetica-Bold").text("Notifications");
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("Email Notifications (Active)");
  doc.fontSize(10).font("Helvetica").text("Office receives: New leads, jobs, and quotes");
  doc.text("Technicians receive: Job assignments and approvals");
  doc.moveDown(0.5);

  doc.fontSize(12).font("Helvetica-Bold").text("SMS Notifications (Pending)");
  doc.fontSize(10).font("Helvetica").text("Currently disabled pending A2P carrier verification. Will include appointment reminders.");
  doc.moveDown(1.5);

  // Footer
  doc.fontSize(10).font("Helvetica-Oblique").text("Chicago Sewer Experts CRM - Built for efficient field service management", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(8).text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });

  return doc;
}
