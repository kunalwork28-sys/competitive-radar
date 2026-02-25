import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateReport(data: {
  profile: any
  pricing: any
  hiring: any
  blog: any
  reviews: any
  techStack: any
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `You are a world-class competitive intelligence analyst.

Given the following data about a competitor, create a strategic competitive intelligence summary.

COMPANY PROFILE:
${JSON.stringify(data.profile, null, 2)}

PRICING DATA:
${JSON.stringify(data.pricing, null, 2)}

HIRING DATA:
${JSON.stringify(data.hiring, null, 2)}

BLOG & CONTENT:
${JSON.stringify(data.blog, null, 2)}

CUSTOMER REVIEWS:
${JSON.stringify(data.reviews, null, 2)}

TECH STACK:
${JSON.stringify(data.techStack, null, 2)}

Write a strategic summary covering:

1. THREAT ASSESSMENT
Rate overall threat level: LOW / MEDIUM / HIGH / CRITICAL
Explain why.

2. KEY STRATEGIC MOVES
What is this company doing right now that matters?
Connect hiring + blog + pricing signals together.

3. VULNERABILITIES
Based on reviews and pricing, where are they weak?
How could a competitor exploit this?

4. PREDICTIONS
Based on all signals, what will they likely do next?

5. RECOMMENDED ACTIONS
Top 5 things a competitor should do in response.

Be specific. Use data from the inputs. No generic advice.
Keep it under 500 words. Every sentence should be actionable.`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}