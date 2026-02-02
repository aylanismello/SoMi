import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      )
    }

    // Delete the chain (this will cascade delete related records)
    const { error } = await supabase
      .from('somi_chains')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting chain:', error)
      return NextResponse.json(
        { error: 'Failed to delete chain' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete chain endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
