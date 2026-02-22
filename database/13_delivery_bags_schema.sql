-- Delivery Bags Schema
-- ========================================================
-- Schema Migration for Delivery Bags Module
-- ========================================================

-- 1. Enums
CREATE TYPE bag_status_enum AS ENUM ('NEW', 'GOOD', 'NEEDS_MAINTENANCE', 'DAMAGED', 'LOST');
CREATE TYPE bag_event_type_enum AS ENUM ('SUPPLY_TO_WAREHOUSE', 'ISSUE_TO_DRIVER', 'RECEIVE_FROM_DRIVER', 'RECEIVE_AND_ISSUE', 'STATUS_CHANGE');

-- 2. Delivery Bags Table
CREATE TABLE delivery_bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_no VARCHAR(50) UNIQUE NOT NULL, -- Serial Number
    status bag_status_enum NOT NULL DEFAULT 'NEW',
    branch_name VARCHAR(100), -- Optional branch location
    current_driver_id UUID REFERENCES inventory_beneficiaries(id), -- Nullable, if null = in warehouse
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Operational timestamps (denormalized for report ease)
    last_supplied_at TIMESTAMP WITH TIME ZONE,
    last_issued_at TIMESTAMP WITH TIME ZONE,
    last_received_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_driver_assignment UNIQUE (current_driver_id) -- Ensures a driver has only ONE active bag
);

-- 3. Bag Events History (Ledger)
CREATE TABLE bag_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID NOT NULL REFERENCES delivery_bags(id),
    event_type bag_event_type_enum NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    from_driver_id UUID REFERENCES inventory_beneficiaries(id),
    to_driver_id UUID REFERENCES inventory_beneficiaries(id),
    
    -- Metadata
    performed_by VARCHAR(255) NOT NULL, -- User name
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS Policies
ALTER TABLE delivery_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON delivery_bags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access to authenticated users" ON bag_events FOR ALL USING (auth.role() = 'authenticated');

-- 5. RPC Functions for Business Logic

-- A. Register/Supply New Bag
CREATE OR REPLACE FUNCTION supply_new_bag(
    p_bag_no VARCHAR,
    p_branch VARCHAR,
    p_status bag_status_enum,
    p_user_name VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_bag_id UUID;
BEGIN
    INSERT INTO delivery_bags (bag_no, branch_name, status, last_supplied_at)
    VALUES (p_bag_no, p_branch, p_status, NOW())
    RETURNING id INTO v_bag_id;
    
    INSERT INTO bag_events (bag_id, event_type, performed_by, notes)
    VALUES (v_bag_id, 'SUPPLY_TO_WAREHOUSE', p_user_name, 'Initial supply of bag');
    
    RETURN jsonb_build_object('success', true, 'bag_id', v_bag_id);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'رقم الشنطة موجود سجل مسبقاً');
END;
$$ LANGUAGE plpgsql;

