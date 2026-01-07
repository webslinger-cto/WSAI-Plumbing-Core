import { storage } from "../storage";
import type { Job, ContentPack, InsertContentItem } from "@shared/schema";

interface BlogGenerationResult {
  title: string;
  body: string;
  html: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  localModifiers: string[];
  searchIntent: string;
}

interface SocialPostResult {
  facebook: { title: string; body: string };
  instagram: { title: string; body: string };
  tiktok: { title: string; body: string };
}

const SERVICE_KEYWORDS: Record<string, { primary: string; secondary: string[]; localModifiers: string[] }> = {
  "sewer_repair": {
    primary: "sewer line repair Chicago",
    secondary: ["broken sewer pipe", "sewer backup repair", "main sewer line replacement", "trenchless sewer repair"],
    localModifiers: ["Chicago", "Chicagoland", "Cook County", "Illinois"]
  },
  "sewer_cleaning": {
    primary: "sewer cleaning Chicago",
    secondary: ["drain cleaning", "sewer jetting", "hydro jetting", "sewer line maintenance"],
    localModifiers: ["Chicago", "Chicagoland", "Cook County", "Illinois"]
  },
  "camera_inspection": {
    primary: "sewer camera inspection Chicago",
    secondary: ["pipe inspection", "video pipe inspection", "sewer scope", "drain camera"],
    localModifiers: ["Chicago", "Chicagoland", "Cook County", "Illinois"]
  },
  "drain_cleaning": {
    primary: "drain cleaning Chicago",
    secondary: ["clogged drain", "slow drain", "blocked drain", "drain unclogging"],
    localModifiers: ["Chicago", "Chicagoland", "Cook County", "Illinois"]
  },
  "emergency": {
    primary: "emergency plumber Chicago",
    secondary: ["24 hour plumber", "emergency sewer repair", "same day plumber", "weekend plumber"],
    localModifiers: ["Chicago", "Chicagoland", "Cook County", "Illinois"]
  },
  "default": {
    primary: "sewer services Chicago",
    secondary: ["plumbing repair", "sewer contractor", "drain services"],
    localModifiers: ["Chicago", "Chicagoland", "Cook County", "Illinois"]
  }
};

