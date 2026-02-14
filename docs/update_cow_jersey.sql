-- Update script for Cow Jersey sprites
-- Run this in your database tool

UPDATE animal_variants 
SET sprites = '{
    "idle": "sprites/animals/cow_jersey/idle",
    "walking": "sprites/animals/cow_jersey/walking",
    "eating": "sprites/animals/cow_jersey/eating",
    "sleeping": "sprites/animals/cow_jersey/sleeping",
    "ready": "sprites/animals/cow_jersey/ready",
    "sick": "sprites/animals/cow_jersey/sick"
}'
WHERE variant_code = 'cow_dairy_jersey';
