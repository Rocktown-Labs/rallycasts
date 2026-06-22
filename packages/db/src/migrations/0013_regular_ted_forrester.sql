ALTER TABLE `challenge` ADD `venue_label` text;--> statement-breakpoint
INSERT INTO `organization` (`id`, `slug`, `name`, `bio`, `is_official`, `created_by_user_id`)
SELECT 'rallycasts-official', 'rallycasts', 'RallyCasts', 'The official RallyCasts organization.', true, `id`
FROM `user`
WHERE `username` = 'cgstewart'
  AND NOT EXISTS (SELECT 1 FROM `organization` WHERE `slug` = 'rallycasts');--> statement-breakpoint
INSERT INTO `organization_member` (`organization_id`, `user_id`, `role`)
SELECT 'rallycasts-official', `id`, 'owner'
FROM `user`
WHERE `username` = 'cgstewart'
  AND EXISTS (SELECT 1 FROM `organization` WHERE `id` = 'rallycasts-official')
  AND NOT EXISTS (
    SELECT 1 FROM `organization_member`
    WHERE `organization_id` = 'rallycasts-official' AND `user_id` = `user`.`id`
  );
