CREATE OR REPLACE FUNCTION "public"."transfer_clan_ownership"("p_clan_id" integer, "p_new_owner_id" "uuid", "p_new_role" "public"."clan_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;

GRANT ALL ON FUNCTION "public"."transfer_clan_ownership"("p_clan_id" integer, "p_new_owner_id" "uuid", "p_new_role" "public"."clan_role") TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_clan_ownership"("p_clan_id" integer, "p_new_owner_id" "uuid", "p_new_role" "public"."clan_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_clan_ownership"("p_clan_id" integer, "p_new_owner_id" "uuid", "p_new_role" "public"."clan_role") TO "service_role";