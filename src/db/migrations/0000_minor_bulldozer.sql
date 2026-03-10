CREATE TYPE "public"."article_language" AS ENUM('fr', 'en');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('pending', 'generating', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."article_tone" AS ENUM('neutral', 'analytical', 'enthusiastic');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'live', 'finished', 'cancelled');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"sport_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"tone" "article_tone" DEFAULT 'neutral' NOT NULL,
	"language" "article_language" DEFAULT 'fr' NOT NULL,
	"status" "article_status" DEFAULT 'pending' NOT NULL,
	"sources" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"sport_id" uuid NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"venue" text,
	"competition" text,
	"status" "event_status" NOT NULL,
	"started_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "events_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"logo_url" text,
	"sport_id" uuid NOT NULL,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"preferred_sports" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"preferred_language" "article_language" DEFAULT 'fr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_sport_id_idx" ON "articles" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_language_idx" ON "articles" USING btree ("language");--> statement-breakpoint
CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "articles_search_vector_gin_idx" ON "articles" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "events_sport_id_idx" ON "events" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_started_at_idx" ON "events" USING btree ("started_at");