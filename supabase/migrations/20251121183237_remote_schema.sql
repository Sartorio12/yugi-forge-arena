drop trigger if exists "update_cards_updated_at" on "public"."cards";

drop trigger if exists "on_participant_leave" on "public"."tournament_participants";

drop policy "Allow clan leaders and strategists to view applications to thei" on "public"."clan_applications";

drop policy "Clan leaders can update applications to their clan." on "public"."clan_applications";

drop policy "Clan leaders can view applications to their clan." on "public"."clan_applications";

drop policy "Leaders and Strategists can delete members from their clan." on "public"."clan_members";

drop policy "Leaders and Strategists can update their clan." on "public"."clans";

drop policy "Allow read access to deck cards based on deck privacy" on "public"."deck_cards";

drop policy "Allow users to delete cards from their own decks" on "public"."deck_cards";

drop policy "Allow users to insert cards into their own decks" on "public"."deck_cards";

drop policy "Allow users to update cards in their own decks" on "public"."deck_cards";

drop policy "Users can manage cards in their own decks." on "public"."deck_cards";

drop policy "Allow admins to delete any comment" on "public"."deck_comments";

drop policy "Allow admins to delete any deck" on "public"."decks";

drop policy "Allow admins to update any deck" on "public"."decks";

drop policy "Allow read access based on privacy" on "public"."decks";

drop policy "Allow admins to delete any comment" on "public"."news_comments";

drop policy "Allow full access for admins" on "public"."news_post_decks";

drop policy "Allow full access for admins and organizers" on "public"."news_posts";

drop policy "Allow admins to view all snapshot cards" on "public"."tournament_deck_snapshot_cards";

drop policy "Allow authenticated users to view their own snapshot cards" on "public"."tournament_deck_snapshot_cards";

drop policy "Enable insert for snapshot owners" on "public"."tournament_deck_snapshot_cards";

drop policy "Allow admins to view all snapshots" on "public"."tournament_deck_snapshots";

drop policy "Allow users to delete their own decklists" on "public"."tournament_decklists";

drop policy "Allow users to insert their own decklists" on "public"."tournament_decklists";

drop policy "Allow admins and organizers to view tournament decks" on "public"."tournament_decks";

drop policy "Allow admins and organizers to delete participants" on "public"."tournament_participants";

drop policy "Allow admins and organizers to update wins" on "public"."tournament_participants";

drop policy "Allow users to insert their own participation" on "public"."tournament_participants";

drop policy "Allow full access for admins and organizers" on "public"."tournaments";

alter table "public"."clan_applications" drop constraint "clan_applications_clan_id_fkey";

alter table "public"."clan_applications" drop constraint "clan_applications_user_id_fkey";

alter table "public"."clan_members" drop constraint "clan_members_clan_id_fkey";

alter table "public"."clan_members" drop constraint "clan_members_user_id_fkey";

alter table "public"."clans" drop constraint "clans_owner_id_fkey";

alter table "public"."deck_cards" drop constraint "deck_cards_deck_id_fkey";

alter table "public"."deck_comment_likes" drop constraint "deck_comment_likes_comment_id_fkey";

alter table "public"."deck_comment_likes" drop constraint "deck_comment_likes_user_id_fkey";

alter table "public"."deck_comments" drop constraint "deck_comments_deck_id_fkey";

alter table "public"."deck_comments" drop constraint "deck_comments_parent_comment_id_fkey";

alter table "public"."deck_comments" drop constraint "deck_comments_user_id_fkey";

alter table "public"."deck_likes" drop constraint "deck_likes_deck_id_fkey";

alter table "public"."deck_likes" drop constraint "deck_likes_user_id_fkey";

alter table "public"."decks" drop constraint "decks_user_id_fkey";

alter table "public"."news_comment_likes" drop constraint "news_comment_likes_comment_id_fkey";

alter table "public"."news_comment_likes" drop constraint "news_comment_likes_user_id_fkey";

