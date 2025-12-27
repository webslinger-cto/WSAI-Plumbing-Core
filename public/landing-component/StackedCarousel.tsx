import { useState } from "react";

interface Screenshot {
  src: string;
  title: string;
  description: string;
  category: string;
}

const screenshots: Screenshot[] = [
  { src: "/screenshots/00_login.png", title: "Secure Login", description: "Role-based authentication with four user types: Admin, Dispatcher, Technician, and Salesperson.", category: "Authentication" },
  { src: "/screenshots/01_admin_dashboard.png", title: "Admin Dashboard", description: "Real-time KPI overview with leads, jobs, and revenue tracking.", category: "Admin" },
  { src: "/screenshots/02_admin_leads.png", title: "Multi-Source Leads", description: "Capture leads from eLocal, Networx, Angi, Thumbtack, Inquirly, and Zapier.", category: "Admin" },
  { src: "/screenshots/07_admin_marketing.png", title: "Marketing ROI", description: "Track cost-per-lead and ROI by source. Know which channels deliver results.", category: "Admin" },
  { src: "/screenshots/06_admin_pricebook.png", title: "Pricebook", description: "Standardized service catalog with labor estimates and material costs.", category: "Admin" },
  { src: "/screenshots/14_dispatcher_map.png", title: "Live GPS Tracking", description: "Interactive map showing real-time technician locations.", category: "Dispatcher" },
  { src: "/screenshots/10_dispatcher_dashboard.png", title: "Dispatch Center", description: "Real-time job coordination and technician assignment.", category: "Dispatcher" },
  { src: "/screenshots/18_tech_quote_builder.png", title: "Quote Builder", description: "Create professional quotes on-site using your pricebook.", category: "Technician" },
  { src: "/screenshots/20_sales_dashboard.png", title: "Sales Dashboard", description: "NET profit-based commission tracking. Earnings based on actual profit.", category: "Salesperson" },
];

const categoryColors: Record<string, string> = {
  "Authentication": "#6B7280",
  "Admin": "#2563EB",
  "Dispatcher": "#16A34A",
  "Technician": "#EA580C",
  "Salesperson": "#9333EA"
};

export default function StackedCarousel() {
  const [current, setCurrent] = useState(0);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    if (clickX > width * 0.5) {
      setCurrent((prev) => (prev + 1) % screenshots.length);
    } else {
      setCurrent((prev) => (prev - 1 + screenshots.length) % screenshots.length);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div 
        className="relative h-[500px] cursor-pointer perspective-1000"
        onClick={handleClick}
      >
        {screenshots.map((screenshot, index) => {
          const offset = index - current;
          const isActive = offset === 0;
          const isPrev = offset < 0 || (current === 0 && index === screenshots.length - 1);
          
          let transform = "";
          let zIndex = 0;
          let opacity = 0;
          
          if (isActive) {
            transform = "translateX(0) scale(1)";
            zIndex = 10;
            opacity = 1;
          } else if (Math.abs(offset) === 1 || (current === 0 && index === screenshots.length - 1) || (current === screenshots.length - 1 && index === 0)) {
            const direction = offset > 0 || (current === screenshots.length - 1 && index === 0) ? 1 : -1;
            transform = `translateX(${direction * 60}px) scale(0.9)`;
            zIndex = 5;
            opacity = 0.5;
          } else if (Math.abs(offset) === 2) {
            const direction = offset > 0 ? 1 : -1;
            transform = `translateX(${direction * 100}px) scale(0.8)`;
            zIndex = 2;
            opacity = 0.2;
          }
          
          return (
            <div
              key={index}
              className="absolute inset-0 transition-all duration-500 ease-out"
              style={{
                transform,
                zIndex,
                opacity,
              }}
            >
              <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                <img
                  src={screenshot.src}
                  alt={screenshot.title}
                  className="w-full h-full object-contain bg-black"
                />
              </div>
            </div>
          );
        })}
        
        <div className="absolute bottom-4 left-4 z-20 text-white/60 text-sm">
          Click left or right to navigate
        </div>
        <div className="absolute bottom-4 right-4 z-20 text-white/60 text-sm">
          {current + 1} / {screenshots.length}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <span 
          className="inline-block px-4 py-1.5 rounded-full text-sm text-white mb-4"
          style={{ backgroundColor: categoryColors[screenshots[current].category] }}
        >
          {screenshots[current].category}
        </span>
        <h3 className="text-3xl font-bold text-white mb-3">
          {screenshots[current].title}
        </h3>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          {screenshots[current].description}
        </p>
      </div>
      
      <div className="flex justify-center gap-2 mt-6">
        {screenshots.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); setCurrent(idx); }}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === current 
                ? "bg-red-600 scale-125" 
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