-- B. Issue Bag to Driver
CREATE OR REPLACE FUNCTION issue_bag_to_driver(
    p_bag_id UUID,
    p_driver_id UUID,
    p_user_name VARCHAR,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_bag RECORD;
    v_driver_has_bag BOOLEAN;
BEGIN
    -- Check Bag Status
    SELECT * INTO v_bag FROM delivery_bags WHERE id = p_bag_id FOR UPDATE;
    
    IF v_bag.current_driver_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'هذه الشنطة مسلمة لموصل آخر بالفعل');
    END IF;
    
    IF v_bag.status IN ('DAMAGED', 'LOST') THEN
        RETURN jsonb_build_object('success', false, 'message', 'لا يمكن صرف شنطة تالفة أو مفقودة');
    END IF;
    
    -- Check Driver Status (One bag per driver rule)
    SELECT EXISTS(SELECT 1 FROM delivery_bags WHERE current_driver_id = p_driver_id) INTO v_driver_has_bag;
    IF v_driver_has_bag THEN
        RETURN jsonb_build_object('success', false, 'message', 'هذا الموصل لديه شنطة بعهدته بالفعل');
    END IF;
    
    -- Execute Issue
    UPDATE delivery_bags 
    SET current_driver_id = p_driver_id,
        last_issued_at = NOW(),
        updated_at = NOW()
    WHERE id = p_bag_id;
    
    INSERT INTO bag_events (bag_id, event_type, to_driver_id, performed_by, notes)
    VALUES (p_bag_id, 'ISSUE_TO_DRIVER', p_driver_id, p_user_name, p_notes);
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- C. Receive Bag from Driver
CREATE OR REPLACE FUNCTION receive_bag_from_driver(
    p_bag_id UUID,
    p_status bag_status_enum, -- Optional status update upon receipt
    p_user_name VARCHAR,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_bag RECORD;
    v_old_driver_id UUID;
BEGIN
    SELECT * INTO v_bag FROM delivery_bags WHERE id = p_bag_id FOR UPDATE;
    
    IF v_bag.current_driver_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الشنطة موجودة في المخزن بالفعل (غير مسلمة)');
    END IF;
    
    v_old_driver_id := v_bag.current_driver_id;
    
    UPDATE delivery_bags 
    SET current_driver_id = NULL,
        status = COALESCE(p_status, status),
        last_received_at = NOW(),
        updated_at = NOW()
    WHERE id = p_bag_id;
    
    INSERT INTO bag_events (bag_id, event_type, from_driver_id, performed_by, notes)
    VALUES (p_bag_id, 'RECEIVE_FROM_DRIVER', v_old_driver_id, p_user_name, p_notes);
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- D. Atomic Receive & Issue (Swap)
CREATE OR REPLACE FUNCTION receive_and_issue_bag(
    p_bag_id UUID,
    p_new_driver_id UUID,
    p_status bag_status_enum,
    p_user_name VARCHAR,
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_bag RECORD;
    v_old_driver_id UUID;
    v_target_driver_has_bag BOOLEAN;
BEGIN
    SELECT * INTO v_bag FROM delivery_bags WHERE id = p_bag_id FOR UPDATE;
    
    IF v_bag.current_driver_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الشنطة غير مسلمة لأحد، استخدم خيار الصرف فقط');
    END IF;
    
    v_old_driver_id := v_bag.current_driver_id;
    
    -- Check Target Driver
    SELECT EXISTS(SELECT 1 FROM delivery_bags WHERE current_driver_id = p_new_driver_id) INTO v_target_driver_has_bag;
    IF v_target_driver_has_bag THEN
        RETURN jsonb_build_object('success', false, 'message', 'الموصل الجديد لديه شنطة بالفعل');
    END IF;

    -- Update Bag (Swap Owner)
    UPDATE delivery_bags 
    SET current_driver_id = p_new_driver_id,
        status = COALESCE(p_status, status),
        last_received_at = NOW(),
        last_issued_at = NOW(),
        updated_at = NOW()
    WHERE id = p_bag_id;
    
    -- Log Event
    INSERT INTO bag_events (bag_id, event_type, from_driver_id, to_driver_id, performed_by, notes)
    VALUES (p_bag_id, 'RECEIVE_AND_ISSUE', v_old_driver_id, p_new_driver_id, p_user_name, p_notes);
    
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 6. Setup Permissions (Module & Admin Access)
DO $$
DECLARE
    v_module_id UUID;
    v_role_id UUID;
    v_view_id UUID;
    v_create_id UUID;
    v_edit_id UUID;
    v_delete_id UUID;
BEGIN
    -- Create Module
    INSERT INTO modules (name, display_name, icon, sort_order, is_active)
    VALUES ('delivery_bags', 'شنط التوصيل', 'briefcase', 90, TRUE)
    ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, icon = EXCLUDED.icon
    RETURNING id INTO v_module_id;

    -- Get Actions
    SELECT id INTO v_view_id FROM actions WHERE name = 'view' LIMIT 1;
    SELECT id INTO v_create_id FROM actions WHERE name = 'create' LIMIT 1;
    SELECT id INTO v_edit_id FROM actions WHERE name = 'edit' LIMIT 1;
    SELECT id INTO v_delete_id FROM actions WHERE name = 'delete' LIMIT 1;

    -- Link Module Actions
    IF v_view_id IS NOT NULL THEN
        INSERT INTO module_actions (module_id, action_id, is_available) VALUES (v_module_id, v_view_id, TRUE) ON CONFLICT DO NOTHING;
    END IF;
    IF v_create_id IS NOT NULL THEN
        INSERT INTO module_actions (module_id, action_id, is_available) VALUES (v_module_id, v_create_id, TRUE) ON CONFLICT DO NOTHING;
    END IF;
    IF v_edit_id IS NOT NULL THEN
        INSERT INTO module_actions (module_id, action_id, is_available) VALUES (v_module_id, v_edit_id, TRUE) ON CONFLICT DO NOTHING;
    END IF;
    IF v_delete_id IS NOT NULL THEN
        INSERT INTO module_actions (module_id, action_id, is_available) VALUES (v_module_id, v_delete_id, TRUE) ON CONFLICT DO NOTHING;
    END IF;

    -- Grant to Admin
    SELECT id INTO v_role_id FROM roles WHERE name = 'Admin' OR name = 'admin' LIMIT 1;
    
    IF v_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, module_id, action_id, has_permission)
        SELECT v_role_id, v_module_id, action_id, TRUE
        FROM module_actions
        WHERE module_id = v_module_id
        ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET has_permission = TRUE;
    END IF;
END $$;
