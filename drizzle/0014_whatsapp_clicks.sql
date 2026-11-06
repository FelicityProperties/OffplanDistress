CREATE TABLE "whatsapp_clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"visitor_hash" text NOT NULL,
	"path" text NOT NULL,
	"place" text NOT NULL,
	"deal_ref" text,
	"country" text,
	"city" text,
	"device" text,
	"browser" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "whatsapp_clicks_created_idx" ON "whatsapp_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_clicks_session_idx" ON "whatsapp_clicks" USING btree ("session_id");