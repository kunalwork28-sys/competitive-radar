'use client'

import { useState } from 'react'

interface AnalysisStep {
  name: string
  status: 'waiting' | 'running' | 'done' | 'error'
}

interface Report {
  profile: any
  pricing: any
  hiring: any
  blog: any
  reviews: any
  techStack: any
  summary: string
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [steps, setSteps] = useState<AnalysisStep[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  const analyze = async () => {
    if (!url) return

    setIsAnalyzing(true)
    setError('')
    setReport(null)
    setSteps([
      { name: 'Company Profile', status: 'waiting' },
      { name: 'Pricing Analysis', status: 'waiting' },
      { name: 'Hiring Signals', status: 'waiting' },
      { name: 'Content Strategy', status: 'waiting' },
      { name: 'Customer Reviews', status: 'waiting' },
      { name: 'Tech Stack', status: 'waiting' },
      { name: 'Generating Report', status: 'waiting' },
    ])

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const data = JSON.parse(line.replace('data: ', ''))

          if (data.type === 'step_update') {
            setSteps(prev =>
              prev.map(step =>
                step.name === data.step
                  ? { ...step, status: data.status }
                  : step
              )
            )
          }

          if (data.type === 'report') {
            setReport(data.report)
          }

          if (data.type === 'error') {
            setError(data.message)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          🔍 Competitive Radar
        </h1>
        <p className="text-xl text-gray-400">
          AI-powered competitive analysis in minutes
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter competitor website (e.g., google.com)"
          className="flex-1 px-6 py-4 rounded-xl bg-gray-800 border border-gray-700 text-white text-lg focus:outline-none focus:border-orange-500"
          disabled={isAnalyzing}
        />
        <button
          onClick={analyze}
          disabled={isAnalyzing || !url}
          className="px-8 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 rounded-xl text-white font-bold text-lg transition-colors"
        >
          {isAnalyzing ? '⏳ Analyzing...' : '🚀 Analyze'}
        </button>
      </div>

      {/* Progress */}
      {steps.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Analysis Progress</h2>
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.name} className="flex items-center gap-3">
                <span className="text-xl">
                  {step.status === 'waiting' && '⬜'}
                  {step.status === 'running' && '⏳'}
                  {step.status === 'done' && '✅'}
                  {step.status === 'error' && '❌'}
                </span>
                <span className={
                  step.status === 'done' ? 'text-green-400' :
                  step.status === 'running' ? 'text-orange-400 animate-pulse' :
                  step.status === 'error' ? 'text-red-400' :
                  'text-gray-500'
                }>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-6 mb-8">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-3xl font-bold mb-6">
            📊 Competitive Intelligence Report
          </h2>

          {/* Company Profile */}
          {report.profile && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                🏢 Company Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Company</p>
                  <p className="text-lg font-bold">{report.profile.company_name}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Industry</p>
                  <p className="text-lg font-bold">{report.profile.industry}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">HQ</p>
                  <p className="text-lg font-bold">{report.profile.hq_location}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Products</p>
                  <p className="text-lg font-bold">{report.profile.products?.length || 0} products</p>
                </div>
              </div>
              <p className="mt-4 text-gray-300">{report.profile.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.profile.regions?.map((region: string) => (
                  <span key={region} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">
                    🌍 {region}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Pricing */}
          {report.pricing && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                💰 Pricing
              </h3>
              {report.pricing.free_trial?.available && (
                <p className="mb-4 text-green-400">
                  ✅ Free trial: {report.pricing.free_trial.duration}
                </p>
              )}
              <div className="grid gap-4">
                {report.pricing.plans?.map((plan: any) => (
                  <div key={plan.name} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold">{plan.name}</h4>
                      <span className="text-orange-400 font-bold">
                        {plan.annual_price_per_user}/user/year
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {plan.storage} · {plan.limits}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hiring */}
          {report.hiring && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                👥 Hiring Signals
              </h3>
              <div className="bg-gray-800 p-4 rounded-lg mb-4">
                <p className="text-3xl font-bold text-orange-400">
                  {report.hiring.total_openings}
                </p>
                <p className="text-gray-400">Open Positions</p>
              </div>
              {report.hiring.analysis?.strategic_signals?.map((signal: string, i: number) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span>🔮</span>
                  <p className="text-gray-300">{signal}</p>
                </div>
              ))}
            </section>
          )}

          {/* Blog */}
          {report.blog && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                📝 Content Strategy
              </h3>
              <p className="text-gray-300 mb-4 italic">
                "{report.blog.analysis?.narrative_strategy}"
              </p>
              <div className="grid gap-3">
                {report.blog.posts?.slice(0, 5).map((post: any, i: number) => (
                  <div key={i} className="bg-gray-800 p-4 rounded-lg">
                    <p className="font-bold">{post.title}</p>
                    <p className="text-gray-400 text-sm">{post.date} · {post.category}</p>
                    <p className="text-gray-300 text-sm mt-1">{post.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          {report.reviews && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                ⭐ Customer Sentiment
              </h3>
              <div className="flex gap-4 mb-4">
                <div className="bg-gray-800 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {report.reviews.overall_rating}
                  </p>
                  <p className="text-gray-400">Rating</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold">
                    {report.reviews.total_reviews?.toLocaleString()}
                  </p>
                  <p className="text-gray-400">Reviews</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-900/30 border border-green-800 p-4 rounded-lg">
                  <h4 className="font-bold text-green-400 mb-2">❤️ Strengths</h4>
                  {report.reviews.analysis?.top_strengths?.map((s: string, i: number) => (
                    <p key={i} className="text-sm text-gray-300 mb-1">✅ {s}</p>
                  ))}
                </div>
                <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg">
                  <h4 className="font-bold text-red-400 mb-2">😤 Weaknesses</h4>
                  {report.reviews.analysis?.top_weaknesses?.map((w: string, i: number) => (
                    <p key={i} className="text-sm text-gray-300 mb-1">⚠️ {w}</p>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Tech Stack */}
          {report.techStack && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                🔧 Tech Stack
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(report.techStack.tech_stack || {}).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="font-bold">
                      {Array.isArray(value) ? value.join(', ') : value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI Summary */}
          {report.summary && (
            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4 text-orange-400">
                🧠 AI Strategic Summary
              </h3>
              <div className="bg-gray-800 p-6 rounded-lg whitespace-pre-wrap text-gray-300">
                {report.summary}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
