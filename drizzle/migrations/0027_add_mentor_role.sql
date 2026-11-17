-- Users are student ("user"), mentor, admin, or HR admin (a company-side HR
-- contact with elevated access). Each ALTER TYPE must run as its own
-- statement/batch, not combined with other SQL in the same transaction.
alter type public.app_role add value if not exists 'mentor';
