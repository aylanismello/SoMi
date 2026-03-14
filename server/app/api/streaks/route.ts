import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../lib/auth'
import type { StreakDay } from '../../../types'

const STREAK_THRESHOLD = 300 // seconds required for a day to count

function toLocalDateStr(timestamp: number | string, tz: string): string {
  // Returns 'YYYY-MM-DD' in the given timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000
  )
}

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  const { searchParams } = new URL(request.url)
  const tz = searchParams.get('tz') || 'UTC'

  try {
    // Fetch all chains with their entries (RLS scopes to this user)
    const { data: chains, error: dbError } = await supabase!
      .from('somi_chains')
      .select('id, created_at, duration_seconds, somi_chain_entries(seconds_elapsed)')

    if (dbError) {
      console.error('Error fetching chains for streaks:', dbError)
      return NextResponse.json({ error: 'Failed to fetch streak data' }, { status: 500 })
    }

    // Track the best (longest) single session per calendar day.
    // Only chains with an explicit duration_seconds count — old chains without it are ignored.
    const daySeconds: Record<string, number> = {}
    for (const chain of (chains || [])) {
      if (!chain.duration_seconds) continue  // skip 0 and null
      const localDate = toLocalDateStr(chain.created_at, tz)
      if (chain.duration_seconds > (daySeconds[localDate] || 0)) {
        daySeconds[localDate] = chain.duration_seconds
      }
    }

    const todayStr = toLocalDateStr(Date.now(), tz)

    const makeDay = (dateStr: string): StreakDay => {
      const secs = daySeconds[dateStr] || 0
      return {
        date: dateStr,
        percentage: Math.min(100, Math.round((secs / STREAK_THRESHOLD) * 100)),
        counts: secs >= STREAK_THRESHOLD,
      }
    }

    // current_streak: consecutive qualifying days.
    // If today hasn't reached the threshold yet, we count backward from yesterday
    // so a streak earned on previous days stays visible all day until midnight.
    let currentStreak: number = 0
    let cursor: string = todayStr
    if ((daySeconds[cursor] || 0) < STREAK_THRESHOLD) {
      cursor = addDays(cursor, -1)
    }
    while ((daySeconds[cursor] || 0) >= STREAK_THRESHOLD) {
      currentStreak++
      cursor = addDays(cursor, -1)
    }

    // all_time_streak: longest consecutive run across all history
    const sortedDates: string[] = Object.keys(daySeconds).sort()
    let allTimeStreak: number = 0
    let run: number = 0
    let prevStreakDate: string | null = null
    for (const d of sortedDates) {
      if ((daySeconds[d] || 0) >= STREAK_THRESHOLD) {
        if (prevStreakDate !== null && diffDays(prevStreakDate, d) === 1) {
          run++
        } else {
          run = 1
        }
        if (run > allTimeStreak) allTimeStreak = run
        prevStreakDate = d
      } else {
        prevStreakDate = null
      }
    }

    // week[]: Monday–Sunday of the current week
    const todayDate = new Date(todayStr + 'T00:00:00Z')
    const dayOfWeek = todayDate.getUTCDay() // 0=Sun,1=Mon,...,6=Sat
    const daysFromMonday: number = (dayOfWeek + 6) % 7 // Mon=0,Tue=1,...,Sun=6
    const weekStartStr: string = addDays(todayStr, -daysFromMonday)
    const DAY_LETTERS: string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    const week: StreakDay[] = Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDays(weekStartStr, i)
      return {
        ...makeDay(dateStr),
        day: DAY_LETTERS[i],
        is_today: dateStr === todayStr,
        is_future: dateStr > todayStr,
      }
    })

    // month[]: 1st of current month through today
    const monthStartStr: string = `${todayStr.slice(0, 7)}-01`
    const month: StreakDay[] = []
    let cur: string = monthStartStr
    while (cur <= todayStr) {
      month.push({
        ...makeDay(cur),
        is_today: cur === todayStr,
      })
      cur = addDays(cur, 1)
    }

    return NextResponse.json({
      current_streak: currentStreak,
      all_time_streak: allTimeStreak,
      week,
      month,
    })
  } catch (err) {
    console.error('Error in streaks endpoint:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
