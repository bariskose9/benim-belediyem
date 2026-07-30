-- CreateEnum
CREATE TYPE "SimulationBehavior" AS ENUM ('normal', 'timeout', 'error', 'not_found');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'unspecified');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'married', 'divorced', 'widowed', 'unspecified');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('unverified', 'kps_verified');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('register_email', 'register_phone', 'password_reset');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('mock', 'email', 'email_sms_simulation');

-- CreateEnum
CREATE TYPE "KpsQueryResult" AS ENUM ('success', 'mismatch', 'not_found', 'rate_limited', 'timeout');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('order_status', 'seat_hold_expired', 'membership_renewal_reminder', 'membership_payment_failed', 'support_ticket_update', 'account');

-- CreateEnum
CREATE TYPE "RelatedEntityType" AS ENUM ('order', 'appointment', 'seat_reservation', 'membership', 'support_ticket');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('active', 'converted', 'abandoned');

-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM ('market', 'restaurant', 'event');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('market_delivery', 'restaurant_delivery', 'ticket');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('received', 'preparing', 'on_the_way', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "CardBrand" AS ENUM ('visa', 'mastercard');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('success', 'declined', 'insufficient_funds');

-- CreateEnum
CREATE TYPE "DoctorTitle" AS ENUM ('professor', 'associate_professor', 'specialist', 'physician');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('booked', 'cancelled');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('concert', 'theatre', 'kids');

-- CreateEnum
CREATE TYPE "SeatReservationStatus" AS ENUM ('held', 'sold');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'payment_pending', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "MembershipPaymentKind" AS ENUM ('renewal', 'early_exit_fee');

-- CreateEnum
CREATE TYPE "MembershipPaymentStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('presidency', 'general_secretariat', 'deputy_general_secretariat', 'directorate', 'branch', 'section');

-- CreateEnum
CREATE TYPE "StaffTitle" AS ENUM ('department_head', 'branch_manager', 'chief', 'engineer', 'specialist', 'technician', 'officer', 'contracted');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_review', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('login', 'logout', 'register', 'password_reset', 'kps_query', 'order_create', 'order_cancel', 'payment_attempt', 'appointment_create', 'appointment_cancel', 'seat_reserve', 'membership_create', 'membership_cancel', 'membership_payment', 'support_ticket_create', 'support_ticket_close', 'consent_change', 'data_export', 'account_delete', 'role_change');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('user', 'session', 'order', 'payment', 'appointment', 'seat_reservation', 'membership', 'membership_payment', 'support_ticket', 'consent_record');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('necessary_cookies', 'analytics_cookies', 'marketing_cookies', 'terms_of_use', 'privacy_notice');

-- CreateTable
CREATE TABLE "kps_citizens" (
    "id" TEXT NOT NULL,
    "national_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "birth_place" TEXT NOT NULL,
    "father_name" TEXT NOT NULL,
    "mother_name" TEXT NOT NULL,
    "registered_province" TEXT NOT NULL,
    "registered_district" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "marital_status" "MaritalStatus" NOT NULL,
    "registered_address" TEXT NOT NULL,
    "simulation_behavior" "SimulationBehavior" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kps_citizens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "national_id_encrypted" TEXT,
    "national_id_hash" TEXT,
    "national_id_masked" TEXT,
    "full_name" TEXT NOT NULL,
    "birth_date" DATE,
    "email" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone" TEXT,
    "phone_verified_at" TIMESTAMP(3),
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "identity_status" "IdentityStatus" NOT NULL DEFAULT 'unverified',
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "staff_member_id" TEXT,
    "registered_province" TEXT,
    "registered_district" TEXT,
    "kps_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "registration_id" TEXT,
    "purpose" "OtpPurpose" NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "destination_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window_started_at" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kps_query_logs" (
    "id" TEXT NOT NULL,
    "actor_ip_hash" TEXT NOT NULL,
    "session_id" TEXT,
    "result" "KpsQueryResult" NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kps_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "full_address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_type" "RelatedEntityType",
    "related_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_id" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "item_type" "CartItemType" NOT NULL,
    "ref_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "fulfillment_type" "FulfillmentType" NOT NULL,
    "subtotal_amount" DECIMAL(10,2) NOT NULL,
    "delivery_fee" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'received',
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "delivery_address_id" TEXT,
    "delivery_slot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_type" "CartItemType" NOT NULL,
    "ref_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand" "CardBrand" NOT NULL,
    "last4" TEXT NOT NULL,
    "exp_month" INTEGER NOT NULL,
    "exp_year" INTEGER NOT NULL,
    "holder_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "saved_card_id" TEXT,
    "brand" "CardBrand" NOT NULL,
    "card_last4" TEXT NOT NULL,
    "fake_transaction_id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "title" "DoctorTitle" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_slots" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "doctor_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'booked',
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_seats" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "row_label" TEXT NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "venue_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "performer" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_reservations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "SeatReservationStatus" NOT NULL DEFAULT 'held',
    "hold_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "seat_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commitment_months" INTEGER NOT NULL,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "saved_card_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "commitment_ends_at" TIMESTAMP(3),
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "auto_renew_enabled" BOOLEAN NOT NULL DEFAULT true,
    "next_billing_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "pending_plan_id" TEXT,
    "pending_plan_effective_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_payments" (
    "id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "kind" "MembershipPaymentKind" NOT NULL,
    "status" "MembershipPaymentStatus" NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "membership_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_type" "OrgUnitType" NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "org_unit_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "title" "StaffTitle" NOT NULL,
    "work_email" TEXT NOT NULL,
    "extension_number" INTEGER NOT NULL,
    "start_year" INTEGER NOT NULL,
    "national_id_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" TEXT,
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_id" TEXT,
    "consent_type" "ConsentType" NOT NULL,
    "is_granted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_seed_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kps_citizens_national_id_key" ON "kps_citizens"("national_id");

-- CreateIndex
CREATE INDEX "kps_citizens_simulation_behavior_idx" ON "kps_citizens"("simulation_behavior");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_hash_key" ON "users"("national_id_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_staff_member_id_key" ON "users"("staff_member_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_identity_status_idx" ON "users"("identity_status");

-- CreateIndex
CREATE INDEX "users_is_staff_idx" ON "users"("is_staff");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "otp_challenges_user_id_idx" ON "otp_challenges"("user_id");

-- CreateIndex
CREATE INDEX "otp_challenges_registration_id_idx" ON "otp_challenges"("registration_id");

-- CreateIndex
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "otp_challenges_destination_hash_purpose_idx" ON "otp_challenges"("destination_hash", "purpose");

-- CreateIndex
CREATE INDEX "rate_limit_counters_window_started_at_idx" ON "rate_limit_counters"("window_started_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_counters_key_window_started_at_key" ON "rate_limit_counters"("key", "window_started_at");

-- CreateIndex
CREATE INDEX "kps_query_logs_created_at_idx" ON "kps_query_logs"("created_at");

-- CreateIndex
CREATE INDEX "kps_query_logs_result_idx" ON "kps_query_logs"("result");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "addresses_deleted_at_idx" ON "addresses"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "carts_anonymous_id_idx" ON "carts"("anonymous_id");

-- CreateIndex
CREATE INDEX "carts_status_updated_at_idx" ON "carts"("status", "updated_at");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_item_type_ref_id_key" ON "cart_items"("cart_id", "item_type", "ref_id");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_payment_id_idx" ON "orders"("payment_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "saved_cards_user_id_idx" ON "saved_cards"("user_id");

-- CreateIndex
CREATE INDEX "saved_cards_deleted_at_idx" ON "saved_cards"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_fake_transaction_id_key" ON "payments"("fake_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_user_id_attempted_at_idx" ON "payments"("user_id", "attempted_at");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_key" ON "specialties"("name");

-- CreateIndex
CREATE INDEX "doctors_specialty_id_idx" ON "doctors"("specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_specialty_id_full_name_key" ON "doctors"("specialty_id", "full_name");

-- CreateIndex
CREATE INDEX "doctor_slots_starts_at_is_booked_idx" ON "doctor_slots"("starts_at", "is_booked");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_slots_doctor_id_starts_at_key" ON "doctor_slots"("doctor_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_user_id_status_idx" ON "appointments"("user_id", "status");

-- CreateIndex
CREATE INDEX "appointments_slot_id_idx" ON "appointments"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");

-- CreateIndex
CREATE INDEX "venue_seats_venue_id_idx" ON "venue_seats"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "venue_seats_venue_id_block_row_label_seat_number_key" ON "venue_seats"("venue_id", "block", "row_label", "seat_number");

-- CreateIndex
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "seat_reservations_user_id_idx" ON "seat_reservations"("user_id");

-- CreateIndex
CREATE INDEX "seat_reservations_event_id_status_idx" ON "seat_reservations"("event_id", "status");

-- CreateIndex
CREATE INDEX "seat_reservations_hold_expires_at_idx" ON "seat_reservations"("hold_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "seat_reservations_event_id_seat_id_key" ON "seat_reservations"("event_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_category_id_name_key" ON "products"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_name_key" ON "menu_categories"("name");

-- CreateIndex
CREATE INDEX "menu_items_category_id_idx" ON "menu_items"("category_id");

-- CreateIndex
CREATE INDEX "menu_items_is_available_idx" ON "menu_items"("is_available");

-- CreateIndex
CREATE INDEX "menu_items_deleted_at_idx" ON "menu_items"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_category_id_name_key" ON "menu_items"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_name_key" ON "membership_plans"("name");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "memberships_plan_id_idx" ON "memberships"("plan_id");

-- CreateIndex
CREATE INDEX "memberships_status_next_billing_at_idx" ON "memberships"("status", "next_billing_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_payments_idempotency_key_key" ON "membership_payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "membership_payments_membership_id_idx" ON "membership_payments"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_payments_membership_id_period_start_key" ON "membership_payments"("membership_id", "period_start");

-- CreateIndex
CREATE INDEX "org_units_parent_id_idx" ON "org_units"("parent_id");

-- CreateIndex
CREATE INDEX "org_units_unit_type_idx" ON "org_units"("unit_type");

-- CreateIndex
CREATE INDEX "org_units_deleted_at_idx" ON "org_units"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_work_email_key" ON "staff_members"("work_email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_extension_number_key" ON "staff_members"("extension_number");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_national_id_hash_key" ON "staff_members"("national_id_hash");

-- CreateIndex
CREATE INDEX "staff_members_org_unit_id_idx" ON "staff_members"("org_unit_id");

-- CreateIndex
CREATE INDEX "staff_members_title_idx" ON "staff_members"("title");

-- CreateIndex
CREATE INDEX "staff_members_full_name_idx" ON "staff_members"("full_name");

-- CreateIndex
CREATE INDEX "staff_members_deleted_at_idx" ON "staff_members"("deleted_at");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_status_idx" ON "support_tickets"("user_id", "status");

-- CreateIndex
CREATE INDEX "support_tickets_deleted_at_idx" ON "support_tickets"("deleted_at");

-- CreateIndex
CREATE INDEX "ticket_attachments_ticket_id_idx" ON "ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "consent_records_user_id_created_at_idx" ON "consent_records"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "consent_records_anonymous_id_idx" ON "consent_records"("anonymous_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_saved_card_id_fkey" FOREIGN KEY ("saved_card_id") REFERENCES "saved_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_slots" ADD CONSTRAINT "doctor_slots_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "doctor_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_seats" ADD CONSTRAINT "venue_seats_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "venue_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_reservations" ADD CONSTRAINT "seat_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_pending_plan_id_fkey" FOREIGN KEY ("pending_plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_saved_card_id_fkey" FOREIGN KEY ("saved_card_id") REFERENCES "saved_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
