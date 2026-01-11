import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint helps verify environment variables in Vercel
  return NextResponse.json({
    hasPostgresHost: !!process.env.POSTGRES_HOST,
    hasPostgresDatabase: !!process.env.POSTGRES_DATABASE,
    hasPostgresUser: !!process.env.POSTGRES_USER,
    hasPostgresPassword: !!process.env.POSTGRES_PASSWORD,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
    // Don't expose actual values for security
    postgresHost: process.env.POSTGRES_HOST ? 'SET' : 'NOT SET',
    postgresDatabase: process.env.POSTGRES_DATABASE ? 'SET' : 'NOT SET',
    postgresUser: process.env.POSTGRES_USER ? 'SET' : 'NOT SET',
    postgresPort: process.env.POSTGRES_PORT || 'NOT SET',
  });
}






