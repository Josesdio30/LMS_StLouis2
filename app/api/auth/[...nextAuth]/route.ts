import { authOptions } from '@/auth';
import NextAuth from 'next-auth';

// For App Router in Next.js with NextAuth v4 we need to use this pattern
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
