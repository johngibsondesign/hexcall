import type { NextApiRequest, NextApiResponse } from 'next'
import { subscribeToMailingList } from '../../lib/supabase'

type Data = {
  success: boolean
  message?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { email, source } = req.body

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' })
  }

  try {
    const result = await subscribeToMailingList(email, source || 'landing-page')
    
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Successfully subscribed to mailing list' 
      })
    } else {
      return res.status(400).json({ 
        success: false, 
        error: result.error || 'Failed to subscribe'
      })
    }
  } catch (error: any) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}
