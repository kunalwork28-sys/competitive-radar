import { NextRequest } from 'next/server'
import { runTinyFishAgent } from '@/lib/tinyfish'
import { generateReport } from '@/lib/gemini'

export const maxDuration = 300

const AGENTS = [
  {
    name: 'Company Profile',
    key: 'profile',
    getUrl: (base: string) => base,
    goal: `Visit this website and extract company information.

First, explore the site to find the About page, Homepage, or Company info.

Extract:
- Company name
- What they do (one sentence)
- Industry
- Headquarters location
- Regions they operate in
- Products or services offered
- Languages supported
- Target customers
- Key value propositions

Return ONLY valid JSON:
{
  "company_name": "",
  "description": "",
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
    getUrl: (base: string) => base,
    goal: `Visit this website and find their pricing page.

Look for links containing: pricing, plans, price, cost, buy, subscribe, or similar.
Check navigation menu and footer links.

Once you find pricing, extract ALL pricing information.

Return ONLY valid JSON:
{
  "company": "",
  "product": "",
  "currency": "",
  "pricing_model": "",
  "pricing_page_url": "",
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
}

If no pricing page found, return:
{
  "company": "",
  "error": "No public pricing page found",
  "pricing_model": "Contact sales or custom pricing"
}`
  },
  {
    name: 'Hiring Signals',
    key: 'hiring',
    getUrl: (base: string) => base,
    goal: `Visit this website and find their careers or jobs page.

Look for links containing: careers, jobs, hiring, work with us, join us, open positions, or similar.
Check navigation menu, footer links, or try common paths like /careers, /jobs.
Also check if they use external job boards like lever.co, greenhouse.io, or ashbyhq.com.

Once you find careers page, extract job listings.

Return ONLY valid JSON:
{
  "company": "",
  "careers_page_url": "",
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
}

If no careers page found, return:
{
  "company": "",
  "error": "No public careers page found",
  "total_openings": "Unknown"
}`
  },
  {
    name: 'Content Strategy',
    key: 'blog',
    getUrl: (base: string) => base,
    goal: `Visit this website and find their blog, news, updates, or content page.

Look for links containing: blog, news, updates, changelog, resources, articles, insights, now, or similar.
Check navigation menu, footer links, or try common paths.

Once you find content page, extract the latest posts.

Return ONLY valid JSON:
{
  "company": "",
  "platform": "Blog",
  "content_page_url": "",
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
}

If no blog found, return:
{
  "company": "",
  "error": "No public blog or news page found"
}`
  },
  {
    name: 'Customer Reviews',
    key: 'reviews',
    getUrl: (base: string) => {
      const domain = base.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
      return `https://www.g2.com/search?query=${encodeURIComponent(domain)}`
    },
    goal: `You are on G2 search results. Find the company product page and click on it.

Then perform a deep extraction of all visible review data. Do not navigate away unnecessarily.

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
}

If reviews not accessible, return:
{
  "company": "",
  "error": "Could not access reviews",
  "review_platform": "G2"
}`
  },
  {
    name: 'Tech Stack',
    key: 'techStack',
    getUrl: (base: string) => base,
    goal: `Visit this website and perform a deep analysis of all technologies being used.

Check page source, scripts, meta tags, cookies, and network requests for:
- JavaScript frameworks and libraries
- Analytics and tracking tools
- Advertising pixels
- Chat or support widgets
- Payment processors
- CDN indicators
- Font services
- Marketing tools

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

  let baseUrl = url.trim()
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  baseUrl = baseUrl.replace(/\/$/, '')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const results: Record<string, any> = {}

      // Run all 6 agents concurrently (20 concurrent limit)
const agentPromises = AGENTS.map(async (agent) => {
  send({ type: 'step_update', step: agent.name, status: 'running' })

  try {
    const agentUrl = agent.getUrl(baseUrl)
    const result = await runTinyFishAgent(agentUrl, agent.goal)
    results[agent.key] = result
    send({ type: 'step_update', step: agent.name, status: 'done' })
  } catch (error: any) {
    console.error(`Agent ${agent.name} failed:`, error.message)
    results[agent.key] = { error: error.message || 'Agent failed' }
    send({ type: 'step_update', step: agent.name, status: 'error' })
  }
})

await Promise.all(agentPromises)
      }

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
        send({ type: 'error', message: 'Report generation failed: ' + error.message })
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

