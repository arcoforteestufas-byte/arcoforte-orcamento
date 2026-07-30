import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING_URL',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING_KEY'
  });
}
