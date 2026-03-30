import OpenAI from "openai";
import type { Job } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface PermitRecommendation {
  permitType: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  required: boolean;
  estimatedCost?: string;
  estimatedTimeline?: string;
}

export interface JurisdictionSuggestion {
  name: string;
  city: string;
  state: string;
  county: string;
  confidence: "high" | "medium" | "low";
}

export interface PermitAnalysisResult {
  summary: string;
  permits: PermitRecommendation[];
  jurisdiction: JurisdictionSuggestion;
  scopeOfWork: string;
  notes: string[];
}

export interface DraftApplicationResult {
  scopeOfWork: string;
  projectDescription: string;
  justification: string;
  estimatedDuration: string;
  specialConditions: string[];
}

export async function analyzeJobForPermits(job: Job): Promise<PermitAnalysisResult> {
  const prompt = `You are an expert in Chicago-area construction and plumbing permit requirements. Analyze the following job and determine which permits are needed.

Job Details:
- Customer: ${job.customerName}
- Address: ${job.address}${job.city ? `, ${job.city}` : ""}${job.zipCode ? ` ${job.zipCode}` : ""}
- Service Type: ${job.serviceType}
- Description: ${job.description || "Not provided"}
- Status: ${job.status}

Based on this information, provide:
1. A brief summary of permit requirements
2. A list of specific permits needed with confidence levels
3. The likely jurisdiction (city/county)
4. A scope of work description suitable for a permit application
5. Any important notes or warnings

For Chicago sewer and plumbing work, consider:
- Plumbing permits (required for most plumbing modifications)
- Sewer repair/replacement permits
- Excavation/dig permits (for any ground disturbance)
- Right-of-Way/Street Opening permits (if work involves public right-of-way, sidewalk, or street)
- MWRD (Metropolitan Water Reclamation District) permits if applicable
- Building permits if structural work is involved

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief overview of permit needs",
  "permits": [
    {
      "permitType": "sewer|plumbing|excavation|row|building|mwrd",
      "confidence": "high|medium|low",
      "reason": "Why this permit is needed",
      "required": true,
      "estimatedCost": "$X-$Y range",
      "estimatedTimeline": "X-Y business days"
    }
  ],
  "jurisdiction": {
    "name": "City of Chicago",
    "city": "Chicago",
    "state": "IL",
    "county": "Cook",
    "confidence": "high|medium|low"
  },
  "scopeOfWork": "Detailed scope suitable for permit application",
  "notes": ["Important note 1", "Important note 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content) as PermitAnalysisResult;

    if (!parsed.summary || !Array.isArray(parsed.permits) || !parsed.jurisdiction) {
      throw new Error("Invalid AI response structure");
    }

    return parsed;
  } catch (error: any) {
    console.error("[PermitAI] Analysis failed:", error);
    return {
      summary: "AI analysis unavailable. Please review manually.",
      permits: [],
      jurisdiction: { name: "City of Chicago", city: "Chicago", state: "IL", county: "Cook", confidence: "low" },
      scopeOfWork: job.description || "",
      notes: ["AI analysis failed: " + (error.message || "Unknown error")],
    };
  }
}

export async function draftPermitApplication(
  job: Job,
  permitType: string,
  jurisdictionName: string,
): Promise<DraftApplicationResult> {
  const prompt = `You are an expert permit application writer for Chicago-area sewer and plumbing contractors. Draft permit application content for the following:

Job Details:
- Customer: ${job.customerName}
- Address: ${job.address}${job.city ? `, ${job.city}` : ""}${job.zipCode ? ` ${job.zipCode}` : ""}
- Service Type: ${job.serviceType}
- Description: ${job.description || "Not provided"}

Permit Type: ${permitType}
Jurisdiction: ${jurisdictionName}
Contractor: Emergency Chicago Sewer Experts

Generate professional permit application content. Be specific and technical. Use standard industry terminology.

Respond ONLY with valid JSON in this exact format:
{
  "scopeOfWork": "Detailed technical scope of work for the permit application",
  "projectDescription": "Formal project description paragraph",
  "justification": "Why this work is necessary",
  "estimatedDuration": "Estimated project duration (e.g., '3-5 business days')",
  "specialConditions": ["Any special conditions, safety measures, or requirements"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    return JSON.parse(content) as DraftApplicationResult;
  } catch (error: any) {
    console.error("[PermitAI] Draft failed:", error);
    return {
      scopeOfWork: job.description || "Scope of work to be determined",
      projectDescription: `${job.serviceType} work at ${job.address}`,
      justification: "Work required per customer request",
      estimatedDuration: "To be determined",
      specialConditions: ["AI draft unavailable - please complete manually"],
    };
  }
}
