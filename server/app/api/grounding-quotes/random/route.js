import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../../lib/auth'

export async function GET(request) {
  const { supabase, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { data, error: dbError } = await supabase
      .from('grounding_quotes')
      .select('id, quote, author')

    if (dbError) {
      console.error('Error fetching grounding quotes:', dbError)
      return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ quote: null })
    }

    const quote = data[Math.floor(Math.random() * data.length)]
    return NextResponse.json({ quote })
  } catch (err) {
    console.error('Error in grounding-quotes endpoint:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
