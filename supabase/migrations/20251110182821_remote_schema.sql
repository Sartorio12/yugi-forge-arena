


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."application_status" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);


ALTER TYPE "public"."application_status" OWNER TO "postgres";


CREATE TYPE "public"."clan_role" AS ENUM (
    'LEADER',
    'MEMBER'
);


ALTER TYPE "public"."clan_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_to_clan"("p_clan_id" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    -- Check if user is already in any clan
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = current_user_id) THEN
        RAISE EXCEPTION 'You are already a member of a clan.';
    END IF;

    -- Check if user already has a pending application for this clan
    IF EXISTS (
        SELECT 1
        FROM public.clan_applications
        WHERE clan_id = p_clan_id AND user_id = current_user_id AND status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'You already have a pending application for this clan.';
    END IF;

    -- Insert the new application
    INSERT INTO public.clan_applications (clan_id, user_id, status)
    VALUES (p_clan_id, current_user_id, 'PENDING');
END;
$$;


ALTER FUNCTION "public"."apply_to_clan"("p_clan_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_clan_id INT;
    clan_owner_id UUID;
BEGIN
    -- Get the current user's ID
    clan_owner_id := auth.uid();

    -- Check if user is already in a clan
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = clan_owner_id) THEN
        RAISE EXCEPTION 'User is already in a clan.';
    END IF;

    -- Insert the new clan
    INSERT INTO public.clans (name, tag, description, icon_url, owner_id)
    VALUES (name, tag, description, icon_url, clan_owner_id)
    RETURNING id INTO new_clan_id;

    -- Insert the owner as the leader of the new clan
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (new_clan_id, clan_owner_id, 'LEADER');

    RETURN new_clan_id;
END;
$$;


ALTER FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text", "banner_url" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_clan_id INT;
    clan_owner_id UUID;
BEGIN
    -- Get the current user's ID
    clan_owner_id := auth.uid();

    -- Check if user is already in a clan
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = clan_owner_id) THEN
        RAISE EXCEPTION 'User is already in a clan.';
    END IF;

    -- Insert the new clan
    INSERT INTO public.clans (name, tag, description, icon_url, banner_url, owner_id)
    VALUES (name, tag, description, icon_url, banner_url, clan_owner_id)
    RETURNING id INTO new_clan_id;

    -- Insert the owner as the leader of the new clan
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (new_clan_id, clan_owner_id, 'LEADER');

    RETURN new_clan_id;
END;
$$;


ALTER FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text", "banner_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_clan_members"("p_clan_id" bigint) RETURNS TABLE("id" "uuid", "username" "text", "avatar_url" "text", "role" "public"."clan_role", "clan_tag" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.username,
        p.avatar_url,
        cm.role,
        c.tag AS clan_tag
    FROM
        clan_members cm
    JOIN
        profiles p ON cm.user_id = p.id
    JOIN
        clans c ON cm.clan_id = c.id
    WHERE
        cm.clan_id = p_clan_id;
END;
$$;


