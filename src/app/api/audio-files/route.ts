import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') || 'ja'
    
    console.log(`Audio files API called for language: ${language}`)

    // public/audioディレクトリのパスを作成
    const audioDir = join(process.cwd(), 'public', 'audio', language)
    console.log(`Looking for audio files in: ${audioDir}`)

    try {
      // ディレクトリ内のファイル一覧を取得
      const files = await readdir(audioDir)
      
      // .wavファイルのみをフィルタし、ファイル情報を取得
      const audioFiles = []
      
      for (const file of files) {
        if (file.endsWith('.wav')) {
          const filePath = join(audioDir, file)
          const stats = await stat(filePath)
          
          audioFiles.push({
            name: file,
            size: stats.size,
            modified: stats.mtime,
            url: `/audio/${language}/${file}`
          })
        }
      }

      // 修正日時順でソート（新しい順）
      audioFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())

      console.log(`Found ${audioFiles.length} audio files:`, audioFiles.map(f => f.name))

      return NextResponse.json({
        success: true,
        language,
        count: audioFiles.length,
        files: audioFiles
      })

    } catch (error) {
      console.error('音声ファイル一覧の取得に失敗:', error)
      
      // ディレクトリが存在しない場合は空の配列を返す
      return NextResponse.json({
        success: true,
        language,
        count: 0,
        files: [],
        error: 'Directory not found or empty'
      })
    }

  } catch (error) {
    console.error('API エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '音声ファイルの一覧取得に失敗しました' 
      },
      { status: 500 }
    )
  }
}