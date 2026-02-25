import { NextRequest } from 'next/server'
import { runTinyFishAgent } from '@/lib/tinyfish'
import { generateReport } from '@/lib/gemini'

export const maxDuration = 300 // 5 minutes timeout

const AGENTS = [
  {
    name: 'Company Profile',
    key: 'profile',
    getUrl: (base: string) => base,
    goal: `Visit this page directly and extract company information.
Return ONLY valid JSON:
{
  "company_name": "",
  "description": "one sentence what they do",
  "industry": "",
  "hq_location": "",
  "regions": [],
  "products": [],
  "languages": [],
  "target_customers": [],
  "value_propositions": []
}`
  },
  {
    name: 'Pricing Analysis',
    key: 'pricing',
    getUrl: (base: string) => `${base}/pricing`,
    goal: `Visit this page directly and extract ALL pricing information.
Return ONLY valid JSON:
{
  "company": "",
  "product": "",
  "currency": "",
  "pricing_model": "",
  "free_trial": { "available": false, "duration": "" },
  "plans": [
    {
      "name": "",
      "monthly_price_per_user": "",
      "annual_price_per_user": "",
      "features": [],
      "storage": "",
      "limits": ""
    }
  ],
  "enterprise_option": false,
  "promotions": []
}`
  },
  {
    name: 'Hiring Signals',
    key: 'hiring',
    getUrl: (base: string) => `${base}/careers`,
    goal: `Visit this page directly and extract job listing information.
Return ONLY valid JSON:
{
  "company": "",
  "total_openings": 0,
  "jobs": [
    {
      "title": "",
      "department": "",
      "location": "",
      "seniority": "",
      "remote": false
    }
  ],
  "analysis": {
    "top_departments": [],
    "top_locations": [],
    "remote_available": false,
    "key_skills_in_demand": [],
    "strategic_signals": []
  }
}`
  },
  {
    name: 'Content Strategy',
    key: 'blog',
    getUrl: (base: string) => `${base}/blog`,
    goal: `Visit this page directly and extract the latest blog posts.
Return ONLY valid JSON:
{
  "company": "",
  "platform": "Blog",
  "posts": [
    {
      "title": "",
      "date": "",
      "category": "",
      "summary": "",
      "products_mentioned": [],
      "themes": []
    }
  ],
  "analysis": {
    "dominant_topics": [],
    "product_launches": [],
    "narrative_strategy": "",
    "target_audience": "",
    "competitive_mentions": []
  }
}`
  },
  {
    name: 'Customer Reviews',
    key: 'reviews',
    getUrl: (base: string) => {
      const domain = base.replace('https://', '').replace('http://', '').replace('www.', '')
      return `https://www.g2.com/search?query=${encodeURIComponent(domain)}`
    },
    goal: `Visit the G2 reviews page directly and perform a deep extraction of all visible review data. Do not navigate away from the page.
Return ONLY valid JSON:
{
  "company": "",
  "product": "",
  "review_platform": "G2",
  "overall_rating": 0,
  "total_reviews": 0,
  "reviews": [
    {
      "rating": 0,
      "title": "",
      "pros": [],
      "cons": [],
      "reviewer_industry": "",
      "reviewer_company_size": "",
      "date": ""
    }
  ],
  "analysis": {
    "top_strengths": [],
    "top_weaknesses": [],
    "feature_requests": [],
    "sentiment_trend": "",
    "reviewer_profile": ""
  }
}`
  },
  {
    name: 'Tech Stack',
    key: 'techStack',
    getUrl: (base: string) => base,
    goal: `Visit this page directly and perform a deep analysis of all technologies being used on this website.
Return ONLY valid JSON:
{
  "company": "",
  "url": "",
  "tech_stack": {
    "frontend_framework": "",
    "analytics": [],
    "advertising": [],
    "customer_support": [],
    "cdn": "",
    "fonts": [],
    "marketing_tools": [],
    "other_technologies": []
  }
}`
  }
]

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  // Ensure URL has protocol
  let baseUrl = url.trim()
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/$/, '')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const results: Record<string, any> = {}

      // Run all 6 agents concurrently
      const agentPromises = AGENTS.map(async (agent) => {
        send({ type: 'step_update', step: agent.name, status: 'running' })

        try {
          const agentUrl = agent.getUrl(baseUrl)
          const result = await runTinyFishAgent(agentUrl, agent.goal)
          results[agent.key] = result
          send({ type: 'step_update', step: agent.name, status: 'done' })
        } catch (error: any) {
          console.error(`Agent ${agent.name} failed:`, error)
          results[agent.key] = null
          send({ type: 'step_update', step: agent.name, status: 'error' })
        }
      })

      await Promise.all(agentPromises)

      // Generate AI summary
      send({ type: 'step_update', step: 'Generating Report', status: 'running' })

      try {
        const summary = await generateReport({
          profile: results.profile,
          pricing: results.pricing,
          hiring: results.hiring,
          blog: results.blog,
          reviews: results.reviews,
          techStack: results.techStack,
        })

        send({
          type: 'report',
          report: {
            profile: results.profile,
            pricing: results.pricing,
            hiring: results.hiring,
            blog: results.blog,
            reviews: results.reviews,
            techStack: results.techStack,
            summary,
          },
        })

        send({ type: 'step_update', step: 'Generating Report', status: 'done' })
      } catch (error: any) {
        console.error('Report generation failed:', error)
        send({ type: 'error', message: 'Report generation failed' })
        send({ type: 'step_update', step: 'Generating Report', status: 'error' })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}