ALTER FUNCTION "public"."get_clan_members"("p_clan_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_rankings"() RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "total_wins" bigint, "total_points" bigint, "clan_tag" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        prv.user_id,
        prv.username,
        prv.avatar_url,
        prv.total_wins,
        prv.total_points,
        c.tag AS clan_tag
    FROM
        player_rankings_view prv
    LEFT JOIN
        clan_members cm ON prv.user_id = cm.user_id
    LEFT JOIN
        clans c ON cm.clan_id = c.id
    WHERE
        prv.total_points > 0
    ORDER BY
        prv.total_points DESC;
END;
$$;


ALTER FUNCTION "public"."get_player_rankings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_with_clan"("p_user_id" "text") RETURNS TABLE("id" "uuid", "username" "text", "avatar_url" "text", "banner_url" "text", "bio" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "role" "text", "clan" json)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.banner_url,
    p.bio,
    p.created_at,
    p.updated_at,
    p.role,
    json_build_object('id', c.id, 'tag', c.tag)
  FROM
    public.profiles AS p
  LEFT JOIN
    public.clan_members AS cm ON p.id = cm.user_id
  LEFT JOIN
    public.clans AS c ON cm.clan_id = c.id
  WHERE
    p.id = p_user_id::UUID;
END;
$$;


ALTER FUNCTION "public"."get_profile_with_clan"("p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_with_clan"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "username" "text", "avatar_url" "text", "banner_url" "text", "bio" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "role" "text", "clan" json)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.banner_url,
    p.bio,
    p.created_at,
    p.updated_at,
    p.role,
    json_build_object('id', c.id, 'tag', c.tag)
  FROM
    public.profiles AS p
  LEFT JOIN
    public.clan_members AS cm ON p.id = cm.user_id
  LEFT JOIN
    public.clans AS c ON cm.clan_id = c.id
  WHERE
    p.id = p_user_id::UUID;
END;
$$;


ALTER FUNCTION "public"."get_profile_with_clan"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_ranked_players"() RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "total_points" bigint, "clan_tag" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        prv.user_id,
        prv.username,
        prv.avatar_url,
        prv.total_points,
        c.tag AS clan_tag
    FROM
        player_rankings_view prv
    LEFT JOIN
        clan_members cm ON prv.user_id = cm.user_id
    LEFT JOIN
        clans c ON cm.clan_id = c.id
    WHERE
        prv.total_points > 0
    ORDER BY
        prv.total_points DESC
    LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_top_ranked_players"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
SELECT role INTO user_role
FROM public.profiles
WHERE id = auth.uid();
RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_clan_application"("p_application_id" integer, "p_new_status" "public"."application_status") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_clan_id INT;
    v_user_id UUID;
    v_current_status public.application_status;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    -- Get application details
    SELECT clan_id, user_id, status
    INTO v_clan_id, v_user_id, v_current_status
    FROM public.clan_applications
    WHERE id = p_application_id;

    -- Check if the current user is the clan owner
    IF NOT EXISTS (
        SELECT 1
        FROM public.clans
        WHERE id = v_clan_id AND owner_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'Only the clan leader can manage applications.';
    END IF;

    -- Check if the application is still pending
    IF v_current_status <> 'PENDING' THEN
        RAISE EXCEPTION 'This application has already been processed.';
    END IF;

    -- Update the application status
    UPDATE public.clan_applications
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_application_id;

    -- If accepted, add the user to the clan members
    IF p_new_status = 'ACCEPTED' THEN
        -- Check if user is already in a clan (double check)
        IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = v_user_id) THEN
            RAISE EXCEPTION 'This user is already a member of a clan.';
        END IF;

        INSERT INTO public.clan_members (clan_id, user_id, role)
        VALUES (v_clan_id, v_user_id, 'MEMBER');
    END IF;
END;
$$;


ALTER FUNCTION "public"."manage_clan_application"("p_application_id" integer, "p_new_status" "public"."application_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_global"("search_term" "text") RETURNS TABLE("id" "text", "name" "text", "avatar_url" "text", "type" "text", "tag" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  (
    -- Search Users
    SELECT
      p.id::text,
      p.username AS name,
      p.avatar_url,
      'user' AS type,
      NULL AS tag
    FROM
      public.profiles AS p
    WHERE
      p.username ILIKE '%' || search_term || '%'
      AND p.id <> auth.uid()
    LIMIT 5
  )
  UNION ALL
  (
    -- Search Clans
    SELECT
      c.id::text,
      c.name,
      c.icon_url AS avatar_url,
      'clan' AS type,
      c.tag
    FROM
      public.clans AS c
    WHERE
      c.name ILIKE '%' || search_term || '%' OR c.tag ILIKE '%' || search_term || '%'
    LIMIT 5
  );
END;
$$;


ALTER FUNCTION "public"."search_global"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cards" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "pt_name" "text",
    "type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "race" "text" NOT NULL,
    "attribute" "text",
    "atk" integer,
    "def" integer,
    "level" integer,
    "image_url" "text" NOT NULL,
    "image_url_small" "text" NOT NULL,
    "ban_tcg" "text",
    "ban_ocg" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ban_master_duel" "text"
);


ALTER TABLE "public"."cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clan_applications" (
    "id" integer NOT NULL,
    "clan_id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."application_status" DEFAULT 'PENDING'::"public"."application_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clan_applications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clan_applications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clan_applications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clan_applications_id_seq" OWNED BY "public"."clan_applications"."id";



CREATE TABLE IF NOT EXISTS "public"."clan_members" (
    "id" integer NOT NULL,
    "clan_id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."clan_role" DEFAULT 'MEMBER'::"public"."clan_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clan_members" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clan_members_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clan_members_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clan_members_id_seq" OWNED BY "public"."clan_members"."id";



CREATE TABLE IF NOT EXISTS "public"."clans" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "tag" "text" NOT NULL,
    "icon_url" "text",
    "description" "text",
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "banner_url" "text"
);


ALTER TABLE "public"."clans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clans_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clans_id_seq" OWNED BY "public"."clans"."id";



CREATE TABLE IF NOT EXISTS "public"."deck_cards" (
    "id" bigint NOT NULL,
    "deck_id" bigint NOT NULL,
    "card_api_id" "text" NOT NULL,
    "deck_section" "text" NOT NULL
);


ALTER TABLE "public"."deck_cards" OWNER TO "postgres";


ALTER TABLE "public"."deck_cards" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."deck_cards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."deck_comments" (
    "id" bigint NOT NULL,
    "deck_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deck_comments_comment_text_check" CHECK (("char_length"("comment_text") > 0))
);


ALTER TABLE "public"."deck_comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."deck_comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."deck_comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."deck_comments_id_seq" OWNED BY "public"."deck_comments"."id";



CREATE TABLE IF NOT EXISTS "public"."deck_likes" (
    "id" bigint NOT NULL,
    "deck_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."deck_likes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."deck_likes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."deck_likes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."deck_likes_id_seq" OWNED BY "public"."deck_likes"."id";



CREATE TABLE IF NOT EXISTS "public"."decks" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deck_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."decks" OWNER TO "postgres";


ALTER TABLE "public"."decks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."decks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."news_comments" (
    "id" bigint NOT NULL,
    "post_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."news_comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."news_comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."news_comments_id_seq" OWNED BY "public"."news_comments"."id";



CREATE TABLE IF NOT EXISTS "public"."news_likes" (
    "id" bigint NOT NULL,
    "post_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."news_likes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."news_likes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."news_likes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."news_likes_id_seq" OWNED BY "public"."news_likes"."id";



CREATE TABLE IF NOT EXISTS "public"."news_post_decks" (
    "id" bigint NOT NULL,
    "post_id" bigint NOT NULL,
    "deck_id" bigint NOT NULL,
    "placement" "text" NOT NULL
);


ALTER TABLE "public"."news_post_decks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."news_post_decks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."news_post_decks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."news_post_decks_id_seq" OWNED BY "public"."news_post_decks"."id";



CREATE TABLE IF NOT EXISTS "public"."news_posts" (
    "id" bigint NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tournament_id" bigint,
    "banner_url" "text",
    CONSTRAINT "news_posts_title_check" CHECK (("char_length"("title") > 0))
);


ALTER TABLE "public"."news_posts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."news_posts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."news_posts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."news_posts_id_seq" OWNED BY "public"."news_posts"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "bio" "text",
    "updated_at" timestamp with time zone,
    "role" "text" DEFAULT 'user'::"text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_participants" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "tournament_id" bigint,
    "total_wins_in_tournament" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deck_id" bigint
);


ALTER TABLE "public"."tournament_participants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_rankings_view" AS
 SELECT "p"."id" AS "user_id",
    "p"."username",
    "p"."avatar_url",
    COALESCE("sum"("tp"."total_wins_in_tournament"), (0)::bigint) AS "total_wins",
    (COALESCE("sum"("tp"."total_wins_in_tournament"), (0)::bigint) * 5) AS "total_points"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."tournament_participants" "tp" ON (("p"."id" = "tp"."user_id")))
  GROUP BY "p"."id", "p"."username", "p"."avatar_url"
  ORDER BY (COALESCE("sum"("tp"."total_wins_in_tournament"), (0)::bigint) * 5) DESC;


ALTER VIEW "public"."player_rankings_view" OWNER TO "postgres";


ALTER TABLE "public"."tournament_participants" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tournament_participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "banner_image_url" "text",
    "description" "text",
    "event_date" timestamp with time zone,
    "status" "text",
    "registration_link" "text",
    "is_decklist_required" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


ALTER TABLE "public"."tournaments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tournaments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."clan_applications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clan_applications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clan_members" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clan_members_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."deck_comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."deck_comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."deck_likes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."deck_likes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."news_comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."news_comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."news_likes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."news_likes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."news_post_decks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."news_post_decks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."news_posts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."news_posts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clan_applications"
    ADD CONSTRAINT "clan_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clan_members"
    ADD CONSTRAINT "clan_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clan_members"
    ADD CONSTRAINT "clan_user_membership_unique" UNIQUE ("clan_id", "user_id");



ALTER TABLE ONLY "public"."clans"
    ADD CONSTRAINT "clans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."clans"
    ADD CONSTRAINT "clans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clans"
    ADD CONSTRAINT "clans_tag_key" UNIQUE ("tag");



ALTER TABLE ONLY "public"."deck_cards"
    ADD CONSTRAINT "deck_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deck_comments"
    ADD CONSTRAINT "deck_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deck_likes"
    ADD CONSTRAINT "deck_likes_deck_id_user_id_key" UNIQUE ("deck_id", "user_id");



ALTER TABLE ONLY "public"."deck_likes"
    ADD CONSTRAINT "deck_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_comments"
    ADD CONSTRAINT "news_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_likes"
    ADD CONSTRAINT "news_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_likes"
    ADD CONSTRAINT "news_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."news_post_decks"
    ADD CONSTRAINT "news_post_decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_posts"
    ADD CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_user_id_tournament_id_key" UNIQUE ("user_id", "tournament_id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clan_members"
    ADD CONSTRAINT "user_clan_unique" UNIQUE ("user_id");



CREATE UNIQUE INDEX "user_clan_pending_application_unique" ON "public"."clan_applications" USING "btree" ("user_id", "clan_id") WHERE ("status" = 'PENDING'::"public"."application_status");



CREATE OR REPLACE TRIGGER "update_cards_updated_at" BEFORE UPDATE ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."clan_applications"
    ADD CONSTRAINT "clan_applications_clan_id_fkey" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clan_applications"
    ADD CONSTRAINT "clan_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clan_members"
    ADD CONSTRAINT "clan_members_clan_id_fkey" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clan_members"
    ADD CONSTRAINT "clan_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clans"
    ADD CONSTRAINT "clans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deck_cards"
    ADD CONSTRAINT "deck_cards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deck_comments"
    ADD CONSTRAINT "deck_comments_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deck_comments"
    ADD CONSTRAINT "deck_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deck_likes"
    ADD CONSTRAINT "deck_likes_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deck_likes"
    ADD CONSTRAINT "deck_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_comments"
    ADD CONSTRAINT "news_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."news_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_comments"
    ADD CONSTRAINT "news_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_likes"
    ADD CONSTRAINT "news_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."news_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_likes"
    ADD CONSTRAINT "news_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_post_decks"
    ADD CONSTRAINT "news_post_decks_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_post_decks"
    ADD CONSTRAINT "news_post_decks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."news_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_posts"
    ADD CONSTRAINT "news_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."news_posts"
    ADD CONSTRAINT "news_posts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_participants"
    ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow admins and organizers to update wins" ON "public"."tournament_participants" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"]))) WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])));



