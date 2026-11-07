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

- Keep admin full-dataset export and company-code contact joining in `src/lib/admin-export.ts`; exports must not depend on filtered or paginated UI rows.
- Keep HR contact aliases synchronized in the database so existing notification functions and new admin edits use the same contact data.
- Reconcile legacy rows on account/profile deletion in database lifecycle triggers, not client-only cleanup, so every deletion path is covered.
