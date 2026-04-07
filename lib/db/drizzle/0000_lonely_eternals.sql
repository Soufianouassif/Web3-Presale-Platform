CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"last_login" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admin_users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"page" text DEFAULT '/' NOT NULL,
	"visitor_id" text,
	"ip" text,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "presale_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true,
	"claim_enabled" boolean DEFAULT false,
	"staking_enabled" boolean DEFAULT false,
	"current_stage" integer DEFAULT 1,
	"total_raised_usd" numeric(18, 6) DEFAULT '0',
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"wallet_type" text,
	"network" text NOT NULL,
	"amount_usd" numeric(18, 6) DEFAULT '0' NOT NULL,
	"amount_tokens" numeric(18, 6) DEFAULT '0' NOT NULL,
	"tx_hash" text,
	"stage" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"code" text NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"total_reward_tokens" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_reward_usd" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "referral_codes_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_wallet" text NOT NULL,
	"referred_wallet" text NOT NULL,
	"purchase_id" integer,
	"reward_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"reward_tokens" numeric(18, 6) DEFAULT '0' NOT NULL,
	"reward_usd" numeric(18, 6) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"wallet_type" text NOT NULL,
	"network" text DEFAULT 'unknown' NOT NULL,
	"ip" text,
	"connected_at" timestamp with time zone DEFAULT now()
);
