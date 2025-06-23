import { OptimizedChatFlow } from '@/types'

export async function loadFlowData(fileName: string = 'sample-flow.json'): Promise<OptimizedChatFlow | null> {
  try {
    const response = await fetch(`/api/flows/${fileName}`)
    if (!response.ok) {
      throw new Error(`Failed to load flow data: ${response.statusText}`)
    }
    const flowData: OptimizedChatFlow = await response.json()
    return flowData
  } catch (error) {
    console.error('Error loading flow data:', error)
    return null
  }
}

export function getFlowDataFromStatic(): OptimizedChatFlow {
  // This is a static fallback for development
  return {
    "version": "1.0",
    "storeName": "サンプル店舗",
    "languages": {
      "ja": {
        "languageSelection": true,
        "settings": {
          "autoStopSeconds": 3,
          "voiceSpeed": 1.0,
          "qrPassword": "1234",
          "qrExpiryMinutes": 30
        },
        "nodes": {
          "start": {
            "id": "start",
            "type": "message",
            "content": "いらっしゃいませ！当店へようこそ。",
            "next": "menu"
          },
          "menu": {
            "id": "menu",
            "type": "choice",
            "content": "どのようなご用件でしょうか？",
            "choices": [
              {
                "id": "reservation",
                "text": "予約について",
                "keywords": ["予約", "席", "ブッキング"],
                "next": "reservation_info"
              },
              {
                "id": "menu_info",
                "text": "メニューについて",
                "keywords": ["メニュー", "料理", "食事"],
                "next": "menu_info"
              },
              {
                "id": "hours",
                "text": "営業時間",
                "keywords": ["営業時間", "時間"],
                "next": "hours_info"
              }
            ]
          },
          "reservation_info": {
            "id": "reservation_info",
            "type": "message",
            "content": "予約承ります。お電話またはオンライン予約をご利用ください。\n\n電話番号: 03-1234-5678\nオンライン: www.example.com/reservation",
            "next": "final"
          },
          "menu_info": {
            "id": "menu_info",
            "type": "message",
            "content": "当店のメニューをご紹介いたします。\n\n・和食コース: 3,000円～\n・洋食コース: 2,500円～\n・お子様メニュー: 1,200円",
            "next": "final"
          },
          "hours_info": {
            "id": "hours_info",
            "type": "message",
            "content": "営業時間: 11:00-22:00\n定休日: 毎週火曜日",
            "next": "final"
          },
          "final": {
            "id": "final",
            "type": "choice",
            "content": "他にご質問はございますか？",
            "choices": [
              {
                "id": "restart",
                "text": "最初からやり直す",
                "next": "start"
              },
              {
                "id": "finish",
                "text": "終了する",
                "next": "thank_you"
              }
            ]
          },
          "thank_you": {
            "id": "thank_you",
            "type": "message",
            "content": "ありがとうございました。またのご来店をお待ちしております。"
          }
        }
      },
      "en": {
        "languageSelection": true,
        "settings": {
          "autoStopSeconds": 3,
          "voiceSpeed": 1.0,
          "qrPassword": "1234",
          "qrExpiryMinutes": 30
        },
        "nodes": {
          "start": {
            "id": "start",
            "type": "message",
            "content": "Welcome to our restaurant!",
            "next": "menu"
          },
          "menu": {
            "id": "menu",
            "type": "choice",
            "content": "How may I help you today?",
            "choices": [
              {
                "id": "reservation",
                "text": "About reservations",
                "keywords": ["reservation", "booking", "table"],
                "next": "reservation_info"
              },
              {
                "id": "menu_info",
                "text": "About our menu",
                "keywords": ["menu", "food", "dish"],
                "next": "menu_info"
              },
              {
                "id": "hours",
                "text": "Opening hours",
                "keywords": ["hours", "time", "open"],
                "next": "hours_info"
              }
            ]
          },
          "reservation_info": {
            "id": "reservation_info",
            "type": "message",
            "content": "We accept reservations by phone or online.\n\nPhone: 03-1234-5678\nOnline: www.example.com/reservation",
            "next": "final"
          },
          "menu_info": {
            "id": "menu_info",
            "type": "message",
            "content": "Here's our menu information:\n\n・Japanese Course: From ¥3,000\n・Western Course: From ¥2,500\n・Kids Menu: ¥1,200",
            "next": "final"
          },
          "hours_info": {
            "id": "hours_info",
            "type": "message",
            "content": "Hours: 11:00-22:00\nClosed: Every Tuesday",
            "next": "final"
          },
          "final": {
            "id": "final",
            "type": "choice",
            "content": "Do you have any other questions?",
            "choices": [
              {
                "id": "restart",
                "text": "Start over",
                "next": "start"
              },
              {
                "id": "finish",
                "text": "Finish",
                "next": "thank_you"
              }
            ]
          },
          "thank_you": {
            "id": "thank_you",
            "type": "message",
            "content": "Thank you for visiting. We look forward to seeing you again!"
          }
        }
      }
    }
  }
}