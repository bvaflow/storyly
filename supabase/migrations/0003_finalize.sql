-- strory.fun — finalization tracking + character link
-- A comic becomes "finalized" once the author marks it done. Until then it's a
-- draft and can be resumed in /create. Public comics also require finalization.
-- character_id is needed so a draft can be reopened with the right reference
-- image/style instead of asking the user to re-pick the character.

alter table public.comics
  add column if not exists finalized_at timestamptz,
  add column if not exists character_id uuid references public.characters(id) on delete set null;

create index if not exists comics_finalized_idx
  on public.comics(finalized_at)
  where finalized_at is not null;
