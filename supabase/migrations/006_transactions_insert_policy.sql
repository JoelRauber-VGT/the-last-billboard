-- Add missing INSERT policy for transactions table
-- This allows authenticated users to create transactions for themselves

create policy "transactions_insert_own" on public.transactions
  for insert
  with check (
    auth.uid() is not null and user_id = auth.uid()
  );