alter table "public"."news_comments" drop constraint "news_comments_parent_comment_id_fkey";

alter table "public"."news_comments" drop constraint "news_comments_post_id_fkey";

alter table "public"."news_comments" drop constraint "news_comments_user_id_fkey";

alter table "public"."news_likes" drop constraint "news_likes_post_id_fkey";

alter table "public"."news_likes" drop constraint "news_likes_user_id_fkey";

alter table "public"."news_post_decks" drop constraint "news_post_decks_deck_id_fkey";

alter table "public"."news_post_decks" drop constraint "news_post_decks_post_id_fkey";

alter table "public"."news_posts" drop constraint "news_posts_author_id_fkey";

alter table "public"."news_posts" drop constraint "news_posts_tournament_id_fkey";

alter table "public"."notifications" drop constraint "notifications_user_id_fkey";

alter table "public"."tournament_deck_snapshot_cards" drop constraint "tournament_deck_snapshot_cards_snapshot_id_fkey";

alter table "public"."tournament_deck_snapshots" drop constraint "tournament_deck_snapshots_tournament_id_fkey";

alter table "public"."tournament_deck_snapshots" drop constraint "tournament_deck_snapshots_user_id_fkey";

alter table "public"."tournament_decklists" drop constraint "tournament_decklists_deck_id_fkey";

alter table "public"."tournament_decklists" drop constraint "tournament_decklists_participant_id_fkey";

alter table "public"."tournament_decks" drop constraint "tournament_decks_deck_id_fkey";

alter table "public"."tournament_decks" drop constraint "tournament_decks_deck_snapshot_id_fkey";

alter table "public"."tournament_decks" drop constraint "tournament_decks_tournament_id_fkey";

alter table "public"."tournament_decks" drop constraint "tournament_decks_user_id_fkey";

alter table "public"."tournament_participants" drop constraint "tournament_participants_tournament_id_fkey";

alter table "public"."tournament_participants" drop constraint "tournament_participants_user_id_fkey";

alter table "public"."user_tournament_banners" drop constraint "user_tournament_banners_tournament_id_fkey";

alter table "public"."user_tournament_banners" drop constraint "user_tournament_banners_user_id_fkey";

drop function if exists "public"."create_notification"(p_recipient_id uuid, p_type notification_type, p_data jsonb, p_link text);

drop function if exists "public"."manage_clan_application"(p_application_id integer, p_new_status application_status);

drop function if exists "public"."transfer_clan_ownership"(p_clan_id integer, p_new_owner_id uuid, p_new_role clan_role);

drop function if exists "public"."get_clan_members"(p_clan_id bigint);

drop index if exists "public"."user_clan_pending_application_unique";

alter table "public"."clan_applications" alter column "id" set default nextval('public.clan_applications_id_seq'::regclass);

alter table "public"."clan_applications" alter column "status" set default 'PENDING'::public.application_status;

alter table "public"."clan_applications" alter column "status" set data type public.application_status using "status"::text::public.application_status;

alter table "public"."clan_members" alter column "id" set default nextval('public.clan_members_id_seq'::regclass);

alter table "public"."clan_members" alter column "role" set default 'MEMBER'::public.clan_role;

alter table "public"."clan_members" alter column "role" set data type public.clan_role using "role"::text::public.clan_role;

alter table "public"."clans" alter column "id" set default nextval('public.clans_id_seq'::regclass);

alter table "public"."deck_comments" alter column "id" set default nextval('public.deck_comments_id_seq'::regclass);

alter table "public"."deck_likes" alter column "id" set default nextval('public.deck_likes_id_seq'::regclass);

alter table "public"."news_comments" alter column "id" set default nextval('public.news_comments_id_seq'::regclass);

alter table "public"."news_likes" alter column "id" set default nextval('public.news_likes_id_seq'::regclass);

alter table "public"."news_post_decks" alter column "id" set default nextval('public.news_post_decks_id_seq'::regclass);

