-- Reverse of 000001_init.up.sql — drops the schema (reverse creation order).
DROP TABLE IF EXISTS payment;

DROP TABLE IF EXISTS subscription;

DROP TABLE IF EXISTS plan;

DROP TABLE IF EXISTS discovery_news;

DROP TABLE IF EXISTS discovery_promo;

DROP TABLE IF EXISTS discovery_event;

DROP TABLE IF EXISTS discovery_thing_to_do;

DROP TABLE IF EXISTS marketplace_wallet_transaction;

DROP TABLE IF EXISTS marketplace_message;

DROP TABLE IF EXISTS marketplace_message_thread;

DROP TABLE IF EXISTS marketplace_job_application;

DROP TABLE IF EXISTS marketplace_job;

DROP TABLE IF EXISTS marketplace_provider_review;

DROP TABLE IF EXISTS marketplace_provider;

DROP TABLE IF EXISTS marketplace_category;

DROP TABLE IF EXISTS email_change_request;

DROP TABLE IF EXISTS email_otp;

DROP TABLE IF EXISTS two_factor;

DROP TABLE IF EXISTS role_permission;

DROP TABLE IF EXISTS permission;

DROP TABLE IF EXISTS "role";

DROP TABLE IF EXISTS "user";
