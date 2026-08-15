import { SupabaseClient } from "@supabase/supabase-js";

export type ActionType = 
  | 'ORDER_CREATED' 
  | 'ORDER_DELETED' 
  | 'ORDER_STATUS_UPDATED'
  | 'ORDER_EDITED'
  | 'PRODUCT_ADDED' 
  | 'PRODUCT_UPDATED' 
  | 'PRODUCT_DELETED'
  | 'CUSTOMER_ADDED' 
  | 'CUSTOMER_UPDATED' 
  | 'CUSTOMER_DELETED'
  | 'EXPENSE_ADDED' 
  | 'EXPENSE_UPDATED' 
  | 'EXPENSE_DELETED';

export type EntityType = 'order' | 'product' | 'customer' | 'expense';

/**
 * Silently logs user activity to the database without throwing errors.
 * This ensures that a failure in logging never breaks the main transaction.
 */
export async function logActivity(
  adminClient: SupabaseClient,
  userId: number,
  action: ActionType,
  entityType: EntityType,
  entityId?: string | number,
  details?: string
) {
  try {
    const { error } = await adminClient.from("activity_logs").insert({
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      details: details || null,
    });
    
    if (error) {
      console.error("Failed to log activity:", error.message);
    }
  } catch (err) {
    console.error("Exception while logging activity:", err);
  }
}
