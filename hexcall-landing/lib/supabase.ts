import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface MailingListSubscriber {
  id?: string
  email: string
  subscribed_at?: string
  source?: string
}

export async function subscribeToMailingList(email: string, source: string = 'landing-page'): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('mailing_list')
      .select('email')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new emails
      throw checkError
    }

    if (existing) {
      return { success: false, error: 'Email already subscribed' }
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('mailing_list')
      .insert([
        {
          email,
          source,
          subscribed_at: new Date().toISOString()
        }
      ])

    if (insertError) {
      throw insertError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error subscribing to mailing list:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to subscribe to mailing list'
    }
  }
}
