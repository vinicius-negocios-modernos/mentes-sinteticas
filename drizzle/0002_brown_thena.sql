CREATE TABLE "debate_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debate_id" uuid NOT NULL,
	"mind_id" uuid NOT NULL,
	"turn_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debate_participants_debate_mind_unique" UNIQUE("debate_id","mind_id"),
	CONSTRAINT "debate_participants_debate_order_unique" UNIQUE("debate_id","turn_order")
);
--> statement-breakpoint
CREATE TABLE "debates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"max_rounds" integer DEFAULT 5 NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"current_turn" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'setup' NOT NULL,
	"conversation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mind_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mind_id" uuid NOT NULL,
	"memory_type" text NOT NULL,
	"content" text NOT NULL,
	"source_conversation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"model" text NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "share_token" varchar(64);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "shared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "mind_slug" varchar(255);--> statement-breakpoint
ALTER TABLE "debate_participants" ADD CONSTRAINT "debate_participants_debate_id_debates_id_fk" FOREIGN KEY ("debate_id") REFERENCES "public"."debates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debate_participants" ADD CONSTRAINT "debate_participants_mind_id_minds_id_fk" FOREIGN KEY ("mind_id") REFERENCES "public"."minds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debates" ADD CONSTRAINT "debates_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mind_memories" ADD CONSTRAINT "mind_memories_mind_id_minds_id_fk" FOREIGN KEY ("mind_id") REFERENCES "public"."minds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mind_memories" ADD CONSTRAINT "mind_memories_source_conversation_id_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mind_memories_user_mind" ON "mind_memories" USING btree ("user_id","mind_id");--> statement-breakpoint
CREATE INDEX "idx_mind_memories_created_at" ON "mind_memories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rate_limits_user_action_window_idx" ON "rate_limits" USING btree ("user_id","action","window_start");--> statement-breakpoint
CREATE INDEX "idx_token_usage_user_date" ON "token_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_token_usage_conversation" ON "token_usage" USING btree ("conversation_id");