CREATE POLICY "Allow admins to delete any comment" ON "public"."deck_comments" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])));



CREATE POLICY "Allow admins to delete any comment" ON "public"."news_comments" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])));



CREATE POLICY "Allow admins to delete any deck" ON "public"."decks" FOR DELETE USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Allow admins to update any deck" ON "public"."decks" FOR UPDATE USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Allow authenticated users to comment" ON "public"."deck_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to like" ON "public"."deck_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to like" ON "public"."news_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to read all profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow full access for admins" ON "public"."news_post_decks" USING ((("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"]))));



CREATE POLICY "Allow full access for admins and organizers" ON "public"."news_posts" USING ((("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"]))));



CREATE POLICY "Allow full access for admins and organizers" ON "public"."tournaments" USING (true) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"]))));



CREATE POLICY "Allow individual access to own profile" ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow public read access" ON "public"."deck_comments" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."deck_likes" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."news_comments" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."news_likes" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to all profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to news" ON "public"."news_posts" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to participants" ON "public"."tournament_participants" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to tournaments" ON "public"."tournaments" FOR SELECT USING (true);



CREATE POLICY "Allow public read-only access to profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow read access based on privacy" ON "public"."decks" FOR SELECT USING ((("is_private" = false) OR ("auth"."uid"() = "user_id") OR (("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])))));



CREATE POLICY "Allow read access to deck cards based on deck privacy" ON "public"."deck_cards" FOR SELECT USING ((("auth"."uid"() = ( SELECT "decks"."user_id"
   FROM "public"."decks"
  WHERE ("decks"."id" = "deck_cards"."deck_id"))) OR (( SELECT "decks"."is_private"
   FROM "public"."decks"
  WHERE ("decks"."id" = "deck_cards"."deck_id")) = false) OR (("auth"."uid"() IS NOT NULL) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'organizer'::"text"])))));



CREATE POLICY "Allow user to delete their own comments" ON "public"."deck_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow user to delete their own comments" ON "public"."news_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow user to unlike" ON "public"."deck_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow user to unlike" ON "public"."news_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow user to update their own decklist" ON "public"."tournament_participants" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to create their own decks" ON "public"."decks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to delete cards from their own decks" ON "public"."deck_cards" FOR DELETE USING (("auth"."uid"() = ( SELECT "decks"."user_id"
   FROM "public"."decks"
  WHERE ("decks"."id" = "deck_cards"."deck_id"))));



