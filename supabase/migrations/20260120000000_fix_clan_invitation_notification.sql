-- Fix for "invalid input value for enum notification_type: clan_invitation"
-- This adds the missing enum value to the notification_type enum

ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'clan_invitation';