alter table "public"."news_posts" alter column "id" set default nextval('public.news_posts_id_seq'::regclass);

alter table "public"."notifications" alter column "type" set data type public.notification_type using "type"::text::public.notification_type;

alter table "public"."tournament_deck_snapshot_cards" alter column "id" set default nextval('public.tournament_deck_snapshot_cards_id_seq'::regclass);

alter table "public"."tournament_deck_snapshots" alter column "id" set default nextval('public.tournament_deck_snapshots_id_seq'::regclass);

alter table "public"."tournament_decks" alter column "id" set default nextval('public.tournament_decks_id_seq'::regclass);

CREATE UNIQUE INDEX user_clan_pending_application_unique ON public.clan_applications USING btree (user_id, clan_id) WHERE (status = 'PENDING'::public.application_status);

alter table "public"."clan_applications" add constraint "clan_applications_clan_id_fkey" FOREIGN KEY (clan_id) REFERENCES public.clans(id) ON DELETE CASCADE not valid;

alter table "public"."clan_applications" validate constraint "clan_applications_clan_id_fkey";

alter table "public"."clan_applications" add constraint "clan_applications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."clan_applications" validate constraint "clan_applications_user_id_fkey";

alter table "public"."clan_members" add constraint "clan_members_clan_id_fkey" FOREIGN KEY (clan_id) REFERENCES public.clans(id) ON DELETE CASCADE not valid;

alter table "public"."clan_members" validate constraint "clan_members_clan_id_fkey";

alter table "public"."clan_members" add constraint "clan_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."clan_members" validate constraint "clan_members_user_id_fkey";

alter table "public"."clans" add constraint "clans_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."clans" validate constraint "clans_owner_id_fkey";

alter table "public"."deck_cards" add constraint "deck_cards_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."deck_cards" validate constraint "deck_cards_deck_id_fkey";

alter table "public"."deck_comment_likes" add constraint "deck_comment_likes_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.deck_comments(id) ON DELETE CASCADE not valid;

alter table "public"."deck_comment_likes" validate constraint "deck_comment_likes_comment_id_fkey";

alter table "public"."deck_comment_likes" add constraint "deck_comment_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."deck_comment_likes" validate constraint "deck_comment_likes_user_id_fkey";

alter table "public"."deck_comments" add constraint "deck_comments_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."deck_comments" validate constraint "deck_comments_deck_id_fkey";

alter table "public"."deck_comments" add constraint "deck_comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.deck_comments(id) ON DELETE CASCADE not valid;

alter table "public"."deck_comments" validate constraint "deck_comments_parent_comment_id_fkey";

alter table "public"."deck_comments" add constraint "deck_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."deck_comments" validate constraint "deck_comments_user_id_fkey";

alter table "public"."deck_likes" add constraint "deck_likes_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."deck_likes" validate constraint "deck_likes_deck_id_fkey";

alter table "public"."deck_likes" add constraint "deck_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."deck_likes" validate constraint "deck_likes_user_id_fkey";

alter table "public"."decks" add constraint "decks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."decks" validate constraint "decks_user_id_fkey";

alter table "public"."news_comment_likes" add constraint "news_comment_likes_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.news_comments(id) ON DELETE CASCADE not valid;

alter table "public"."news_comment_likes" validate constraint "news_comment_likes_comment_id_fkey";

alter table "public"."news_comment_likes" add constraint "news_comment_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."news_comment_likes" validate constraint "news_comment_likes_user_id_fkey";

alter table "public"."news_comments" add constraint "news_comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.news_comments(id) ON DELETE CASCADE not valid;

alter table "public"."news_comments" validate constraint "news_comments_parent_comment_id_fkey";

alter table "public"."news_comments" add constraint "news_comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.news_posts(id) ON DELETE CASCADE not valid;

alter table "public"."news_comments" validate constraint "news_comments_post_id_fkey";

