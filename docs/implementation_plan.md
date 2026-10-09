# ADS Investigation Engine - V2 Implementation Plan (Final)

This document outlines the architectural refactor for the **Error Log Investigation Pipeline**. The primary goal is to maximize memory efficiency, enable complex multi-range time queries, and preserve LLM processing time by strictly relying on Data Structures for filtering and ranking.

## Phase 0: LLM Pre-Flight & Dynamic Tag Scoring
Before the C++ engine runs, the LLM acts as the master router and classifier.
1. The LLM's system prompt contains a predefined list of standard cloud infrastructure tags (Vercel, Supabase, Postgres, auth, timeout, etc.).
2. The LLM reads the user's intent, selects the most relevant tags, and dynamically assigns priority scores to them based on the context of the query.
3. It passes these tags and scores to the C++ engine (e.g., `--heap-tags "timeout:1000,auth:500"`).

## Phase 1: Ingestion Filter & Optimized Trie
We heavily restrict what enters the data structures to keep memory footprints microscopic.
1. **Dynamic Ingestion (No Cap)**: The engine reads the entire log file to ensure no data is missed, but the C++ engine immediately drops any logs that are not categorized as errors (dropping `[INFO]`, `[DEBUG]`, etc.).
2. **Optimized Trie (Multiple Keywords)**: The Trie only indexes stripped log messages of the confirmed errors. It supports **multiple keyword searches** simultaneously (e.g., searching for "database" AND "stripe" in one pass).

## Phase 2: B+ Tree - Seconds Precision & Multiple Ranges
The B+ Tree only receives confirmed error logs and handles complex time windows.
1. **Seconds Precision**: All timestamps ingested and stored use strict seconds precision (`YYYY-MM-DD HH:MM:SS`).
2. **LLM Output Schema**: The LLM outputs an array of `ranges`.
3. **C++ Execution**: Parse the `--bplus-ranges` argument, execute multiple $O(\log N)$ `bpt.searchRange()` queries, and merge results using `std::unordered_map` to prevent duplicates.

## Phase 3: Dynamic Max-Heap
The Heap ranks the filtered subset using the scores assigned dynamically by the LLM.
1. **Heap Execution (`main.cpp`)**: Calculates the `priorityScore` strictly using the LLM's weighted values. Ties are broken by chronological recency.
2. **Top K Output**: The Heap mathematically isolates the Top K most important errors and passes them down the pipeline.

## Phase 4: Full Visualizations with Path Highlighting
Instead of sending complex algorithmic traces, we will render the full Data Structures and highlight the relevant search paths.
1. **B+ Tree UI**: The SVG canvas will dynamically expand to fit *all* ingested timestamps. The specific nodes that fall within the user's searched time range will be distinctly highlighted.
2. **Trie UI**: The full prefix tree will be rendered, with the specific characters of the searched keywords highlighted in a bright active color.
3. **Heap UI**: The full Top K binary heap will be rendered, allowing the user to visually trace how the highest-scored errors bubbled to the top.

## Phase 5: LLM Error Summarization & Fix Synthesis
The final phase leverages the LLM to act as a Senior DevOps Engineer.
1. The Heap outputs the highly curated Top K logs **including their full, unstripped message strings** and metrics reports.
2. The LLM reads this complete context to prevent hallucinations and generates a structured JSON response:
   ```json
   {
     "summary": "Database connection pool exhausted during peak hours.",
     "root_cause": "The auth microservice opened too many idle connections to DB-01.",
     "possible_fix": "Increase the max_connections limit in PostgreSQL and implement a timeout for idle connections.",
     "key_findings": ["[ERROR] DB-01 Connection timeout"]
   }
   ```
