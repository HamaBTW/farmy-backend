-- Update script for Cow Jersey sprites
-- Run this in your database tool

UPDATE animal_variants 
SET sprites = '{
    "idle": "sprites/animals/cow_jersey/idle",
    "walking": "sprites/animals/cow_jersey/idle",
    "eating": "sprites/animals/cow_jersey/idle",
    "sleeping": "sprites/animals/cow_jersey/idle",
    "ready": "sprites/animals/cow_jersey/idle",
    "sick": "sprites/animals/cow_jersey/idle"
}'
WHERE variant_code = 'cow_dairy_jersey';
