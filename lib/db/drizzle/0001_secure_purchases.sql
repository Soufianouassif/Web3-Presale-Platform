ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "referral_code" text;
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'VERIFIED';
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "verification_source" text;
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "ip" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchases_tx_hash_unique" ON "purchases" ("tx_hash") WHERE "tx_hash" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referred_wallet_unique" ON "referrals" ("referred_wallet");
