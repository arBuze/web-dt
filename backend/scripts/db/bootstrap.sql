-- =====================================================
-- DATABASE ACCESS
-- =====================================================

GRANT CONNECT
ON DATABASE digital_twin
TO digital_twin_user;


-- Переключаемся на рабочую БД.
\connect digital_twin


-- =====================================================
-- SCHEMA ACCESS
-- =====================================================

GRANT USAGE
ON SCHEMA public
TO digital_twin_user;


-- =====================================================
-- EXISTING OBJECTS
-- =====================================================

-- Если миграции уже когда-либо выполнялись,
-- выдаём права на существующие таблицы.
GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO digital_twin_user;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO digital_twin_user;


-- =====================================================
-- FUTURE OBJECTS CREATED BY POSTGRES
-- =====================================================

ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLES
TO digital_twin_user;

ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
GRANT USAGE, SELECT
ON SEQUENCES
TO digital_twin_user;