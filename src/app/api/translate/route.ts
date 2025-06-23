import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text, sourceLang, targetLang } = await request.json()

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
            content: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Maintain the same tone and style.`
          },
          {
            role: 'user',
            content: text
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const translatedText = data.choices[0]?.message?.content

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Failed to translate text' },
      { status: 500 }
    )
  }
} 