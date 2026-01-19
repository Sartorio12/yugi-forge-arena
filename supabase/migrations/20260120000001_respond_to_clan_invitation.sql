create or replace function public.respond_to_clan_invitation(
    p_invitation_id bigint,
    p_response text -- 'ACCEPTED' or 'REJECTED'
)
returns void
language plpgsql
security definer
as $$
declare
    v_invitee_id uuid;
    v_clan_id bigint;
    v_current_status public.invitation_status;
    v_existing_clan_id bigint;
begin
    -- Get invitation details
    select invitee_id, clan_id, status 
    into v_invitee_id, v_clan_id, v_current_status
    from public.clan_invitations
    where id = p_invitation_id;

    if v_invitee_id is null then
        raise exception 'Invitation not found.';
    end if;

    if v_invitee_id != auth.uid() then
        raise exception 'You are not the recipient of this invitation.';
    end if;

    if v_current_status != 'PENDING' then
        raise exception 'This invitation is no longer pending.';
    end if;

    if p_response = 'ACCEPTED' then
        -- Check if user is already in a clan
        select clan_id into v_existing_clan_id
        from public.clan_members
        where user_id = auth.uid();

        if v_existing_clan_id is not null then
            raise exception 'You are already in a clan. You must leave your current clan before accepting a new invitation.';
        end if;

        -- Add to clan members
        insert into public.clan_members (clan_id, user_id, role)
        values (v_clan_id, auth.uid(), 'MEMBER');

        -- Update invitation status
        update public.clan_invitations
        set status = 'ACCEPTED', updated_at = now()
        where id = p_invitation_id;

        -- Create notification for clan leaders/strategists? (Optional, skipping for now to keep it simple)

    elsif p_response = 'REJECTED' then
        -- Update invitation status
        update public.clan_invitations
        set status = 'REJECTED', updated_at = now()
        where id = p_invitation_id;
    else
        raise exception 'Invalid response.';
    end if;
end;
$$;