alter table "public"."news_comments" add constraint "news_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."news_comments" validate constraint "news_comments_user_id_fkey";

alter table "public"."news_likes" add constraint "news_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.news_posts(id) ON DELETE CASCADE not valid;

alter table "public"."news_likes" validate constraint "news_likes_post_id_fkey";

alter table "public"."news_likes" add constraint "news_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."news_likes" validate constraint "news_likes_user_id_fkey";

alter table "public"."news_post_decks" add constraint "news_post_decks_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."news_post_decks" validate constraint "news_post_decks_deck_id_fkey";

alter table "public"."news_post_decks" add constraint "news_post_decks_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.news_posts(id) ON DELETE CASCADE not valid;

alter table "public"."news_post_decks" validate constraint "news_post_decks_post_id_fkey";

alter table "public"."news_posts" add constraint "news_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) not valid;

alter table "public"."news_posts" validate constraint "news_posts_author_id_fkey";

alter table "public"."news_posts" add constraint "news_posts_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL not valid;

alter table "public"."news_posts" validate constraint "news_posts_tournament_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."tournament_deck_snapshot_cards" add constraint "tournament_deck_snapshot_cards_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES public.tournament_deck_snapshots(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_deck_snapshot_cards" validate constraint "tournament_deck_snapshot_cards_snapshot_id_fkey";

alter table "public"."tournament_deck_snapshots" add constraint "tournament_deck_snapshots_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_deck_snapshots" validate constraint "tournament_deck_snapshots_tournament_id_fkey";

alter table "public"."tournament_deck_snapshots" add constraint "tournament_deck_snapshots_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."tournament_deck_snapshots" validate constraint "tournament_deck_snapshots_user_id_fkey";

alter table "public"."tournament_decklists" add constraint "tournament_decklists_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_decklists" validate constraint "tournament_decklists_deck_id_fkey";

alter table "public"."tournament_decklists" add constraint "tournament_decklists_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.tournament_participants(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_decklists" validate constraint "tournament_decklists_participant_id_fkey";

alter table "public"."tournament_decks" add constraint "tournament_decks_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.decks(id) not valid;

alter table "public"."tournament_decks" validate constraint "tournament_decks_deck_id_fkey";

alter table "public"."tournament_decks" add constraint "tournament_decks_deck_snapshot_id_fkey" FOREIGN KEY (deck_snapshot_id) REFERENCES public.tournament_deck_snapshots(id) not valid;

alter table "public"."tournament_decks" validate constraint "tournament_decks_deck_snapshot_id_fkey";

alter table "public"."tournament_decks" add constraint "tournament_decks_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_decks" validate constraint "tournament_decks_tournament_id_fkey";

alter table "public"."tournament_decks" add constraint "tournament_decks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."tournament_decks" validate constraint "tournament_decks_user_id_fkey";

alter table "public"."tournament_participants" add constraint "tournament_participants_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_participants" validate constraint "tournament_participants_tournament_id_fkey";

alter table "public"."tournament_participants" add constraint "tournament_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tournament_participants" validate constraint "tournament_participants_user_id_fkey";

alter table "public"."user_tournament_banners" add constraint "user_tournament_banners_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL not valid;

alter table "public"."user_tournament_banners" validate constraint "user_tournament_banners_tournament_id_fkey";

alter table "public"."user_tournament_banners" add constraint "user_tournament_banners_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_tournament_banners" validate constraint "user_tournament_banners_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_notification(p_recipient_id uuid, p_type public.notification_type, p_data jsonb, p_link text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    actor_id uuid := auth.uid();
    actor_profile jsonb;
    notification_data jsonb;
BEGIN
    -- Don't notify the user about their own actions
    IF actor_id = p_recipient_id THEN
        RETURN;
    END IF;

    -- Get actor's profile
    SELECT jsonb_build_object('actor_username', username, 'actor_avatar_url', avatar_url)
    INTO actor_profile
    FROM public.profiles
    WHERE id = actor_id;

    -- Merge the actor profile with the provided data
    notification_data := actor_profile || p_data;

    -- Insert notification
    INSERT INTO public.notifications (user_id, type, data, link)
    VALUES (p_recipient_id, p_type, notification_data, p_link);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.manage_clan_application(p_application_id integer, p_new_status public.application_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_clan_id INT;
    v_user_id UUID;
    v_current_status public.application_status;
    current_user_id UUID;
    v_new_member_username TEXT;
    v_clan_name TEXT;
BEGIN
    current_user_id := auth.uid();

    -- Get application details
    SELECT clan_id, user_id, status
    INTO v_clan_id, v_user_id, v_current_status
    FROM public.clan_applications
    WHERE id = p_application_id;

    -- Check if the current user is the clan owner or has a 'strategist' role
    IF NOT EXISTS (
        SELECT 1
        FROM public.clan_members
        WHERE clan_id = v_clan_id AND user_id = current_user_id AND role IN ('LEADER', 'STRATEGIST')
    ) THEN
        RAISE EXCEPTION 'Only clan leaders or strategists can manage applications.';
    END IF;

    -- Check if the application is still pending
    IF v_current_status <> 'PENDING' THEN
        RAISE EXCEPTION 'This application has already been processed.';
    END IF;

    -- Update the application status
    UPDATE public.clan_applications
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_application_id;

    -- If accepted, add the user to the clan members and create notifications
    IF p_new_status = 'ACCEPTED' THEN
        -- Check if user is already in a clan (double check)
        IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = v_user_id) THEN
            RAISE EXCEPTION 'This user is already a member of a clan.';
        END IF;

        INSERT INTO public.clan_members (clan_id, user_id, role)
        VALUES (v_clan_id, v_user_id, 'MEMBER');

        -- Get data for notification
        SELECT username INTO v_new_member_username FROM public.profiles WHERE id = v_user_id;
        SELECT name INTO v_clan_name FROM public.clans WHERE id = v_clan_id;

        -- Notify all existing clan members (including the leader who accepted)
        INSERT INTO public.notifications (user_id, type, data, link)
        SELECT
            cm.user_id,
            'new_clan_member'::public.notification_type,
            jsonb_build_object(
                'new_member_username', v_new_member_username,
                'clan_name', v_clan_name
            ),
            '/clans/' || v_clan_id -- Corrected link here!
        FROM
            public.clan_members cm
        WHERE
            cm.clan_id = v_clan_id
            AND cm.user_id != v_user_id; -- Don't notify the new member themselves

    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.transfer_clan_ownership(p_clan_id integer, p_new_owner_id uuid, p_new_role public.clan_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_leader_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    -- Get the current leader of the clan
    SELECT owner_id INTO current_leader_id
    FROM public.clans
    WHERE id = p_clan_id;

    -- Check if the current user is the actual owner of the clan
    IF current_user_id IS NULL OR current_user_id <> current_leader_id THEN
        RAISE EXCEPTION 'Only the current clan leader can transfer ownership.';
    END IF;

    -- Demote the current leader to a member
    UPDATE public.clan_members
    SET role = 'MEMBER'::public.clan_role
    WHERE clan_id = p_clan_id AND user_id = current_leader_id;

    -- Promote the new owner to the specified role
    UPDATE public.clan_members
    SET role = p_new_role::public.clan_role
    WHERE clan_id = p_clan_id AND user_id = p_new_owner_id;

    -- If the new role is LEADER, update the clan's owner_id
    IF p_new_role = 'LEADER' THEN
        UPDATE public.clans
        SET owner_id = p_new_owner_id
        WHERE id = p_clan_id;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_clan_members(p_clan_id bigint)
 RETURNS TABLE(id uuid, username text, avatar_url text, role public.clan_role, clan_tag text)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

create or replace view "public"."player_rankings_view" as  SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    COALESCE(sum(tp.total_wins_in_tournament), (0)::bigint) AS total_wins,
    (COALESCE(sum(tp.total_wins_in_tournament), (0)::bigint) * 5) AS total_points
   FROM (public.profiles p
     LEFT JOIN public.tournament_participants tp ON ((p.id = tp.user_id)))
  GROUP BY p.id, p.username, p.avatar_url
  ORDER BY (COALESCE(sum(tp.total_wins_in_tournament), (0)::bigint) * 5) DESC;



  create policy "Allow clan leaders and strategists to view applications to thei"
  on "public"."clan_applications"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (auth.uid() IN ( SELECT cm.user_id
   FROM public.clan_members cm
  WHERE ((cm.clan_id = clan_applications.clan_id) AND (cm.role = ANY (ARRAY['LEADER'::public.clan_role, 'STRATEGIST'::public.clan_role])))))));



  create policy "Clan leaders can update applications to their clan."
  on "public"."clan_applications"
  as permissive
  for update
  to public
