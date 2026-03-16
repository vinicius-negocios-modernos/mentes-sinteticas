-- Update file_uri_cache with fresh Gemini URIs (2026-03-16)
-- Uses LIKE pattern matching on local_path to handle NFD encoding

BEGIN;

UPDATE file_uri_cache SET
  file_uri = v.new_uri,
  expires_at = v.new_expires::timestamptz,
  updated_at = NOW()
FROM (VALUES
  ('%M1 - Hist%ria de Vida e Forma%', 'https://generativelanguage.googleapis.com/v1beta/files/jkgffusgsmrz', '2026-03-18T22:12:08.406149118Z'),
  ('%M2 - Sistemas de Pensamento%', 'https://generativelanguage.googleapis.com/v1beta/files/wy33pokqxqsm', '2026-03-18T22:12:10.305589136Z'),
  ('%M3 - Dom%nio e Expertise%', 'https://generativelanguage.googleapis.com/v1beta/files/910l9qxgs00h', '2026-03-18T22:12:11.980912429Z'),
  ('%M4 - Comunica%o e Express%', 'https://generativelanguage.googleapis.com/v1beta/files/e1tle4eclovb', '2026-03-18T22:12:13.667631261Z'),
  ('%M5 - Valores e Princ%pios%', 'https://generativelanguage.googleapis.com/v1beta/files/lq97xm0qpmyg', '2026-03-18T22:12:15.170499656Z'),
  ('%M6 - Contexto e Perspectiva%', 'https://generativelanguage.googleapis.com/v1beta/files/zk9at1luxdqg', '2026-03-18T22:12:16.656496372Z'),
  ('%M7 - Legado e Impacto%', 'https://generativelanguage.googleapis.com/v1beta/files/csrumst8dt2w', '2026-03-18T22:12:18.209308477Z'),
  ('%M8 - Fontes e Refer%ncias%', 'https://generativelanguage.googleapis.com/v1beta/files/bgcqaix6efko', '2026-03-18T22:12:19.503412987Z'),
  ('%Arquitetura da Domin%ncia Competitiva%', 'https://generativelanguage.googleapis.com/v1beta/files/2kw4siqordhr', '2026-03-18T22:12:21.414884166Z'),
  ('%Mente do Estrategista%Sistema Operacional%', 'https://generativelanguage.googleapis.com/v1beta/files/3fvtn0a2dr2i', '2026-03-18T22:12:23.758507348Z'),
  ('%ARQUEOLOGIA COGNITIVA DEEP%', 'https://generativelanguage.googleapis.com/v1beta/files/uk6d3co0me5i', '2026-03-18T22:12:25.560922320Z'),
  ('%ARQUEOLOGIA COGNITIVA: ANT%NIO NAPOLE', 'https://generativelanguage.googleapis.com/v1beta/files/amv2tkam2c65', '2026-03-18T22:12:27.237253848Z'),
  ('%estrategista que%arma o segundo lugar%', 'https://generativelanguage.googleapis.com/v1beta/files/2143n72aeyrg', '2026-03-18T22:12:28.795267855Z'),
  ('%COMPILA%O COMPLETA%SLIDES palestra parabelum%', 'https://generativelanguage.googleapis.com/v1beta/files/3hjifkmxc8ol', '2026-03-18T22:12:30.178512153Z'),
  ('%ENCICLOP%DIA ESTRAT%GICA NAPOLE%', 'https://generativelanguage.googleapis.com/v1beta/files/zry6pt6l7hnw', '2026-03-18T22:12:31.833310116Z'),
  ('%Estrat%gia Empresarial%Economia Real ao Digital%', 'https://generativelanguage.googleapis.com/v1beta/files/x8epk5mj8mej', '2026-03-18T22:12:33.511157758Z'),
  ('%Key Insights on Ant%nio Napole%', 'https://generativelanguage.googleapis.com/v1beta/files/dib2aop1fsxv', '2026-03-18T22:12:35.796542561Z'),
  ('%Pesquisa Aprofundada%Ant%nio Napole%Intelig%ncia Competitiva%', 'https://generativelanguage.googleapis.com/v1beta/files/alvkb7ea5aj5', '2026-03-18T22:12:37.916473794Z'),
  ('%Relat%rio de Intelig%ncia Estrat%gica%Ecossistema%Napole%', 'https://generativelanguage.googleapis.com/v1beta/files/x3qhrx1b8ayl', '2026-03-18T22:12:40.042853974Z'),
  ('%SISTEMA IMUNOL%GICO COGNITIVO%NAPOLE%', 'https://generativelanguage.googleapis.com/v1beta/files/soqmpc49f472', '2026-03-18T22:12:41.514276722Z'),
  ('%/overview', 'https://generativelanguage.googleapis.com/v1beta/files/d5cl69ueoo5j', '2026-03-18T22:12:43.008549399Z')
) AS v(path_pattern, new_uri, new_expires)
JOIN knowledge_documents kd ON kd.local_path LIKE v.path_pattern
WHERE file_uri_cache.knowledge_document_id = kd.id;

-- Verify results
SELECT 'Updated rows: ' || count(*) AS result
FROM file_uri_cache
WHERE expires_at > '2026-03-18T00:00:00Z';

SELECT kd.local_path, fc.file_uri, fc.expires_at
FROM file_uri_cache fc
JOIN knowledge_documents kd ON fc.knowledge_document_id = kd.id
ORDER BY kd.local_path
LIMIT 5;

COMMIT;
