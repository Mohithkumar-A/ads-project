import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/features/investigator/dashboard';
import { pageMeta } from '@/features/investigator/components';
export const Route = createFileRoute('/')({head:()=>pageMeta('Investigation','Investigate system logs with B+ Tree retrieval, Trie keyword matching, deterministic Heap prioritization and evidence-grounded local LLM-assisted analysis.'),component:Dashboard});
