import { createFileRoute } from '@tanstack/react-router';
import { HeapPage } from '@/features/investigator/structure-pages';
import { pageMeta } from '@/features/investigator/components';
export const Route = createFileRoute('/heap')({head:()=>pageMeta('Priority Heap','Rank critical system events with deterministic severity, frequency and recency scores and inspect Top-K results.'),component:HeapPage});
