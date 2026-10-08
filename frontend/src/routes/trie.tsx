import { createFileRoute } from "@tanstack/react-router";
import { TriePage } from "@/features/investigator/structure-pages";
import { pageMeta } from "@/features/investigator/components";
export const Route = createFileRoute("/trie")({
  head: () =>
    pageMeta(
      "Trie",
      "Explore fast keyword and prefix-based log search with highlighted Trie paths and matching evidence.",
    ),
  component: TriePage,
});
