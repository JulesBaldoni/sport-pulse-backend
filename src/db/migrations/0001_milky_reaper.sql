CREATE TABLE "news_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sport_id" uuid NOT NULL,
	"entities" text[] NOT NULL,
	"keywords" text[] NOT NULL,
	"headline" text NOT NULL,
	"sources_count" integer NOT NULL,
	"score" integer NOT NULL,
	"raw_excerpts" jsonb NOT NULL,
	"article_id" uuid,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_topics" ADD CONSTRAINT "news_topics_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_topics" ADD CONSTRAINT "news_topics_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_topics_sport_id_idx" ON "news_topics" USING btree ("sport_id");--> statement-breakpoint
CREATE INDEX "news_topics_score_idx" ON "news_topics" USING btree ("score");--> statement-breakpoint
CREATE INDEX "news_topics_first_seen_at_idx" ON "news_topics" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX "news_topics_article_id_idx" ON "news_topics" USING btree ("article_id");