using ((( SELECT clans.owner_id
   FROM public.clans
  WHERE (clans.id = clan_applications.clan_id)) = auth.uid()));



  create policy "Clan leaders can view applications to their clan."
  on "public"."clan_applications"
  as permissive
  for select
  to public
using ((( SELECT clans.owner_id
   FROM public.clans
  WHERE (clans.id = clan_applications.clan_id)) = auth.uid()));



  create policy "Leaders and Strategists can delete members from their clan."
  on "public"."clan_members"
  as permissive
  for delete
  to public
using (((( SELECT clans.owner_id
   FROM public.clans
  WHERE (clans.id = clan_members.clan_id)) = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.clan_members cm
  WHERE ((cm.clan_id = clan_members.clan_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'STRATEGIST'::public.clan_role))))));



  create policy "Leaders and Strategists can update their clan."
  on "public"."clans"
  as permissive
  for update
  to public
using (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM public.clan_members
  WHERE ((clan_members.clan_id = clans.id) AND (clan_members.user_id = auth.uid()) AND (clan_members.role = 'STRATEGIST'::public.clan_role))))));



  create policy "Allow read access to deck cards based on deck privacy"
  on "public"."deck_cards"
  as permissive
  for select
  to public
using (((auth.uid() = ( SELECT decks.user_id
   FROM public.decks
  WHERE (decks.id = deck_cards.deck_id))) OR (( SELECT decks.is_private
   FROM public.decks
  WHERE (decks.id = deck_cards.deck_id)) = false) OR ((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text])))));



  create policy "Allow users to delete cards from their own decks"
  on "public"."deck_cards"
  as permissive
  for delete
  to public
