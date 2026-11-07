CREATE TABLE "courses" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"year" integer NOT NULL,
	"term" text NOT NULL,
	CONSTRAINT "courses_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"due_at" timestamp with time zone,
	"due_text" text NOT NULL,
	"weight_pct" real,
	"node_ids" text[] NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "deadlines_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"user_id" text NOT NULL,
	"hash" text NOT NULL,
	"filename" text NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_user_id_hash_pk" PRIMARY KEY("user_id","hash")
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"status" text NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "edges_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"course_ids" text[] NOT NULL,
	"domains" text[] NOT NULL,
	"years" integer[] NOT NULL,
	"topic_id" text,
	"summary" text NOT NULL,
	"mastery" real,
	CONSTRAINT "nodes_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"course_id" text,
	CONSTRAINT "topics_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edges_user_idx" ON "edges" USING btree ("user_id");