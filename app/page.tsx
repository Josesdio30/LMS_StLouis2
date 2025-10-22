'use client';

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function HomePage() {
  useAuthGuard();

  return null;
}