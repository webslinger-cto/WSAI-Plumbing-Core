import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Screenshot {
  src: string;
  title: string;
  description: string;
  category: string;
}

const screenshots: Screenshot[] = [
  {
    src: "/screenshots/00_login.png",
    title: "Secure Login",
    description: "Role-based authentication with Chicago Sewer Experts branding. Four user roles: Admin, Dispatcher, Technician, and Salesperson.",
    category: "Authentication"
  },
  {
    src: "/screenshots/01_admin_dashboard.png",
    title: "Admin Dashboard",
    description: "Real-time KPI overview with leads, jobs, revenue tracking. At-a-glance metrics for business performance.",
    category: "Admin"
  },
  {
    src: "/screenshots/02_admin_leads.png",
    title: "Multi-Source Lead Management",
    description: "Capture leads from 6+ sources: eLocal, Networx, Angi, Thumbtack, Inquirly, and Zapier webhooks. No lead slips through the cracks.",
    category: "Admin"
  },
  {
    src: "/screenshots/03_admin_jobs.png",
    title: "Complete Job Tracking",
    description: "Full job lifecycle management with labor hours, materials, travel, and equipment costs. Track every dollar.",
    category: "Admin"
  },
  {
    src: "/screenshots/04_admin_technicians.png",
    title: "Technician Management",
    description: "Skill-based technician profiles with hourly rates, certifications, and availability tracking.",
    category: "Admin"
  },
  {
    src: "/screenshots/05_admin_analytics.png",
    title: "Advanced Analytics",
    description: "ROI and profitability metrics. Understand your business performance with actionable insights.",
    category: "Admin"
  },
  {
    src: "/screenshots/06_admin_pricebook.png",
    title: "Pricebook Management",
    description: "Standardized service catalog with labor estimates and material costs. Consistent pricing across your team.",
    category: "Admin"
  },
  {
    src: "/screenshots/07_admin_marketing.png",
    title: "Marketing ROI Tracking",
    description: "Track cost-per-lead and ROI by source. Know exactly which marketing channels deliver results.",
    category: "Admin"
  },
  {
    src: "/screenshots/10_dispatcher_dashboard.png",
    title: "Dispatch Center",
    description: "Real-time job coordination and technician assignment. Keep your team organized and efficient.",
    category: "Dispatcher"
  },
  {
    src: "/screenshots/14_dispatcher_map.png",
    title: "Live GPS Tracking",
    description: "Interactive map showing real-time technician locations. Optimize routes and response times.",
    category: "Dispatcher"
  },
  {
    src: "/screenshots/15_dispatcher_staffing.png",
    title: "Staffing Pool",
    description: "Workload management and technician availability. Balance assignments across your team.",
    category: "Dispatcher"
  },
  {
    src: "/screenshots/16_tech_dashboard.png",
    title: "Technician Dashboard",
    description: "Personal job queue and daily schedule. Technicians see exactly what they need to do.",
    category: "Technician"
  },
  {
    src: "/screenshots/18_tech_quote_builder.png",
    title: "On-Site Quote Builder",
    description: "Create professional quotes on-site using your pricebook. Close deals faster in the field.",
    category: "Technician"
  },
  {
    src: "/screenshots/19_tech_earnings.png",
    title: "Earnings Tracking",
    description: "Personal earnings dashboard. Technicians track their completed jobs and pay.",
    category: "Technician"
  },
  {
    src: "/screenshots/20_sales_dashboard.png",
    title: "Sales Dashboard",
    description: "NET profit-based commission tracking. Sales team sees their real earnings based on actual profit, not just revenue.",
    category: "Salesperson"
  },
  {
    src: "/screenshots/23_sales_quotes.png",
    title: "Quote Management",
    description: "Track all sales quotes with status, value, and conversion metrics. Follow up on opportunities.",
    category: "Salesperson"
  },
  {
    src: "/screenshots/24_sales_quote_tool.png",
    title: "Quick Quote Tool",
    description: "Generate professional quotes in seconds. Integrated with pricebook for accurate pricing.",
    category: "Salesperson"
  }
];

const categoryColors: Record<string, string> = {
  "Authentication": "bg-gray-500",
  "Admin": "bg-blue-600",
  "Dispatcher": "bg-green-600",
  "Technician": "bg-orange-600",
  "Salesperson": "bg-purple-600"
};

export default function ScreenshotCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % screenshots.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const current = screenshots[currentIndex];

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
        <img
          src={current.src}
          alt={current.title}
          className="w-full h-full object-contain"
        />
        
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
          aria-label="Previous screenshot"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
          aria-label="Next screenshot"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {screenshots.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Go to screenshot ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-sm text-white mb-3 ${categoryColors[current.category]}`}>
          {current.category}
        </span>
        <h3 className="text-2xl font-bold text-white mb-2">{current.title}</h3>
        <p className="text-gray-300 max-w-2xl mx-auto">{current.description}</p>
        <p className="text-gray-500 text-sm mt-4">
          {currentIndex + 1} of {screenshots.length}
        </p>
      </div>
    </div>
  );
}
