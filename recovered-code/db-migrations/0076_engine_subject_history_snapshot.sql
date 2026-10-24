ALTER TABLE `competitionMatches` ADD `engineSubjectNameSnapshot` varchar(120);
UPDATE `competitionMatches` AS matches
INNER JOIN `competitionEngines` AS engines ON engines.id = matches.engineId
SET matches.engineSubjectNameSnapshot = engines.subjectName
WHERE matches.engineSubjectNameSnapshot IS NULL;
