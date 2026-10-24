ALTER TABLE `competitionMatches` ADD `engineTitleSnapshot` varchar(240);
UPDATE `competitionMatches` AS matches
INNER JOIN `competitionEngines` AS engines ON engines.id = matches.engineId
SET matches.engineTitleSnapshot = engines.title
WHERE matches.engineTitleSnapshot IS NULL;
