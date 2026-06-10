-- ============================================================================
-- Migration 003 — Sender pool for outbound campaign rotation
--
-- Ryan Cahill sends from three SpaceMail mailboxes on benefitview.us
-- (benefitcheck, clarityreview, notification). The send-campaign n8n
-- workflow rotates campaign_leads across this pool. Additive only:
-- new column on client_profiles, and only fills in currently-NULL
-- sending_email / sending_domain / sender_pool for the ryan-cahill row.
-- ============================================================================

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS sender_pool TEXT[];

UPDATE client_profiles
SET
  sending_email  = COALESCE(sending_email, 'benefitcheck@benefitview.us'),
  sending_domain = COALESCE(sending_domain, 'benefitview.us'),
  sender_pool    = COALESCE(sender_pool, ARRAY[
    'benefitcheck@benefitview.us',
    'clarityreview@benefitview.us',
    'notification@benefitview.us'
  ])
WHERE client_id = 'ryan-cahill';
