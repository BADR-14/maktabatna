-- Profile photo; room and bookcase names in formal Arabic (غرفة الضيوف، غرفة الجلوس).
ALTER TABLE `users` ADD `avatar_uri` text;--> statement-breakpoint
UPDATE `rooms` SET `name` = 'غرفة الضيوف' WHERE `id` = 'bcd2b7ad-f9f0-5b37-bbfa-1f66ebdbe83f';
--> statement-breakpoint
UPDATE `rooms` SET `name` = 'غرفة الجلوس' WHERE `id` = 'd4552759-7583-57fc-ae9d-51a33c1ed456';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'خزانة زجاجية', `wall` = 'الجدار الطويل، بجانب النافذة' WHERE `id` = 'a646f411-5b34-59d9-83b2-7102da098a7f';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'مكتبة مفتوحة', `wall` = 'الجدار الطويل' WHERE `id` = '4903c2d4-1467-5bec-98e7-87a32af94b87';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'مكتبة مفتوحة', `wall` = 'جدار الباب' WHERE `id` = '0f97997f-9999-57b0-8677-242283113b90';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'خزانة زجاجية علوية', `wall` = 'جدار الباب، فوق الوحدة الصغيرة' WHERE `id` = 'b7773d25-b90c-5086-95e7-5249550c5f42';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'خزانة زجاجية فوق الباب', `wall` = 'جدار الباب، فوق الباب' WHERE `id` = '9a415b93-9cce-5b9c-bb02-a5169d7a4ac9';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'الوحدة الصغيرة', `wall` = 'جدار الباب، بجانب الباب' WHERE `id` = 'b465ad0b-6387-5e67-8427-91999e6ff1c7';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'الخزانة الزجاجية اليمنى', `wall` = 'بجانب النافذة' WHERE `id` = '2062b0e3-91f6-59e6-ab4f-9482e85dc988';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'المكتبة الكبيرة اليمنى', `wall` = 'في الوسط' WHERE `id` = '0cd18300-383b-5dd1-a4e1-0db99bd27967';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'المكتبة الكبيرة اليسرى', `wall` = 'في الوسط' WHERE `id` = 'b34671eb-c2ef-52bc-9897-dc73a92c6c81';
--> statement-breakpoint
UPDATE `bookcases` SET `name` = 'الخزانة الزجاجية اليسرى', `wall` = 'بجانب الساعة' WHERE `id` = '7220793a-0073-5df8-ba08-0242fdc70b13';
