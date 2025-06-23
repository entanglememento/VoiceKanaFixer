import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { originalConfig } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at converting banking configuration JSON files into optimized chat flow formats. You must respond with valid JSON only, no explanations.'
          },
          {
            role: 'user',
            content: JSON.stringify(originalConfig, null, 2)
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    const content = result.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No content received from OpenAI' },
        { status: 500 }
      )
    }

    try {
      const optimizedFlow = JSON.parse(content)
      return NextResponse.json({
        success: true,
        data: optimizedFlow,
        tokensUsed: result.usage?.total_tokens || 0
      })
    } catch (parseError) {
      return NextResponse.json(
        { error: `Failed to parse OpenAI response: ${parseError}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to convert configuration' },
      { status: 500 }
    )
  }
} 