CREATE POLICY "Allow users to delete their own decks" ON "public"."decks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert cards into their own decks" ON "public"."deck_cards" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "decks"."user_id"
   FROM "public"."decks"
  WHERE ("decks"."id" = "deck_cards"."deck_id"))));



CREATE POLICY "Allow users to insert their own participation" ON "public"."tournament_participants" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (( SELECT "tournaments"."status"
   FROM "public"."tournaments"
  WHERE ("tournaments"."id" = "tournament_participants"."tournament_id")) = 'Aberto'::"text")));



CREATE POLICY "Allow users to post comments as themselves" ON "public"."news_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update cards in their own decks" ON "public"."deck_cards" FOR UPDATE USING (("auth"."uid"() = ( SELECT "decks"."user_id"
   FROM "public"."decks"
  WHERE ("decks"."id" = "deck_cards"."deck_id"))));



CREATE POLICY "Allow users to update their own decks" ON "public"."decks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Clan leaders can update applications to their clan." ON "public"."clan_applications" FOR UPDATE USING ((( SELECT "clans"."owner_id"
   FROM "public"."clans"
  WHERE ("clans"."id" = "clan_applications"."clan_id")) = "auth"."uid"()));



CREATE POLICY "Clan leaders can view applications to their clan." ON "public"."clan_applications" FOR SELECT USING ((( SELECT "clans"."owner_id"
   FROM "public"."clans"
  WHERE ("clans"."id" = "clan_applications"."clan_id")) = "auth"."uid"()));



