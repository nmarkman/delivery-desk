-- Add daily sync settings to user_act_connections table (only add columns that don't exist)
DO $$
BEGIN
    -- Check and add daily_sync_enabled column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_act_connections' AND column_name = 'daily_sync_enabled') THEN
        ALTER TABLE user_act_connections ADD COLUMN daily_sync_enabled BOOLEAN DEFAULT true;
    END IF;

    -- Check and add daily_sync_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_act_connections' AND column_name = 'daily_sync_time') THEN
        ALTER TABLE user_act_connections ADD COLUMN daily_sync_time TIME DEFAULT '02:00:00';
    END IF;

    -- Check and add next_sync_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_act_connections' AND column_name = 'next_sync_at') THEN
        ALTER TABLE user_act_connections ADD COLUMN next_sync_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Check and add last_daily_sync_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_act_connections' AND column_name = 'last_daily_sync_at') THEN
        ALTER TABLE user_act_connections ADD COLUMN last_daily_sync_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Check and add daily_sync_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_act_connections' AND column_name = 'daily_sync_status') THEN
        ALTER TABLE user_act_connections ADD COLUMN daily_sync_status TEXT DEFAULT 'pending' 
        CHECK (daily_sync_status IN ('pending', 'running', 'success', 'failed'));
    END IF;

    -- Check and add daily_sync_error column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_act_connections' AND column_name = 'daily_sync_error') THEN
        ALTER TABLE user_act_connections ADD COLUMN daily_sync_error TEXT;
    END IF;

    -- Check and add is_batch_operation column to integration_logs (sync_batch_id and parent_log_id already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'integration_logs' AND column_name = 'is_batch_operation') THEN
        ALTER TABLE integration_logs ADD COLUMN is_batch_operation BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_act_connections_daily_sync 
ON user_act_connections(daily_sync_enabled, next_sync_at) 
WHERE daily_sync_enabled = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_integration_logs_batch_sync 
ON integration_logs(sync_batch_id, created_at);

-- Function to get all active connections ready for daily sync
CREATE OR REPLACE FUNCTION get_connections_ready_for_sync()
RETURNS TABLE (
    id TEXT,
    user_id TEXT,
    act_username TEXT,
    act_password_encrypted TEXT,
    act_database_name TEXT,
    act_region TEXT,
    api_base_url TEXT,
    cached_bearer_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    token_last_refreshed_at TIMESTAMP WITH TIME ZONE,
    connection_name TEXT,
    daily_sync_time TIME
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uac.id,
        uac.user_id,
        uac.act_username,
        uac.act_password_encrypted,
        uac.act_database_name,
        uac.act_region,
        uac.api_base_url,
        uac.cached_bearer_token,
        uac.token_expires_at,
        uac.token_last_refreshed_at,
        uac.connection_name,
        uac.daily_sync_time
    FROM user_act_connections uac
    WHERE uac.is_active = true
    AND uac.daily_sync_enabled = true
    AND (
        uac.next_sync_at IS NULL 
        OR uac.next_sync_at <= NOW()
    )
    AND uac.daily_sync_status != 'running'
    ORDER BY uac.daily_sync_time, uac.created_at;
END;
$$;

-- Function to update next sync time for a connection
CREATE OR REPLACE FUNCTION update_next_sync_time(connection_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    sync_time TIME;
BEGIN
    SELECT daily_sync_time INTO sync_time
    FROM user_act_connections
    WHERE id = connection_id;
    
    UPDATE user_act_connections
    SET next_sync_at = (CURRENT_DATE + INTERVAL '1 day' + sync_time)
    WHERE id = connection_id;
END;
$$;

-- Function to update daily sync status
CREATE OR REPLACE FUNCTION update_daily_sync_status(
    connection_id TEXT,
    status TEXT,
    error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE user_act_connections
    SET 
        daily_sync_status = status,
        daily_sync_error = error_message,
        last_daily_sync_at = CASE 
            WHEN status IN ('success', 'failed') THEN NOW()
            ELSE last_daily_sync_at
        END
    WHERE id = connection_id;
END;
$$;

-- Set initial next_sync_at for existing connections (only if they don't have it set)
UPDATE user_act_connections
SET next_sync_at = (CURRENT_DATE + INTERVAL '1 day' + COALESCE(daily_sync_time, '02:00:00'::TIME))
WHERE daily_sync_enabled IS NOT FALSE  -- handles both true and null cases
AND next_sync_at IS NULL;