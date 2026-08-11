-- Stores only what's needed to re-fetch weather (a city name the user
-- typed or confirmed) - never raw geolocation coordinates or location history.
alter table user_preferences add column if not exists location_city text;
