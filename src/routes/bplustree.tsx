import { createFileRoute } from '@tanstack/react-router';
import { BPlusPage } from '@/features/investigator/structure-pages';
import { pageMeta } from '@/features/investigator/components';
export const Route = createFileRoute('/bplustree')({head:()=>pageMeta('B+ Tree','Explore ordered timestamp indexing, range retrieval, search paths and log records in the B+ Tree.'),component:BPlusPage});
