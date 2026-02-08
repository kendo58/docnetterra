-- Audit Logs Table for tracking all platform changes
-- Run this script to create the audit logging system

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who performed the action
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  actor_type VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user', 'admin', 'system'
  
  -- What action was performed
  action VARCHAR(100) NOT NULL, -- 'user.created', 'listing.updated', 'booking.confirmed', etc.
  action_category VARCHAR(50) NOT NULL, -- 'auth', 'listing', 'booking', 'message', 'admin', 'payment'
  
  -- What resource was affected
  resource_type VARCHAR(50), -- 'user', 'listing', 'booking', 'message', 'review'
  resource_id UUID,
  
  -- Details of the change
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Additional context like old/new values, IP, user agent
  
  -- Risk/importance level
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexing for fast queries
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

-- System/admins can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create a function to log actions (can be called from triggers)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_id UUID,
  p_actor_email VARCHAR,
  p_actor_type VARCHAR,
  p_action VARCHAR,
  p_action_category VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_severity VARCHAR DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    actor_id, actor_email, actor_type,
    action, action_category,
    resource_type, resource_id,
    description, metadata, severity
  ) VALUES (
    p_actor_id, p_actor_email, p_actor_type,
    p_action, p_action_category,
    p_resource_type, p_resource_id,
    p_description, p_metadata, p_severity
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create triggers for automatic logging of important events

-- Log user profile changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      actor_id, actor_type, action, action_category,
      resource_type, resource_id, description, metadata
    ) VALUES (
      NEW.id, 'user', 'user.created', 'auth',
      'user', NEW.id, 'New user account created',
      jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log significant changes
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
       OLD.is_active IS DISTINCT FROM NEW.is_active OR
       OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
      INSERT INTO audit_logs (
        actor_id, actor_type, action, action_category,
        resource_type, resource_id, description, metadata, severity
      ) VALUES (
        NEW.id, 
        CASE WHEN NEW.is_admin THEN 'admin' ELSE 'user' END,
        CASE 
          WHEN OLD.is_active AND NOT NEW.is_active THEN 'user.suspended'
          WHEN NOT OLD.is_active AND NEW.is_active THEN 'user.reactivated'
          WHEN OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN 'user.admin_status_changed'
          ELSE 'user.verification_updated'
        END,
        'admin',
        'user', NEW.id,
        CASE 
          WHEN OLD.is_active AND NOT NEW.is_active THEN 'User account suspended'
          WHEN NOT OLD.is_active AND NEW.is_active THEN 'User account reactivated'
          WHEN OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN 'User admin status changed'
          ELSE 'User verification status updated'
        END,
        jsonb_build_object(
          'old_verification', OLD.verification_status,
          'new_verification', NEW.verification_status,
          'old_active', OLD.is_active,
          'new_active', NEW.is_active,
          'old_admin', OLD.is_admin,
          'new_admin', NEW.is_admin
        ),
        CASE 
          WHEN OLD.is_active AND NOT NEW.is_active THEN 'warning'
          WHEN OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN 'critical'
          ELSE 'info'
        END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profile_trigger ON profiles;
CREATE TRIGGER audit_profile_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_changes();

-- Log booking changes
CREATE OR REPLACE FUNCTION audit_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      actor_id, actor_type, action, action_category,
      resource_type, resource_id, description, metadata
    ) VALUES (
      NEW.sitter_id, 'user', 'booking.created', 'booking',
      'booking', NEW.id, 'New booking request created',
      jsonb_build_object(
        'listing_id', NEW.listing_id,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_logs (
        actor_id, actor_type, action, action_category,
        resource_type, resource_id, description, metadata, severity
      ) VALUES (
        COALESCE(NEW.cancelled_by, NEW.sitter_id), 'user',
        'booking.' || NEW.status, 'booking',
        'booking', NEW.id,
        'Booking status changed to ' || NEW.status,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'cancellation_reason', NEW.cancellation_reason
        ),
        CASE WHEN NEW.status = 'cancelled' THEN 'warning' ELSE 'info' END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_booking_trigger ON bookings;
CREATE TRIGGER audit_booking_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION audit_booking_changes();

-- Log listing changes
CREATE OR REPLACE FUNCTION audit_listing_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      actor_id, actor_type, action, action_category,
      resource_type, resource_id, description, metadata
    ) VALUES (
      NEW.user_id, 'user', 'listing.created', 'listing',
      'listing', NEW.id, 'New listing created: ' || NEW.title,
      jsonb_build_object('title', NEW.title, 'property_type', NEW.property_type)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO audit_logs (
        actor_id, actor_type, action, action_category,
        resource_type, resource_id, description, metadata
      ) VALUES (
        NEW.user_id, 'user',
        CASE WHEN NEW.is_active THEN 'listing.activated' ELSE 'listing.deactivated' END,
        'listing',
        'listing', NEW.id,
        CASE WHEN NEW.is_active THEN 'Listing activated' ELSE 'Listing deactivated' END,
        jsonb_build_object('title', NEW.title)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      actor_id, actor_type, action, action_category,
      resource_type, resource_id, description, metadata, severity
    ) VALUES (
      OLD.user_id, 'user', 'listing.deleted', 'listing',
      'listing', OLD.id, 'Listing deleted: ' || OLD.title,
      jsonb_build_object('title', OLD.title),
      'warning'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_listing_trigger ON listings;
CREATE TRIGGER audit_listing_trigger
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION audit_listing_changes();

-- Log safety reports
CREATE OR REPLACE FUNCTION audit_safety_report_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      actor_id, actor_type, action, action_category,
      resource_type, resource_id, description, metadata, severity
    ) VALUES (
      NEW.reporter_id, 'user', 'report.created', 'admin',
      'report', NEW.id, 'Safety report submitted: ' || NEW.report_type,
      jsonb_build_object(
        'report_type', NEW.report_type,
        'reported_user_id', NEW.reported_user_id
      ),
      'warning'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_logs (
        actor_id, actor_type, action, action_category,
        resource_type, resource_id, description, metadata, severity
      ) VALUES (
        NULL, 'admin', 'report.' || NEW.status, 'admin',
        'report', NEW.id, 'Safety report ' || NEW.status,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'resolution_notes', NEW.resolution_notes
        ),
        CASE WHEN NEW.status = 'resolved' THEN 'info' ELSE 'warning' END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_safety_report_trigger ON safety_reports;
CREATE TRIGGER audit_safety_report_trigger
  AFTER INSERT OR UPDATE ON safety_reports
  FOR EACH ROW
  EXECUTE FUNCTION audit_safety_report_changes();

-- Log match events
CREATE OR REPLACE FUNCTION audit_match_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT OLD.is_match AND NEW.is_match THEN
    INSERT INTO audit_logs (
      actor_id, actor_type, action, action_category,
      resource_type, resource_id, description, metadata
    ) VALUES (
      NEW.sitter_id, 'user', 'match.created', 'matching',
      'match', NEW.id, 'New match created',
      jsonb_build_object(
        'listing_id', NEW.listing_id,
        'sitter_id', NEW.sitter_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_match_trigger ON matches;
CREATE TRIGGER audit_match_trigger
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION audit_match_changes();

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all platform activities';
