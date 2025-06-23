import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const nodeId = formData.get('nodeId') as string
    const speaker = formData.get('speaker') as string
    const language = formData.get('language') as string || 'ja' // デフォルトは日本語

    if (!audioFile || !nodeId) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // ファイル名を生成 (nodeId_speaker.wav 形式)
    const filename = speaker ? `${nodeId}_${speaker}.wav` : `${nodeId}.wav`

    // public/audioディレクトリのパスを作成
    const audioDir = join(process.cwd(), 'public', 'audio', language)

    // ディレクトリが存在しない場合は作成
    try {
      await mkdir(audioDir, { recursive: true })
    } catch (error) {
      console.error('ディレクトリ作成エラー:', error)
    }

    // ファイルパスを作成
    const filePath = join(audioDir, filename)

    // ファイルを保存
    const bytes = await audioFile.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    console.log(`音声ファイルを保存しました: ${filePath}`)

    return NextResponse.json({ 
      success: true, 
      filename: filename,
      path: `/audio/${language}/${filename}`
    })
  } catch (error) {
    console.error('音声ファイル保存エラー:', error)
    return NextResponse.json(
      { error: '音声ファイルの保存に失敗しました' },
      { status: 500 }
    )
  }
} 