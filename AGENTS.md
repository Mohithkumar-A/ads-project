<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep the four content routes thin and compose shared investigator views; this keeps navigation and page metadata independent.
- Keep mock data and REST-shaped operations in the investigator mock adapter, with no actual ADS or LLM implementation in the browser; the adapter can later be replaced by C++ HTTP calls.
- Use SVG node/edge visualizations for data structures; semantic CSS tokens keep search and priority paths consistent.
- Keep log retrieval and deterministic priority rules covered by colocated tests; this protects future backend-adapter replacements.