using ((auth.uid() = ( SELECT decks.user_id
   FROM public.decks
  WHERE (decks.id = deck_cards.deck_id))));



  create policy "Allow users to insert cards into their own decks"
  on "public"."deck_cards"
  as permissive
  for insert
  to public
with check ((auth.uid() = ( SELECT decks.user_id
   FROM public.decks
  WHERE (decks.id = deck_cards.deck_id))));



  create policy "Allow users to update cards in their own decks"
  on "public"."deck_cards"
  as permissive
  for update
  to public
using ((auth.uid() = ( SELECT decks.user_id
   FROM public.decks
  WHERE (decks.id = deck_cards.deck_id))));



  create policy "Users can manage cards in their own decks."
  on "public"."deck_cards"
  as permissive
  for all
  to public
using ((auth.uid() = ( SELECT decks.user_id
   FROM public.decks
  WHERE (decks.id = deck_cards.deck_id))));



  create policy "Allow admins to delete any comment"
  on "public"."deck_comments"
  as permissive
  for delete
  to public
using ((public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text])));



  create policy "Allow admins to delete any deck"
  on "public"."decks"
  as permissive
  for delete
  to public
using ((public.get_user_role() = 'admin'::text));



  create policy "Allow admins to update any deck"
  on "public"."decks"
  as permissive
  for update
  to public
