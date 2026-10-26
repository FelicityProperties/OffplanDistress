CREATE TABLE "page_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"view_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"visitor_hash" text NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"ref" text,
	"country" text,
	"city" text,
	"device" text,
	"browser" text,
	"locale" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "page_views_view_idx" ON "page_views" USING btree ("view_id");--> statement-breakpoint
CREATE INDEX "page_views_created_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_views_session_idx" ON "page_views" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "page_views_visitor_idx" ON "page_views" USING btree ("visitor_hash");--> statement-breakpoint
CREATE INDEX "page_views_path_idx" ON "page_views" USING btree ("path");