function getKeywordsForService(serviceType: string): { primary: string; secondary: string[]; localModifiers: string[] } {
  const normalizedType = serviceType.toLowerCase().replace(/\s+/g, "_");
  return SERVICE_KEYWORDS[normalizedType] || SERVICE_KEYWORDS["default"];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function generateBlogFromJob(job: Job): Promise<BlogGenerationResult> {
  const keywords = getKeywordsForService(job.serviceType);
  const neighborhood = job.address?.split(",")[0] || "Chicago";
  
  const title = `${job.serviceType.replace(/_/g, " ")} Success Story in ${neighborhood} - Chicago Sewer Experts`;
  const slug = generateSlug(`${job.serviceType}-${neighborhood}-${Date.now()}`);
  
  const body = `
# Professional ${job.serviceType.replace(/_/g, " ")} in ${neighborhood}

Chicago Sewer Experts recently completed a successful ${job.serviceType.replace(/_/g, " ")} project in ${neighborhood}. Our team of licensed professionals delivered exceptional results, demonstrating why we are the trusted choice for ${keywords.primary}.

## The Challenge

Our customer reached out with concerns about their sewer system. After a thorough assessment, our technicians identified the issue and developed a comprehensive solution plan.

## Our Solution

Using state-of-the-art equipment and proven techniques, our team:

- Conducted a detailed inspection of the entire sewer system
- Identified the root cause of the problem
- Implemented an effective, long-lasting repair solution
- Verified the repair with follow-up testing

## Why Choose Chicago Sewer Experts?

When you need ${keywords.secondary[0]} or any ${keywords.primary}, trust the experts who have served the ${neighborhood} area for years:

- **Licensed & Insured**: All work performed by certified professionals
- **24/7 Availability**: Emergency services when you need them most
- **Transparent Pricing**: No hidden fees or surprise charges
- **Guaranteed Satisfaction**: We stand behind our work

## Serving the Chicagoland Area

Whether you're in ${neighborhood}, downtown Chicago, or anywhere in Cook County, Chicago Sewer Experts is ready to help with all your sewer and drain needs.

**Contact us today for a free estimate!**

📞 Call: (630) 251-5628
🌐 Visit: ChicagoSewerExperts.com
  `.trim();

  const html = `
<article>
  <h1>Professional ${job.serviceType.replace(/_/g, " ")} in ${neighborhood}</h1>
  
  <p>Chicago Sewer Experts recently completed a successful ${job.serviceType.replace(/_/g, " ")} project in ${neighborhood}. Our team of licensed professionals delivered exceptional results, demonstrating why we are the trusted choice for <strong>${keywords.primary}</strong>.</p>

  <h2>The Challenge</h2>
  <p>Our customer reached out with concerns about their sewer system. After a thorough assessment, our technicians identified the issue and developed a comprehensive solution plan.</p>

  <h2>Our Solution</h2>
  <p>Using state-of-the-art equipment and proven techniques, our team:</p>
  <ul>
    <li>Conducted a detailed inspection of the entire sewer system</li>
    <li>Identified the root cause of the problem</li>
    <li>Implemented an effective, long-lasting repair solution</li>
    <li>Verified the repair with follow-up testing</li>
  </ul>

  <h2>Why Choose Chicago Sewer Experts?</h2>
  <p>When you need ${keywords.secondary[0]} or any ${keywords.primary}, trust the experts who have served the ${neighborhood} area for years:</p>
  <ul>
    <li><strong>Licensed & Insured</strong>: All work performed by certified professionals</li>
    <li><strong>24/7 Availability</strong>: Emergency services when you need them most</li>
    <li><strong>Transparent Pricing</strong>: No hidden fees or surprise charges</li>
    <li><strong>Guaranteed Satisfaction</strong>: We stand behind our work</li>
  </ul>

  <h2>Serving the Chicagoland Area</h2>
  <p>Whether you're in ${neighborhood}, downtown Chicago, or anywhere in Cook County, Chicago Sewer Experts is ready to help with all your sewer and drain needs.</p>

  <p><strong>Contact us today for a free estimate!</strong></p>
  <p>Call: (630) 251-5628<br/>Visit: ChicagoSewerExperts.com</p>
</article>
  `.trim();

  return {
    title,
    body,
    html,
    slug,
    metaTitle: `${job.serviceType.replace(/_/g, " ")} in ${neighborhood} | Chicago Sewer Experts`,
    metaDescription: `Professional ${job.serviceType.replace(/_/g, " ")} in ${neighborhood}, Chicago. Licensed experts, 24/7 service, free estimates. Call (630) 251-5628 today!`,
    primaryKeyword: keywords.primary,
    secondaryKeywords: keywords.secondary,
    localModifiers: keywords.localModifiers,
    searchIntent: "transactional"
  };
}

export async function generateSocialPostsFromJob(job: Job): Promise<SocialPostResult> {
  const neighborhood = job.address?.split(",")[0] || "Chicago";
  const serviceType = job.serviceType.replace(/_/g, " ");

  return {
    facebook: {
      title: `Another Successful ${serviceType} in ${neighborhood}!`,
      body: `Chicago Sewer Experts just completed another successful ${serviceType} project in ${neighborhood}! Our team of licensed professionals is committed to providing top-quality service to the Chicagoland area.\n\nNeed help with your sewer or drain? We offer:\n- Free Estimates\n- 24/7 Emergency Service\n- Licensed & Insured Professionals\n\nCall us today: (630) 251-5628\n\n#ChicagoSewer #${neighborhood.replace(/\s+/g, "")} #PlumbingExperts`
    },
    instagram: {
      title: `${serviceType} Complete`,
      body: `Just wrapped up a ${serviceType} project in ${neighborhood}!\n\nTrust Chicago Sewer Experts for all your sewer and drain needs.\n\nCall: (630) 251-5628\n\n#ChicagoSewerExperts #SewerRepair #${neighborhood.replace(/\s+/g, "")} #Plumbing #ChicagoPlumber #DrainCleaning #ProfessionalService`
    },
    tiktok: {
      title: `Watch Us Fix a ${serviceType} Issue!`,
      body: `Another day, another sewer saved! Our team just completed a ${serviceType} in ${neighborhood}. Chicago Sewer Experts - your trusted local pros!\n\n#ChicagoTikTok #PlumbingTok #SewerRepair #${neighborhood.replace(/\s+/g, "")} #Chicago`
    }
  };
}

export async function createContentPackFromJob(jobId: string): Promise<ContentPack | null> {
  const job = await storage.getJob(jobId);
  if (!job) return null;

  const neighborhood = job.address?.split(",")[0] || "Chicago";
  
  const pack = await storage.createContentPack({
    jobId: job.id,
    format: "seo_money",
    geoTarget: { city: "Chicago", neighborhood, state: "IL" },
    status: "auto_drafted"
  });

  const blogContent = await generateBlogFromJob(job);
  const socialContent = await generateSocialPostsFromJob(job);

  const contentItems: InsertContentItem[] = [
    {
      contentPackId: pack.id,
      type: "blog",
      title: blogContent.title,
      body: blogContent.body,
      html: blogContent.html,
      slug: blogContent.slug,
      metaTitle: blogContent.metaTitle,
      metaDescription: blogContent.metaDescription,
      primaryKeyword: blogContent.primaryKeyword,
      secondaryKeywords: blogContent.secondaryKeywords,
      localModifiers: blogContent.localModifiers,
      searchIntent: blogContent.searchIntent,
      status: "draft"
    },
    {
      contentPackId: pack.id,
      type: "facebook",
      title: socialContent.facebook.title,
      body: socialContent.facebook.body,
      status: "draft"
    },
    {
      contentPackId: pack.id,
      type: "instagram",
      title: socialContent.instagram.title,
      body: socialContent.instagram.body,
      status: "draft"
    },
    {
      contentPackId: pack.id,
      type: "tiktok",
      title: socialContent.tiktok.title,
      body: socialContent.tiktok.body,
      status: "draft"
    }
  ];

  for (const item of contentItems) {
    await storage.createContentItem(item);
  }

  return pack;
}

export async function getContentPackWithItems(packId: string): Promise<{ pack: ContentPack; items: any[] } | null> {
  const pack = await storage.getContentPack(packId);
  if (!pack) return null;

  const items = await storage.getContentItemsByPack(packId);
  return { pack, items };
}