using ((public.get_user_role() = 'admin'::text));



  create policy "Allow read access based on privacy"
  on "public"."decks"
  as permissive
  for select
  to public
using (((is_private = false) OR (auth.uid() = user_id) OR ((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text])))));



  create policy "Allow admins to delete any comment"
  on "public"."news_comments"
  as permissive
  for delete
  to public
using ((public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text])));



  create policy "Allow full access for admins"
  on "public"."news_post_decks"
  as permissive
  for all
  to public
using (((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text]))))
with check (((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text]))));



  create policy "Allow full access for admins and organizers"
  on "public"."news_posts"
  as permissive
  for all
  to public
using (((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text]))))
with check (((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text]))));



  create policy "Allow admins to view all snapshot cards"
  on "public"."tournament_deck_snapshot_cards"
  as permissive
  for select
  to public
using (public.is_admin(auth.uid()));



  create policy "Allow authenticated users to view their own snapshot cards"
  on "public"."tournament_deck_snapshot_cards"
  as permissive
  for select
  to public
using ((snapshot_id IN ( SELECT tournament_deck_snapshots.id
   FROM public.tournament_deck_snapshots
  WHERE (tournament_deck_snapshots.user_id = auth.uid()))));



  create policy "Enable insert for snapshot owners"
  on "public"."tournament_deck_snapshot_cards"
  as permissive
  for insert
  to public
with check ((snapshot_id IN ( SELECT tournament_deck_snapshots.id
   FROM public.tournament_deck_snapshots
  WHERE (tournament_deck_snapshots.user_id = auth.uid()))));



  create policy "Allow admins to view all snapshots"
  on "public"."tournament_deck_snapshots"
  as permissive
  for select
  to public
using (public.is_admin(auth.uid()));



  create policy "Allow users to delete their own decklists"
  on "public"."tournament_decklists"
  as permissive
  for delete
  to authenticated
using ((( SELECT tournament_participants.user_id
   FROM public.tournament_participants
  WHERE (tournament_participants.id = tournament_decklists.participant_id)) = auth.uid()));



  create policy "Allow users to insert their own decklists"
  on "public"."tournament_decklists"
  as permissive
  for insert
  to authenticated
with check ((( SELECT tournament_participants.user_id
   FROM public.tournament_participants
  WHERE (tournament_participants.id = tournament_decklists.participant_id)) = auth.uid()));



  create policy "Allow admins and organizers to view tournament decks"
  on "public"."tournament_decks"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.role = 'organizer'::text))))));



  create policy "Allow admins and organizers to delete participants"
  on "public"."tournament_participants"
  as permissive
  for delete
  to public
using (((public.get_user_role() = 'admin'::text) OR (public.get_user_role() = 'organizer'::text)));



  create policy "Allow admins and organizers to update wins"
  on "public"."tournament_participants"
  as permissive
  for update
  to public
using ((public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text])))
with check ((public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text])));



  create policy "Allow users to insert their own participation"
  on "public"."tournament_participants"
  as permissive
  for insert
  to public
with check (((auth.uid() = user_id) AND (( SELECT tournaments.status
   FROM public.tournaments
  WHERE (tournaments.id = tournament_participants.tournament_id)) = 'Aberto'::text)));



  create policy "Allow full access for admins and organizers"
  on "public"."tournaments"
  as permissive
  for all
  to public
using (true)
with check (((auth.uid() IS NOT NULL) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text]))));


CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_participant_leave AFTER DELETE ON public.tournament_participants FOR EACH ROW EXECUTE FUNCTION public.delete_user_tournament_decks();

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

drop policy "Admin and Organizer write access for news content" on "storage"."objects";


  create policy "Admin and Organizer write access for news content"
  on "storage"."objects"
  as permissive
  for all
  to public
with check (((bucket_id = 'news_content'::text) AND (auth.role() = 'authenticated'::text) AND (public.get_user_role() = ANY (ARRAY['admin'::text, 'organizer'::text]))));



