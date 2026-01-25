-- Add 'system_notification' to notification_type enum
-- Required for grant_frame_to_users RPC

ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'system_notification';