CREATE POLICY "Clan members are viewable by everyone." ON "public"."clan_members" FOR SELECT USING (true);



CREATE POLICY "Clan owners can delete their own clan." ON "public"."clans" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Clan owners can update their own clan." ON "public"."clans" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Clans are viewable by everyone." ON "public"."clans" FOR SELECT USING (true);



CREATE POLICY "Public cards are viewable by everyone." ON "public"."cards" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."news_post_decks" FOR SELECT USING (true);



CREATE POLICY "Tournaments are viewable by everyone." ON "public"."tournaments" FOR SELECT USING (true);



CREATE POLICY "Users can create clans." ON "public"."clans" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can create their own applications." ON "public"."clan_applications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own decks." ON "public"."decks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own decks." ON "public"."decks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage cards in their own decks." ON "public"."deck_cards" USING (("auth"."uid"() = ( SELECT "decks"."user_id"
   FROM "public"."decks"
  WHERE ("decks"."id" = "deck_cards"."deck_id"))));



CREATE POLICY "Users can update their own decks." ON "public"."decks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own applications." ON "public"."clan_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own decks." ON "public"."decks" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clan_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clan_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deck_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deck_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deck_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_post_decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."apply_to_clan"("p_clan_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_to_clan"("p_clan_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_to_clan"("p_clan_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text", "banner_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text", "banner_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_clan"("name" "text", "tag" "text", "description" "text", "icon_url" "text", "banner_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_clan_members"("p_clan_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_clan_members"("p_clan_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_clan_members"("p_clan_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_rankings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_rankings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_rankings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_with_clan"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_with_clan"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_with_clan"("p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_with_clan"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_with_clan"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_with_clan"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_ranked_players"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_ranked_players"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_ranked_players"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_clan_application"("p_application_id" integer, "p_new_status" "public"."application_status") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_clan_application"("p_application_id" integer, "p_new_status" "public"."application_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_clan_application"("p_application_id" integer, "p_new_status" "public"."application_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_global"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_global"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_global"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."cards" TO "anon";
GRANT ALL ON TABLE "public"."cards" TO "authenticated";
GRANT ALL ON TABLE "public"."cards" TO "service_role";



GRANT ALL ON TABLE "public"."clan_applications" TO "anon";
GRANT ALL ON TABLE "public"."clan_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."clan_applications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clan_applications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clan_applications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clan_applications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clan_members" TO "anon";
GRANT ALL ON TABLE "public"."clan_members" TO "authenticated";
GRANT ALL ON TABLE "public"."clan_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clan_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clan_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clan_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clans" TO "anon";
GRANT ALL ON TABLE "public"."clans" TO "authenticated";
GRANT ALL ON TABLE "public"."clans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clans_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deck_cards" TO "anon";
GRANT ALL ON TABLE "public"."deck_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."deck_cards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."deck_cards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deck_cards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deck_cards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deck_comments" TO "anon";
GRANT ALL ON TABLE "public"."deck_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."deck_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."deck_comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deck_comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deck_comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deck_likes" TO "anon";
GRANT ALL ON TABLE "public"."deck_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."deck_likes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."deck_likes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deck_likes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deck_likes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."decks" TO "anon";
GRANT ALL ON TABLE "public"."decks" TO "authenticated";
GRANT ALL ON TABLE "public"."decks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."decks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."decks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."decks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."news_comments" TO "anon";
GRANT ALL ON TABLE "public"."news_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."news_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."news_comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."news_comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."news_comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."news_likes" TO "anon";
GRANT ALL ON TABLE "public"."news_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."news_likes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."news_likes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."news_likes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."news_likes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."news_post_decks" TO "anon";
GRANT ALL ON TABLE "public"."news_post_decks" TO "authenticated";
GRANT ALL ON TABLE "public"."news_post_decks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."news_post_decks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."news_post_decks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."news_post_decks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."news_posts" TO "anon";
GRANT ALL ON TABLE "public"."news_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."news_posts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."news_posts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."news_posts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."news_posts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_participants" TO "anon";
GRANT ALL ON TABLE "public"."tournament_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_participants" TO "service_role";



GRANT ALL ON TABLE "public"."player_rankings_view" TO "anon";
GRANT ALL ON TABLE "public"."player_rankings_view" TO "authenticated";
GRANT ALL ON TABLE "public"."player_rankings_view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tournament_participants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tournament_participants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tournament_participants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tournaments_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































